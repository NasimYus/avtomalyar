package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/avtomalyar/backend/internal/domain"
)

// Claims is the JWT payload identifying an authenticated principal.
type Claims struct {
	Role domain.Role `json:"role"`
	Name string      `json:"name"`
	jwt.RegisteredClaims
}

// GenerateToken issues a signed JWT for the given principal, valid for ttl.
func GenerateToken(secret string, principal domain.Principal, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		Role: principal.Role,
		Name: principal.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", principal.ID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// ParseToken validates a JWT and returns the principal it carries.
func ParseToken(secret, tokenString string) (domain.Principal, error) {
	var claims Claims
	token, err := jwt.ParseWithClaims(tokenString, &claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return domain.Principal{}, fmt.Errorf("parse token: %w", err)
	}
	if !token.Valid {
		return domain.Principal{}, fmt.Errorf("invalid token")
	}

	var id int64
	if _, err := fmt.Sscanf(claims.Subject, "%d", &id); err != nil {
		return domain.Principal{}, fmt.Errorf("invalid token subject: %w", err)
	}

	return domain.Principal{
		ID:   id,
		Role: claims.Role,
		Name: claims.Name,
	}, nil
}
