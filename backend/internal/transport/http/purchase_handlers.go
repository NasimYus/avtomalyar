package http

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/repository/db"
	"github.com/avtomalyar/backend/internal/service"
)

const dateLayout = "2006-01-02"

type purchaseService interface {
	List(ctx context.Context, filter service.PurchaseFilter) (service.PurchasePage, error)
	Get(ctx context.Context, id int64) (db.Purchase, error)
	Create(ctx context.Context, dealerID, amount int64, purchaseDate time.Time, comment *string, createdBy int64) (db.Purchase, error)
	Update(ctx context.Context, id, dealerID, amount int64, purchaseDate time.Time, comment *string) (db.Purchase, error)
	Delete(ctx context.Context, id int64) error
}

type purchaseRequest struct {
	DealerID     int64   `json:"dealer_id" validate:"required"`
	Amount       int64   `json:"amount" validate:"required,gt=0"`
	PurchaseDate string  `json:"purchase_date" validate:"required"`
	Comment      *string `json:"comment"`
}

type purchaseResponse struct {
	ID       int64 `json:"id"`
	DealerID int64 `json:"dealer_id"`
	// Included on list responses so the table doesn't need a second
	// lookup; empty on single-purchase responses.
	DealerName   string  `json:"dealer_name,omitempty"`
	Amount       int64   `json:"amount"`
	PurchaseDate string  `json:"purchase_date"`
	Comment      *string `json:"comment,omitempty"`
	CreatedBy    int64   `json:"created_by"`
}

func toPurchaseResponse(p db.Purchase) purchaseResponse {
	resp := purchaseResponse{
		ID:           p.ID,
		DealerID:     p.DealerID,
		Amount:       p.Amount,
		PurchaseDate: p.PurchaseDate.Time.Format(dateLayout),
		CreatedBy:    p.CreatedBy,
	}
	if p.Comment.Valid {
		resp.Comment = &p.Comment.String
	}
	return resp
}

type purchaseListResponse struct {
	Items []purchaseResponse `json:"items"`
	Total int64              `json:"total"`
	// Sum over everything matching the filter, not just this page.
	TotalAmount int64 `json:"total_amount"`
	Page        int   `json:"page"`
	PerPage     int   `json:"per_page"`
}

type purchaseHandler struct {
	service   purchaseService
	logger    *slog.Logger
	validator *validator.Validate
}

func (h *purchaseHandler) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := service.PurchaseFilter{
		Page:    atoiOrDefault(q.Get("page"), 1),
		PerPage: atoiOrDefault(q.Get("per_page"), 20),
	}
	if v, err := strconv.ParseInt(q.Get("dealer_id"), 10, 64); err == nil {
		filter.DealerID = &v
	}
	if v, err := time.Parse(dateLayout, q.Get("date_from")); err == nil {
		filter.DateFrom = &v
	}
	if v, err := time.Parse(dateLayout, q.Get("date_to")); err == nil {
		filter.DateTo = &v
	}

	page, err := h.service.List(r.Context(), filter)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	items := make([]purchaseResponse, len(page.Items))
	for i, p := range page.Items {
		items[i] = purchaseResponse{
			ID:           p.ID,
			DealerID:     p.DealerID,
			DealerName:   p.DealerName,
			Amount:       p.Amount,
			PurchaseDate: p.PurchaseDate.Time.Format(dateLayout),
			CreatedBy:    p.CreatedBy,
		}
		if p.Comment.Valid {
			items[i].Comment = &p.Comment.String
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

func (h *purchaseHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	purchase, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toPurchaseResponse(purchase))
}

func (h *purchaseHandler) decodeAndValidate(w http.ResponseWriter, r *http.Request) (purchaseRequest, time.Time, bool) {
	var req purchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return req, time.Time{}, false
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return req, time.Time{}, false
	}

	purchaseDate, err := time.Parse(dateLayout, req.PurchaseDate)
	if err != nil {
		writeValidationErrors(w, map[string]string{"PurchaseDate": "must be YYYY-MM-DD"})
		return req, time.Time{}, false
	}
	return req, purchaseDate, true
}

func (h *purchaseHandler) create(w http.ResponseWriter, r *http.Request) {
	req, purchaseDate, ok := h.decodeAndValidate(w, r)
	if !ok {
		return
	}

	principal, _ := PrincipalFromContext(r.Context())

	purchase, err := h.service.Create(r.Context(), req.DealerID, req.Amount, purchaseDate, req.Comment, principal.ID)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusCreated, toPurchaseResponse(purchase))
}

func (h *purchaseHandler) update(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	req, purchaseDate, ok := h.decodeAndValidate(w, r)
	if !ok {
		return
	}

	purchase, err := h.service.Update(r.Context(), id, req.DealerID, req.Amount, purchaseDate, req.Comment)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toPurchaseResponse(purchase))
}

func (h *purchaseHandler) delete(w http.ResponseWriter, r *http.Request) {
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
