import { NextResponse } from 'next/server';
import { getCourseBookById } from '@/lib/course-books';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const courseBook = await getCourseBookById(id, userId);

    if (!courseBook) {
      return NextResponse.json({ error: 'Course book not found' }, { status: 404 });
    }

    return NextResponse.json({ courseBook });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load course book';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

