import { sql } from '../client';
import { instagramPermalink, type InstagramPostKind, type InstagramPostRef } from '@/lib/instagram/links';
import type { InstagramPost, PublicInstagramPost } from '@/lib/instagram/types';

/**
 * Instagram posts featured on the website. Posts are ordered within their
 * talent (or within VersaTalent's own posts, talent_id NULL) by sort_order.
 */

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function talentOf(row: any): { id: string; name: string } | null {
  return row.talent_id ? { id: row.talent_id, name: row.talent_name } : null;
}

function mapPost(row: any): InstagramPost {
  const kind = row.kind as InstagramPostKind;
  return {
    id: row.id,
    shortcode: row.shortcode,
    kind,
    permalink: instagramPermalink({ kind, shortcode: row.shortcode }),
    talent: talentOf(row),
    on_homepage: row.on_homepage,
    is_visible: row.is_visible,
    sort_order: Number(row.sort_order),
    created_at: iso(row.created_at),
  };
}

/** Every post, VersaTalent's own first, then by talent name */
export async function listInstagramPosts(): Promise<InstagramPost[]> {
  const rows = await sql`
    SELECT p.*, t.name AS talent_name
    FROM instagram_posts p
    LEFT JOIN talents t ON t.id = p.talent_id
    ORDER BY (p.talent_id IS NOT NULL), t.name, p.sort_order, p.created_at
  `;
  return rows.map(mapPost);
}

/**
 * Posts the public site shows: visible ones, and only for talents still on
 * the site. Either one talent's posts, or the homepage selection.
 */
export async function listPublicInstagramPosts(
  filter: { talentId: string } | { homepage: true },
  limit = 12
): Promise<PublicInstagramPost[]> {
  const talentId = 'talentId' in filter ? filter.talentId : null;
  const rows = await sql`
    SELECT p.id, p.kind, p.shortcode, p.talent_id, t.name AS talent_name
    FROM instagram_posts p
    LEFT JOIN talents t ON t.id = p.talent_id
    WHERE p.is_visible
      AND (p.talent_id IS NULL OR t.is_active)
      AND ${talentId === null ? sql`p.on_homepage` : sql`p.talent_id = ${talentId}`}
    ORDER BY p.sort_order, p.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row: any) => ({
    id: row.id,
    kind: row.kind,
    permalink: instagramPermalink({ kind: row.kind, shortcode: row.shortcode }),
    talent: talentOf(row),
  }));
}

export async function getInstagramPost(id: string): Promise<InstagramPost | null> {
  const rows = await sql`
    SELECT p.*, t.name AS talent_name FROM instagram_posts p LEFT JOIN talents t ON t.id = p.talent_id WHERE p.id = ${id}
  `;
  return rows[0] ? mapPost(rows[0]) : null;
}

/** Adds a post at the end of its talent's list. Returns null if it's already featured */
export async function createInstagramPost(
  post: InstagramPostRef & { talentId: string | null; onHomepage: boolean; addedBy: string | null }
): Promise<string | null> {
  const rows = await sql`
    INSERT INTO instagram_posts (shortcode, kind, talent_id, on_homepage, added_by, sort_order)
    SELECT ${post.shortcode}, ${post.kind}, ${post.talentId}, ${post.onHomepage}, ${post.addedBy},
      COALESCE(MAX(sort_order) + 1, 0)
    FROM instagram_posts WHERE talent_id IS NOT DISTINCT FROM ${post.talentId}
    ON CONFLICT (shortcode) DO NOTHING
    RETURNING id
  `;
  return rows[0]?.id ?? null;
}

export async function updateInstagramPost(
  id: string,
  changes: { talent_id?: string | null; on_homepage?: boolean; is_visible?: boolean }
): Promise<boolean> {
  const moving = changes.talent_id !== undefined;
  const rows = await sql`
    UPDATE instagram_posts p SET
      on_homepage = COALESCE(${changes.on_homepage ?? null}, p.on_homepage),
      is_visible = COALESCE(${changes.is_visible ?? null}, p.is_visible),
      talent_id = ${moving ? sql`${changes.talent_id ?? null}::uuid` : sql`p.talent_id`},
      -- A post given to another talent goes to the end of their list
      sort_order = ${
        moving
          ? sql`(SELECT COALESCE(MAX(o.sort_order) + 1, 0) FROM instagram_posts o
                 WHERE o.talent_id IS NOT DISTINCT FROM ${changes.talent_id ?? null}::uuid AND o.id <> p.id)`
          : sql`p.sort_order`
      },
      updated_at = NOW()
    WHERE p.id = ${id}
    RETURNING p.id
  `;
  return rows.length > 0;
}

/** Swaps a post with the one above or below it in its talent's list */
export async function moveInstagramPost(id: string, direction: 'up' | 'down'): Promise<boolean> {
  const current = await sql`SELECT talent_id FROM instagram_posts WHERE id = ${id}`;
  if (!current[0]) return false;

  const siblings = await sql`
    SELECT id FROM instagram_posts WHERE talent_id IS NOT DISTINCT FROM ${current[0].talent_id}
    ORDER BY sort_order, created_at
  `;
  const ids: string[] = siblings.map((row: any) => row.id);
  const from = ids.indexOf(id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return true; // already first or last

  [ids[from], ids[to]] = [ids[to], ids[from]];
  // Renumber the whole list 0, 1, 2…, which also tidies any gaps or ties
  await sql`
    UPDATE instagram_posts p SET sort_order = o.position - 1, updated_at = NOW()
    FROM unnest(${ids}::uuid[]) WITH ORDINALITY AS o (id, position)
    WHERE p.id = o.id
  `;
  return true;
}

export async function deleteInstagramPost(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM instagram_posts WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
