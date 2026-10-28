import type { InstagramPostKind } from './links';

/** A featured post, as the admin page sees it */
export interface InstagramPost {
  id: string;
  shortcode: string;
  kind: InstagramPostKind;
  permalink: string;
  /** null = VersaTalent's own account */
  talent: { id: string; name: string } | null;
  on_homepage: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
}

/** A featured post, as the public site sees it */
export interface PublicInstagramPost {
  id: string;
  kind: InstagramPostKind;
  permalink: string;
  talent: { id: string; name: string } | null;
}
