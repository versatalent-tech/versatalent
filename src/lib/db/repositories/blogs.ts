import { sql, query } from '../client';
import type { BlogPost, CreateBlogPostRequest, UpdateBlogPostRequest } from '../types';

// Helper function to generate a slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 200);
}

// Helper function to map database row to BlogPost
function mapRowToBlogPost(row: any): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    author: row.author,
    category: row.category,
    image_url: row.image_url,
    video_url: row.video_url,
    tags: row.tags || [],
    featured: row.featured || false,
    is_published: row.is_published !== false,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

/**
 * Get all blog posts with optional filters
 */
export async function getAllBlogPosts(options?: {
  publishedOnly?: boolean;
  category?: string;
  featured?: boolean;
  limit?: number;
}): Promise<BlogPost[]> {
  const { publishedOnly = true, category, featured, limit } = options || {};

  let baseQuery = `SELECT * FROM blog_posts WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (publishedOnly) {
    baseQuery += ` AND is_published = true`;
  }

  if (category) {
    baseQuery += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (featured !== undefined) {
    baseQuery += ` AND featured = $${paramIndex}`;
    params.push(featured);
    paramIndex++;
  }

  baseQuery += ` ORDER BY COALESCE(published_at, created_at) DESC`;

  if (limit) {
    baseQuery += ` LIMIT $${paramIndex}`;
    params.push(limit);
  }

  const rows = await query(baseQuery, params);
  return rows.map(mapRowToBlogPost);
}

/**
 * Get featured blog posts
 */
export async function getFeaturedBlogPosts(limit?: number): Promise<BlogPost[]> {
  const rows = await sql`
    SELECT * FROM blog_posts
    WHERE is_published = true AND featured = true
    ORDER BY COALESCE(published_at, created_at) DESC
    ${limit ? sql`LIMIT ${limit}` : sql``}
  `;
  return rows.map(mapRowToBlogPost);
}

/**
 * Get a blog post by ID
 */
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const rows = await sql`
      SELECT * FROM blog_posts
      WHERE id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    return mapRowToBlogPost(rows[0]);
  } catch (error: any) {
    if (error.code === '22P02') {
      return null;
    }
    throw error;
  }
}

/**
 * Get a blog post by slug
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const rows = await sql`
    SELECT * FROM blog_posts
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return mapRowToBlogPost(rows[0]);
}

/**
 * Get a blog post by ID or slug
 */
export async function getBlogPost(idOrSlug: string): Promise<BlogPost | null> {
  try {
    const rows = await sql`
      SELECT * FROM blog_posts
      WHERE id = ${idOrSlug} OR slug = ${idOrSlug}
      LIMIT 1
    `;
    return rows[0] ? mapRowToBlogPost(rows[0]) : null;
  } catch (error: any) {
    if (error.code === '22P02') {
      const rows = await sql`
        SELECT * FROM blog_posts
        WHERE slug = ${idOrSlug}
        LIMIT 1
      `;
      return rows[0] ? mapRowToBlogPost(rows[0]) : null;
    }
    throw error;
  }
}

/**
 * Create a new blog post
 */
export async function createBlogPost(data: CreateBlogPostRequest): Promise<BlogPost> {
  const slug = data.slug || generateSlug(data.title);
  const publishedAt = data.is_published !== false ? (data.published_at || new Date()) : null;

  const rows = await sql`
    INSERT INTO blog_posts (
      title, slug, excerpt, content, author, category,
      image_url, video_url, tags, featured, is_published, published_at
    ) VALUES (
      ${data.title},
      ${slug},
      ${data.excerpt || null},
      ${data.content},
      ${data.author || 'VersaTalent Team'},
      ${data.category || null},
      ${data.image_url || null},
      ${data.video_url || null},
      ${data.tags || []},
      ${data.featured || false},
      ${data.is_published !== false},
      ${publishedAt}
    )
    RETURNING *
  `;

  return mapRowToBlogPost(rows[0]);
}

/**
 * Update a blog post
 */
export async function updateBlogPost(
  idOrSlug: string,
  data: UpdateBlogPostRequest
): Promise<BlogPost | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(data.title);
  }
  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    params.push(data.slug);
  }
  if (data.excerpt !== undefined) {
    updates.push(`excerpt = $${paramIndex++}`);
    params.push(data.excerpt);
  }
  if (data.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    params.push(data.content);
  }
  if (data.author !== undefined) {
    updates.push(`author = $${paramIndex++}`);
    params.push(data.author);
  }
  if (data.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(data.category);
  }
  if (data.image_url !== undefined) {
    updates.push(`image_url = $${paramIndex++}`);
    params.push(data.image_url);
  }
  if (data.video_url !== undefined) {
    updates.push(`video_url = $${paramIndex++}`);
    params.push(data.video_url);
  }
  if (data.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    params.push(data.tags);
  }
  if (data.featured !== undefined) {
    updates.push(`featured = $${paramIndex++}`);
    params.push(data.featured);
  }
  if (data.is_published !== undefined) {
    updates.push(`is_published = $${paramIndex++}`);
    params.push(data.is_published);

    // Set published_at when publishing for the first time
    if (data.is_published && data.published_at === undefined) {
      updates.push(`published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`);
    }
  }
  if (data.published_at !== undefined) {
    updates.push(`published_at = $${paramIndex++}`);
    params.push(data.published_at);
  }

  if (updates.length === 0) {
    return getBlogPost(idOrSlug);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  params.push(idOrSlug);
  params.push(idOrSlug);

  const queryText = `
    UPDATE blog_posts
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} OR slug = $${paramIndex}
    RETURNING *
  `;

  const result = await query(queryText, params);

  if (result.length === 0) {
    return null;
  }

  return mapRowToBlogPost(result[0]);
}

/**
 * Delete a blog post
 */
export async function deleteBlogPost(idOrSlug: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM blog_posts
    WHERE id = ${idOrSlug} OR slug = ${idOrSlug}
  `;
  return result.count > 0;
}

/**
 * Search blog posts
 */
export async function searchBlogPosts(searchTerm: string): Promise<BlogPost[]> {
  const rows = await sql`
    SELECT * FROM blog_posts
    WHERE is_published = true
    AND (
      title ILIKE ${'%' + searchTerm + '%'}
      OR excerpt ILIKE ${'%' + searchTerm + '%'}
      OR content ILIKE ${'%' + searchTerm + '%'}
      OR author ILIKE ${'%' + searchTerm + '%'}
    )
    ORDER BY COALESCE(published_at, created_at) DESC
  `;

  return rows.map(mapRowToBlogPost);
}

/**
 * Get blog post categories
 */
export async function getBlogCategories(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT category FROM blog_posts
    WHERE category IS NOT NULL AND is_published = true
    ORDER BY category
  `;

  return rows.map((row: any) => row.category);
}
