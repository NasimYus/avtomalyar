package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/avtomalyar/backend/internal/auth"
	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

const (
	maxLoginGenerationAttempts = 5
	maxDealerPage              = 1_000_000 // keeps page*perPage well within int32 for the SQL OFFSET
)

type dealerRepository interface {
	ListDealers(ctx context.Context, arg db.ListDealersParams) ([]db.Dealer, error)
	CountDealers(ctx context.Context, arg db.CountDealersParams) (int64, error)
	GetDealerByID(ctx context.Context, id int64) (db.Dealer, error)
	CreateDealer(ctx context.Context, arg db.CreateDealerParams) (db.Dealer, error)
	UpdateDealer(ctx context.Context, arg db.UpdateDealerParams) (db.Dealer, error)
	SetDealerActive(ctx context.Context, arg db.SetDealerActiveParams) (db.Dealer, error)
	SetDealerPasswordHash(ctx context.Context, arg db.SetDealerPasswordHashParams) error
	SetDealerGrade(ctx context.Context, arg db.SetDealerGradeParams) error
	DeleteDealer(ctx context.Context, id int64) (int64, error)
	ListGrades(ctx context.Context) ([]db.Grade, error)
	WithTx(ctx context.Context, fn func(q *db.Queries) error) error
}

// DealerFilter narrows ListDealers; a nil/zero field means "don't filter
// on this".
type DealerFilter struct {
	CityID   *int64
	GradeID  *int64
	IsActive *bool
	Query    string
	Page     int
	PerPage  int
}

// DealerPage is a page of dealers plus the total count matching the
// filter, for pagination.
type DealerPage struct {
	Items   []db.Dealer
	Total   int64
	Page    int
	PerPage int
}

// DealerService implements CRUD for dealers: creation generates their
// login and password (ToR 5.3), and every write that can change lifetime
// totals or grades keeps grade_id consistent via domain.SelectGrade.
type DealerService struct {
	repo dealerRepository
}

// NewDealerService constructs a DealerService backed by repo.
func NewDealerService(repo dealerRepository) *DealerService {
	return &DealerService{repo: repo}
}

// List returns a page of dealers matching filter.
func (s *DealerService) List(ctx context.Context, filter DealerFilter) (DealerPage, error) {
	page, perPage := filter.Page, filter.PerPage
	if page < 1 || page > maxDealerPage {
		page = 1
	}
	if perPage < 1 || perPage > 200 {
		perPage = 20
	}

	params := dealerFilterParams(filter)

	offset := (page - 1) * perPage // page <= maxDealerPage and perPage <= 200, so this stays well within int32

	items, err := s.repo.ListDealers(ctx, db.ListDealersParams{
		CityID: params.CityID, GradeID: params.GradeID, IsActive: params.IsActive, Query: params.Query,
		Limit: int32(perPage), Offset: int32(offset), //nolint:gosec // bounded above
	})
	if err != nil {
		return DealerPage{}, fmt.Errorf("list dealers: %w", repository.TranslateError(err))
	}

	total, err := s.repo.CountDealers(ctx, db.CountDealersParams{
		CityID: params.CityID, GradeID: params.GradeID, IsActive: params.IsActive, Query: params.Query,
	})
	if err != nil {
		return DealerPage{}, fmt.Errorf("count dealers: %w", repository.TranslateError(err))
	}

	return DealerPage{Items: items, Total: total, Page: page, PerPage: perPage}, nil
}

type dealerFilterParamValues struct {
	CityID   pgtype.Int8
	GradeID  pgtype.Int8
	IsActive pgtype.Bool
	Query    pgtype.Text
}

func dealerFilterParams(filter DealerFilter) dealerFilterParamValues {
	var v dealerFilterParamValues
	if filter.CityID != nil {
		v.CityID = pgtype.Int8{Int64: *filter.CityID, Valid: true}
	}
	if filter.GradeID != nil {
		v.GradeID = pgtype.Int8{Int64: *filter.GradeID, Valid: true}
	}
	if filter.IsActive != nil {
		v.IsActive = pgtype.Bool{Bool: *filter.IsActive, Valid: true}
	}
	if filter.Query != "" {
		v.Query = pgtype.Text{String: filter.Query, Valid: true}
	}
	return v
}

// Get returns the dealer with the given id, or domain.ErrNotFound.
func (s *DealerService) Get(ctx context.Context, id int64) (db.Dealer, error) {
	dealer, err := s.repo.GetDealerByID(ctx, id)
	if err != nil {
		return db.Dealer{}, fmt.Errorf("get dealer: %w", repository.TranslateError(err))
	}
	return dealer, nil
}

// CreatedDealer is a newly created dealer plus their one-time plaintext
// password — the only place it's ever available after creation.
type CreatedDealer struct {
	Dealer   db.Dealer
	Password string
}

// Create adds a dealer, generating their login and password, and assigns
// their initial grade (a brand-new dealer always starts at a
// lifetime_purchase_total of 0).
func (s *DealerService) Create(ctx context.Context, fullName, phone string, cityID int64) (CreatedDealer, error) {
	password, err := auth.GenerateRandomPassword(12)
	if err != nil {
		return CreatedDealer{}, fmt.Errorf("generate password: %w", err)
	}
	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return CreatedDealer{}, err
	}

	var dealer db.Dealer
	for attempt := 0; attempt < maxLoginGenerationAttempts; attempt++ {
		login, loginErr := generateDealerLogin(fullName)
		if loginErr != nil {
			return CreatedDealer{}, fmt.Errorf("generate login: %w", loginErr)
		}

		txErr := s.repo.WithTx(ctx, func(q *db.Queries) error {
			created, err := q.CreateDealer(ctx, db.CreateDealerParams{
				FullName: fullName, Phone: phone, CityID: cityID, Login: login, PasswordHash: passwordHash,
			})
			if err != nil {
				return err
			}
			dealer = created
			// A brand-new dealer always starts at a lifetime_purchase_total
			// of 0 (purchases can only be added afterwards, referencing this
			// dealer_id), so this only needs the grade half of the shared
			// recompute helper.
			return recomputeSingleDealerGrade(ctx, q, dealer.ID, 0)
		})
		if txErr == nil {
			break
		}
		if errors.Is(repository.TranslateError(txErr), domain.ErrConflict) {
			continue // login collision, try another random suffix
		}
		return CreatedDealer{}, fmt.Errorf("create dealer: %w", repository.TranslateError(txErr))
	}
	if dealer.ID == 0 {
		return CreatedDealer{}, fmt.Errorf("create dealer: could not generate a unique login after %d attempts", maxLoginGenerationAttempts)
	}

	// Re-fetch: the transaction set grade_id after the row above was
	// returned by CreateDealer, so this copy is stale.
	dealer, err = s.repo.GetDealerByID(ctx, dealer.ID)
	if err != nil {
		return CreatedDealer{}, fmt.Errorf("reload created dealer: %w", repository.TranslateError(err))
	}

	return CreatedDealer{Dealer: dealer, Password: password}, nil
}

// Update overwrites a dealer's name, phone and city.
func (s *DealerService) Update(ctx context.Context, id int64, fullName, phone string, cityID int64) (db.Dealer, error) {
	dealer, err := s.repo.UpdateDealer(ctx, db.UpdateDealerParams{
		ID: id, FullName: fullName, Phone: phone, CityID: cityID,
	})
	if err != nil {
		return db.Dealer{}, fmt.Errorf("update dealer: %w", repository.TranslateError(err))
	}
	return dealer, nil
}

// SetActive activates or deactivates a dealer's access without deleting
// their record or purchase history.
func (s *DealerService) SetActive(ctx context.Context, id int64, active bool) (db.Dealer, error) {
	dealer, err := s.repo.SetDealerActive(ctx, db.SetDealerActiveParams{ID: id, IsActive: active})
	if err != nil {
		return db.Dealer{}, fmt.Errorf("set dealer active: %w", repository.TranslateError(err))
	}
	return dealer, nil
}

// ResetPassword generates a new password for a dealer and returns it —
// again, the only time it's available in plaintext.
func (s *DealerService) ResetPassword(ctx context.Context, id int64) (string, error) {
	password, err := auth.GenerateRandomPassword(12)
	if err != nil {
		return "", fmt.Errorf("generate password: %w", err)
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return "", err
	}

	if err := s.repo.SetDealerPasswordHash(ctx, db.SetDealerPasswordHashParams{ID: id, PasswordHash: hash}); err != nil {
		return "", fmt.Errorf("reset dealer password: %w", repository.TranslateError(err))
	}
	return password, nil
}

// Delete removes a dealer outright. The ToR's rule is that dealers are
// deactivated rather than deleted, so history survives — the purchases
// foreign key enforces it: a dealer who ever bought anything can't be
// deleted and comes back as domain.ErrConflict, leaving deactivation as
// the only option. Deletion therefore only clears out records created by
// mistake.
func (s *DealerService) Delete(ctx context.Context, id int64) error {
	rows, err := s.repo.DeleteDealer(ctx, id)
	if err != nil {
		if errors.Is(repository.TranslateError(err), domain.ErrConflict) {
			return fmt.Errorf("%w: dealer has purchases and can only be deactivated", domain.ErrConflict)
		}
		return fmt.Errorf("delete dealer: %w", repository.TranslateError(err))
	}
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}
