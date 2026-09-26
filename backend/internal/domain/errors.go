// Package domain holds entities and pure business rules, independent of
// transport or storage concerns.
package domain

import (
	"errors"
	"fmt"
)

// Sentinel errors mapped to HTTP status codes in one place at the transport layer.
var (
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
	ErrValidation   = errors.New("validation error")
	ErrForbidden    = errors.New("forbidden")
	ErrUnauthorized = errors.New("unauthorized")
)

// ReasonError is a sentinel error with a stable, machine-readable reason
// ("city_in_use") next to the English message. The API passes the reason
// on, so the client can show the problem in the user's own language
// instead of echoing the message.
type ReasonError struct {
	Kind    error
	Reason  string
	Message string
}

func (e *ReasonError) Error() string { return e.Kind.Error() + ": " + e.Message }

// Unwrap lets errors.Is(err, ErrConflict) and friends see the kind.
func (e *ReasonError) Unwrap() error { return e.Kind }

// Reasoned builds a ReasonError of the given kind; format and args make
// up the English message, as with fmt.Errorf.
func Reasoned(kind error, reason, format string, args ...any) error {
	return &ReasonError{Kind: kind, Reason: reason, Message: fmt.Sprintf(format, args...)}
}

// ReasonOf returns the reason carried by err, or "" if it has none.
func ReasonOf(err error) string {
	var reasoned *ReasonError
	if errors.As(err, &reasoned) {
		return reasoned.Reason
	}
	return ""
}
