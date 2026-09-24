package domain

import (
	"errors"
	"testing"
)

func TestSentinelErrorsAreDistinct(t *testing.T) {
	all := []error{ErrNotFound, ErrConflict, ErrValidation, ErrForbidden}
	for i, a := range all {
		for j, b := range all {
			if i != j && errors.Is(a, b) {
				t.Fatalf("expected %v and %v to be distinct sentinel errors", a, b)
			}
		}
	}
}
