-- name: GetDealerProfile :one
-- Everything the cabinet's header needs in one row: the dealer plus the
-- names their ids stand for.
SELECT
    d.id,
    d.full_name,
    d.phone,
    d.login,
    d.is_active,
    d.lifetime_purchase_total,
    d.city_id,
    c.name_ru AS city_name_ru,
    c.name_tg AS city_name_tg,
    d.grade_id,
    g.name_ru AS grade_name_ru,
    g.name_tg AS grade_name_tg,
    g.min_purchase_amount AS grade_min_purchase_amount
FROM dealers d
JOIN cities c ON c.id = d.city_id
LEFT JOIN grades g ON g.id = d.grade_id
WHERE d.id = $1;

-- name: ListDealerPromotions :many
-- Promotions a dealer may see: the ones running now, the ones whose
-- results are being reviewed, the published ones, and archived ones that
-- were published before being filed away — the cabinet's archive (ToR 6).
-- An archived promotion that never published results was called off, so
-- it stays out. Drafts are invisible in any case.
--
-- Whether the dealer actually takes part is decided by domain.IsEligible,
-- not here, so the rule has a single tested implementation.
SELECT * FROM promotions
WHERE status IN ('active', 'calculated', 'published')
   OR (status = 'archived' AND published_at IS NOT NULL)
ORDER BY end_date DESC, id DESC;
