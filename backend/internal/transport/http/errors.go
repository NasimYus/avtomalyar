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
	Code string `json:"code"`
	// Which rule was broken ("city_in_use"), when the error says — the
	// client shows its own translated text for it. The English message is
	// for logs and developers.
	Reason  string            `json:"reason,omitempty"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func writeJSONError(w http.ResponseWriter, status int, code, message string, fields map[string]string) {
	writeJSONErrorBody(w, status, apiErrorPayload{Code: code, Message: message, Fields: fields})
}

func writeJSONErrorBody(w http.ResponseWriter, status int, payload apiErrorPayload) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(apiErrorBody{Error: payload})
}

// writeError maps a domain (or unexpected) error to the API's unified error
// response shape and an appropriate HTTP status code. Unexpected errors are
// logged with full detail but never leaked to the client.
func writeError(w http.ResponseWriter, logger *slog.Logger, err error) {
	known := func(status int, code string) {
		writeJSONErrorBody(w, status, apiErrorPayload{
			Code: code, Reason: domain.ReasonOf(err), Message: err.Error(),
		})
	}

	switch {
	case errors.Is(err, domain.ErrNotFound):
		known(http.StatusNotFound, "not_found")
	case errors.Is(err, domain.ErrConflict):
		known(http.StatusConflict, "conflict")
	case errors.Is(err, domain.ErrValidation):
		known(http.StatusBadRequest, "validation_error")
	case errors.Is(err, domain.ErrForbidden):
		known(http.StatusForbidden, "forbidden")
	case errors.Is(err, domain.ErrUnauthorized):
		known(http.StatusUnauthorized, "unauthorized")
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
