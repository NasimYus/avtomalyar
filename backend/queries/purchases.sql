-- name: ListPurchases :many
SELECT * FROM purchases
WHERE (sqlc.narg('dealer_id')::bigint IS NULL OR dealer_id = sqlc.narg('dealer_id'))
  AND (sqlc.narg('date_from')::date IS NULL OR purchase_date >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::date IS NULL OR purchase_date <= sqlc.narg('date_to'))
ORDER BY purchase_date DESC, id DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: CountPurchases :one
SELECT count(*) FROM purchases
WHERE (sqlc.narg('dealer_id')::bigint IS NULL OR dealer_id = sqlc.narg('dealer_id'))
  AND (sqlc.narg('date_from')::date IS NULL OR purchase_date >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::date IS NULL OR purchase_date <= sqlc.narg('date_to'));

-- name: SumPurchases :one
SELECT COALESCE(SUM(amount), 0)::bigint FROM purchases
WHERE (sqlc.narg('dealer_id')::bigint IS NULL OR dealer_id = sqlc.narg('dealer_id'))
  AND (sqlc.narg('date_from')::date IS NULL OR purchase_date >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::date IS NULL OR purchase_date <= sqlc.narg('date_to'));

-- name: GetPurchaseByID :one
SELECT * FROM purchases WHERE id = $1;

-- name: CreatePurchase :one
INSERT INTO purchases (dealer_id, amount, purchase_date, comment, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdatePurchase :one
UPDATE purchases
SET dealer_id = $2, amount = $3, purchase_date = $4, comment = $5
WHERE id = $1
RETURNING *;

-- name: DeletePurchase :execrows
DELETE FROM purchases WHERE id = $1;

-- name: RecomputeDealerLifetimeTotal :exec
UPDATE dealers
SET lifetime_purchase_total = (
    SELECT COALESCE(SUM(amount), 0) FROM purchases WHERE dealer_id = $1
)
WHERE id = $1;
