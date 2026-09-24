package http

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/repository/db"
)

type cityService interface {
	List(ctx context.Context) ([]db.City, error)
	Get(ctx context.Context, id int64) (db.City, error)
	Create(ctx context.Context, nameRu, nameTg string) (db.City, error)
	Update(ctx context.Context, id int64, nameRu, nameTg string) (db.City, error)
	Delete(ctx context.Context, id int64) error
}

type cityRequest struct {
	NameRu string `json:"name_ru" validate:"required"`
	NameTg string `json:"name_tg" validate:"required"`
}

type cityResponse struct {
	ID     int64  `json:"id"`
	NameRu string `json:"name_ru"`
	NameTg string `json:"name_tg"`
}

func toCityResponse(c db.City) cityResponse {
	return cityResponse{ID: c.ID, NameRu: c.NameRu, NameTg: c.NameTg}
}

type cityHandler struct {
	service   cityService
	logger    *slog.Logger
	validator *validator.Validate
}

func (h *cityHandler) list(w http.ResponseWriter, r *http.Request) {
	cities, err := h.service.List(r.Context())
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	items := make([]cityResponse, len(cities))
	for i, c := range cities {
		items[i] = toCityResponse(c)
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *cityHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	city, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toCityResponse(city))
}

func (h *cityHandler) create(w http.ResponseWriter, r *http.Request) {
	var req cityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	city, err := h.service.Create(r.Context(), req.NameRu, req.NameTg)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusCreated, toCityResponse(city))
}

func (h *cityHandler) update(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req cityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	city, err := h.service.Update(r.Context(), id, req.NameRu, req.NameTg)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toCityResponse(city))
}

func (h *cityHandler) delete(w http.ResponseWriter, r *http.Request) {
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

func pathID(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
}
