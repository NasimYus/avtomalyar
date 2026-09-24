// Command seed provides seed-admin and seed-demo subcommands used by the
// Makefile.
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/avtomalyar/backend/internal/auth"
	"github.com/avtomalyar/backend/internal/config"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: seed <admin|demo>")
		os.Exit(1)
	}

	if err := run(os.Args[1]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(subcommand string) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx := context.Background()
	repo, err := repository.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer repo.Close()

	switch subcommand {
	case "admin":
		return seedAdmin(ctx, repo)
	case "demo":
		return fmt.Errorf("seed demo: not implemented yet")
	default:
		return fmt.Errorf("unknown subcommand %q", subcommand)
	}
}

func seedAdmin(ctx context.Context, repo *repository.Repository) error {
	count, err := repo.CountAdmins(ctx)
	if err != nil {
		return fmt.Errorf("count admins: %w", err)
	}
	if count > 0 {
		fmt.Println("an admin already exists, skipping")
		return nil
	}

	login := envOrDefault("ADMIN_LOGIN", "admin")
	name := envOrDefault("ADMIN_NAME", "Administrator")

	password := os.Getenv("ADMIN_PASSWORD")
	generated := password == ""
	if generated {
		password, err = auth.GenerateRandomPassword(16)
		if err != nil {
			return fmt.Errorf("generate password: %w", err)
		}
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}

	if _, err := repo.CreateAdmin(ctx, db.CreateAdminParams{Login: login, PasswordHash: hash, Name: name}); err != nil {
		return fmt.Errorf("create admin: %w", err)
	}

	fmt.Println("admin created")
	fmt.Println("login:   ", login)
	if generated {
		fmt.Println("password:", password, "(generated, shown once — save it now)")
	} else {
		fmt.Println("password: (set from ADMIN_PASSWORD)")
	}
	return nil
}

func envOrDefault(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
