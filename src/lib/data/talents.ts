// Talent data lives in the database (see lib/db/repositories/talents.ts).
// Re-export types from database for consistency
export type {
  Industry,
  Gender,
  AgeGroup,
  PortfolioItem,
  SocialLinks,
  Talent
} from '@/lib/db/types';
