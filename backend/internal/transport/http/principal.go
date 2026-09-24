package http

import (
	"context"

	"github.com/avtomalyar/backend/internal/domain"
)

type principalContextKey struct{}

func contextWithPrincipal(ctx context.Context, p domain.Principal) context.Context {
	return context.WithValue(ctx, principalContextKey{}, p)
}

// PrincipalFromContext returns the authenticated principal for the request,
// if any. Handlers behind requireRole can assume ok is true.
func PrincipalFromContext(ctx context.Context) (domain.Principal, bool) {
	p, ok := ctx.Value(principalContextKey{}).(domain.Principal)
	return p, ok
}
