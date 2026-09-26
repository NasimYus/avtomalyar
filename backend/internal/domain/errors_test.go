package domain

import (
	"errors"
	"fmt"
	"testing"
)

func TestReasonedKeepsKindAndMessage(t *testing.T) {
	err := Reasoned(ErrConflict, "city_in_use", "city %q is in use", "Душанбе")

	if !errors.Is(err, ErrConflict) {
		t.Fatalf("errors.Is(%v, ErrConflict) = false", err)
	}
	if got, want := err.Error(), `conflict: city "Душанбе" is in use`; got != want {
		t.Fatalf("Error() = %q, want %q", got, want)
	}
}

func TestReasonOfSeesThroughWrapping(t *testing.T) {
	err := fmt.Errorf("delete city: %w", Reasoned(ErrConflict, "city_in_use", "in use"))

	if got := ReasonOf(err); got != "city_in_use" {
		t.Fatalf("ReasonOf = %q, want city_in_use", got)
	}
	if got := ReasonOf(ErrConflict); got != "" {
		t.Fatalf("ReasonOf(plain sentinel) = %q, want empty", got)
	}
}
