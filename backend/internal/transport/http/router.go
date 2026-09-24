// Package http wires HTTP handlers, middleware and routing.
package http

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewRouter builds the top-level chi router. Feature routes are mounted
// under /api/v1 as modules land (auth, cities, grades, ...).
func NewRouter(logger *slog.Logger) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)

	logger.Debug("router initialized")

	r.Get("/healthz", handleHealthz)

	r.Route("/api/v1", func(_ chi.Router) {
		// auth, admin and me routes are registered here as they are implemented.
	})

	return r
}

func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
