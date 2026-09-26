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

type dashboardRepository interface {
	DashboardTotals(ctx context.Context, arg db.DashboardTotalsParams) (db.DashboardTotalsRow, error)
	DealerCountsByGrade(ctx context.Context) ([]db.DealerCountsByGradeRow, error)
}

// GradeBreakdown is how many dealers currently sit at a given grade.
type GradeBreakdown struct {
	GradeID           int64
	NameRu            string
	NameTg            string
	MinPurchaseAmount int64
	// The material the grade is painted in; nil when left to its place in
	// the ladder.
	Color        *string
	DealersCount int64
}

// DashboardSummary is the admin dashboard's headline numbers.
type DashboardSummary struct {
	DealersTotal  int64
	DealersActive int64
	/** Purchases within the requested period. */
	PeriodAmount int64
	PeriodCount  int64
	/** Sum of every dealer's lifetime total. */
	LifetimeTotal int64
	/** Promotions currently running (ToR 5.1). */
	PromotionsActive int64
	/** Of those, the ones whose period is over and results are not yet computed. */
	PromotionsAwaiting int64
	Grades             []GradeBreakdown
}

// DashboardService assembles the admin dashboard summary.
type DashboardService struct {
	repo dashboardRepository
}

// NewDashboardService constructs a DashboardService backed by repo.
func NewDashboardService(repo dashboardRepository) *DashboardService {
	return &DashboardService{repo: repo}
}

// Summary returns the dashboard numbers for the given period (inclusive).
func (s *DashboardService) Summary(ctx context.Context, from, to time.Time) (DashboardSummary, error) {
	totals, err := s.repo.DashboardTotals(ctx, db.DashboardTotalsParams{
		DateFrom: pgtype.Date{Time: from, Valid: true},
		DateTo:   pgtype.Date{Time: to, Valid: true},
		Today:    pgtype.Date{Time: domain.Today(), Valid: true},
	})
	if err != nil {
		return DashboardSummary{}, fmt.Errorf("dashboard totals: %w", repository.TranslateError(err))
	}

	rows, err := s.repo.DealerCountsByGrade(ctx)
	if err != nil {
		return DashboardSummary{}, fmt.Errorf("dealer counts by grade: %w", repository.TranslateError(err))
	}

	grades := make([]GradeBreakdown, len(rows))
	for i, row := range rows {
		grades[i] = GradeBreakdown{
			GradeID:           row.ID,
			NameRu:            row.NameRu,
			NameTg:            row.NameTg,
			MinPurchaseAmount: row.MinPurchaseAmount,
			Color:             textToPtr(row.Color),
			DealersCount:      row.DealersCount,
		}
	}

	return DashboardSummary{
		DealersTotal:       totals.DealersTotal,
		DealersActive:      totals.DealersActive,
		PeriodAmount:       totals.PeriodAmount,
		PeriodCount:        totals.PeriodCount,
		LifetimeTotal:      totals.LifetimeTotal,
		PromotionsActive:   totals.PromotionsActive,
		PromotionsAwaiting: totals.PromotionsAwaiting,
		Grades:             grades,
	}, nil
}
