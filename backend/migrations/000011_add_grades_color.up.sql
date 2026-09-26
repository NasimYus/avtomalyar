-- The material a grade is painted in (bronze, gold, emerald, …). NULL
-- means "automatic": the cabinet picks it from the grade's place in the
-- ladder, so a shop that never touches it still gets a sensible ladder of
-- any length. The list of materials lives in the API's validation, not
-- in a CHECK, so adding one does not need a migration.
ALTER TABLE grades ADD COLUMN color TEXT;
