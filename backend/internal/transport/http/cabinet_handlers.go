package http

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/avtomalyar/backend/internal/service"
)

type cabinetService interface {
	Profile(ctx context.Context, dealerID int64) (service.DealerProfile, error)
	Purchases(ctx context.Context, dealerID int64, filter service.PurchaseFilter) (service.PurchasePage, error)
	Promotions(ctx context.Context, dealerID int64) ([]service.CabinetPromotion, error)
	Promotion(ctx context.Context, dealerID, promotionID int64) (service.CabinetPromotionDetail, error)
}

type gradeRef struct {
	ID     int64  `json:"id"`
	NameRu string `json:"name_ru"`
	NameTg string `json:"name_tg"`
	// Lifetime purchase total at which the grade is reached, in dirams.
	MinPurchaseAmount int64 `json:"min_purchase_amount"`
}

type nextGradeResponse struct {
	gradeRef
	// What is still missing to reach it, in dirams.
	Remaining int64 `json:"remaining"`
}

type profileResponse struct {
	ID                    int64     `json:"id"`
	FullName              string    `json:"full_name"`
	Phone                 string    `json:"phone"`
	Login                 string    `json:"login"`
	CityNameRu            string    `json:"city_name_ru"`
	CityNameTg            string    `json:"city_name_tg"`
	LifetimePurchaseTotal int64     `json:"lifetime_purchase_total"`
	Grade                 *gradeRef `json:"grade,omitempty"`
	// Absent once the top grade is reached.
	NextGrade *nextGradeResponse `json:"next_grade,omitempty"`
}

type rankingEntryResponse struct {
	DealerID    int64   `json:"dealer_id"`
	DealerName  string  `json:"dealer_name"`
	Place       int32   `json:"place"`
	PeriodTotal int64   `json:"period_total"`
	PrizeNameRu *string `json:"prize_name_ru,omitempty"`
	PrizeNameTg *string `json:"prize_name_tg,omitempty"`
	Awarded     bool    `json:"awarded"`
	IsMe        bool    `json:"is_me"`
}

type cabinetPromotionResponse struct {
	promotionResponse
	// The dealer's own line, absent while results are being reviewed.
	Standing *rankingEntryResponse `json:"standing,omitempty"`
	// Number of dealers taking part, so the cabinet can say "3rd of 12".
	ParticipantsCount int `json:"participants_count"`
}

type cabinetPromotionDetailResponse struct {
	cabinetPromotionResponse
	Ranking []rankingEntryResponse `json:"ranking"`
	// False while the ranking is a live count that can still change.
	Final bool `json:"final"`
}

func toRankingEntryResponse(entry service.RankingEntry) rankingEntryResponse {
	return rankingEntryResponse{
		DealerID:    entry.DealerID,
		DealerName:  entry.DealerName,
		Place:       entry.Place,
		PeriodTotal: entry.PeriodTotal,
		PrizeNameRu: entry.PrizeNameRu,
		PrizeNameTg: entry.PrizeNameTg,
		Awarded:     entry.Awarded,
		IsMe:        entry.IsMe,
	}
}

type cabinetHandler struct {
	service cabinetService
	logger  *slog.Logger
}

// dealerID is the authenticated dealer. The routes below are behind
// requireRole(dealer), so a principal is always present.
func dealerID(r *http.Request) int64 {
	principal, _ := PrincipalFromContext(r.Context())
	return principal.ID
}

func (h *cabinetHandler) profile(w http.ResponseWriter, r *http.Request) {
	profile, err := h.service.Profile(r.Context(), dealerID(r))
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	dealer := profile.Dealer
	resp := profileResponse{
		ID:                    dealer.ID,
		FullName:              dealer.FullName,
		Phone:                 dealer.Phone,
		Login:                 dealer.Login,
		CityNameRu:            dealer.CityNameRu,
		CityNameTg:            dealer.CityNameTg,
		LifetimePurchaseTotal: dealer.LifetimePurchaseTotal,
	}
	if dealer.GradeID.Valid {
		resp.Grade = &gradeRef{
			ID:                dealer.GradeID.Int64,
			NameRu:            dealer.GradeNameRu.String,
			NameTg:            dealer.GradeNameTg.String,
			MinPurchaseAmount: dealer.GradeMinPurchaseAmount.Int64,
		}
	}
	if profile.NextGrade != nil {
		resp.NextGrade = &nextGradeResponse{
			gradeRef: gradeRef{
				ID:                profile.NextGrade.GradeID,
				NameRu:            profile.NextGrade.NameRu,
				NameTg:            profile.NextGrade.NameTg,
				MinPurchaseAmount: profile.NextGrade.MinPurchaseAmount,
			},
			Remaining: profile.NextGrade.Remaining,
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *cabinetHandler) purchases(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := service.PurchaseFilter{
		Page:    atoiOrDefault(q.Get("page"), 1),
		PerPage: atoiOrDefault(q.Get("per_page"), 20),
	}
	if v, err := time.Parse(dateLayout, q.Get("date_from")); err == nil {
		filter.DateFrom = &v
	}
	if v, err := time.Parse(dateLayout, q.Get("date_to")); err == nil {
		filter.DateTo = &v
	}

	page, err := h.service.Purchases(r.Context(), dealerID(r), filter)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	// The dealer's own name is on every row and adds nothing here.
	items := make([]purchaseResponse, len(page.Items))
	for i, purchase := range page.Items {
		items[i] = purchaseResponse{
			ID:           purchase.ID,
			DealerID:     purchase.DealerID,
			Amount:       purchase.Amount,
			PurchaseDate: purchase.PurchaseDate.Time.Format(dateLayout),
			CreatedBy:    purchase.CreatedBy,
		}
		if purchase.Comment.Valid {
			items[i].Comment = &purchase.Comment.String
		}
	}
	writeJSON(w, http.StatusOK, purchaseListResponse{
		Items:       items,
		Total:       page.Total,
		TotalAmount: page.TotalAmount,
		Page:        page.Page,
		PerPage:     page.PerPage,
	})
}

func toCabinetPromotionResponse(promotion service.CabinetPromotion) cabinetPromotionResponse {
	resp := cabinetPromotionResponse{
		promotionResponse: toPromotionResponse(promotion.Promotion),
		ParticipantsCount: promotion.ParticipantsCount,
	}
	if promotion.Standing != nil {
		standing := toRankingEntryResponse(*promotion.Standing)
		resp.Standing = &standing
	}
	return resp
}

func (h *cabinetHandler) promotions(w http.ResponseWriter, r *http.Request) {
	promotions, err := h.service.Promotions(r.Context(), dealerID(r))
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	items := make([]cabinetPromotionResponse, len(promotions))
	for i, promotion := range promotions {
		items[i] = toCabinetPromotionResponse(promotion)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *cabinetHandler) promotion(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	detail, err := h.service.Promotion(r.Context(), dealerID(r), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	ranking := make([]rankingEntryResponse, len(detail.Ranking))
	for i, entry := range detail.Ranking {
		ranking[i] = toRankingEntryResponse(entry)
	}

	resp := cabinetPromotionDetailResponse{
		cabinetPromotionResponse: toCabinetPromotionResponse(detail.CabinetPromotion),
		Ranking:                  ranking,
		Final:                    detail.Final,
	}
	resp.PrizePlaces = toPrizePlaceResponses(detail.PrizePlaces)
	writeJSON(w, http.StatusOK, resp)
}
