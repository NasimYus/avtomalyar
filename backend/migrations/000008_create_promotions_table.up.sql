-- Lifecycle per ToR 3.4: draft → active → calculated → published → archived.
CREATE TABLE promotions (
    id                             BIGSERIAL PRIMARY KEY,
    title_ru                       TEXT NOT NULL,
    title_tg                       TEXT NOT NULL,
    description_ru                 TEXT,
    description_tg                 TEXT,
    start_date                     DATE NOT NULL,
    end_date                       DATE NOT NULL,
    -- Optional eligibility filters; NULL means "no restriction".
    city_id                        BIGINT REFERENCES cities(id) ON DELETE RESTRICT,
    grade_id                       BIGINT REFERENCES grades(id) ON DELETE RESTRICT,
    min_lifetime_purchase_threshold BIGINT CHECK (
        min_lifetime_purchase_threshold IS NULL OR min_lifetime_purchase_threshold >= 0
    ),
    status                         TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'calculated', 'published', 'archived')),
    -- When the ranking was last computed; cleared by a recalculation.
    calculated_at                  TIMESTAMPTZ,
    published_at                   TIMESTAMPTZ,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT promotions_period_valid CHECK (end_date >= start_date)
);

CREATE INDEX promotions_status_idx ON promotions (status);

CREATE TRIGGER promotions_set_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
