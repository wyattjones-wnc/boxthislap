ALTER TABLE f1_session_results ADD COLUMN qualifying_unadjusted_seconds REAL;
ALTER TABLE f1_session_results ADD COLUMN qualifying_adjusted_seconds REAL;
ALTER TABLE f1_session_results ADD COLUMN qualifying_adjusted_session TEXT NOT NULL DEFAULT '';
