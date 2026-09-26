// Package service implements application/business logic on top of the
// repository layer, independent of HTTP transport concerns.
package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/avtomalyar/backend/internal/auth"
	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

type authRepository interface {
	GetAdminByLogin(ctx context.Context, login string) (db.Admin, error)
	GetDealerByLogin(ctx context.Context, login string) (db.Dealer, error)
	GetDealerByID(ctx context.Context, id int64) (db.Dealer, error)
}

// AuthService authenticates admins and dealers against a single
// login/password pair, per the ToR's single-endpoint login design.
type AuthService struct {
	repo authRepository
}

// NewAuthService constructs an AuthService backed by repo.
func NewAuthService(repo authRepository) *AuthService {
	return &AuthService{repo: repo}
}

// Login looks up login among admins first, then dealers, and verifies the
// password. It returns domain.ErrUnauthorized both when the login does not
// exist and when the password is wrong, so callers can't use response
// differences to enumerate valid logins. A deactivated dealer cannot log
// in even with the correct password.
func (s *AuthService) Login(ctx context.Context, login, password string) (domain.Principal, error) {
	admin, err := s.repo.GetAdminByLogin(ctx, login)
	switch {
	case err == nil:
		if !auth.ComparePassword(admin.PasswordHash, password) {
			return domain.Principal{}, domain.ErrUnauthorized
		}
		return domain.Principal{ID: admin.ID, Role: domain.RoleAdmin, Name: admin.Name}, nil
	case !errors.Is(err, pgx.ErrNoRows):
		return domain.Principal{}, fmt.Errorf("look up admin by login: %w", err)
	}

	dealer, err := s.repo.GetDealerByLogin(ctx, login)
	switch {
	case err == nil:
		if !dealer.IsActive || !auth.ComparePassword(dealer.PasswordHash, password) {
			return domain.Principal{}, domain.ErrUnauthorized
		}
		return domain.Principal{ID: dealer.ID, Role: domain.RoleDealer, Name: dealer.FullName}, nil
	case !errors.Is(err, pgx.ErrNoRows):
		return domain.Principal{}, fmt.Errorf("look up dealer by login: %w", err)
	}

	return domain.Principal{}, domain.ErrUnauthorized
}

// IsDealerActive reports whether a dealer may still use the cabinet.
//
// Deactivation has to bite immediately, not when the session expires: a
// blocked dealer with a browser tab already open would otherwise keep
// their access for the rest of the token's life.
func (s *AuthService) IsDealerActive(ctx context.Context, id int64) (bool, error) {
	dealer, err := s.repo.GetDealerByID(ctx, id)
	if err != nil {
		return false, fmt.Errorf("look up dealer: %w", repository.TranslateError(err))
	}
	return dealer.IsActive, nil
}
