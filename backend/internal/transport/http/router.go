// Package http wires HTTP handlers, middleware and routing.
package http

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"

	"github.com/avtomalyar/backend/internal/domain"
)

// Deps holds everything the router needs to build request handlers.
// Modules add fields here as they land (cities service, dealers service,
// ...).
type Deps struct {
	Logger    *slog.Logger
	Session   SessionConfig
	Auth      authService
	Cities    cityService
	Grades    gradeService
	Prizes    prizeService
	Dealers   dealerService
	Purchases purchaseService
	UploadDir string
}

// NewRouter builds the top-level chi router.
func NewRouter(deps Deps) http.Handler {
	r := chi.NewRouter()
	validate := validator.New()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	r.Use(authenticate(deps.Session))

	r.Get("/healthz", handleHealthz)

	authH := &authHandler{
		service:   deps.Auth,
		session:   deps.Session,
		logger:    deps.Logger,
		validator: validate,
	}

	cityH := &cityHandler{service: deps.Cities, logger: deps.Logger, validator: validate}
	gradeH := &gradeHandler{service: deps.Grades, logger: deps.Logger, validator: validate}
	prizeH := &prizeHandler{service: deps.Prizes, logger: deps.Logger, validator: validate}
	dealerH := &dealerHandler{service: deps.Dealers, logger: deps.Logger, validator: validate}
	purchaseH := &purchaseHandler{service: deps.Purchases, logger: deps.Logger, validator: validate}

	if deps.UploadDir != "" {
		fileServer := http.FileServer(http.Dir(deps.UploadDir))
		r.Handle("/media/*", http.StripPrefix("/media/", fileServer))
	}

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.With(rateLimitLogin).Post("/login", authH.login)
			r.Post("/logout", authH.logout)
			r.With(requireRole(deps.Logger, domain.RoleAdmin, domain.RoleDealer)).Get("/me", authH.me)
		})

		r.Route("/admin", func(r chi.Router) {
			r.Use(requireRole(deps.Logger, domain.RoleAdmin))

			r.Route("/cities", func(r chi.Router) {
				r.Get("/", cityH.list)
				r.Post("/", cityH.create)
				r.Get("/{id}", cityH.get)
				r.Put("/{id}", cityH.update)
				r.Delete("/{id}", cityH.delete)
			})

			r.Route("/grades", func(r chi.Router) {
				r.Get("/", gradeH.list)
				r.Post("/", gradeH.create)
				r.Get("/{id}", gradeH.get)
				r.Put("/{id}", gradeH.update)
				r.Delete("/{id}", gradeH.delete)
			})

			r.Route("/prizes", func(r chi.Router) {
				r.Get("/", prizeH.list)
				r.Post("/", prizeH.create)
				r.Get("/{id}", prizeH.get)
				r.Put("/{id}", prizeH.update)
				r.Post("/{id}/photo", prizeH.uploadPhoto)
				r.Delete("/{id}", prizeH.delete)
			})

			r.Route("/dealers", func(r chi.Router) {
				r.Get("/", dealerH.list)
				r.Post("/", dealerH.create)
				r.Get("/{id}", dealerH.get)
				r.Put("/{id}", dealerH.update)
				r.Patch("/{id}/active", dealerH.setActive)
				r.Post("/{id}/reset-password", dealerH.resetPassword)
			})

			r.Route("/purchases", func(r chi.Router) {
				r.Get("/", purchaseH.list)
				r.Post("/", purchaseH.create)
				r.Get("/{id}", purchaseH.get)
				r.Put("/{id}", purchaseH.update)
				r.Delete("/{id}", purchaseH.delete)
			})
		})
	})

	return r
}

func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
