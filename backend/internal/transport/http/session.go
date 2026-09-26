package http

import (
	"net/http"
	"time"

	"github.com/avtomalyar/backend/internal/auth"
	"github.com/avtomalyar/backend/internal/domain"
)

// SessionConfig controls how session JWTs are signed and how the session
// cookie carrying them is set.
type SessionConfig struct {
	JWTSecret    string
	JWTTTL       time.Duration
	CookieName   string
	CookieDomain string
	// Secure sends the cookie over HTTPS only (see config.CookieSecure).
	Secure bool
}

func (c SessionConfig) setCookie(w http.ResponseWriter, principal domain.Principal) error {
	token, err := auth.GenerateToken(c.JWTSecret, principal, c.JWTTTL)
	if err != nil {
		return err
	}

	// Secure is on unless AUTH_COOKIE_SECURE=false (a plain-HTTP test stand).
	http.SetCookie(w, &http.Cookie{ //nolint:gosec // G124: Secure is configurable, on by default
		Name:     c.CookieName,
		Value:    token,
		Path:     "/",
		Domain:   c.CookieDomain,
		Expires:  time.Now().Add(c.JWTTTL),
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (c SessionConfig) clearCookie(w http.ResponseWriter) {
	// Secure is on unless AUTH_COOKIE_SECURE=false (a plain-HTTP test stand).
	http.SetCookie(w, &http.Cookie{ //nolint:gosec // G124: Secure is configurable, on by default
		Name:     c.CookieName,
		Value:    "",
		Path:     "/",
		Domain:   c.CookieDomain,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (c SessionConfig) principalFromRequest(r *http.Request) (domain.Principal, bool) {
	cookie, err := r.Cookie(c.CookieName)
	if err != nil || cookie.Value == "" {
		return domain.Principal{}, false
	}

	principal, err := auth.ParseToken(c.JWTSecret, cookie.Value)
	if err != nil {
		return domain.Principal{}, false
	}
	return principal, true
}
