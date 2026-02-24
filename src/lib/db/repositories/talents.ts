import { sql, query } from '@/lib/db/client';
import { cache, CACHE_TTL } from '@/lib/utils/cache';
import type {
  Talent,
  CreateTalentRequest,
  UpdateTalentRequest,
  Industry,
} from '@/lib/db/types';

// Cache keys
const CACHE_KEYS = {
  ALL_TALENTS: 'talents:all',
  FEATURED_TALENTS: 'talents:featured',
  byIndustry: (industry: Industry) => `talents:industry:${industry}`,
  byId: (id: string) => `talents:id:${id}`,
};

// Invalidate all talent caches (call after create/update/delete)
export function invalidateTalentCache(): void {
  cache.invalidatePrefix('talents:');
}

// Helper function to map database row to Talent
// Maps snake_case database fields to match frontend expectations
function mapRowToTalent(row: any): Talent {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    gender: row.gender,
    age_group: row.age_group,
    ageGroup: row.age_group, // Backward compatibility
    profession: row.profession,
    location: row.location,
    bio: row.bio,
    tagline: row.tagline,
    skills: row.skills || [],
    image_src: row.image_src,
    imageSrc: row.image_src, // Backward compatibility
    cover_image: row.cover_image,
    featured: row.featured || false,
    is_active: row.is_active !== false,
    social_links: row.social_links || {},
    socialLinks: row.social_links || {}, // Backward compatibility
    portfolio: row.portfolio || [],
    industry_details: row.industry_details || {},
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  } as any;
}

/**
 * Get all talents with optional filters
 */
export async function getAllTalents(options: {
  industry?: Industry;
  featured?: boolean;
  activeOnly?: boolean;
} = {}): Promise<Talent[]> {
  const { industry, featured, activeOnly = true } = options;

  // Build dynamic query using template literals
  let baseQuery = `SELECT * FROM talents WHERE 1=1`;
  const conditions: string[] = [];
  const params: any[] = [];

  if (activeOnly) {
    conditions.push(`is_active = true`);
  }

  if (industry) {
    conditions.push(`industry = ${params.length + 1}`);
    params.push(industry);
  }

  if (featured !== undefined) {
    conditions.push(`featured = ${params.length + 1}`);
    params.push(featured);
  }

  if (conditions.length > 0) {
    baseQuery += ` AND ` + conditions.join(' AND ');
  }

  baseQuery += ' ORDER BY created_at DESC';

  // Use the query helper for parameterized queries
  const rows = await query(baseQuery, params);
  return rows.map(mapRowToTalent);
}

/**
 * Get featured talents (for homepage) - with caching
 */
export async function getFeaturedTalents(): Promise<Talent[]> {
  // Check cache first
  const cached = cache.get<Talent[]>(CACHE_KEYS.FEATURED_TALENTS);
  if (cached) {
    return cached;
  }

  const rows = await sql`
    SELECT * FROM talents
    WHERE is_active = true AND featured = true
    ORDER BY created_at DESC
  `;
  const talents = rows.map(mapRowToTalent);

  // Cache for 2 minutes (featured talents don't change often)
  cache.set(CACHE_KEYS.FEATURED_TALENTS, talents, CACHE_TTL.MEDIUM * 2);

  return talents;
}

/**
 * Get talents by industry - with caching
 */
export async function getTalentsByIndustry(industry: Industry): Promise<Talent[]> {
  const cacheKey = CACHE_KEYS.byIndustry(industry);

  // Check cache first
  const cached = cache.get<Talent[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await sql`
    SELECT * FROM talents
    WHERE is_active = true AND industry = ${industry}
    ORDER BY created_at DESC
  `;
  const talents = rows.map(mapRowToTalent);

  // Cache for 1 minute
  cache.set(cacheKey, talents, CACHE_TTL.MEDIUM);

  return talents;
}

/**
 * Get a single talent by ID
 */
export async function getTalentById(id: string): Promise<Talent | null> {
  try {
    const rows = await sql`
      SELECT * FROM talents
      WHERE id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    return mapRowToTalent(rows[0]);
  } catch (error: any) {
    // Handle invalid UUID format
    if (error.code === '22P02') {
      return null;
    }
    throw error;
  }
}

/**
 * Search talents by name, tagline, or skills
 */
export async function searchTalents(searchTerm: string): Promise<Talent[]> {
  const rows = await sql`
    SELECT * FROM talents
    WHERE is_active = true
    AND (
      name ILIKE ${'%' + searchTerm + '%'}
      OR tagline ILIKE ${'%' + searchTerm + '%'}
      OR EXISTS (
        SELECT 1 FROM unnest(skills) AS skill
        WHERE skill ILIKE ${'%' + searchTerm + '%'}
      )
    )
    ORDER BY created_at DESC
  `;

  return rows.map(mapRowToTalent);
}

/**
 * Create a new talent
 */
export async function createTalent(data: CreateTalentRequest): Promise<Talent> {
  const {
    name,
    industry,
    gender,
    age_group,
    profession,
    location,
    bio,
    tagline,
    skills,
    image_src,
    cover_image,
    featured = false,
    is_active = true,
    social_links = {},
    portfolio = [],
    industry_details = {},
  } = data;

  const rows = await sql`
    INSERT INTO talents (
      name, industry, gender, age_group, profession, location,
      bio, tagline, skills, image_src, cover_image, featured, is_active,
      social_links, portfolio, industry_details
    ) VALUES (
      ${name}, ${industry}, ${gender}, ${age_group}, ${profession}, ${location},
      ${bio}, ${tagline}, ${skills}, ${image_src}, ${cover_image || null}, ${featured}, ${is_active},
      ${JSON.stringify(social_links)}, ${JSON.stringify(portfolio)}, ${JSON.stringify(industry_details)}
    )
    RETURNING *
  `;

  // Invalidate all talent caches after creating a new talent
  invalidateTalentCache();

  return mapRowToTalent(rows[0]);
}

/**
 * Update an existing talent
 */
export async function updateTalent(
  id: string,
  data: UpdateTalentRequest
): Promise<Talent | null> {
  // Define allowed fields (database columns only)
  const allowedFields = [
    'name', 'industry', 'gender', 'age_group', 'profession', 'location',
    'bio', 'tagline', 'skills', 'image_src', 'cover_image', 'featured', 'is_active',
    'social_links', 'portfolio', 'industry_details'
  ];

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Build dynamic SET clause - only for allowed fields
  Object.entries(data).forEach(([key, value]) => {
    // Skip fields that aren't in the allowed list (id, created_at, updated_at, camelCase fields, etc.)
    if (!allowedFields.includes(key)) {
      return;
    }

    if (value !== undefined) {
      if (key === 'social_links' || key === 'portfolio' || key === 'industry_details') {
        updates.push(`${key} = $${paramIndex}`);
        params.push(JSON.stringify(value));
      } else if (key === 'skills') {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
      } else {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
      }
      paramIndex++;
    }
  });

  if (updates.length === 0) {
    console.log(`[DB] No fields to update for talent ${id}, returning existing talent`);
    return getTalentById(id);
  }

  const queryText = `
    UPDATE talents
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(id);

  console.log('[DB] Executing UPDATE query:', {
    talentId: id,
    fieldsToUpdate: updates.length,
    fields: updates,
    query: queryText,
    paramCount: params.length
  });

  try {
    const result = await query(queryText, params);

    if (result.length === 0) {
      console.error(`[DB] No talent found with id ${id} after update`);
      return null;
    }

    console.log(`[DB] Successfully updated talent ${id}`);

    // Invalidate all talent caches after updating
    invalidateTalentCache();

    return mapRowToTalent(result[0]);
  } catch (error) {
    console.error('[DB] Update query failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: queryText,
      paramCount: params.length,
      fields: updates
    });
    throw error;
  }
}

/**
 * Soft delete a talent (set is_active to false)
 */
export async function deactivateTalent(id: string): Promise<boolean> {
  const rows = await sql`
    UPDATE talents
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;

  // Invalidate cache after deactivation
  if (rows.length > 0) {
    invalidateTalentCache();
  }

  return rows.length > 0;
}

/**
 * Hard delete a talent (permanent removal)
 */
export async function deleteTalent(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM talents
    WHERE id = ${id}
    RETURNING id
  `;

  // Invalidate cache after deletion
  if (rows.length > 0) {
    invalidateTalentCache();
  }

  return rows.length > 0;
}

/**
 * Toggle featured status for a talent
 */
export async function toggleFeatured(id: string): Promise<Talent | null> {
  const rows = await sql`
    UPDATE talents
    SET featured = NOT featured, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) {
    return null;
  }

  // Invalidate cache after toggle
  invalidateTalentCache();

  return mapRowToTalent(rows[0]);
}
