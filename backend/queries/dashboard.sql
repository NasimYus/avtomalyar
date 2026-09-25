-- name: DashboardTotals :one
SELECT
    (SELECT count(*) FROM dealers)::bigint AS dealers_total,
    (SELECT count(*) FROM dealers WHERE dealers.is_active)::bigint AS dealers_active,
    (
        SELECT COALESCE(SUM(purchases.amount), 0) FROM purchases
        WHERE purchases.purchase_date >= sqlc.arg('date_from')::date
          AND purchases.purchase_date <= sqlc.arg('date_to')::date
    )::bigint AS period_amount,
    (
        SELECT count(*) FROM purchases
        WHERE purchases.purchase_date >= sqlc.arg('date_from')::date
          AND purchases.purchase_date <= sqlc.arg('date_to')::date
    )::bigint AS period_count,
    (SELECT COALESCE(SUM(dealers.lifetime_purchase_total), 0) FROM dealers)::bigint AS lifetime_total;

-- name: DealerCountsByGrade :many
SELECT
    g.id,
    g.name_ru,
    g.name_tg,
    g.min_purchase_amount,
    count(d.id)::bigint AS dealers_count
FROM grades g
LEFT JOIN dealers d ON d.grade_id = g.id
GROUP BY g.id
ORDER BY g.min_purchase_amount;
