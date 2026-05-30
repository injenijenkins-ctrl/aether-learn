import { NextResponse } from 'next/server';
import { updateCourseBookResources } from '@/lib/course-books';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { resourceIds } = body as { resourceIds?: string[] };

    if (!Array.isArray(resourceIds)) {
      return NextResponse.json({ error: 'resourceIds must be an array' }, { status: 400 });
    }

    const userId = await getUserId();
    const courseBook = await updateCourseBookResources(id, userId, resourceIds);
    return NextResponse.json({ courseBook });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update course book resources';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

