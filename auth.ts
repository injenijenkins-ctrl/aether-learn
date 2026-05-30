import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { upsertUser } from '@/lib/db';

function getAuthSecret(): string | undefined {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === 'production' ? undefined : 'aetherlearn-local-development-secret')
  );
}

const secret = getAuthSecret();

if (!secret && process.env.NODE_ENV === 'production') {
  console.error(
    '[auth] Missing AUTH_SECRET (or NEXTAUTH_SECRET). Set it in Vercel Environment Variables and redeploy.'
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (user.id && user.email) {
        try {
          await upsertUser({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          });
        } catch (error) {
          // Do not block sign-in if Supabase is misconfigured
          console.error('[auth] upsertUser failed:', error);
        }
      }
      return true;
    },
  },
});
