import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getUserId, ANONYMOUS_USER_ID } from './session';
import { getSupabase } from './supabase';
import {
  AI_USAGE_LIMITS,
  DEFAULT_USAGE_TIER,
  normalizeUsageTier,
  type UsageTier,
} from './ai-usage-config';

export const USAGE_LIMIT_REACHED = 'USAGE_LIMIT_REACHED';
export const IP_RATE_LIMIT_REACHED = 'IP_RATE_LIMIT_REACHED';

export type UsageAllowance = {
  allowed: boolean;
  status: number;
  code?: typeof USAGE_LIMIT_REACHED | typeof IP_RATE_LIMIT_REACHED;
  message?: string;
  userId: string;
  tier: UsageTier;
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
};

type ConsumeUsageRow = {
  allowed: boolean;
  interactions_used: number;
  remaining: number;
  tier: UsageTier;
  period_start: string;
  period_end: string;
};

type IpRateLimitRow = {
  allowed: boolean;
  remaining: number;
};

function currentMonthlyPeriod(now = new Date()) {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwarded ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  );
}

function hashIp(ip: string) {
  const salt = process.env.IP_RATE_LIMIT_SALT || 'aetherlearn-local-rate-limit';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

async function getUserTier(userId: string): Promise<UsageTier> {
  if (userId === ANONYMOUS_USER_ID) return DEFAULT_USAGE_TIER;

  const { data, error } = await getSupabase()
    .from('users')
    .select('ai_tier, is_pro')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_USAGE_TIER;
  // NOTE: ai_tier is NOT NULL DEFAULT 'free' in the schema, so it is never
  // falsy — a `!data.ai_tier` check here would never fire even for legacy
  // is_pro users whose ai_tier was never explicitly upgraded. Treat
  // is_pro=true as at minimum 'pro' unless ai_tier says otherwise.
  if (data.is_pro && data.ai_tier === 'free') return 'pro';
  return normalizeUsageTier(data.ai_tier);
}

/**
 * Read-only status check — does NOT consume a usage unit. Use this for
 * displaying remaining quota in the UI; use enforceAIUsageLimit for the
 * actual gate in front of an AI call.
 */
export async function getUsageStatus(userId: string): Promise<{
  tier: UsageTier;
  limit: number;
  used: number;
  remaining: number;
}> {
  const tier = await getUserTier(userId);
  const tierLimit = AI_USAGE_LIMITS[tier];
  const { periodStart } = currentMonthlyPeriod();

  if (userId === ANONYMOUS_USER_ID) {
    return { tier, limit: tierLimit.monthlyInteractions, used: 0, remaining: tierLimit.monthlyInteractions };
  }

  const { data } = await getSupabase()
    .from('usage_counters')
    .select('interactions_used')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .maybeSingle();

  const used = data?.interactions_used ?? 0;
  return {
    tier,
    limit: tierLimit.monthlyInteractions,
    used,
    remaining: Math.max(0, tierLimit.monthlyInteractions - used),
  };
}

async function enforceIpRateLimit(request: Request, tier: UsageTier): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const config = AI_USAGE_LIMITS[tier].ipSlidingWindow;
  const { data, error } = await getSupabase().rpc('consume_ip_rate_limit', {
    ip_hash: hashIp(getClientIp(request)),
    max_requests: config.maxRequests,
    window_seconds: config.windowSeconds,
  });

  if (error) throw new Error(`Failed to enforce IP rate limit: ${error.message}`);
  const row = ((data || []) as IpRateLimitRow[])[0];
  return {
    allowed: row?.allowed ?? false,
    remaining: row?.remaining ?? 0,
  };
}

export async function enforceAIUsageLimit(request: Request): Promise<UsageAllowance> {
  const userId = await getUserId();
  return enforceAIUsageLimitForUser(request, userId);
}

/**
 * Same enforcement as enforceAIUsageLimit, but against an explicitly
 * supplied user id rather than the current session's user. Needed for
 * group study rooms, where usage is drawn from the room host's plan
 * regardless of which member actually sent the message — IP abuse
 * protection still keys off the real request, but the tier/quota check
 * is against targetUserId.
 */
export async function enforceAIUsageLimitForUser(
  request: Request,
  targetUserId: string
): Promise<UsageAllowance> {
  const userId = targetUserId;
  const tier = await getUserTier(userId);
  const tierLimit = AI_USAGE_LIMITS[tier];
  const { periodStart, periodEnd } = currentMonthlyPeriod();

  if (userId === ANONYMOUS_USER_ID || tier === 'free') {
    const ipAllowance = await enforceIpRateLimit(request, tier);
    if (!ipAllowance.allowed) {
      return {
        allowed: false,
        status: 429,
        code: IP_RATE_LIMIT_REACHED,
        message: 'Too many AI requests from this network. Please wait and try again.',
        userId,
        tier,
        limit: tierLimit.monthlyInteractions,
        used: 0,
        remaining: 0,
        periodStart,
        periodEnd,
      };
    }
  }

  const { data, error } = await getSupabase().rpc('consume_ai_interaction', {
    counter_user_id: userId,
    counter_tier: tier,
    counter_period_start: periodStart,
    counter_period_end: periodEnd,
    tier_cap: tierLimit.monthlyInteractions,
  });

  if (error) throw new Error(`Failed to update usage counter: ${error.message}`);

  const row = ((data || []) as ConsumeUsageRow[])[0];
  if (!row) {
    throw new Error('Usage counter did not return a result');
  }

  return {
    allowed: row.allowed,
    status: row.allowed ? 200 : 429,
    code: row.allowed ? undefined : USAGE_LIMIT_REACHED,
    message: row.allowed
      ? undefined
      : `Monthly AI interaction limit reached for your ${tier} plan.`,
    userId,
    tier,
    limit: tierLimit.monthlyInteractions,
    used: row.interactions_used,
    remaining: Math.max(0, row.remaining),
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

export function usageHeaders(allowance: UsageAllowance): HeadersInit {
  return {
    'X-AI-Quota-Limit': String(allowance.limit),
    'X-AI-Quota-Used': String(allowance.used),
    'X-AI-Quota-Remaining': String(allowance.remaining),
    'X-AI-Quota-Tier': allowance.tier,
    'X-AI-Quota-Period-Start': allowance.periodStart,
    'X-AI-Quota-Period-End': allowance.periodEnd,
  };
}

export function usageLimitResponse(allowance: UsageAllowance) {
  return NextResponse.json(
    {
      error: allowance.message || 'AI usage limit reached',
      code: allowance.code || USAGE_LIMIT_REACHED,
      remaining: allowance.remaining,
      tier: allowance.tier,
    },
    {
      status: allowance.status,
      headers: usageHeaders(allowance),
    }
  );
}

export function withUsageHeaders<T extends Response>(response: T, allowance: UsageAllowance): T {
  for (const [key, value] of Object.entries(usageHeaders(allowance))) {
    response.headers.set(key, String(value));
  }
  return response;
}
