-- Extends user_concept_mastery with the fields lib/sm2.ts and
-- lib/memory-model.ts already expect (ease_factor, interval, repetitions —
-- same shape as the existing flashcard_reviews table), so concept mastery
-- reuses the app's existing forgetting-curve model instead of a new,
-- separate scoring formula:
--
--   mastery_score  = round(estimateMemory({easeFactor, interval,
--                    repetitions, lastReview}).strength * 100)
--   next_review_due = optimalReviewDateAfterReview(...)
--
-- mastery_score itself stays as-is from the previous migration (0-100,
-- used directly by the adaptive orchestrator's advance/reinforce/reteach
-- thresholds) — this just adds the underlying state it's now derived
-- from, so a mastery read days after the last review honestly reflects
-- decay instead of staying frozen at whatever it was last set to.

ALTER TABLE user_concept_mastery
  ADD COLUMN IF NOT EXISTS ease_factor REAL NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetitions INTEGER NOT NULL DEFAULT 0;
