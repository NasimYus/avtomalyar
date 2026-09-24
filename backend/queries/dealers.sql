-- name: GetDealerByLogin :one
SELECT * FROM dealers WHERE login = $1;

-- name: GetDealerByID :one
SELECT * FROM dealers WHERE id = $1;
