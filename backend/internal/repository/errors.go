package repository

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/avtomalyar/backend/internal/domain"
)

// Postgres error codes this package translates into domain errors.
// See https://www.postgresql.org/docs/current/errcodes-appendix.html
const (
	pgErrUniqueViolation     = "23505"
	pgErrForeignKeyViolation = "23503"
)

// TranslateError converts pgx/pgconn errors that represent an expected,
// user-facing condition (not found, FK or unique conflict) into the
// matching domain sentinel error, wrapped so both errors.Is(err,
// domain.ErrConflict) and the original Postgres detail remain available.
// Other errors are returned unchanged.
func TranslateError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case pgErrUniqueViolation, pgErrForeignKeyViolation:
			return fmt.Errorf("%w: %s", domain.ErrConflict, pgErr.Message)
		}
	}

	return err
}
