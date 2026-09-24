package auth

import (
	"testing"
	"time"

	"github.com/avtomalyar/backend/internal/domain"
)

func TestGenerateAndParseToken_RoundTrip(t *testing.T) {
	want := domain.Principal{ID: 42, Role: domain.RoleAdmin, Name: "Firuz"}

	token, err := GenerateToken("test-secret", want, time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	got, err := ParseToken("test-secret", token)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}

	if got != want {
		t.Errorf("ParseToken() = %+v, want %+v", got, want)
	}
}

func TestParseToken_WrongSecret(t *testing.T) {
	token, err := GenerateToken("secret-a", domain.Principal{ID: 1, Role: domain.RoleDealer}, time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	if _, err := ParseToken("secret-b", token); err == nil {
		t.Error("ParseToken() with the wrong secret succeeded, want error")
	}
}

func TestParseToken_Expired(t *testing.T) {
	token, err := GenerateToken("test-secret", domain.Principal{ID: 1, Role: domain.RoleDealer}, -time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	if _, err := ParseToken("test-secret", token); err == nil {
		t.Error("ParseToken() with an expired token succeeded, want error")
	}
}
