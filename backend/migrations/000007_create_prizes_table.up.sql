CREATE TABLE prizes (
    id              BIGSERIAL PRIMARY KEY,
    name_ru         TEXT NOT NULL,
    name_tg         TEXT NOT NULL,
    description_ru  TEXT,
    description_tg  TEXT,
    photo_path      TEXT,
    stock_quantity  INT CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER prizes_set_updated_at
    BEFORE UPDATE ON prizes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
