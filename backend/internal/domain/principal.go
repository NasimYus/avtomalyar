package domain

// Role identifies which side of the system an authenticated principal
// belongs to. There is no "customer" role — see the project ToR.
type Role string

const (
	// RoleAdmin is a shop employee with full management access.
	RoleAdmin Role = "admin"
	// RoleDealer is a shop customer, restricted to their own data.
	RoleDealer Role = "dealer"
)

// Principal is the authenticated actor behind a request, decoded from the
// session JWT. Handlers must never trust a dealer_id supplied in a request
// body or query string — only the one carried here.
type Principal struct {
	ID   int64
	Role Role
	Name string
}
