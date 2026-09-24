package http

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/repository/db"
)

type gradeService interface {
	List(ctx context.Context) ([]db.Grade, error)
	Get(ctx context.Context, id int64) (db.Grade, error)
	Create(ctx context.Context, nameRu, nameTg string, minPurchaseAmount int64) (db.Grade, error)
	Update(ctx context.Context, id int64, nameRu, nameTg string, minPurchaseAmount int64) (db.Grade, error)
	Delete(ctx context.Context, id int64) error
}

type gradeRequest struct {
	NameRu            string `json:"name_ru" validate:"required"`
	NameTg            string `json:"name_tg" validate:"required"`
	MinPurchaseAmount int64  `json:"min_purchase_amount" validate:"gte=0"`
}

type gradeResponse struct {
	ID                int64  `json:"id"`
	NameRu            string `json:"name_ru"`
	NameTg            string `json:"name_tg"`
	MinPurchaseAmount int64  `json:"min_purchase_amount"`
}

func toGradeResponse(g db.Grade) gradeResponse {
	return gradeResponse{ID: g.ID, NameRu: g.NameRu, NameTg: g.NameTg, MinPurchaseAmount: g.MinPurchaseAmount}
}

type gradeHandler struct {
	service   gradeService
	logger    *slog.Logger
	validator *validator.Validate
}

func (h *gradeHandler) list(w http.ResponseWriter, r *http.Request) {
	grades, err := h.service.List(r.Context())
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	items := make([]gradeResponse, len(grades))
	for i, g := range grades {
		items[i] = toGradeResponse(g)
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *gradeHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	grade, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toGradeResponse(grade))
}

func (h *gradeHandler) create(w http.ResponseWriter, r *http.Request) {
	var req gradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	grade, err := h.service.Create(r.Context(), req.NameRu, req.NameTg, req.MinPurchaseAmount)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusCreated, toGradeResponse(grade))
}

func (h *gradeHandler) update(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req gradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	grade, err := h.service.Update(r.Context(), id, req.NameRu, req.NameTg, req.MinPurchaseAmount)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toGradeResponse(grade))
}

func (h *gradeHandler) delete(w http.ResponseWriter, r *http.Request) {
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
