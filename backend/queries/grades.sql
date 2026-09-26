-- name: ListGrades :many
SELECT * FROM grades ORDER BY min_purchase_amount;

-- name: GetGradeByID :one
SELECT * FROM grades WHERE id = $1;

-- name: CreateGrade :one
INSERT INTO grades (name_ru, name_tg, min_purchase_amount, color)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateGrade :one
UPDATE grades
SET name_ru = $2, name_tg = $3, min_purchase_amount = $4, color = $5
WHERE id = $1
RETURNING *;

-- name: DeleteGrade :execrows
DELETE FROM grades WHERE id = $1;

-- name: RecomputeAllDealerGrades :exec
UPDATE dealers d
SET grade_id = (
    SELECT g.id
    FROM grades g
    WHERE g.min_purchase_amount <= d.lifetime_purchase_total
    ORDER BY g.min_purchase_amount DESC
    LIMIT 1
)
WHERE d.grade_id IS DISTINCT FROM (
    SELECT g.id
    FROM grades g
    WHERE g.min_purchase_amount <= d.lifetime_purchase_total
    ORDER BY g.min_purchase_amount DESC
    LIMIT 1
);
