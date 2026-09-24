// Package domain holds entities and pure business rules, independent of
// transport or storage concerns.
package domain

import "errors"

// Sentinel errors mapped to HTTP status codes in one place at the transport layer.
var (
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
	ErrValidation   = errors.New("validation error")
	ErrForbidden    = errors.New("forbidden")
	ErrUnauthorized = errors.New("unauthorized")
)
