export type ReviewQuality = 'hard' | 'good' | 'easy';

export interface SM2State {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export function qualityToNumber(quality: ReviewQuality): number {
  if (quality === 'hard') return 2;
  if (quality === 'good') return 4;
  return 5;
}

export function nextSM2State(
  state: SM2State,
  quality: ReviewQuality
): SM2State & { nextReview: Date } {
  const q = qualityToNumber(quality);
  let { easeFactor, interval, repetitions } = state;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReview };
}
