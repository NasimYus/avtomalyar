CREATE TABLE dealers (
    id                      BIGSERIAL PRIMARY KEY,
    full_name               TEXT NOT NULL,
    phone                   TEXT NOT NULL,
    city_id                 BIGINT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    grade_id                BIGINT REFERENCES grades(id) ON DELETE SET NULL,
    lifetime_purchase_total BIGINT NOT NULL DEFAULT 0,
    login                   TEXT NOT NULL UNIQUE,
    password_hash           TEXT NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX dealers_city_id_idx ON dealers (city_id);
CREATE INDEX dealers_grade_id_idx ON dealers (grade_id);

CREATE TRIGGER dealers_set_updated_at
    BEFORE UPDATE ON dealers
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
