export type UsageTier = 'free' | 'basic' | 'plus' | 'pro';

export type TierLimit = {
  monthlyInteractions: number;
  ipSlidingWindow: {
    maxRequests: number;
    windowSeconds: number;
  };
};

export const AI_USAGE_LIMITS: Record<UsageTier, TierLimit> = {
  free: {
    monthlyInteractions: 20,
    ipSlidingWindow: {
      maxRequests: 10,
      windowSeconds: 60,
    },
  },
  basic: {
    monthlyInteractions: 120,
    ipSlidingWindow: {
      maxRequests: 30,
      windowSeconds: 60,
    },
  },
  plus: {
    monthlyInteractions: 450,
    ipSlidingWindow: {
      maxRequests: 60,
      windowSeconds: 60,
    },
  },
  pro: {
    monthlyInteractions: 1500,
    ipSlidingWindow: {
      maxRequests: 120,
      windowSeconds: 60,
    },
  },
};

export const DEFAULT_USAGE_TIER: UsageTier = 'free';

export function normalizeUsageTier(value: unknown): UsageTier {
  return value === 'basic' || value === 'plus' || value === 'pro' ? value : 'free';
}
