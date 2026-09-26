package http

import (
	"context"
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

// dealerStatus answers whether a dealer is still allowed in.
type dealerStatus interface {
	IsDealerActive(ctx context.Context, id int64) (bool, error)
}

// requireActiveDealer turns a dealer away once an admin has deactivated
// them, even if their session was issued beforehand.
//
// The ToR calls is_active a block on access (3.3), and a block that only
// takes hold when the token expires is not one — a dealer with a tab
// already open would keep the cabinet for the rest of the day. The cost
// is one lookup by primary key per cabinet request.
func requireActiveDealer(logger *slog.Logger, status dealerStatus) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			principal, ok := PrincipalFromContext(r.Context())
			if !ok {
				writeError(w, logger, domain.ErrUnauthorized)
				return
			}

			active, err := status.IsDealerActive(r.Context(), principal.ID)
			if err != nil {
				writeError(w, logger, err)
				return
			}
			if !active {
				writeError(w, logger, domain.ErrForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
