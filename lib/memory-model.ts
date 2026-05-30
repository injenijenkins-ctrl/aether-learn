export const TARGET_RECALL = 0.86;
export const FORGETTING_THRESHOLD = 0.6;

const MS_PER_DAY = 86_400_000;

export interface MemoryCardInput {
  easeFactor: number;
  interval: number;
  repetitions: number;
  lastReview?: string | null;
  nextReview?: string | null;
  createdAt?: string | null;
}

export interface MemoryEstimate {
  strength: number;
  stabilityDays: number;
  elapsedDays: number;
  optimalReviewAt: string;
  predictedForgetAt: string;
  overdue: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / MS_PER_DAY);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAnchorDate(card: MemoryCardInput, now: Date) {
  return safeDate(card.lastReview) || safeDate(card.createdAt) || now;
}

export function estimateStabilityDays(card: MemoryCardInput) {
  const scheduledInterval = Math.max(0, card.interval || 0);
  const ease = clamp(card.easeFactor || 2.5, 1.3, 3.2);
  const reps = Math.max(0, card.repetitions || 0);

  if (reps === 0 || scheduledInterval === 0) {
    return clamp(0.35 * (ease / 2.5), 0.18, 0.65);
  }

  const intervalDerived = scheduledInterval / -Math.log(TARGET_RECALL);
  const repetitionLift = 1 + Math.log1p(reps) * 0.08;
  const easeLift = clamp(ease / 2.5, 0.65, 1.35);

  return clamp(intervalDerived * repetitionLift * easeLift, 0.35, 365);
}

export function estimateMemory(card: MemoryCardInput, at = new Date()): MemoryEstimate {
  const anchor = getAnchorDate(card, at);
  const stabilityDays = estimateStabilityDays(card);
  const elapsedDays = daysBetween(anchor, at);
  const strength = clamp(Math.exp(-elapsedDays / stabilityDays), 0, 1);
  const optimalReviewAt = addDays(anchor, stabilityDays * -Math.log(TARGET_RECALL));
  const predictedForgetAt = addDays(anchor, stabilityDays * -Math.log(FORGETTING_THRESHOLD));

  return {
    strength,
    stabilityDays,
    elapsedDays,
    optimalReviewAt: optimalReviewAt.toISOString(),
    predictedForgetAt: predictedForgetAt.toISOString(),
    overdue: at > optimalReviewAt,
  };
}

export function buildMemoryCurve(card: MemoryCardInput, days = 21, from = new Date()) {
  const anchor = getAnchorDate(card, from);
  const stabilityDays = estimateStabilityDays(card);

  return Array.from({ length: days + 1 }, (_, day) => {
    const date = addDays(from, day);
    const elapsedDays = daysBetween(anchor, date);
    return {
      date: date.toISOString().slice(0, 10),
      day,
      strength: Math.round(clamp(Math.exp(-elapsedDays / stabilityDays), 0, 1) * 100),
    };
  });
}

export function qualityTargetRecall(quality: 'hard' | 'good' | 'easy') {
  if (quality === 'hard') return 0.92;
  if (quality === 'easy') return 0.82;
  return TARGET_RECALL;
}

export function optimalReviewDateAfterReview(
  card: Pick<MemoryCardInput, 'easeFactor' | 'interval' | 'repetitions'>,
  quality: 'hard' | 'good' | 'easy',
  from = new Date()
) {
  const stabilityDays = estimateStabilityDays({
    ...card,
    lastReview: from.toISOString(),
  });
  return addDays(from, stabilityDays * -Math.log(qualityTargetRecall(quality)));
}
