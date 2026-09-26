-- name: ListPromotions :many
SELECT * FROM promotions
WHERE (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
ORDER BY start_date DESC, id DESC;

-- name: CountPromotionsByStatus :many
SELECT status, count(*)::bigint AS total FROM promotions GROUP BY status;

-- name: GetPromotionByID :one
SELECT * FROM promotions WHERE id = $1;

-- name: CreatePromotion :one
INSERT INTO promotions (
    title_ru, title_tg, description_ru, description_tg,
    start_date, end_date, city_id, grade_id, min_lifetime_purchase_threshold
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdatePromotion :one
UPDATE promotions
SET title_ru = $2,
    title_tg = $3,
    description_ru = $4,
    description_tg = $5,
    start_date = $6,
    end_date = $7,
    city_id = $8,
    grade_id = $9,
    min_lifetime_purchase_threshold = $10
WHERE id = $1
RETURNING *;

-- name: SetPromotionStatus :one
UPDATE promotions
SET status = $2,
    calculated_at = CASE WHEN $2 = 'calculated' THEN now() ELSE calculated_at END,
    published_at = CASE WHEN $2 = 'published' THEN now() ELSE published_at END
WHERE id = $1
RETURNING *;

-- name: DeletePromotion :execrows
DELETE FROM promotions WHERE id = $1;

-- name: ListPrizePlaces :many
SELECT pp.*, pr.name_ru AS prize_name_ru, pr.name_tg AS prize_name_tg, pr.photo_path AS prize_photo_path
FROM promotion_prize_places pp
JOIN prizes pr ON pr.id = pp.prize_id
WHERE pp.promotion_id = $1
ORDER BY pp.place_rank;

-- name: DeletePrizePlaces :exec
DELETE FROM promotion_prize_places WHERE promotion_id = $1;

-- name: CreatePrizePlace :one
INSERT INTO promotion_prize_places (promotion_id, place_rank, prize_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListActiveDealersWithPeriodTotals :many
-- Period totals for every active dealer, including those who bought
-- nothing in the window (they still take part, with a total of 0).
-- Eligibility filters are deliberately left to domain.IsEligible so the
-- rule has a single, tested implementation; the dealer count is in the
-- hundreds, so loading them all is fine.
SELECT
    d.id AS dealer_id,
    d.full_name AS dealer_name,
    d.city_id,
    d.grade_id,
    d.lifetime_purchase_total,
    COALESCE(SUM(p.amount), 0)::bigint AS period_total,
    MAX(p.purchase_date)::date AS last_purchase_date,
    MAX(p.created_at)::timestamptz AS last_purchase_created_at
FROM dealers d
LEFT JOIN purchases p
    ON p.dealer_id = d.id
   AND p.purchase_date >= sqlc.arg('date_from')::date
   AND p.purchase_date <= sqlc.arg('date_to')::date
WHERE d.is_active
GROUP BY d.id;

-- name: DeletePromotionResults :exec
DELETE FROM promotion_results WHERE promotion_id = $1;

-- name: CreatePromotionResult :exec
INSERT INTO promotion_results (promotion_id, dealer_id, period_total, place_rank, prize_id)
VALUES ($1, $2, $3, $4, $5);

-- name: ListPromotionResults :many
SELECT
    r.*,
    d.full_name AS dealer_name,
    d.city_id AS dealer_city_id,
    c.name_ru AS dealer_city_ru,
    c.name_tg AS dealer_city_tg,
    pr.name_ru AS prize_name_ru,
    pr.name_tg AS prize_name_tg
FROM promotion_results r
JOIN dealers d ON d.id = r.dealer_id
JOIN cities c ON c.id = d.city_id
LEFT JOIN prizes pr ON pr.id = r.prize_id
WHERE r.promotion_id = $1
ORDER BY r.place_rank NULLS LAST, r.period_total DESC, r.dealer_id;

-- name: GetPromotionResult :one
SELECT * FROM promotion_results WHERE promotion_id = $1 AND dealer_id = $2;

-- name: UpdatePromotionResult :one
-- Manual correction before publication: an admin can move a dealer off a
-- prize place or swap the prize; the row is flagged so the change is
-- visible afterwards.
UPDATE promotion_results
SET place_rank = $3,
    prize_id = $4,
    awarded = $5,
    is_manually_adjusted = true
WHERE promotion_id = $1 AND dealer_id = $2
RETURNING *;

-- name: SetPromotionResultAwarded :one
-- Marks a prize as actually handed over (ToR 3.8). Kept apart from
-- UpdatePromotionResult because this is not a correction of the ranking:
-- it touches neither the place nor the prize, and leaves the
-- is_manually_adjusted flag alone.
UPDATE promotion_results
SET awarded = $3
WHERE promotion_id = $1 AND dealer_id = $2
RETURNING *;

-- name: CountResultsByPromotion :many
-- How many participants each promotion's stored results hold. For a
-- promotion already calculated this is the participant count, fixed at
-- the moment of calculation.
SELECT promotion_id, count(*)::bigint AS total
FROM promotion_results
GROUP BY promotion_id;
