package http

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/repository/db"
	"github.com/avtomalyar/backend/internal/service"
)

type promotionService interface {
	List(ctx context.Context, status *string) ([]service.PromotionListItem, error)
	StatusCounts(ctx context.Context) (map[string]int64, error)
	Get(ctx context.Context, id int64) (db.Promotion, []db.ListPrizePlacesRow, error)
	Create(ctx context.Context, input service.PromotionInput) (db.Promotion, error)
	Update(ctx context.Context, id int64, input service.PromotionInput) (db.Promotion, error)
	SetPrizePlaces(ctx context.Context, id int64, places []service.PrizePlaceInput) error
	Delete(ctx context.Context, id int64) error
	Start(ctx context.Context, id int64) (db.Promotion, error)
	Publish(ctx context.Context, id int64) (db.Promotion, error)
	Archive(ctx context.Context, id int64) (db.Promotion, error)
	Calculate(ctx context.Context, id int64) ([]db.ListPromotionResultsRow, error)
	Results(ctx context.Context, id int64) ([]db.ListPromotionResultsRow, error)
	AdjustResult(ctx context.Context, promotionID int64, adjustment service.ResultAdjustment) (db.PromotionResult, error)
	SetAwarded(ctx context.Context, promotionID, dealerID int64, awarded bool) (db.PromotionResult, error)
}

type promotionRequest struct {
	TitleRu       string  `json:"title_ru" validate:"required,max=200"`
	TitleTg       string  `json:"title_tg" validate:"required,max=200"`
	DescriptionRu *string `json:"description_ru"`
	DescriptionTg *string `json:"description_tg"`
	StartDate     string  `json:"start_date" validate:"required"`
	EndDate       string  `json:"end_date" validate:"required"`
	CityID        *int64  `json:"city_id"`
	GradeID       *int64  `json:"grade_id"`
	// Lifetime purchase threshold in dirams; null means everyone takes part.
	MinLifetimeThreshold *int64 `json:"min_lifetime_purchase_threshold"`
}

type prizePlaceRequest struct {
	PlaceRank int32 `json:"place_rank" validate:"required,gt=0"`
	PrizeID   int64 `json:"prize_id" validate:"required"`
}

type prizePlacesRequest struct {
	Places []prizePlaceRequest `json:"places" validate:"dive"`
}

type awardedRequest struct {
	DealerID int64 `json:"dealer_id" validate:"required"`
	Awarded  bool  `json:"awarded"`
}

type resultAdjustmentRequest struct {
	DealerID int64 `json:"dealer_id" validate:"required"`
	// null takes the dealer off the prize places entirely.
	PlaceRank *int32 `json:"place_rank"`
	PrizeID   *int64 `json:"prize_id"`
	Awarded   bool   `json:"awarded"`
}

type prizePlaceResponse struct {
	PlaceRank      int32   `json:"place_rank"`
	PrizeID        int64   `json:"prize_id"`
	PrizeNameRu    string  `json:"prize_name_ru"`
	PrizeNameTg    string  `json:"prize_name_tg"`
	PrizePhotoPath *string `json:"prize_photo_path,omitempty"`
}

type promotionResponse struct {
	ID                   int64                `json:"id"`
	TitleRu              string               `json:"title_ru"`
	TitleTg              string               `json:"title_tg"`
	DescriptionRu        *string              `json:"description_ru,omitempty"`
	DescriptionTg        *string              `json:"description_tg,omitempty"`
	StartDate            string               `json:"start_date"`
	EndDate              string               `json:"end_date"`
	CityID               *int64               `json:"city_id,omitempty"`
	GradeID              *int64               `json:"grade_id,omitempty"`
	MinLifetimeThreshold *int64               `json:"min_lifetime_purchase_threshold,omitempty"`
	Status               string               `json:"status"`
	CalculatedAt         *string              `json:"calculated_at,omitempty"`
	PublishedAt          *string              `json:"published_at,omitempty"`
	PrizePlaces          []prizePlaceResponse `json:"prize_places,omitempty"`
	// Dealers taking part — live for a promotion still open, fixed at the
	// calculation once results exist (ToR 5.5). Only on list responses.
	ParticipantsCount *int `json:"participants_count,omitempty"`
}

type promotionResultResponse struct {
	DealerID           int64   `json:"dealer_id"`
	DealerName         string  `json:"dealer_name"`
	PeriodTotal        int64   `json:"period_total"`
	PlaceRank          *int32  `json:"place_rank,omitempty"`
	PrizeID            *int64  `json:"prize_id,omitempty"`
	PrizeNameRu        *string `json:"prize_name_ru,omitempty"`
	PrizeNameTg        *string `json:"prize_name_tg,omitempty"`
	IsManuallyAdjusted bool    `json:"is_manually_adjusted"`
	Awarded            bool    `json:"awarded"`
}

type promotionListResponse struct {
	Items []promotionResponse `json:"items"`
	// Per-status totals for the tabs above the list; every status is
	// present, including the ones with no promotions.
	Counts map[string]int64 `json:"counts"`
}

func toPromotionResponse(p db.Promotion) promotionResponse {
	resp := promotionResponse{
		ID:        p.ID,
		TitleRu:   p.TitleRu,
		TitleTg:   p.TitleTg,
		StartDate: p.StartDate.Time.Format(dateLayout),
		EndDate:   p.EndDate.Time.Format(dateLayout),
		Status:    p.Status,
	}
	if p.DescriptionRu.Valid {
		resp.DescriptionRu = &p.DescriptionRu.String
	}
	if p.DescriptionTg.Valid {
		resp.DescriptionTg = &p.DescriptionTg.String
	}
	if p.CityID.Valid {
		resp.CityID = &p.CityID.Int64
	}
	if p.GradeID.Valid {
		resp.GradeID = &p.GradeID.Int64
	}
	if p.MinLifetimePurchaseThreshold.Valid {
		resp.MinLifetimeThreshold = &p.MinLifetimePurchaseThreshold.Int64
	}
	if p.CalculatedAt.Valid {
		at := p.CalculatedAt.Time.Format(time.RFC3339)
		resp.CalculatedAt = &at
	}
	if p.PublishedAt.Valid {
		at := p.PublishedAt.Time.Format(time.RFC3339)
		resp.PublishedAt = &at
	}
	return resp
}

func toPrizePlaceResponses(places []db.ListPrizePlacesRow) []prizePlaceResponse {
	out := make([]prizePlaceResponse, len(places))
	for i, place := range places {
		out[i] = prizePlaceResponse{
			PlaceRank:   place.PlaceRank,
			PrizeID:     place.PrizeID,
			PrizeNameRu: place.PrizeNameRu,
			PrizeNameTg: place.PrizeNameTg,
		}
		if place.PrizePhotoPath.Valid {
			out[i].PrizePhotoPath = &place.PrizePhotoPath.String
		}
	}
	return out
}

func toPromotionResultResponses(results []db.ListPromotionResultsRow) []promotionResultResponse {
	out := make([]promotionResultResponse, len(results))
	for i, result := range results {
		out[i] = promotionResultResponse{
			DealerID:           result.DealerID,
			DealerName:         result.DealerName,
			PeriodTotal:        result.PeriodTotal,
			IsManuallyAdjusted: result.IsManuallyAdjusted,
			Awarded:            result.Awarded,
		}
		if result.PlaceRank.Valid {
			out[i].PlaceRank = &result.PlaceRank.Int32
		}
		if result.PrizeID.Valid {
			out[i].PrizeID = &result.PrizeID.Int64
		}
		if result.PrizeNameRu.Valid {
			out[i].PrizeNameRu = &result.PrizeNameRu.String
		}
		if result.PrizeNameTg.Valid {
			out[i].PrizeNameTg = &result.PrizeNameTg.String
		}
	}
	return out
}

type promotionHandler struct {
	service   promotionService
	logger    *slog.Logger
	validator *validator.Validate
}

func (h *promotionHandler) list(w http.ResponseWriter, r *http.Request) {
	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	promotions, err := h.service.List(r.Context(), status)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	counts, err := h.service.StatusCounts(r.Context())
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	items := make([]promotionResponse, len(promotions))
	for i, promotion := range promotions {
		items[i] = toPromotionResponse(promotion.Promotion)
		participants := promotion.ParticipantsCount
		items[i].ParticipantsCount = &participants
	}
	writeJSON(w, http.StatusOK, promotionListResponse{Items: items, Counts: counts})
}

func (h *promotionHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	promotion, places, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	resp := toPromotionResponse(promotion)
	resp.PrizePlaces = toPrizePlaceResponses(places)
	writeJSON(w, http.StatusOK, resp)
}

func (h *promotionHandler) decodeAndValidate(w http.ResponseWriter, r *http.Request) (service.PromotionInput, bool) {
	var req promotionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return service.PromotionInput{}, false
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return service.PromotionInput{}, false
	}

	startDate, err := time.Parse(dateLayout, req.StartDate)
	if err != nil {
		writeValidationErrors(w, map[string]string{"StartDate": "must be YYYY-MM-DD"})
		return service.PromotionInput{}, false
	}
	endDate, err := time.Parse(dateLayout, req.EndDate)
	if err != nil {
		writeValidationErrors(w, map[string]string{"EndDate": "must be YYYY-MM-DD"})
		return service.PromotionInput{}, false
	}

	return service.PromotionInput{
		TitleRu:              req.TitleRu,
		TitleTg:              req.TitleTg,
		DescriptionRu:        req.DescriptionRu,
		DescriptionTg:        req.DescriptionTg,
		StartDate:            startDate,
		EndDate:              endDate,
		CityID:               req.CityID,
		GradeID:              req.GradeID,
		MinLifetimeThreshold: req.MinLifetimeThreshold,
	}, true
}

func (h *promotionHandler) create(w http.ResponseWriter, r *http.Request) {
	input, ok := h.decodeAndValidate(w, r)
	if !ok {
		return
	}

	promotion, err := h.service.Create(r.Context(), input)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusCreated, toPromotionResponse(promotion))
}

func (h *promotionHandler) update(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	input, ok := h.decodeAndValidate(w, r)
	if !ok {
		return
	}

	promotion, err := h.service.Update(r.Context(), id, input)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toPromotionResponse(promotion))
}

func (h *promotionHandler) setPrizePlaces(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req prizePlacesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	places := make([]service.PrizePlaceInput, len(req.Places))
	for i, place := range req.Places {
		places[i] = service.PrizePlaceInput{PlaceRank: place.PlaceRank, PrizeID: place.PrizeID}
	}

	if err := h.service.SetPrizePlaces(r.Context(), id, places); err != nil {
		writeError(w, h.logger, err)
		return
	}

	_, stored, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"prize_places": toPrizePlaceResponses(stored)})
}

func (h *promotionHandler) delete(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		writeError(w, h.logger, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// transition serves the lifecycle endpoints, which differ only in the step
// they take.
func (h *promotionHandler) transition(
	step func(ctx context.Context, id int64) (db.Promotion, error),
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
			return
		}

		promotion, err := step(r.Context(), id)
		if err != nil {
			writeError(w, h.logger, err)
			return
		}
		writeJSON(w, http.StatusOK, toPromotionResponse(promotion))
	}
}

func (h *promotionHandler) calculate(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	results, err := h.service.Calculate(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": toPromotionResultResponses(results)})
}

func (h *promotionHandler) results(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	results, err := h.service.Results(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": toPromotionResultResponses(results)})
}

func (h *promotionHandler) adjustResult(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req resultAdjustmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	if _, err := h.service.AdjustResult(r.Context(), id, service.ResultAdjustment{
		DealerID:  req.DealerID,
		PlaceRank: req.PlaceRank,
		PrizeID:   req.PrizeID,
		Awarded:   req.Awarded,
	}); err != nil {
		writeError(w, h.logger, err)
		return
	}

	// The whole table is returned: moving one dealer changes how the
	// ranking reads, and the screen redraws it anyway.
	results, err := h.service.Results(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": toPromotionResultResponses(results)})
}

// setAwarded records that a prize has been handed over. Unlike a
// correction this stays available after publication — prizes are given
// out once the results are announced.
func (h *promotionHandler) setAwarded(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req awardedRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	if _, err := h.service.SetAwarded(r.Context(), id, req.DealerID, req.Awarded); err != nil {
		writeError(w, h.logger, err)
		return
	}

	results, err := h.service.Results(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": toPromotionResultResponses(results)})
}
