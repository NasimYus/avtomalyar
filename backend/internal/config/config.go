// Package config loads runtime configuration from environment variables.
package config

import (
	"fmt"
	"os"
	"time"
)

// Config holds runtime configuration loaded from environment variables.
type Config struct {
	HTTPPort     string
	DatabaseURL  string
	JWTSecret    string
	JWTTTL       time.Duration
	CookieName   string
	CookieDomain string
	// CookieSecure marks the session cookie Secure, so browsers send it over
	// HTTPS only. On by default; a test stand served over plain HTTP by IP
	// or host name (not localhost) must turn it off, or browsers drop the
	// cookie and every login ends on the next request.
	CookieSecure bool
	Env          string
	UploadDir    string
}

// Load reads configuration from the process environment. It returns an
// error if a required variable is missing.
func Load() (Config, error) {
	cfg := Config{
		HTTPPort:     getEnv("HTTP_PORT", "8080"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		JWTTTL:       12 * time.Hour,
		CookieName:   getEnv("AUTH_COOKIE_NAME", "avtomalyar_session"),
		CookieDomain: os.Getenv("AUTH_COOKIE_DOMAIN"),
		CookieSecure: getEnv("AUTH_COOKIE_SECURE", "true") != "false",
		Env:          getEnv("APP_ENV", "development"),
		UploadDir:    getEnv("UPLOAD_DIR", "./uploads"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
