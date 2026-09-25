package domain

import "time"

// BusinessLocation is the shop's timezone (ToR 3.6). Calendar rules —
// "a purchase date can't be in the future", "this month" on the
// dashboard — are judged here, not in the server's local time.
var BusinessLocation = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Dushanbe")
	if err != nil {
		return time.UTC
	}
	return loc
}()

// Today returns the current date in the shop's timezone, truncated to
// midnight.
func Today() time.Time {
	now := time.Now().In(BusinessLocation)
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, BusinessLocation)
}
