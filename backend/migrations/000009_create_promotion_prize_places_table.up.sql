-- "place → prize": one prize may be assigned to several places, and the
-- number of rows is the number of prize-winning places in a promotion.
CREATE TABLE promotion_prize_places (
    id           BIGSERIAL PRIMARY KEY,
    promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    place_rank   INT NOT NULL CHECK (place_rank > 0),
    prize_id     BIGINT NOT NULL REFERENCES prizes(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (promotion_id, place_rank)
);

CREATE INDEX promotion_prize_places_prize_id_idx ON promotion_prize_places (prize_id);

CREATE TRIGGER promotion_prize_places_set_updated_at
    BEFORE UPDATE ON promotion_prize_places
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
