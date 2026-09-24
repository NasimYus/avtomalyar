-- name: GetAdminByLogin :one
SELECT * FROM admins WHERE login = $1;

-- name: GetAdminByID :one
SELECT * FROM admins WHERE id = $1;

-- name: CountAdmins :one
SELECT count(*) FROM admins;

-- name: CreateAdmin :one
INSERT INTO admins (login, password_hash, name)
VALUES ($1, $2, $3)
RETURNING *;
