package service

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/avtomalyar/backend/internal/auth"
	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository/db"
)

type fakeAuthRepository struct {
	admin     db.Admin
	hasAdmin  bool
	dealer    db.Dealer
	hasDealer bool
}

func (f fakeAuthRepository) GetAdminByLogin(_ context.Context, login string) (db.Admin, error) {
	if f.hasAdmin && f.admin.Login == login {
		return f.admin, nil
	}
	return db.Admin{}, pgx.ErrNoRows
}

func (f fakeAuthRepository) GetDealerByLogin(_ context.Context, login string) (db.Dealer, error) {
	if f.hasDealer && f.dealer.Login == login {
		return f.dealer, nil
	}
	return db.Dealer{}, pgx.ErrNoRows
}

func mustHash(t *testing.T, plaintext string) string {
	t.Helper()
	hash, err := auth.HashPassword(plaintext)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	return hash
}

func TestAuthService_Login(t *testing.T) {
	adminHash := mustHash(t, "admin-pass")
	dealerHash := mustHash(t, "dealer-pass")

	repo := fakeAuthRepository{
		admin:     db.Admin{ID: 1, Login: "admin1", PasswordHash: adminHash, Name: "Admin One"},
		hasAdmin:  true,
		dealer:    db.Dealer{ID: 2, Login: "dealer1", PasswordHash: dealerHash, FullName: "Dealer One", IsActive: true},
		hasDealer: true,
	}
	svc := NewAuthService(repo)

	tests := []struct {
		name     string
		login    string
		password string
		want     domain.Principal
		wantErr  error
	}{
		{
			name:     "admin with correct password",
			login:    "admin1",
			password: "admin-pass",
			want:     domain.Principal{ID: 1, Role: domain.RoleAdmin, Name: "Admin One"},
		},
		{
			name:     "dealer with correct password",
			login:    "dealer1",
			password: "dealer-pass",
			want:     domain.Principal{ID: 2, Role: domain.RoleDealer, Name: "Dealer One"},
		},
		{
			name:     "admin with wrong password",
			login:    "admin1",
			password: "wrong",
			wantErr:  domain.ErrUnauthorized,
		},
		{
			name:     "unknown login",
			login:    "nobody",
			password: "whatever",
			wantErr:  domain.ErrUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := svc.Login(context.Background(), tt.login, tt.password)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Login() error = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Login() unexpected error = %v", err)
			}
			if got != tt.want {
				t.Errorf("Login() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestAuthService_Login_DeactivatedDealer(t *testing.T) {
	hash := mustHash(t, "dealer-pass")
	repo := fakeAuthRepository{
		dealer:    db.Dealer{ID: 2, Login: "dealer1", PasswordHash: hash, FullName: "Dealer One", IsActive: false},
		hasDealer: true,
	}
	svc := NewAuthService(repo)

	_, err := svc.Login(context.Background(), "dealer1", "dealer-pass")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("Login() error = %v, want %v", err, domain.ErrUnauthorized)
	}
}
