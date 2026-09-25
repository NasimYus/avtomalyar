package service

import "github.com/jackc/pgx/v5/pgtype"

// Conversions between optional Go values and the nullable column types
// sqlc generates. Shared by every service, so they live on their own
// rather than in whichever one happened to need them first.

func textOrNull(v *string) pgtype.Text {
	if v == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *v, Valid: true}
}

func int4OrNull(v *int32) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: *v, Valid: true}
}

func int8OrNull(v *int64) pgtype.Int8 {
	if v == nil {
		return pgtype.Int8{}
	}
	return pgtype.Int8{Int64: *v, Valid: true}
}

// int8ToPtr is the reverse: a nullable column as an optional value the
// domain rules can read.
func int8ToPtr(v pgtype.Int8) *int64 {
	if !v.Valid {
		return nil
	}
	value := v.Int64
	return &value
}
