import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

const providers = [];
const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === 'production' ? undefined : 'aetherlearn-local-development-secret');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

export const authConfig = {
  providers,
  pages: {
    signIn: '/login',
  },
  // Auth.js v5 reads AUTH_SECRET from env; also set via auth.ts `secret` option
  secret: authSecret,
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const protectedPaths = [
        '/dashboard',
        '/course-books',
        '/tutor',
        '/lessons',
        '/quizzes',
        '/exams',
        '/flashcards',
        '/notes',
        '/progress',
        '/ingestion',
        '/settings',
        '/study-plan',
        '/study-rooms',
      ];
      const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      );
      if (isProtected) return !!auth;
      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
