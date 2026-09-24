package service

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository/db"
)

// recomputeSingleDealerGrade sets grade_id for one dealer to whatever
// domain.SelectGrade picks given lifetimeTotal and the current grades.
// Shared by DealerService (a brand-new dealer starts at lifetimeTotal 0)
// and PurchaseService (after a purchase changes a dealer's total).
func recomputeSingleDealerGrade(ctx context.Context, q *db.Queries, dealerID, lifetimeTotal int64) error {
	grades, err := q.ListGrades(ctx)
	if err != nil {
		return fmt.Errorf("list grades for grade assignment: %w", err)
	}

	domainGrades := make([]domain.Grade, len(grades))
	for i, g := range grades {
		domainGrades[i] = domain.Grade{ID: g.ID, MinPurchaseAmount: g.MinPurchaseAmount}
	}

	gradeID, ok := domain.SelectGrade(domainGrades, lifetimeTotal)
	arg := db.SetDealerGradeParams{ID: dealerID}
	if ok {
		arg.GradeID = pgtype.Int8{Int64: gradeID, Valid: true}
	}

	if err := q.SetDealerGrade(ctx, arg); err != nil {
		return fmt.Errorf("assign grade: %w", err)
	}
	return nil
}

// recomputeDealerLifetimeAndGrade re-sums a dealer's purchases into
// lifetime_purchase_total (ToR 3.2 — full recompute, not an increment)
// and then recomputes their grade from the new total. Callers run this
// inside the same transaction as the purchase write that triggered it.
func recomputeDealerLifetimeAndGrade(ctx context.Context, q *db.Queries, dealerID int64) error {
	if err := q.RecomputeDealerLifetimeTotal(ctx, dealerID); err != nil {
		return fmt.Errorf("recompute lifetime total: %w", err)
	}

	dealer, err := q.GetDealerByID(ctx, dealerID)
	if err != nil {
		return fmt.Errorf("reload dealer after lifetime recompute: %w", err)
	}

	return recomputeSingleDealerGrade(ctx, q, dealerID, dealer.LifetimePurchaseTotal)
}
