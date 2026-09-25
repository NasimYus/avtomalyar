package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

type purchaseRepository interface {
	ListPurchases(ctx context.Context, arg db.ListPurchasesParams) ([]db.Purchase, error)
	CountPurchases(ctx context.Context, arg db.CountPurchasesParams) (int64, error)
	SumPurchases(ctx context.Context, arg db.SumPurchasesParams) (int64, error)
	GetPurchaseByID(ctx context.Context, id int64) (db.Purchase, error)
	WithTx(ctx context.Context, fn func(q *db.Queries) error) error
}

// PurchaseFilter narrows ListPurchases; a nil field means "don't filter on
// this".
type PurchaseFilter struct {
	DealerID *int64
	DateFrom *time.Time
	DateTo   *time.Time
	Page     int
	PerPage  int
}

// PurchasePage is a page of purchases plus, for the whole filtered set
// (not just this page), how many there are and what they add up to — the
// "итого за период" figure the purchases screen shows.
type PurchasePage struct {
	Items       []db.Purchase
	Total       int64
	TotalAmount int64
	Page        int
	PerPage     int
}

// PurchaseService implements CRUD for purchases. Every write recomputes
// lifetime_purchase_total (a full re-sum, per ToR 3.2 — never an
// increment) and grade_id for every dealer it affects, in the same
// transaction as the write.
type PurchaseService struct {
	repo purchaseRepository
}

// NewPurchaseService constructs a PurchaseService backed by repo.
func NewPurchaseService(repo purchaseRepository) *PurchaseService {
	return &PurchaseService{repo: repo}
}

// List returns a page of purchases matching filter, most recent first.
func (s *PurchaseService) List(ctx context.Context, filter PurchaseFilter) (PurchasePage, error) {
	page, perPage := filter.Page, filter.PerPage
	if page < 1 || page > maxDealerPage {
		page = 1
	}
	if perPage < 1 || perPage > 200 {
		perPage = 20
	}
	offset := (page - 1) * perPage // page <= maxDealerPage and perPage <= 200, so this stays well within int32

	dealerID, dateFrom, dateTo := purchaseFilterParams(filter)

	items, err := s.repo.ListPurchases(ctx, db.ListPurchasesParams{
		DealerID: dealerID, DateFrom: dateFrom, DateTo: dateTo,
		Limit: int32(perPage), Offset: int32(offset), //nolint:gosec // bounded above
	})
	if err != nil {
		return PurchasePage{}, fmt.Errorf("list purchases: %w", repository.TranslateError(err))
	}

	total, err := s.repo.CountPurchases(ctx, db.CountPurchasesParams{
		DealerID: dealerID, DateFrom: dateFrom, DateTo: dateTo,
	})
	if err != nil {
		return PurchasePage{}, fmt.Errorf("count purchases: %w", repository.TranslateError(err))
	}

	totalAmount, err := s.repo.SumPurchases(ctx, db.SumPurchasesParams{
		DealerID: dealerID, DateFrom: dateFrom, DateTo: dateTo,
	})
	if err != nil {
		return PurchasePage{}, fmt.Errorf("sum purchases: %w", repository.TranslateError(err))
	}

	return PurchasePage{
		Items:       items,
		Total:       total,
		TotalAmount: totalAmount,
		Page:        page,
		PerPage:     perPage,
	}, nil
}

func purchaseFilterParams(filter PurchaseFilter) (pgtype.Int8, pgtype.Date, pgtype.Date) {
	var dealerID pgtype.Int8
	if filter.DealerID != nil {
		dealerID = pgtype.Int8{Int64: *filter.DealerID, Valid: true}
	}
	var dateFrom, dateTo pgtype.Date
	if filter.DateFrom != nil {
		dateFrom = pgtype.Date{Time: *filter.DateFrom, Valid: true}
	}
	if filter.DateTo != nil {
		dateTo = pgtype.Date{Time: *filter.DateTo, Valid: true}
	}
	return dealerID, dateFrom, dateTo
}

// Get returns the purchase with the given id, or domain.ErrNotFound.
func (s *PurchaseService) Get(ctx context.Context, id int64) (db.Purchase, error) {
	purchase, err := s.repo.GetPurchaseByID(ctx, id)
	if err != nil {
		return db.Purchase{}, fmt.Errorf("get purchase: %w", repository.TranslateError(err))
	}
	return purchase, nil
}

// Create records a purchase and recomputes the dealer's lifetime total and
// grade in the same transaction.
func (s *PurchaseService) Create(ctx context.Context, dealerID int64, amount int64, purchaseDate time.Time, comment *string, createdBy int64) (db.Purchase, error) {
	if err := validatePurchase(amount, purchaseDate); err != nil {
		return db.Purchase{}, err
	}

	var purchase db.Purchase
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		created, err := q.CreatePurchase(ctx, db.CreatePurchaseParams{
			DealerID:     dealerID,
			Amount:       amount,
			PurchaseDate: pgtype.Date{Time: purchaseDate, Valid: true},
			Comment:      textOrNull(comment),
			CreatedBy:    createdBy,
		})
		if err != nil {
			return err
		}
		purchase = created
		return recomputeDealerLifetimeAndGrade(ctx, q, dealerID)
	})
	if err != nil {
		return db.Purchase{}, fmt.Errorf("create purchase: %w", repository.TranslateError(err))
	}
	return purchase, nil
}

// Update overwrites a purchase's dealer, amount, date and comment, then
// recomputes lifetime total and grade for whichever dealer(s) are
// affected — both the old and new dealer, if it was reassigned.
func (s *PurchaseService) Update(ctx context.Context, id, dealerID, amount int64, purchaseDate time.Time, comment *string) (db.Purchase, error) {
	if err := validatePurchase(amount, purchaseDate); err != nil {
		return db.Purchase{}, err
	}

	var purchase db.Purchase
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		existing, err := q.GetPurchaseByID(ctx, id)
		if err != nil {
			return err
		}

		updated, err := q.UpdatePurchase(ctx, db.UpdatePurchaseParams{
			ID:           id,
			DealerID:     dealerID,
			Amount:       amount,
			PurchaseDate: pgtype.Date{Time: purchaseDate, Valid: true},
			Comment:      textOrNull(comment),
		})
		if err != nil {
			return err
		}
		purchase = updated

		if err := recomputeDealerLifetimeAndGrade(ctx, q, dealerID); err != nil {
			return err
		}
		if existing.DealerID != dealerID {
			if err := recomputeDealerLifetimeAndGrade(ctx, q, existing.DealerID); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return db.Purchase{}, fmt.Errorf("update purchase: %w", repository.TranslateError(err))
	}
	return purchase, nil
}

// Delete removes a purchase and recomputes its dealer's lifetime total and
// grade.
func (s *PurchaseService) Delete(ctx context.Context, id int64) error {
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		existing, err := q.GetPurchaseByID(ctx, id)
		if err != nil {
			return err
		}

		rows, err := q.DeletePurchase(ctx, id)
		if err != nil {
			return err
		}
		if rows == 0 {
			return domain.ErrNotFound
		}

		return recomputeDealerLifetimeAndGrade(ctx, q, existing.DealerID)
	})
	if err != nil {
		return fmt.Errorf("delete purchase: %w", repository.TranslateError(err))
	}
	return nil
}

// businessLocation is the shop's timezone (ToR 3.6) — "purchase date not in
// the future" is judged against today's date there, not the server's.
var businessLocation = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Dushanbe")
	if err != nil {
		return time.UTC
	}
	return loc
}()

func validatePurchase(amount int64, purchaseDate time.Time) error {
	if amount <= 0 {
		return fmt.Errorf("%w: purchase amount must be positive", domain.ErrValidation)
	}

	today := time.Now().In(businessLocation)
	todayDate := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, businessLocation)
	givenDate := time.Date(purchaseDate.Year(), purchaseDate.Month(), purchaseDate.Day(), 0, 0, 0, 0, businessLocation)
	if givenDate.After(todayDate) {
		return fmt.Errorf("%w: purchase date cannot be in the future", domain.ErrValidation)
	}
	return nil
}
