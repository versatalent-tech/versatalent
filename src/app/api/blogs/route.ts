import { NextRequest, NextResponse } from 'next/server';
import { getAllBlogPosts, createBlogPost, getBlogCategories } from '@/lib/db/repositories/blogs';
import type { CreateBlogPostRequest } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('publishedOnly') !== 'false';
    const category = searchParams.get('category') || undefined;
    const featured = searchParams.get('featured') === 'true' ? true : searchParams.get('featured') === 'false' ? false : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const includeCategories = searchParams.get('includeCategories') === 'true';

    const posts = await getAllBlogPosts({
      publishedOnly,
      category,
      featured,
      limit,
    });

    if (includeCategories) {
      const categories = await getBlogCategories();
      return NextResponse.json({ posts, categories });
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateBlogPostRequest = await request.json();

    // Validate required fields
    if (!data.title || !data.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const post = await createBlogPost(data);

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog post:', error);

    // Handle unique constraint violation (duplicate slug)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A blog post with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
