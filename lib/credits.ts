import { getSupabase } from './supabase';

export const FREE_DAILY_CREDITS = 20;

export async function checkAndDeductCredit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  message?: string;
}> {
  if (userId === 'anonymous') {
    return { allowed: true, remaining: FREE_DAILY_CREDITS };
  }

  const supabase = getSupabase();
  const { data: user, error } = await supabase
    .from('users')
    .select('daily_credits, credits_reset_at, is_pro')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return { allowed: true, remaining: FREE_DAILY_CREDITS };
  }

  if (user.is_pro) {
    return { allowed: true, remaining: 999999 };
  }

  // Check if credits need resetting (24 hours passed)
  const resetAt = new Date(user.credits_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    // Reset credits
    await supabase
      .from('users')
      .update({
        daily_credits: FREE_DAILY_CREDITS - 1,
        credits_reset_at: now.toISOString(),
      })
      .eq('id', userId);

    return { allowed: true, remaining: FREE_DAILY_CREDITS - 1 };
  }

  if (user.daily_credits <= 0) {
    const hoursUntilReset = Math.ceil(24 - hoursSinceReset);
    return {
      allowed: false,
      remaining: 0,
      message: `You've used all your free requests for today. Your credits reset in ${hoursUntilReset} hour${hoursUntilReset === 1 ? '' : 's'}. Add your own API key in Settings for unlimited access.`,
    };
  }

  // Deduct one credit
  await supabase
    .from('users')
    .update({ daily_credits: user.daily_credits - 1 })
    .eq('id', userId);

  return { allowed: true, remaining: user.daily_credits - 1 };
}

export async function getRemainingCredits(userId: string): Promise<number> {
  if (userId === 'anonymous') return FREE_DAILY_CREDITS;

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from('users')
    .select('daily_credits, credits_reset_at, is_pro')
    .eq('id', userId)
    .single();

  if (!user) return FREE_DAILY_CREDITS;
  if (user.is_pro) return 999999;

  const resetAt = new Date(user.credits_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) return FREE_DAILY_CREDITS;
  return user.daily_credits;
}

export async function getCreditStatus(userId: string): Promise<{
  credits: number;
  is_pro: boolean;
}> {
  if (userId === 'anonymous') {
    return { credits: FREE_DAILY_CREDITS, is_pro: false };
  }

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from('users')
    .select('daily_credits, credits_reset_at, is_pro')
    .eq('id', userId)
    .single();

  if (!user) return { credits: FREE_DAILY_CREDITS, is_pro: false };
  if (user.is_pro) return { credits: 999999, is_pro: true };

  const resetAt = new Date(user.credits_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  return {
    credits: hoursSinceReset >= 24 ? FREE_DAILY_CREDITS : user.daily_credits,
    is_pro: false,
  };
}
