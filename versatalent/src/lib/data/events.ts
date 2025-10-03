export type EventCategory = 'performance' | 'fashion' | 'sports' | 'music' | 'culinary' | 'workshop' | 'other';

export interface EventVenue {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  tags?: string[];
  dateStart: string; // ISO
  dateEnd?: string;  // ISO
  timezone?: string;
  venue?: EventVenue;
  coverImage?: string;
  gallery?: string[];
  talentIds?: string[]; // references talents.ts ids/keys used in routes
  organizer?: string;
  ticketUrl?: string;
  priceFromGBP?: number;
  priceToGBP?: number;
  status?: 'scheduled' | 'cancelled' | 'postponed';
  createdAt?: string;
  updatedAt?: string;
}

export const eventsSeed: EventItem[] = [
  {
    id: 'ev-1',
    title: 'Deejay WG — Summer Vibes Set',
    description: 'High-energy open-air set featuring amapiano, afrohouse, and more.',
    category: 'music',
    tags: ['festival', 'amapiano', 'afrohouse'],
    dateStart: '2025-09-20T21:40:00.000Z', // Future date
    venue: { name: 'Leeds Riverside Park', city: 'Leeds', country: 'UK' },
    coverImage: '/deejaywg/IMG_8999.jpg',
    talentIds: ['deejaywg'],
    organizer: 'VersaTalent',
    ticketUrl: '#',
    priceFromGBP: 15,
    priceToGBP: 35,
    status: 'scheduled'
  },
  {
    id: 'ev-2',
    title: 'Jessica Dias — Editorial Showcase',
    description: 'Runway and editorial photography showcase with Q&A.',
    category: 'fashion',
    tags: ['runway', 'editorial'],
    dateStart: '2024-12-25T18:00:00.000Z', // Past date
    venue: { name: 'Shoreditch Studio', city: 'London', country: 'UK' },
    coverImage: '/jessicadias/IMG_9288-altered.jpg',
    talentIds: ['jessicadias'],
    organizer: 'VersaTalent',
    priceFromGBP: 0,
    status: 'scheduled'
  },
  {
    id: 'ev-3',
    title: 'Antonio Monteiro — Charity Match',
    description: 'Friendly charity match featuring local semi-pro talents.',
    category: 'sports',
    tags: ['football', 'charity'],
    dateStart: '2025-09-12T21:30:00.000Z', // Future date
    dateEnd: '2025-09-12T23:30:00.000Z', // +2 hours
    venue: { name: 'South Leeds Stadium', city: 'Leeds', country: 'UK' },
    coverImage: '/antoniomonteiro/Tonecas_2.jpg',
    talentIds: ['antoniomonteiro'],
    organizer: 'Leeds Community Foundation',
    ticketUrl: '#',
    priceFromGBP: 8,
    status: 'scheduled'
  }
];

// Date helpers
export function now(): Date { return new Date(); }
export function toDate(iso?: string): Date | null {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
export function isOngoing(ev: EventItem, ref: Date = now()): boolean {
  const start = toDate(ev.dateStart);
  const end = toDate(ev.dateEnd);
  if (!start) return false;
  if (end) return start <= ref && ref <= end;
  // Treat single-date events as ongoing only on the same day
  try {
    return start.toDateString() === ref.toDateString();
  } catch {
    return false;
  }
}
export function isUpcoming(ev: EventItem, ref: Date = now()): boolean {
  const start = toDate(ev.dateStart);
  if (!start) return false;
  return start > ref;
}
export function isPast(ev: EventItem, ref: Date = now()): boolean {
  const end = toDate(ev.dateEnd) ?? toDate(ev.dateStart);
  if (!end) return false;
  return end < ref && !isOngoing(ev, ref);
}
export function daysUntil(ev: EventItem, ref: Date = now()): number | null {
  const start = toDate(ev.dateStart);
  if (!start) return null;
  try {
    return Math.ceil((start.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
export function daysSince(ev: EventItem, ref: Date = now()): number | null {
  const end = toDate(ev.dateEnd) ?? toDate(ev.dateStart);
  if (!end) return null;
  try {
    return Math.ceil((ref.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export interface EventQuery {
  q?: string;
  category?: string;
  city?: string;
  country?: string;
  status?: 'upcoming' | 'ongoing' | 'past' | 'all';
  page?: number;
  pageSize?: number;
  sort?: 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'title-asc';
  priceFrom?: number;
  priceTo?: number;
  startDate?: string; // ISO
  endDate?: string;   // ISO
}

export interface EventQueryResult {
  items: EventItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: { upcoming: number; ongoing: number; past: number; all: number };
}

export function queryEvents(list: EventItem[], query: EventQuery, ref: Date = now()): EventQueryResult {
  try {
    const {
      q, category, city, country,
      status = 'upcoming', page = 1, pageSize = 12,
      sort = 'date-asc', priceFrom, priceTo, startDate, endDate,
    } = query;

    if (!Array.isArray(list)) {
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
        counts: { upcoming: 0, ongoing: 0, past: 0, all: 0 }
      };
    }

    let base = [...list];
  if (q) {
    const s = q.toLowerCase();
    base = base.filter(e =>
      e.title.toLowerCase().includes(s) ||
      (e.description?.toLowerCase().includes(s) ?? false) ||
      (e.venue?.name?.toLowerCase().includes(s) ?? false) ||
      (e.venue?.city?.toLowerCase().includes(s) ?? false) ||
      (e.organizer?.toLowerCase().includes(s) ?? false) ||
      (e.tags?.some(t => t.toLowerCase().includes(s)) ?? false)
    );
  }
  if (category) base = base.filter(e => e.category === category);
  if (city) base = base.filter(e => e.venue?.city?.toLowerCase() === city.toLowerCase());
  if (country) base = base.filter(e => e.venue?.country?.toLowerCase() === country.toLowerCase());
  if (typeof priceFrom === 'number') base = base.filter(e => (e.priceFromGBP ?? 0) >= priceFrom);
  if (typeof priceTo === 'number') base = base.filter(e => (e.priceToGBP ?? e.priceFromGBP ?? 0) <= priceTo);
  if (startDate) {
    const sd = new Date(startDate).getTime();
    base = base.filter(e => {
      const startTime = toDate(e.dateStart)?.getTime();
      return startTime !== undefined && startTime >= sd;
    });
  }
  if (endDate) {
    const ed = new Date(endDate).getTime();
    base = base.filter(e => {
      const endTime = (toDate(e.dateEnd) ?? toDate(e.dateStart))?.getTime();
      return endTime !== undefined && endTime <= ed;
    });
  }

  const counts = {
    upcoming: base.filter(e => isUpcoming(e, ref)).length,
    ongoing: base.filter(e => isOngoing(e, ref)).length,
    past: base.filter(e => isPast(e, ref)).length,
    all: base.length
  };

  let filtered = [...base];
  if (status !== 'all') {
    filtered = filtered.filter(e =>
      status === 'ongoing' ? isOngoing(e, ref)
        : status === 'past' ? isPast(e, ref)
        : isUpcoming(e, ref)
    );
  }

  // Sorting
  filtered.sort((a, b) => {
    const aStartTime = toDate(a.dateStart)?.getTime();
    const bStartTime = toDate(b.dateStart)?.getTime();
    if (aStartTime === undefined || bStartTime === undefined) return 0;
    const aStart = aStartTime;
    const bStart = bStartTime;
    switch (sort) {
      case 'date-desc':
        return bStart - aStart;
      case 'price-asc':
        return (a.priceFromGBP ?? 0) - (b.priceFromGBP ?? 0);
      case 'price-desc':
        return (b.priceFromGBP ?? 0) - (a.priceFromGBP ?? 0);
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'date-asc':
      default:
        return aStart - bStart;
    }
  });

  const total = filtered.length;
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filtered.slice(startIdx, endIdx);

  return { items: pageItems, total, page, pageSize, totalPages: Math.ceil(total / pageSize), counts };
  } catch (error) {
    console.error('Error in queryEvents:', error);
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
      totalPages: 0,
      counts: { upcoming: 0, ongoing: 0, past: 0, all: 0 }
    };
  }
}
