CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_no_overlap_per_dentist;

ALTER TABLE appointments
ADD CONSTRAINT appointments_no_overlap_per_dentist
EXCLUDE USING gist (
  "dentistId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE (status IN ('CONFIRMED', 'COMPLETED'));