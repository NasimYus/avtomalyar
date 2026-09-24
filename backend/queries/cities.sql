-- name: ListCities :many
SELECT * FROM cities ORDER BY name_ru;

-- name: GetCityByID :one
SELECT * FROM cities WHERE id = $1;

-- name: CreateCity :one
INSERT INTO cities (name_ru, name_tg)
VALUES ($1, $2)
RETURNING *;

-- name: UpdateCity :one
UPDATE cities
SET name_ru = $2, name_tg = $3
WHERE id = $1
RETURNING *;

-- name: DeleteCity :execrows
DELETE FROM cities WHERE id = $1;
