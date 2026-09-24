package http

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/repository/db"
	"github.com/avtomalyar/backend/internal/service"
)

const (
	maxPrizePhotoBytes = 5 << 20 // 5 MB, per ToR 10
)

var allowedPhotoExtensions = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

type prizeService interface {
	List(ctx context.Context) ([]db.Prize, error)
	Get(ctx context.Context, id int64) (db.Prize, error)
	Create(ctx context.Context, fields service.PrizeFields) (db.Prize, error)
	Update(ctx context.Context, id int64, fields service.PrizeFields) (db.Prize, error)
	SetPhoto(ctx context.Context, id int64, filename string, data []byte) (db.Prize, error)
	Delete(ctx context.Context, id int64) error
}

type prizeRequest struct {
	NameRu        string  `json:"name_ru" validate:"required"`
	NameTg        string  `json:"name_tg" validate:"required"`
	DescriptionRu *string `json:"description_ru"`
	DescriptionTg *string `json:"description_tg"`
	StockQuantity *int32  `json:"stock_quantity" validate:"omitempty,gte=0"`
}

func (r prizeRequest) toFields() service.PrizeFields {
	return service.PrizeFields{
		NameRu:        r.NameRu,
		NameTg:        r.NameTg,
		DescriptionRu: r.DescriptionRu,
		DescriptionTg: r.DescriptionTg,
		StockQuantity: r.StockQuantity,
	}
}

type prizeResponse struct {
	ID            int64   `json:"id"`
	NameRu        string  `json:"name_ru"`
	NameTg        string  `json:"name_tg"`
	DescriptionRu *string `json:"description_ru,omitempty"`
	DescriptionTg *string `json:"description_tg,omitempty"`
	PhotoURL      *string `json:"photo_url,omitempty"`
	StockQuantity *int32  `json:"stock_quantity,omitempty"`
}

func toPrizeResponse(p db.Prize) prizeResponse {
	resp := prizeResponse{ID: p.ID, NameRu: p.NameRu, NameTg: p.NameTg}
	if p.DescriptionRu.Valid {
		resp.DescriptionRu = &p.DescriptionRu.String
	}
	if p.DescriptionTg.Valid {
		resp.DescriptionTg = &p.DescriptionTg.String
	}
	if p.PhotoPath.Valid {
		resp.PhotoURL = &p.PhotoPath.String
	}
	if p.StockQuantity.Valid {
		resp.StockQuantity = &p.StockQuantity.Int32
	}
	return resp
}

type prizeHandler struct {
	service   prizeService
	logger    *slog.Logger
	validator *validator.Validate
}

func (h *prizeHandler) list(w http.ResponseWriter, r *http.Request) {
	prizes, err := h.service.List(r.Context())
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	items := make([]prizeResponse, len(prizes))
	for i, p := range prizes {
		items[i] = toPrizeResponse(p)
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *prizeHandler) get(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	prize, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toPrizeResponse(prize))
}

func (h *prizeHandler) create(w http.ResponseWriter, r *http.Request) {
	var req prizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	prize, err := h.service.Create(r.Context(), req.toFields())
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusCreated, toPrizeResponse(prize))
}

func (h *prizeHandler) update(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	var req prizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}
	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	prize, err := h.service.Update(r.Context(), id, req.toFields())
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toPrizeResponse(prize))
}

func (h *prizeHandler) uploadPhoto(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid id", nil)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxPrizePhotoBytes)
	file, _, err := r.FormFile("photo")
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeJSONError(w, http.StatusBadRequest, "validation_error", "photo exceeds the 5MB limit", nil)
			return
		}
		writeJSONError(w, http.StatusBadRequest, "validation_error", "missing \"photo\" file field", nil)
		return
	}
	defer func() { _ = file.Close() }()

	data, err := io.ReadAll(file)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "could not read uploaded photo", nil)
		return
	}

	contentType := http.DetectContentType(data)
	ext, ok := allowedPhotoExtensions[contentType]
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "photo must be JPEG, PNG or WebP", nil)
		return
	}

	filename := fmt.Sprintf("%d-%s%s", id, randomSuffix(), ext)
	prize, err := h.service.SetPhoto(r.Context(), id, filename, data)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}
	writeJSON(w, http.StatusOK, toPrizeResponse(prize))
}

func (h *prizeHandler) delete(w http.ResponseWriter, r *http.Request) {
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

// randomSuffix returns a short hex string used to make uploaded filenames
// unique without trusting anything from the client.
func randomSuffix() string {
	var buf [8]byte
	_, _ = rand.Read(buf[:])
	return hex.EncodeToString(buf[:])
}
