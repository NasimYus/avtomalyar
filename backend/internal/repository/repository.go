// Package repository wraps sqlc-generated queries with a pgx connection
// pool and transaction helpers.
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/avtomalyar/backend/internal/repository/db"
)

// Repository bundles a connection pool with the generated query methods
// running against it directly (outside a transaction).
type Repository struct {
	*db.Queries
	pool *pgxpool.Pool
}

// New connects to Postgres and returns a ready-to-use Repository.
func New(ctx context.Context, databaseURL string) (*Repository, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &Repository{
		Queries: db.New(pool),
		pool:    pool,
	}, nil
}

// Close releases all pooled connections.
func (r *Repository) Close() {
	r.pool.Close()
}

// WithTx runs fn inside a database transaction, committing on success and
// rolling back if fn returns an error or panics.
func (r *Repository) WithTx(ctx context.Context, fn func(q *db.Queries) error) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := fn(r.Queries.WithTx(tx)); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}
