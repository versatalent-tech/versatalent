import { sql } from '@/lib/db/client';
import type {
  Talent,
  CreateTalentRequest,
  UpdateTalentRequest,
  Industry,
} from '@/lib/db/types';

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
    featured: row.featured || false,
    is_active: row.is_active !== false,
    social_links: row.social_links || {},
    socialLinks: row.social_links || {}, // Backward compatibility
    portfolio: row.portfolio || [],
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

  let query = 'SELECT * FROM talents WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (activeOnly) {
    query += ` AND is_active = true`;
  }

  if (industry) {
    query += ` AND industry = $${paramIndex}`;
    params.push(industry);
    paramIndex++;
  }

  if (featured !== undefined) {
    query += ` AND featured = $${paramIndex}`;
    params.push(featured);
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC';

  const rows = await sql(query, params);
  return rows.map(mapRowToTalent);
}

/**
 * Get featured talents (for homepage)
 */
export async function getFeaturedTalents(): Promise<Talent[]> {
  const rows = await sql`
    SELECT * FROM talents
    WHERE is_active = true AND featured = true
    ORDER BY created_at DESC
  `;
  return rows.map(mapRowToTalent);
}

/**
 * Get talents by industry
 */
export async function getTalentsByIndustry(industry: Industry): Promise<Talent[]> {
  const rows = await sql`
    SELECT * FROM talents
    WHERE is_active = true AND industry = ${industry}
    ORDER BY created_at DESC
  `;
  return rows.map(mapRowToTalent);
}

/**
 * Get a single talent by ID
 */
export async function getTalentById(id: string): Promise<Talent | null> {
  const rows = await sql`
    SELECT * FROM talents
    WHERE id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return mapRowToTalent(rows[0]);
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
    featured = false,
    is_active = true,
    social_links = {},
    portfolio = [],
  } = data;

  const rows = await sql`
    INSERT INTO talents (
      name, industry, gender, age_group, profession, location,
      bio, tagline, skills, image_src, featured, is_active,
      social_links, portfolio
    ) VALUES (
      ${name}, ${industry}, ${gender}, ${age_group}, ${profession}, ${location},
      ${bio}, ${tagline}, ${skills}, ${image_src}, ${featured}, ${is_active},
      ${JSON.stringify(social_links)}, ${JSON.stringify(portfolio)}
    )
    RETURNING *
  `;

  return mapRowToTalent(rows[0]);
}

/**
 * Update an existing talent
 */
export async function updateTalent(
  id: string,
  data: UpdateTalentRequest
): Promise<Talent | null> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Build dynamic SET clause
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'social_links' || key === 'portfolio') {
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
    return getTalentById(id);
  }

  const query = `
    UPDATE talents
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(id);

  const rows = await sql(query, params);

  if (rows.length === 0) {
    return null;
  }

  return mapRowToTalent(rows[0]);
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

  return mapRowToTalent(rows[0]);
}
