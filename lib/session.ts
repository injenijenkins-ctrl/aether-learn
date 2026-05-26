import { auth } from '@/auth';

export const ANONYMOUS_USER_ID = 'anonymous';

export async function getUserId(): Promise<string> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {
    // auth not configured yet
  }
  return ANONYMOUS_USER_ID;
}
