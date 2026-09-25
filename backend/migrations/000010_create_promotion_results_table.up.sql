-- A calculated ranking, frozen at calculation time. Rows are rewritten on
-- recalculation and become immutable once the promotion is published.
CREATE TABLE promotion_results (
    id                   BIGSERIAL PRIMARY KEY,
    promotion_id         BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    dealer_id            BIGINT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
    -- Sum of the dealer's purchases inside the promotion period.
    period_total         BIGINT NOT NULL DEFAULT 0,
    -- Position in the ranking; NULL once an admin removes a dealer from
    -- the prize places by hand.
    place_rank           INT CHECK (place_rank IS NULL OR place_rank > 0),
    prize_id             BIGINT REFERENCES prizes(id) ON DELETE RESTRICT,
    is_manually_adjusted BOOLEAN NOT NULL DEFAULT false,
    awarded              BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (promotion_id, dealer_id)
);

CREATE INDEX promotion_results_promotion_id_place_idx
    ON promotion_results (promotion_id, place_rank);

CREATE TRIGGER promotion_results_set_updated_at
    BEFORE UPDATE ON promotion_results
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
