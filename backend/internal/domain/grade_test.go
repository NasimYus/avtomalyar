package domain

import "testing"

func TestSelectGrade(t *testing.T) {
	bronze := Grade{ID: 1, MinPurchaseAmount: 0}
	silver := Grade{ID: 2, MinPurchaseAmount: 100_000_00}
	gold := Grade{ID: 3, MinPurchaseAmount: 1_000_000_00}

	tests := []struct {
		name          string
		grades        []Grade
		lifetimeTotal int64
		wantID        int64
		wantOK        bool
	}{
		{
			name:          "below every threshold with no zero-floor grade",
			grades:        []Grade{silver, gold},
			lifetimeTotal: 50_000_00,
			wantOK:        false,
		},
		{
			name:          "qualifies for the zero-floor grade only",
			grades:        []Grade{bronze, silver, gold},
			lifetimeTotal: 50_000_00,
			wantID:        bronze.ID,
			wantOK:        true,
		},
		{
			name:          "exactly at a threshold qualifies for that grade",
			grades:        []Grade{bronze, silver, gold},
			lifetimeTotal: silver.MinPurchaseAmount,
			wantID:        silver.ID,
			wantOK:        true,
		},
		{
			name:          "picks the highest qualifying threshold, not just any",
			grades:        []Grade{bronze, silver, gold},
			lifetimeTotal: 5_000_000_00,
			wantID:        gold.ID,
			wantOK:        true,
		},
		{
			name:          "order of the input slice does not matter",
			grades:        []Grade{gold, bronze, silver},
			lifetimeTotal: silver.MinPurchaseAmount,
			wantID:        silver.ID,
			wantOK:        true,
		},
		{
			name:          "no grades defined at all",
			grades:        nil,
			lifetimeTotal: 1_000_000_00,
			wantOK:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotID, gotOK := SelectGrade(tt.grades, tt.lifetimeTotal)
			if gotOK != tt.wantOK || (gotOK && gotID != tt.wantID) {
				t.Errorf("SelectGrade(%v, %d) = (%d, %v), want (%d, %v)",
					tt.grades, tt.lifetimeTotal, gotID, gotOK, tt.wantID, tt.wantOK)
			}
		})
	}
}
