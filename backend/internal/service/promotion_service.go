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

type promotionRepository interface {
	ListPromotions(ctx context.Context, status pgtype.Text) ([]db.Promotion, error)
	CountPromotionsByStatus(ctx context.Context) ([]db.CountPromotionsByStatusRow, error)
	GetPromotionByID(ctx context.Context, id int64) (db.Promotion, error)
	CreatePromotion(ctx context.Context, arg db.CreatePromotionParams) (db.Promotion, error)
	UpdatePromotion(ctx context.Context, arg db.UpdatePromotionParams) (db.Promotion, error)
	DeletePromotion(ctx context.Context, id int64) (int64, error)
	ListPrizePlaces(ctx context.Context, promotionID int64) ([]db.ListPrizePlacesRow, error)
	ListPromotionResults(ctx context.Context, promotionID int64) ([]db.ListPromotionResultsRow, error)
	ListActiveDealersWithPeriodTotals(
		ctx context.Context,
		arg db.ListActiveDealersWithPeriodTotalsParams,
	) ([]db.ListActiveDealersWithPeriodTotalsRow, error)
	WithTx(ctx context.Context, fn func(q *db.Queries) error) error
}

// PromotionInput is the editable part of a promotion.
type PromotionInput struct {
	TitleRu       string
	TitleTg       string
	DescriptionRu *string
	DescriptionTg *string
	StartDate     time.Time
	EndDate       time.Time
	CityID        *int64
	GradeID       *int64
	// Lifetime purchase threshold in dirams; nil means everyone takes part.
	MinLifetimeThreshold *int64
}

// PrizePlaceInput assigns a prize to a place in the ranking.
type PrizePlaceInput struct {
	PlaceRank int32
	PrizeID   int64
}

// PromotionService implements the promotion lifecycle: setting one up,
// computing the ranking, letting an admin correct it, and publishing.
type PromotionService struct {
	repo promotionRepository
}

// NewPromotionService constructs a PromotionService backed by repo.
func NewPromotionService(repo promotionRepository) *PromotionService {
	return &PromotionService{repo: repo}
}

// List returns promotions, optionally narrowed to one status.
func (s *PromotionService) List(ctx context.Context, status *string) ([]db.Promotion, error) {
	var filter pgtype.Text
	if status != nil {
		filter = pgtype.Text{String: *status, Valid: true}
	}

	promotions, err := s.repo.ListPromotions(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("list promotions: %w", repository.TranslateError(err))
	}
	return promotions, nil
}

// StatusCounts powers the status tabs above the promotions list.
func (s *PromotionService) StatusCounts(ctx context.Context) (map[string]int64, error) {
	rows, err := s.repo.CountPromotionsByStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("count promotions: %w", repository.TranslateError(err))
	}

	// Statuses with no promotions still get a zero, so the tabs never
	// disappear from the list screen.
	counts := make(map[string]int64, len(domain.AllPromotionStatuses()))
	for _, status := range domain.AllPromotionStatuses() {
		counts[string(status)] = 0
	}
	for _, row := range rows {
		counts[row.Status] = row.Total
	}
	return counts, nil
}

// Get returns a promotion with the prizes attached to its places.
func (s *PromotionService) Get(ctx context.Context, id int64) (db.Promotion, []db.ListPrizePlacesRow, error) {
	promotion, err := s.repo.GetPromotionByID(ctx, id)
	if err != nil {
		return db.Promotion{}, nil, fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}

	places, err := s.repo.ListPrizePlaces(ctx, id)
	if err != nil {
		return db.Promotion{}, nil, fmt.Errorf("list prize places: %w", repository.TranslateError(err))
	}
	return promotion, places, nil
}

func validatePromotionInput(input PromotionInput) error {
	if input.EndDate.Before(input.StartDate) {
		return fmt.Errorf("%w: end date cannot be before the start date", domain.ErrValidation)
	}
	if input.MinLifetimeThreshold != nil && *input.MinLifetimeThreshold < 0 {
		return fmt.Errorf("%w: threshold cannot be negative", domain.ErrValidation)
	}
	return nil
}

// Create adds a promotion as a draft; its prize places are set separately.
func (s *PromotionService) Create(ctx context.Context, input PromotionInput) (db.Promotion, error) {
	if err := validatePromotionInput(input); err != nil {
		return db.Promotion{}, err
	}

	promotion, err := s.repo.CreatePromotion(ctx, db.CreatePromotionParams{
		TitleRu:                      input.TitleRu,
		TitleTg:                      input.TitleTg,
		DescriptionRu:                textOrNull(input.DescriptionRu),
		DescriptionTg:                textOrNull(input.DescriptionTg),
		StartDate:                    pgtype.Date{Time: input.StartDate, Valid: true},
		EndDate:                      pgtype.Date{Time: input.EndDate, Valid: true},
		CityID:                       int8OrNull(input.CityID),
		GradeID:                      int8OrNull(input.GradeID),
		MinLifetimePurchaseThreshold: int8OrNull(input.MinLifetimeThreshold),
	})
	if err != nil {
		return db.Promotion{}, fmt.Errorf("create promotion: %w", repository.TranslateError(err))
	}
	return promotion, nil
}

// Update changes a promotion's terms. Once the results are calculated the
// terms are frozen — changing them afterwards would invalidate a ranking
// dealers may already have seen.
func (s *PromotionService) Update(ctx context.Context, id int64, input PromotionInput) (db.Promotion, error) {
	if err := validatePromotionInput(input); err != nil {
		return db.Promotion{}, err
	}

	existing, err := s.repo.GetPromotionByID(ctx, id)
	if err != nil {
		return db.Promotion{}, fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}
	if !domain.PromotionStatus(existing.Status).IsEditable() {
		return db.Promotion{}, fmt.Errorf("%w: promotion is no longer editable", domain.ErrConflict)
	}

	promotion, err := s.repo.UpdatePromotion(ctx, db.UpdatePromotionParams{
		ID:                           id,
		TitleRu:                      input.TitleRu,
		TitleTg:                      input.TitleTg,
		DescriptionRu:                textOrNull(input.DescriptionRu),
		DescriptionTg:                textOrNull(input.DescriptionTg),
		StartDate:                    pgtype.Date{Time: input.StartDate, Valid: true},
		EndDate:                      pgtype.Date{Time: input.EndDate, Valid: true},
		CityID:                       int8OrNull(input.CityID),
		GradeID:                      int8OrNull(input.GradeID),
		MinLifetimePurchaseThreshold: int8OrNull(input.MinLifetimeThreshold),
	})
	if err != nil {
		return db.Promotion{}, fmt.Errorf("update promotion: %w", repository.TranslateError(err))
	}
	return promotion, nil
}

// SetPrizePlaces replaces the whole "place → prize" table of a promotion.
// The same prize may be used for several places (ToR 3.2).
func (s *PromotionService) SetPrizePlaces(ctx context.Context, id int64, places []PrizePlaceInput) error {
	existing, err := s.repo.GetPromotionByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}
	if !domain.PromotionStatus(existing.Status).IsEditable() {
		return fmt.Errorf("%w: promotion is no longer editable", domain.ErrConflict)
	}

	seen := make(map[int32]bool, len(places))
	for _, place := range places {
		if place.PlaceRank < 1 {
			return fmt.Errorf("%w: place must be positive", domain.ErrValidation)
		}
		if seen[place.PlaceRank] {
			return fmt.Errorf("%w: place %d is listed twice", domain.ErrValidation, place.PlaceRank)
		}
		seen[place.PlaceRank] = true
	}

	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		if err := q.DeletePrizePlaces(ctx, id); err != nil {
			return err
		}
		for _, place := range places {
			if _, err := q.CreatePrizePlace(ctx, db.CreatePrizePlaceParams{
				PromotionID: id,
				PlaceRank:   place.PlaceRank,
				PrizeID:     place.PrizeID,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("set prize places: %w", repository.TranslateError(err))
	}
	return nil
}

// Delete removes a promotion. Only a draft can be deleted — anything that
// has been visible to dealers is archived instead, so the history holds.
func (s *PromotionService) Delete(ctx context.Context, id int64) error {
	existing, err := s.repo.GetPromotionByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}
	if domain.PromotionStatus(existing.Status) != domain.PromotionDraft {
		return fmt.Errorf("%w: only a draft can be deleted, archive it instead", domain.ErrConflict)
	}

	rows, err := s.repo.DeletePromotion(ctx, id)
	if err != nil {
		return fmt.Errorf("delete promotion: %w", repository.TranslateError(err))
	}
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// transition moves a promotion to another status, refusing steps the
// lifecycle doesn't allow.
func (s *PromotionService) transition(ctx context.Context, id int64, to domain.PromotionStatus) (db.Promotion, error) {
	existing, err := s.repo.GetPromotionByID(ctx, id)
	if err != nil {
		return db.Promotion{}, fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}

	from := domain.PromotionStatus(existing.Status)
	if !domain.CanTransition(from, to) {
		return db.Promotion{}, fmt.Errorf(
			"%w: cannot move a promotion from %q to %q", domain.ErrConflict, from, to)
	}

	var updated db.Promotion
	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		var txErr error
		updated, txErr = q.SetPromotionStatus(ctx, db.SetPromotionStatusParams{
			ID: id, Status: string(to),
		})
		return txErr
	})
	if err != nil {
		return db.Promotion{}, fmt.Errorf("set promotion status: %w", repository.TranslateError(err))
	}
	return updated, nil
}

// Start makes a draft visible to dealers.
func (s *PromotionService) Start(ctx context.Context, id int64) (db.Promotion, error) {
	return s.transition(ctx, id, domain.PromotionActive)
}

// Archive takes a promotion out of the active lists.
func (s *PromotionService) Archive(ctx context.Context, id int64) (db.Promotion, error) {
	return s.transition(ctx, id, domain.PromotionArchived)
}

// Publish makes the calculated results visible to dealers and freezes
// them (ToR 4.6).
func (s *PromotionService) Publish(ctx context.Context, id int64) (db.Promotion, error) {
	return s.transition(ctx, id, domain.PromotionPublished)
}
