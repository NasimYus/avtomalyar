package http

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/repository/db"
	"github.com/avtomalyar/backend/internal/service"
)

type dealerService interface {
	List(ctx context.Context, filter service.DealerFilter) (service.DealerPage, error)
	Get(ctx context.Context, id int64) (db.Dealer, error)
	Create(ctx context.Context, fullName, phone string, cityID int64) (service.CreatedDealer, error)
	Update(ctx context.Context, id int64, fullName, phone string, cityID int64) (db.Dealer, error)
	SetActive(ctx context.Context, id int64, active bool) (db.Dealer, error)
	ResetPassword(ctx context.Context, id int64) (string, error)
	Delete(ctx context.Context, id int64) error
}

type dealerRequest struct {
	FullName string `json:"full_name" validate:"required"`
	Phone    string `json:"phone" validate:"required"`
	CityID   int64  `json:"city_id" validate:"required"`
}

type dealerResponse struct {
	ID                    int64  `json:"id"`
	FullName              string `json:"full_name"`
	Phone                 string `json:"phone"`
	CityID                int64  `json:"city_id"`
	GradeID               *int64 `json:"grade_id,omitempty"`
	LifetimePurchaseTotal int64  `json:"lifetime_purchase_total"`
	Login                 string `json:"login"`
	IsActive              bool   `json:"is_active"`
}

func toDealerResponse(d db.Dealer) dealerResponse {
	resp := dealerResponse{
		ID:                    d.ID,
		FullName:              d.FullName,
		Phone:                 d.Phone,
		CityID:                d.CityID,
		LifetimePurchaseTotal: d.LifetimePurchaseTotal,
		Login:                 d.Login,
		IsActive:              d.IsActive,
	}
	if d.GradeID.Valid {
		resp.GradeID = &d.GradeID.Int64
	}
	return resp
}

type dealerListResponse struct {
	Items   []dealerResponse `json:"items"`
	Total   int64            `json:"total"`
	Page    int              `json:"page"`
	PerPage int              `json:"per_page"`
}

type createdDealerResponse struct {
	dealerResponse
	Password string `json:"password"`
}

type dealerHandler struct {
	service   dealerService
	logger    *slog.Logger
	validator *validator.Validate
}

func (h *dealerHandler) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := service.DealerFilter{
		Query:   q.Get("q"),
		Page:    atoiOrDefault(q.Get("page"), 1),
		PerPage: atoiOrDefault(q.Get("per_page"), 20),
	}
	if v, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil {
		filter.CityID = &v
	}
	if v, err := strconv.ParseInt(q.Get("grade_id"), 10, 64); err == nil {
		filter.GradeID = &v
	}
	if v, err := strconv.ParseBool(q.Get("is_active")); err == nil {
		filter.IsActive = &v
	}

	page, err := h.service.List(r.Context(), filter)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	items := make([]dealerResponse, len(page.Items))
	for i, d := range page.Items {
		items[i] = toDealerResponse(d)
	}
	writeJSON(w, http.StatusOK, dealerListResponse{Items: items, Total: page.Total, Page: page.Page, PerPage: page.PerPage})
}

func (h *dealerHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	dealer, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toDealerResponse(dealer))
}

func (h *dealerHandler) create(w http.ResponseWriter, r *http.Request) {
	var req dealerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	created, err := h.service.Create(r.Context(), req.FullName, req.Phone, req.CityID)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusCreated, createdDealerResponse{
		dealerResponse: toDealerResponse(created.Dealer),
		Password:       created.Password,
	})
}

func (h *dealerHandler) update(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req dealerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	dealer, err := h.service.Update(r.Context(), id, req.FullName, req.Phone, req.CityID)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toDealerResponse(dealer))
}

type setActiveRequest struct {
	IsActive bool `json:"is_active"`
}

func (h *dealerHandler) setActive(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req setActiveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}

	dealer, err := h.service.SetActive(r.Context(), id, req.IsActive)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toDealerResponse(dealer))
}

func (h *dealerHandler) resetPassword(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	password, err := h.service.ResetPassword(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"password": password})
}

func atoiOrDefault(s string, fallback int) int {
	v, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return v
}

func (h *dealerHandler) delete(w http.ResponseWriter, r *http.Request) {
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
