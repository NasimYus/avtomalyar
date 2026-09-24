package domain

// Grade is a dealer tier with a name and the lifetime purchase threshold
// (in dirams) at which it is reached.
type Grade struct {
	ID                int64
	MinPurchaseAmount int64
}

// SelectGrade returns the id of the grade a dealer with the given lifetime
// purchase total (in dirams) qualifies for: the grade with the highest
// MinPurchaseAmount that is <= lifetimeTotal. It returns (0, false) if no
// grade applies (lifetimeTotal is below every grade's threshold, or there
// are no grades at all).
//
// This mirrors the bulk SQL recompute run against the whole dealers table
// (see queries/grades.sql, RecomputeAllDealerGrades) — kept here as a pure,
// independently-tested function per the ToR's emphasis on grade-assignment
// correctness, and reused wherever a single dealer's grade needs computing
// in Go (e.g. previewing progress toward the next grade).
func SelectGrade(grades []Grade, lifetimeTotal int64) (id int64, ok bool) {
	best := Grade{MinPurchaseAmount: -1}
	found := false

	for _, g := range grades {
		if g.MinPurchaseAmount <= lifetimeTotal && g.MinPurchaseAmount > best.MinPurchaseAmount {
			best = g
			found = true
		}
	}

	if !found {
		return 0, false
	}
	return best.ID, true
}
