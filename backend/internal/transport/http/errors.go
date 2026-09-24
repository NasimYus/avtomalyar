package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/avtomalyar/backend/internal/domain"
)

type apiErrorBody struct {
	Error apiErrorPayload `json:"error"`
}

type apiErrorPayload struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func writeJSONError(w http.ResponseWriter, status int, code, message string, fields map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(apiErrorBody{
		Error: apiErrorPayload{Code: code, Message: message, Fields: fields},
	})
}

// writeError maps a domain (or unexpected) error to the API's unified error
// response shape and an appropriate HTTP status code. Unexpected errors are
// logged with full detail but never leaked to the client.
func writeError(w http.ResponseWriter, logger *slog.Logger, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		writeJSONError(w, http.StatusNotFound, "not_found", err.Error(), nil)
	case errors.Is(err, domain.ErrConflict):
		writeJSONError(w, http.StatusConflict, "conflict", err.Error(), nil)
	case errors.Is(err, domain.ErrValidation):
		writeJSONError(w, http.StatusBadRequest, "validation_error", err.Error(), nil)
	case errors.Is(err, domain.ErrForbidden):
		writeJSONError(w, http.StatusForbidden, "forbidden", err.Error(), nil)
	case errors.Is(err, domain.ErrUnauthorized):
		writeJSONError(w, http.StatusUnauthorized, "unauthorized", err.Error(), nil)
	default:
		logger.Error("unhandled error", "error", err)
		writeJSONError(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
	}
}

// writeValidationErrors reports request payload validation failures with
// per-field messages.
func writeValidationErrors(w http.ResponseWriter, fields map[string]string) {
	writeJSONError(w, http.StatusBadRequest, "validation_error", "validation error", fields)
}
