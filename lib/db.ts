import { getSupabase } from './supabase';

export async function upsertUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<void> {
  try {
    const { error } = await getSupabase().from('users').upsert(
      {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('upsertUser failed:', error);
    }
  } catch (error) {
    console.error('upsertUser failed:', error);
  }
}
