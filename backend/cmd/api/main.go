// Command api runs the Avtomalyar HTTP API server.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/avtomalyar/backend/internal/config"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/service"
	"github.com/avtomalyar/backend/internal/storage"
	transporthttp "github.com/avtomalyar/backend/internal/transport/http"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logLevel := slog.LevelInfo
	if cfg.Env == "development" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	repo, err := repository.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer repo.Close()

	fileStore, err := storage.New(cfg.UploadDir)
	if err != nil {
		return err
	}

	authService := service.NewAuthService(repo)
	cityService := service.NewCityService(repo)
	gradeService := service.NewGradeService(repo)
	prizeService := service.NewPrizeService(repo, fileStore)
	dealerService := service.NewDealerService(repo)
	purchaseService := service.NewPurchaseService(repo)
	dashboardService := service.NewDashboardService(repo)

	handler := transporthttp.NewRouter(transporthttp.Deps{
		Logger: logger,
		Session: transporthttp.SessionConfig{
			JWTSecret:    cfg.JWTSecret,
			JWTTTL:       cfg.JWTTTL,
			CookieName:   cfg.CookieName,
			CookieDomain: cfg.CookieDomain,
		},
		Auth:      authService,
		Cities:    cityService,
		Grades:    gradeService,
		Prizes:    prizeService,
		Dealers:   dealerService,
		Purchases: purchaseService,
		Dashboard: dashboardService,
		UploadDir: cfg.UploadDir,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("http server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	logger.Info("http server shutting down")
	return srv.Shutdown(shutdownCtx)
}
