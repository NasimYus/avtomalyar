CREATE TABLE grades (
    id                  BIGSERIAL PRIMARY KEY,
    name_ru             TEXT NOT NULL,
    name_tg             TEXT NOT NULL,
    min_purchase_amount BIGINT NOT NULL UNIQUE CHECK (min_purchase_amount >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER grades_set_updated_at
    BEFORE UPDATE ON grades
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
