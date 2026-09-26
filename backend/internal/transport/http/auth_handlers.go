package http

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/domain"
)

type authService interface {
	Login(ctx context.Context, login, password string) (domain.Principal, error)
	// Checked on every cabinet request, so deactivation takes hold at once.
	IsDealerActive(ctx context.Context, id int64) (bool, error)
}

type loginRequest struct {
	Login    string `json:"login" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type principalResponse struct {
	ID   int64       `json:"id"`
	Role domain.Role `json:"role"`
	Name string      `json:"name"`
}

type authHandler struct {
	service   authService
	session   SessionConfig
	logger    *slog.Logger
	validator *validator.Validate
}

func (h *authHandler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "validation_error", "invalid JSON body", nil)
		return
	}

	if err := h.validator.Struct(req); err != nil {
		writeValidationErrors(w, validationFields(err))
		return
	}

	principal, err := h.service.Login(r.Context(), req.Login, req.Password)
	if err != nil {
		writeError(w, h.logger, err)
		return
	}

	if err := h.session.setCookie(w, principal); err != nil {
		writeError(w, h.logger, err)
		return
	}

	writeJSON(w, http.StatusOK, principalResponse{ID: principal.ID, Role: principal.Role, Name: principal.Name})
}

func (h *authHandler) logout(w http.ResponseWriter, _ *http.Request) {
	h.session.clearCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *authHandler) me(w http.ResponseWriter, r *http.Request) {
	principal, ok := PrincipalFromContext(r.Context())
	if !ok {
		writeError(w, h.logger, domain.ErrUnauthorized)
		return
	}

	// A dealer deactivated mid-session has no session left. Answering
	// "signed out" here rather than letting every cabinet request fail
	// with 403 is what sends them back to the login screen.
	if principal.Role == domain.RoleDealer {
		active, err := h.service.IsDealerActive(r.Context(), principal.ID)
		if err != nil {
			writeError(w, h.logger, err)
			return
		}
		if !active {
			h.session.clearCookie(w)
			writeError(w, h.logger, domain.ErrUnauthorized)
			return
		}
	}

	writeJSON(w, http.StatusOK, principalResponse{ID: principal.ID, Role: principal.Role, Name: principal.Name})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func validationFields(err error) map[string]string {
	fields := make(map[string]string)
	var validationErrs validator.ValidationErrors
	if !errors.As(err, &validationErrs) {
		return fields
	}
	for _, fe := range validationErrs {
		fields[fe.Field()] = fe.Tag()
	}
	return fields
}
