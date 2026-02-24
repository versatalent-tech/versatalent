export type EventType = 'performance' | 'photoshoot' | 'match' | 'collaboration' | 'workshop' | 'appearance';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface EventVenue {
  name: string;
  address: string;
  city: string;
  country: string;
  capacity?: number;
  website?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  date: string; // ISO date string
  endDate?: string; // For multi-day events
  time: string;
  venue: EventVenue;
  talentIds: string[]; // References to talent IDs
  imageSrc: string;
  featured: boolean;
  ticketsUrl?: string;
  price?: {
    min: number;
    max?: number;
    currency: string;
    isFree?: boolean;
  };
  tags: string[];
  organizer?: string;
  expectedAttendance?: number;
}

export const events: EventItem[] = [
  {
    id: "1",
    title: "La Gitane - Batida Quente",
    description: "Deejay WG headlines featuring a special set mixing Afrobeats, Amapiano, House music, Kizomba and more",
    type: "performance",
    status: "completed",
    date: "2025-10-10T22:00:00Z",
    time: "10:00 PM",
    venue: {
      name: "La Gitane",
      address: "Bridge Street",
      city: "Manchester",
      country: "UK"
    },
    talentIds: ["1"],
    imageSrc: "/images/events/Batida_Quente.jpg",
    featured: true,
    ticketsUrl: "https://www.fatsoma.com/e/2zpafrr4/batida-quente-palop-world-music-sean-wilson-dj-wg-fabio-israel",
    price: {
      min: 7,
      max: 10,
      currency: "GBP"
    },
    tags: ["Nightclub", "Afro House", "Afrobeats", "Kizomba"],
    organizer: "Palop Entertainment",
    expectedAttendance: 100
  },
  {
    id: "2",
    title: "La Gitane - Batida Quente - Halloween",
    description: "Deejay WG headlines featuring a special set mixing Afrobeats, Amapiano, House music, Kizomba and more fo halloween",
    type: "performance",
    status: "completed",
    date: "2025-10-31T22:00:00Z",
    time: "10:00 PM",
    venue: {
      name: "La Gitane",
      address: "Bridge Street",
      city: "Manchester",
      country: "UK"
    },
    talentIds: ["1"],
    imageSrc: "/images/events/Batida_Quente_Halloween.jpg",
    featured: true,
    ticketsUrl: "https://www.fatsoma.com/e/2yz12k9n/batida-quente-halloween-party-palop-world-music-sean-wilson-dj-fanta-dj-wg",
    price: {
      min: 7,
      max: 10,
      currency: "GBP"
    },
    tags: ["Nightclub", "Afro House", "Afrobeats", "Kizomba"],
    organizer: "Palop Entertainment",
    expectedAttendance: 100
  },
  {
    id: '3',
    title: 'West Yorkshire Fashion Week',
    description: 'Jessica Dias shines at the West Yorkshire Fashion Week, catwalking for amazing designers.',
    type: 'performance',
    status: 'upcoming',
    date: '2025-10-11T19:30:00Z',
    time: '7:30 PM',
    venue: {
      name: 'Gomersal Park Hotel',
      address: 'Moor Ln, BD19 4LJ',
      city: 'Cleckheaton',
      country: 'UK'
    },
    talentIds: ['2'], // Jessica Dias
    imageSrc: '/images/events/West_Yorkshire_Fashion_Week.jpeg',
    featured: true,
    price: {
      min: 15,
      currency: 'GBP'
    },
    tags: ['Fashion Show', 'Catwalking', 'Designers', 'West Yorkshire'],
    organizer: 'West Yorkshire Fashion Week'
  },
  {
    id: '4',
    title: 'Hot Tarraxinha Mini Weekender - 1st Day',
    description: 'Deejay WG will be bringing his smooth, versatile sound to the Hot Tarraxinha Weekender 2025. He’ll deliver a balanced blend of tarraxinha, kizomba, ghetto zouk and konpa that perfectly complements the weekend’s vibe. A set you’ll want to experience.',
    type: 'performance',
    status: 'upcoming',
    date: '2025-11-21T20:00:00Z',
    time: '8:00 PM',
    venue: {
      name: 'La Gitane',
      address: '79-81 Bridge St, M3 2RH',
      city: 'Manchester',
      country: 'UK'
    },
    talentIds: ['1'], // Deejay WG
    imageSrc: '/images/events/hot_tarraxinha.jpg',
    featured: true,
    ticketsUrl: 'https://www.fatsoma.com/e/yjcobqww/hot-tarraxinha-weekender-manchester-2025-21st-23rd-nov-tarraxinha-konpa-ghetto-zouk-kizomba',
    price: {
      min: 15,
      max: 60,
      currency: 'GBP'
    },
    tags: ['Nightclub', 'Tarraxinha', 'Kompa', 'Ghetto Zouk', 'Kizomba'],
    organizer: 'Kizomba Manchester'
  },
  {
    id: '5',
    title: 'Hot Tarraxinha Mini Weekender - 3rd Day',
    description: 'Deejay WG will be bringing his smooth, versatile sound to the Hot Tarraxinha Weekender 2025. He’ll deliver a balanced blend of tarraxinha, kizomba, ghetto zouk and konpa that perfectly complements the weekend’s vibe. A set you’ll want to experience.',
    type: 'performance',
    status: 'upcoming',
    date: '2025-11-23T20:00:00Z',
    time: '8:00 PM',
    venue: {
      name: 'La Gitane',
      address: '79-81 Bridge St, M3 2RH',
      city: 'Manchester',
      country: 'UK'
    },
    talentIds: ['1'], // Deejay WG
    imageSrc: '/images/events/hot_tarraxinha.jpg',
    featured: true,
    ticketsUrl: 'https://www.fatsoma.com/e/yjcobqww/hot-tarraxinha-weekender-manchester-2025-21st-23rd-nov-tarraxinha-konpa-ghetto-zouk-kizomba',
    price: {
      min: 15,
      max: 60,
      currency: 'GBP'
    },
    tags: ['Nightclub', 'Tarraxinha', 'Kompa', 'Ghetto Zouk', 'Kizomba'],
    organizer: 'Kizomba Manchester'
  },
  {
    id: '6',
    title: 'Sundown Sessions',
    description: 'We’re excited to welcome Deejay WG to the decks — a master of seamless genre-mixing whose sets breathe rhythm and vibe. Known for his refined energy and ability to connect with the floor, WG will be weaving through melodic house grooves, Afro-house pulses and undercurrent of global dance rhythms that echo the evening’s promise of “energy, the people and the music.”',
    type: 'appearance',
    status: 'upcoming',
    date: '2026-11-30T18:00:00Z',
    time: '6:00 PM',
    venue: {
      name: 'The Neighbourhood Leeds',
      address: '5 Greek St, LS1 5RW',
      city: 'Leeds',
      country: 'UK',
    },
    talentIds: ['1'], // Deejay WG
    imageSrc: '/images/events/After_Dark.jpg',
    featured: true,
    ticketsUrl: 'https://www.fatsoma.com/e/xia2ppoe/11-11-neighbourhood-leeds-30th-november-2025?utm_campaign=prom_ss&utm_medium=social&utm_source=dynamic',
    price: {
      min: 0,
      currency: 'GBP',
      isFree: true
    },
    tags: ['Nightclub', 'Amapiano', 'Afrobeats', 'Afrohouse'],
    organizer: '11:11'
  }
];

// Utility functions
export function getUpcomingEvents(): EventItem[] {
  const now = new Date();
  console.log('getUpcomingEvents - Current date:', now.toISOString());

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const isUpcoming = event.status === 'upcoming';
    const isFuture = eventDate > now;

    console.log(`Event: ${event.title}, Date: ${event.date}, Status: ${event.status}, Is Future: ${isFuture}, Featured: ${event.featured}`);

    return isUpcoming && isFuture;
  });

  console.log('Total upcoming events found:', upcomingEvents.length);

  return upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getFeaturedEvents(): EventItem[] {
  // Get all featured events, regardless of status (for homepage display)
  return events.filter(event => event.featured)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getEventsByTalent(talentId: string): EventItem[] {
  return events.filter(event => event.talentIds.includes(talentId));
}

export function getEventById(id: string): EventItem | undefined {
  return events.find(event => event.id === id);
}

export function getEventsByType(type: EventType): EventItem[] {
  return events.filter(event => event.type === type);
}

export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function isEventToday(dateString: string): boolean {
  const eventDate = new Date(dateString);
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
}

export function isEventThisWeek(dateString: string): boolean {
  const eventDate = new Date(dateString);
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  return eventDate >= today && eventDate <= weekFromNow;
}
