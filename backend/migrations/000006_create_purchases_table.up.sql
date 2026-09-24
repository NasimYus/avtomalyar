CREATE TABLE purchases (
    id            BIGSERIAL PRIMARY KEY,
    dealer_id     BIGINT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
    amount        BIGINT NOT NULL CHECK (amount > 0),
    purchase_date DATE NOT NULL,
    comment       TEXT,
    created_by    BIGINT NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX purchases_dealer_id_purchase_date_idx ON purchases (dealer_id, purchase_date);

CREATE TRIGGER purchases_set_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
