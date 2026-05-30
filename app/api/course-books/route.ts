import { NextResponse } from 'next/server';
import { createCourseBook, getCourseBooksForUser } from '@/lib/course-books';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const courseBooks = await getCourseBooksForUser(userId);
    return NextResponse.json({ courseBooks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load course books';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, color, goal } = body as {
      title?: string;
      description?: string;
      color?: string;
      goal?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Course book title is required' }, { status: 400 });
    }

    const userId = await getUserId();
    const courseBook = await createCourseBook(userId, {
      title,
      description,
      color,
      goal,
    });

    return NextResponse.json({ courseBook }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create course book';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

