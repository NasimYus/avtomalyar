-- name: ListPrizes :many
SELECT * FROM prizes ORDER BY name_ru;

-- name: GetPrizeByID :one
SELECT * FROM prizes WHERE id = $1;

-- name: CreatePrize :one
INSERT INTO prizes (name_ru, name_tg, description_ru, description_tg, stock_quantity)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdatePrize :one
UPDATE prizes
SET name_ru = $2, name_tg = $3, description_ru = $4, description_tg = $5, stock_quantity = $6
WHERE id = $1
RETURNING *;

-- name: UpdatePrizePhoto :one
UPDATE prizes
SET photo_path = $2
WHERE id = $1
RETURNING *;

-- name: DeletePrize :execrows
DELETE FROM prizes WHERE id = $1;
