package service

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

// Calculate ranks the promotion's participants and stores the result as a
// draft the admin can review (ToR 4.5 — never published automatically,
// because valuable prizes hang on it).
//
// Recalculation is allowed while the promotion sits in "calculated":
// results are rewritten from scratch, which also discards manual
// corrections — that is the point of recalculating.
func (s *PromotionService) Calculate(ctx context.Context, id int64) ([]db.ListPromotionResultsRow, error) {
	promotion, err := s.repo.GetPromotionByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}

	from := domain.PromotionStatus(promotion.Status)
	if !domain.CanTransition(from, domain.PromotionCalculated) {
		return nil, fmt.Errorf(
			"%w: results cannot be calculated for a %q promotion", domain.ErrConflict, from)
	}

	// The ranking is only meaningful once the period is over; until then
	// dealers can still change their position.
	if !promotion.EndDate.Time.Before(domain.Today()) {
		return nil, fmt.Errorf(
			"%w: the promotion period has not ended yet", domain.ErrConflict)
	}

	participants, err := s.rankParticipants(ctx, promotion)
	if err != nil {
		return nil, err
	}

	places, err := s.repo.ListPrizePlaces(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("list prize places: %w", repository.TranslateError(err))
	}
	prizeByPlace := make(map[int32]int64, len(places))
	for _, place := range places {
		prizeByPlace[place.PlaceRank] = place.PrizeID
	}

	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		if err := q.DeletePromotionResults(ctx, id); err != nil {
			return err
		}

		for _, participant := range participants {
			place := int32(participant.Place) //nolint:gosec // places are bounded by the dealer count

			var prize pgtype.Int8
			if prizeID, ok := prizeByPlace[place]; ok {
				prize = pgtype.Int8{Int64: prizeID, Valid: true}
			}

			if err := q.CreatePromotionResult(ctx, db.CreatePromotionResultParams{
				PromotionID: id,
				DealerID:    participant.DealerID,
				PeriodTotal: participant.PeriodTotal,
				PlaceRank:   pgtype.Int4{Int32: place, Valid: true},
				PrizeID:     prize,
			}); err != nil {
				return err
			}
		}

		_, err := q.SetPromotionStatus(ctx, db.SetPromotionStatusParams{
			ID: id, Status: string(domain.PromotionCalculated),
		})
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("store promotion results: %w", repository.TranslateError(err))
	}

	return s.Results(ctx, id)
}

// rankParticipants loads every active dealer with their total inside the
// promotion period, keeps the eligible ones and orders them by the domain
// rules.
func (s *PromotionService) rankParticipants(
	ctx context.Context,
	promotion db.Promotion,
) ([]domain.RankedParticipant, error) {
	rows, err := s.repo.ListActiveDealersWithPeriodTotals(ctx, db.ListActiveDealersWithPeriodTotalsParams{
		DateFrom: promotion.StartDate,
		DateTo:   promotion.EndDate,
	})
	if err != nil {
		return nil, fmt.Errorf("load participants: %w", repository.TranslateError(err))
	}

	conditions := domain.PromotionConditions{
		CityID:               int8ToPtr(promotion.CityID),
		GradeID:              int8ToPtr(promotion.GradeID),
		MinLifetimeThreshold: int8ToPtr(promotion.MinLifetimePurchaseThreshold),
	}

	eligible := make([]domain.Participant, 0, len(rows))
	for _, row := range rows {
		dealer := domain.DealerSnapshot{
			ID:                    row.DealerID,
			CityID:                row.CityID,
			GradeID:               int8ToPtr(row.GradeID),
			IsActive:              true, // the query only returns active dealers
			LifetimePurchaseTotal: row.LifetimePurchaseTotal,
		}
		if !domain.IsEligible(dealer, conditions) {
			continue
		}

		eligible = append(eligible, domain.Participant{
			DealerID:              row.DealerID,
			PeriodTotal:           row.PeriodTotal,
			LastPurchaseDate:      row.LastPurchaseDate.Time,
			LastPurchaseCreatedAt: row.LastPurchaseCreatedAt.Time,
		})
	}

	return domain.RankParticipants(eligible), nil
}

// Results returns the stored ranking of a promotion.
func (s *PromotionService) Results(ctx context.Context, id int64) ([]db.ListPromotionResultsRow, error) {
	results, err := s.repo.ListPromotionResults(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("list promotion results: %w", repository.TranslateError(err))
	}
	return results, nil
}

// ResultAdjustment is a manual correction to one participant's outcome.
type ResultAdjustment struct {
	DealerID int64
	// nil takes the dealer off the prize places entirely.
	PlaceRank *int32
	PrizeID   *int64
	Awarded   bool
}

// AdjustResult applies an admin's correction before publication. Once the
// results are published they are frozen, so corrections are refused.
func (s *PromotionService) AdjustResult(
	ctx context.Context,
	promotionID int64,
	adjustment ResultAdjustment,
) (db.PromotionResult, error) {
	promotion, err := s.repo.GetPromotionByID(ctx, promotionID)
	if err != nil {
		return db.PromotionResult{}, fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}
	if domain.PromotionStatus(promotion.Status) != domain.PromotionCalculated {
		return db.PromotionResult{}, fmt.Errorf(
			"%w: results can only be corrected before publication", domain.ErrConflict)
	}
	if adjustment.PlaceRank != nil && *adjustment.PlaceRank < 1 {
		return db.PromotionResult{}, fmt.Errorf("%w: place must be positive", domain.ErrValidation)
	}

	var updated db.PromotionResult
	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		var txErr error
		updated, txErr = q.UpdatePromotionResult(ctx, db.UpdatePromotionResultParams{
			PromotionID: promotionID,
			DealerID:    adjustment.DealerID,
			PlaceRank:   int4OrNull(adjustment.PlaceRank),
			PrizeID:     int8OrNull(adjustment.PrizeID),
			Awarded:     adjustment.Awarded,
		})
		return txErr
	})
	if err != nil {
		return db.PromotionResult{}, fmt.Errorf("adjust result: %w", repository.TranslateError(err))
	}
	return updated, nil
}

// SetAwarded records whether a prize has actually been handed over
// (ToR 3.8).
//
// Unlike a correction of the ranking this stays available after
// publication, because that is when prizes are physically given out — an
// admin publishes the results and then ticks people off over the
// following days. Once the promotion is archived its results are closed
// history and the flag freezes with them.
func (s *PromotionService) SetAwarded(
	ctx context.Context,
	promotionID, dealerID int64,
	awarded bool,
) (db.PromotionResult, error) {
	promotion, err := s.repo.GetPromotionByID(ctx, promotionID)
	if err != nil {
		return db.PromotionResult{}, fmt.Errorf("get promotion: %w", repository.TranslateError(err))
	}

	status := domain.PromotionStatus(promotion.Status)
	if status != domain.PromotionCalculated && status != domain.PromotionPublished {
		return db.PromotionResult{}, fmt.Errorf(
			"%w: prizes can be handed over only between calculation and archiving", domain.ErrConflict)
	}

	// Nothing to hand over without a prize on the row.
	result, err := s.repo.GetPromotionResult(ctx, db.GetPromotionResultParams{
		PromotionID: promotionID, DealerID: dealerID,
	})
	if err != nil {
		return db.PromotionResult{}, fmt.Errorf("get promotion result: %w", repository.TranslateError(err))
	}
	if awarded && !result.PrizeID.Valid {
		return db.PromotionResult{}, fmt.Errorf(
			"%w: this participant has no prize to hand over", domain.ErrValidation)
	}

	var updated db.PromotionResult
	err = s.repo.WithTx(ctx, func(q *db.Queries) error {
		var txErr error
		updated, txErr = q.SetPromotionResultAwarded(ctx, db.SetPromotionResultAwardedParams{
			PromotionID: promotionID,
			DealerID:    dealerID,
			Awarded:     awarded,
		})
		return txErr
	})
	if err != nil {
		return db.PromotionResult{}, fmt.Errorf("set awarded: %w", repository.TranslateError(err))
	}
	return updated, nil
}
