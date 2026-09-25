package domain

import (
	"sort"
	"time"
)

// PromotionStatus is the lifecycle stage of a promotion (ToR 3.4).
// Whether an active promotion is still running or already waiting for
// results is derived from its end date, not from a separate status.
type PromotionStatus string

// The statuses a promotion moves through, in order.
const (
	// PromotionDraft — being set up, invisible to dealers.
	PromotionDraft PromotionStatus = "draft"
	// PromotionActive — visible to dealers; the ranking is live.
	PromotionActive PromotionStatus = "active"
	// PromotionCalculated — results computed, awaiting the admin's review.
	PromotionCalculated PromotionStatus = "calculated"
	// PromotionPublished — results visible to dealers and frozen.
	PromotionPublished PromotionStatus = "published"
	// PromotionArchived — kept for history only.
	PromotionArchived PromotionStatus = "archived"
)

// allowedTransitions encodes the lifecycle. Recalculation is a
// calculated → calculated step, so it stays allowed until publication
// freezes the results.
var allowedTransitions = map[PromotionStatus][]PromotionStatus{
	PromotionDraft:      {PromotionActive, PromotionArchived},
	PromotionActive:     {PromotionCalculated, PromotionArchived},
	PromotionCalculated: {PromotionCalculated, PromotionPublished, PromotionArchived},
	PromotionPublished:  {PromotionArchived},
	PromotionArchived:   {},
}

// CanTransition reports whether a promotion may move from one status to
// another.
func CanTransition(from, to PromotionStatus) bool {
	for _, allowed := range allowedTransitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}

// IsEditable reports whether a promotion's terms may still change.
// Once results are published they are frozen, and an archived promotion
// is history.
func (s PromotionStatus) IsEditable() bool {
	return s == PromotionDraft || s == PromotionActive
}

// DealerSnapshot is what eligibility is judged on, as of calculation time.
type DealerSnapshot struct {
	ID       int64
	CityID   int64
	GradeID  *int64
	IsActive bool
	// Sum of all purchases ever — the figure thresholds and grades use.
	LifetimePurchaseTotal int64
}

// PromotionConditions are a promotion's eligibility filters; a nil field
// means "no restriction".
type PromotionConditions struct {
	CityID  *int64
	GradeID *int64
	// Minimum lifetime purchase total, in dirams (e.g. the car promotion's
	// 3 000 000 somoni).
	MinLifetimeThreshold *int64
}

// IsEligible reports whether a dealer takes part in a promotion (ToR 4.1):
// they must be active, match the city and grade filters when those are
// set, and have reached the lifetime threshold when one is set.
func IsEligible(dealer DealerSnapshot, conditions PromotionConditions) bool {
	if !dealer.IsActive {
		return false
	}
	if conditions.CityID != nil && dealer.CityID != *conditions.CityID {
		return false
	}
	if conditions.GradeID != nil {
		if dealer.GradeID == nil || *dealer.GradeID != *conditions.GradeID {
			return false
		}
	}
	if conditions.MinLifetimeThreshold != nil &&
		dealer.LifetimePurchaseTotal < *conditions.MinLifetimeThreshold {
		return false
	}
	return true
}

// Participant is an eligible dealer with the figures the ranking needs:
// their total inside the promotion period and when they reached it.
type Participant struct {
	DealerID int64
	// Sum of purchases dated inside [start; end] of the promotion.
	PeriodTotal int64
	// Date of the latest purchase counted in PeriodTotal — the moment the
	// dealer reached that sum. Zero when they bought nothing in the period.
	LastPurchaseDate time.Time
	// Creation time of that purchase, used when two dealers reached the
	// same sum on the same day.
	LastPurchaseCreatedAt time.Time
}

// RankedParticipant is a participant with the place they took.
type RankedParticipant struct {
	Participant
	Place int
}

// RankParticipants orders participants by the rules in ToR 4.3–4.4: the
// biggest period total wins, and when totals are equal the dealer who
// reached that sum earlier ranks higher (by the date of their last
// counted purchase, then by when it was recorded). A smaller dealer id —
// meaning an earlier registration — breaks a full tie.
//
// Places are consecutive and unique: prizes are attached to distinct
// places, so the tie-break exists precisely to avoid shared ones.
func RankParticipants(participants []Participant) []RankedParticipant {
	ordered := make([]Participant, len(participants))
	copy(ordered, participants)

	sort.SliceStable(ordered, func(i, j int) bool {
		a, b := ordered[i], ordered[j]

		if a.PeriodTotal != b.PeriodTotal {
			return a.PeriodTotal > b.PeriodTotal
		}
		if !a.LastPurchaseDate.Equal(b.LastPurchaseDate) {
			return a.LastPurchaseDate.Before(b.LastPurchaseDate)
		}
		if !a.LastPurchaseCreatedAt.Equal(b.LastPurchaseCreatedAt) {
			return a.LastPurchaseCreatedAt.Before(b.LastPurchaseCreatedAt)
		}
		return a.DealerID < b.DealerID
	})

	ranked := make([]RankedParticipant, len(ordered))
	for i, participant := range ordered {
		ranked[i] = RankedParticipant{Participant: participant, Place: i + 1}
	}
	return ranked
}

// AllPromotionStatuses lists the statuses in lifecycle order, for the tabs
// above the promotions list.
func AllPromotionStatuses() []PromotionStatus {
	return []PromotionStatus{
		PromotionDraft,
		PromotionActive,
		PromotionCalculated,
		PromotionPublished,
		PromotionArchived,
	}
}
