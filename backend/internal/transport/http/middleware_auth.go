package http

import (
	"log/slog"
	"net/http"

	"github.com/avtomalyar/backend/internal/domain"
)

// authenticate decodes the session cookie, if present and valid, and
// attaches the resulting principal to the request context. It never
// rejects a request by itself — routes that require a principal use
// requireRole.
func authenticate(cfg SessionConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if principal, ok := cfg.principalFromRequest(r); ok {
				r = r.WithContext(contextWithPrincipal(r.Context(), principal))
			}
			next.ServeHTTP(w, r)
		})
	}
}

// requireRole rejects requests with no authenticated principal (401) or a
// principal whose role is not one of roles (403).
func requireRole(logger *slog.Logger, roles ...domain.Role) func(http.Handler) http.Handler {
	allowed := make(map[domain.Role]bool, len(roles))
	for _, role := range roles {
		allowed[role] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			principal, ok := PrincipalFromContext(r.Context())
			if !ok {
				writeError(w, logger, domain.ErrUnauthorized)
				return
			}
			if !allowed[principal.Role] {
				writeError(w, logger, domain.ErrForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
