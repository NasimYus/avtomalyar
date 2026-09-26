package http

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/service"
)

type dashboardService interface {
	Summary(ctx context.Context, from, to time.Time) (service.DashboardSummary, error)
}

type gradeBreakdownResponse struct {
	GradeID           int64  `json:"grade_id"`
	NameRu            string `json:"name_ru"`
	NameTg            string `json:"name_tg"`
	MinPurchaseAmount int64  `json:"min_purchase_amount"`
	DealersCount      int64  `json:"dealers_count"`
}

type dashboardSummaryResponse struct {
	DealersTotal  int64  `json:"dealers_total"`
	DealersActive int64  `json:"dealers_active"`
	PeriodFrom    string `json:"period_from"`
	PeriodTo      string `json:"period_to"`
	PeriodAmount  int64  `json:"period_amount"`
	PeriodCount   int64  `json:"period_count"`
	LifetimeTotal int64  `json:"lifetime_total"`
	// Promotions running right now, and how many of those are waiting for
	// their results to be computed (ToR 5.1).
	PromotionsActive   int64                    `json:"promotions_active"`
	PromotionsAwaiting int64                    `json:"promotions_awaiting"`
	Grades             []gradeBreakdownResponse `json:"grades"`
}

type dashboardHandler struct {
	service dashboardService
	logger  *slog.Logger
}

// currentMonth returns the first and last day of the month containing now,
// in the shop's timezone — the dashboard's default period.
func currentMonth(now time.Time) (time.Time, time.Time) {
	first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	return first, first.AddDate(0, 1, -1)
}

func (h *dashboardHandler) summary(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	from, to := currentMonth(time.Now().In(domain.BusinessLocation))

	if v, err := time.Parse(dateLayout, q.Get("date_from")); err == nil {
		from = v
	}
	if v, err := time.Parse(dateLayout, q.Get("date_to")); err == nil {
		to = v
	}

	summary, err := h.service.Summary(r.Context(), from, to)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	grades := make([]gradeBreakdownResponse, len(summary.Grades))
	for i, grade := range summary.Grades {
		grades[i] = gradeBreakdownResponse{
			GradeID:           grade.GradeID,
			NameRu:            grade.NameRu,
			NameTg:            grade.NameTg,
			MinPurchaseAmount: grade.MinPurchaseAmount,
			DealersCount:      grade.DealersCount,
		}
	}

	writeJSON(w, http.StatusOK, dashboardSummaryResponse{
		DealersTotal:       summary.DealersTotal,
		DealersActive:      summary.DealersActive,
		PeriodFrom:         from.Format(dateLayout),
		PeriodTo:           to.Format(dateLayout),
		PeriodAmount:       summary.PeriodAmount,
		PeriodCount:        summary.PeriodCount,
		LifetimeTotal:      summary.LifetimeTotal,
		PromotionsActive:   summary.PromotionsActive,
		PromotionsAwaiting: summary.PromotionsAwaiting,
		Grades:             grades,
	})
}
