package domain

import (
	"testing"
	"time"
)

func ptr[T any](v T) *T { return &v }

func date(day int) time.Time {
	return time.Date(2026, time.September, day, 0, 0, 0, 0, time.UTC)
}

func TestIsEligible(t *testing.T) {
	const dushanbe, khujand = int64(1), int64(2)
	const gold, silver = int64(10), int64(11)

	activeDealer := DealerSnapshot{
		ID:                    1,
		CityID:                dushanbe,
		GradeID:               ptr(gold),
		IsActive:              true,
		LifetimePurchaseTotal: 250_000_000,
	}

	tests := []struct {
		name       string
		dealer     DealerSnapshot
		conditions PromotionConditions
		want       bool
	}{
		{
			name:       "no conditions — everyone active takes part",
			dealer:     activeDealer,
			conditions: PromotionConditions{},
			want:       true,
		},
		{
			name: "deactivated dealer never takes part",
			dealer: func() DealerSnapshot {
				d := activeDealer
				d.IsActive = false
				return d
			}(),
			conditions: PromotionConditions{},
			want:       false,
		},
		{
			name:       "city filter matches",
			dealer:     activeDealer,
			conditions: PromotionConditions{CityID: ptr(dushanbe)},
			want:       true,
		},
		{
			name:       "city filter excludes другой город",
			dealer:     activeDealer,
			conditions: PromotionConditions{CityID: ptr(khujand)},
			want:       false,
		},
		{
			name:       "grade filter matches",
			dealer:     activeDealer,
			conditions: PromotionConditions{GradeID: ptr(gold)},
			want:       true,
		},
		{
			name:       "grade filter excludes another grade",
			dealer:     activeDealer,
			conditions: PromotionConditions{GradeID: ptr(silver)},
			want:       false,
		},
		{
			name: "grade filter excludes a dealer without a grade",
			dealer: func() DealerSnapshot {
				d := activeDealer
				d.GradeID = nil
				return d
			}(),
			conditions: PromotionConditions{GradeID: ptr(gold)},
			want:       false,
		},
		{
			name:       "lifetime threshold reached exactly",
			dealer:     activeDealer,
			conditions: PromotionConditions{MinLifetimeThreshold: ptr(int64(250_000_000))},
			want:       true,
		},
		{
			name:       "below the lifetime threshold — the car promotion case",
			dealer:     activeDealer,
			conditions: PromotionConditions{MinLifetimeThreshold: ptr(int64(300_000_000))},
			want:       false,
		},
		{
			name:   "all filters must hold at once",
			dealer: activeDealer,
			conditions: PromotionConditions{
				CityID:               ptr(dushanbe),
				GradeID:              ptr(gold),
				MinLifetimeThreshold: ptr(int64(100_000_000)),
			},
			want: true,
		},
		{
			name:   "one failing filter is enough to exclude",
			dealer: activeDealer,
			conditions: PromotionConditions{
				CityID:               ptr(dushanbe),
				GradeID:              ptr(gold),
				MinLifetimeThreshold: ptr(int64(999_000_000)),
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsEligible(tt.dealer, tt.conditions); got != tt.want {
				t.Errorf("IsEligible() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRankParticipants(t *testing.T) {
	tests := []struct {
		name         string
		participants []Participant
		wantOrder    []int64
	}{
		{
			name: "orders by period total, biggest first",
			participants: []Participant{
				{DealerID: 1, PeriodTotal: 500, LastPurchaseDate: date(10)},
				{DealerID: 2, PeriodTotal: 900, LastPurchaseDate: date(10)},
				{DealerID: 3, PeriodTotal: 700, LastPurchaseDate: date(10)},
			},
			wantOrder: []int64{2, 3, 1},
		},
		{
			name: "equal totals: whoever reached the sum earlier ranks higher",
			participants: []Participant{
				{DealerID: 1, PeriodTotal: 900, LastPurchaseDate: date(20)},
				{DealerID: 2, PeriodTotal: 900, LastPurchaseDate: date(12)},
				{DealerID: 3, PeriodTotal: 900, LastPurchaseDate: date(17)},
			},
			wantOrder: []int64{2, 3, 1},
		},
		{
			name: "same day: the purchase recorded earlier wins",
			participants: []Participant{
				{
					DealerID: 1, PeriodTotal: 900, LastPurchaseDate: date(12),
					LastPurchaseCreatedAt: date(12).Add(15 * time.Hour),
				},
				{
					DealerID: 2, PeriodTotal: 900, LastPurchaseDate: date(12),
					LastPurchaseCreatedAt: date(12).Add(9 * time.Hour),
				},
			},
			wantOrder: []int64{2, 1},
		},
		{
			name: "full tie falls back to the earlier registration",
			participants: []Participant{
				{DealerID: 7, PeriodTotal: 900, LastPurchaseDate: date(12)},
				{DealerID: 3, PeriodTotal: 900, LastPurchaseDate: date(12)},
			},
			wantOrder: []int64{3, 7},
		},
		{
			name: "participants who bought nothing rank last",
			participants: []Participant{
				{DealerID: 1, PeriodTotal: 0},
				{DealerID: 2, PeriodTotal: 100, LastPurchaseDate: date(12)},
			},
			wantOrder: []int64{2, 1},
		},
		{
			name:         "empty ranking",
			participants: nil,
			wantOrder:    []int64{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ranked := RankParticipants(tt.participants)

			if len(ranked) != len(tt.wantOrder) {
				t.Fatalf("got %d ranked participants, want %d", len(ranked), len(tt.wantOrder))
			}
			for i, want := range tt.wantOrder {
				if ranked[i].DealerID != want {
					t.Errorf("place %d = dealer %d, want dealer %d", i+1, ranked[i].DealerID, want)
				}
				if ranked[i].Place != i+1 {
					t.Errorf("participant at index %d has place %d, want %d", i, ranked[i].Place, i+1)
				}
			}
		})
	}
}

func TestRankParticipants_DoesNotMutateInput(t *testing.T) {
	participants := []Participant{
		{DealerID: 1, PeriodTotal: 100},
		{DealerID: 2, PeriodTotal: 900},
	}

	RankParticipants(participants)

	if participants[0].DealerID != 1 {
		t.Error("RankParticipants() reordered the caller's slice")
	}
}

func TestCanTransition(t *testing.T) {
	tests := []struct {
		from, to PromotionStatus
		want     bool
	}{
		{PromotionDraft, PromotionActive, true},
		{PromotionDraft, PromotionPublished, false},
		{PromotionActive, PromotionCalculated, true},
		{PromotionActive, PromotionPublished, false},
		// Recalculation is allowed until the results are published.
		{PromotionCalculated, PromotionCalculated, true},
		{PromotionCalculated, PromotionPublished, true},
		{PromotionPublished, PromotionCalculated, false},
		{PromotionPublished, PromotionArchived, true},
		{PromotionArchived, PromotionActive, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.from)+"→"+string(tt.to), func(t *testing.T) {
			if got := CanTransition(tt.from, tt.to); got != tt.want {
				t.Errorf("CanTransition(%q, %q) = %v, want %v", tt.from, tt.to, got, tt.want)
			}
		})
	}
}

func TestPromotionStatus_IsEditable(t *testing.T) {
	editable := []PromotionStatus{PromotionDraft, PromotionActive}
	frozen := []PromotionStatus{PromotionCalculated, PromotionPublished, PromotionArchived}

	for _, status := range editable {
		if !status.IsEditable() {
			t.Errorf("%q should be editable", status)
		}
	}
	for _, status := range frozen {
		if status.IsEditable() {
			t.Errorf("%q should not be editable", status)
		}
	}
}
