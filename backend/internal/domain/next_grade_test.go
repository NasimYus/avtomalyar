package domain

import "testing"

func TestNextGrade(t *testing.T) {
	// A typical ladder: bronze from 0, silver from 1 000 000 somoni,
	// gold from 2 500 000 somoni (in dirams).
	ladder := []Grade{
		{ID: 1, MinPurchaseAmount: 0},
		{ID: 2, MinPurchaseAmount: 100_000_000},
		{ID: 3, MinPurchaseAmount: 250_000_000},
	}

	tests := []struct {
		name          string
		grades        []Grade
		lifetimeTotal int64
		wantID        int64
		wantRemaining int64
		wantOK        bool
	}{
		{
			name:          "fresh dealer aims at the second grade",
			grades:        ladder,
			lifetimeTotal: 0,
			wantID:        2,
			wantRemaining: 100_000_000,
			wantOK:        true,
		},
		{
			name:          "part way up aims at the same grade",
			grades:        ladder,
			lifetimeTotal: 40_000_000,
			wantID:        2,
			wantRemaining: 60_000_000,
			wantOK:        true,
		},
		{
			name:          "exactly on a threshold aims at the one above",
			grades:        ladder,
			lifetimeTotal: 100_000_000,
			wantID:        3,
			wantRemaining: 150_000_000,
			wantOK:        true,
		},
		{
			name:          "top grade reached has nothing above it",
			grades:        ladder,
			lifetimeTotal: 250_000_000,
			wantOK:        false,
		},
		{
			name:          "beyond the top grade still has nothing above it",
			grades:        ladder,
			lifetimeTotal: 900_000_000,
			wantOK:        false,
		},
		{
			name:          "no grades defined at all",
			grades:        nil,
			lifetimeTotal: 50_000_000,
			wantOK:        false,
		},
		{
			name:          "unordered input is handled",
			grades:        []Grade{{ID: 3, MinPurchaseAmount: 250_000_000}, {ID: 2, MinPurchaseAmount: 100_000_000}},
			lifetimeTotal: 10_000_000,
			wantID:        2,
			wantRemaining: 90_000_000,
			wantOK:        true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			next, remaining, ok := NextGrade(tt.grades, tt.lifetimeTotal)
			if ok != tt.wantOK {
				t.Fatalf("NextGrade(...) ok = %v, want %v", ok, tt.wantOK)
			}
			if !ok {
				return
			}
			if next.ID != tt.wantID || remaining != tt.wantRemaining {
				t.Errorf("NextGrade(...) = (id %d, remaining %d), want (id %d, remaining %d)",
					next.ID, remaining, tt.wantID, tt.wantRemaining)
			}
		})
	}
}
