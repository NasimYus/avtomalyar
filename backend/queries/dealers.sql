-- name: GetDealerByLogin :one
SELECT * FROM dealers WHERE login = $1;

-- name: GetDealerByID :one
SELECT * FROM dealers WHERE id = $1;

-- name: ListDealers :many
SELECT * FROM dealers
WHERE (sqlc.narg('city_id')::bigint IS NULL OR city_id = sqlc.narg('city_id'))
  AND (sqlc.narg('grade_id')::bigint IS NULL OR grade_id = sqlc.narg('grade_id'))
  AND (sqlc.narg('is_active')::boolean IS NULL OR is_active = sqlc.narg('is_active'))
  AND (
    sqlc.narg('query')::text IS NULL
    OR full_name ILIKE '%' || sqlc.narg('query')::text || '%'
    OR phone ILIKE '%' || sqlc.narg('query')::text || '%'
    OR login ILIKE '%' || sqlc.narg('query')::text || '%'
  )
ORDER BY full_name
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: CountDealers :one
SELECT count(*) FROM dealers
WHERE (sqlc.narg('city_id')::bigint IS NULL OR city_id = sqlc.narg('city_id'))
  AND (sqlc.narg('grade_id')::bigint IS NULL OR grade_id = sqlc.narg('grade_id'))
  AND (sqlc.narg('is_active')::boolean IS NULL OR is_active = sqlc.narg('is_active'))
  AND (
    sqlc.narg('query')::text IS NULL
    OR full_name ILIKE '%' || sqlc.narg('query')::text || '%'
    OR phone ILIKE '%' || sqlc.narg('query')::text || '%'
    OR login ILIKE '%' || sqlc.narg('query')::text || '%'
  );

-- name: CreateDealer :one
INSERT INTO dealers (full_name, phone, city_id, login, password_hash)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateDealer :one
UPDATE dealers
SET full_name = $2, phone = $3, city_id = $4
WHERE id = $1
RETURNING *;

-- name: SetDealerActive :one
UPDATE dealers
SET is_active = $2
WHERE id = $1
RETURNING *;

-- name: SetDealerPasswordHash :exec
UPDATE dealers SET password_hash = $2 WHERE id = $1;

-- name: SetDealerGrade :exec
UPDATE dealers SET grade_id = $2 WHERE id = $1;
