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
    id: '1',
    title: 'Summer Beats Festival 2025',
    description: 'Deejay WG headlines the biggest electronic music festival of the summer, featuring a special 2-hour set mixing Afrobeats, Amapiano, and House music.',
    type: 'performance',
    status: 'upcoming',
    date: '2025-12-15T20:00:00Z',
    time: '8:00 PM',
    venue: {
      name: 'Roundhay Park',
      address: 'Princes Avenue',
      city: 'Leeds',
      country: 'UK',
      capacity: 15000,
      website: 'https://roundhaypark.org.uk'
    },
    talentIds: ['1'], // Deejay WG
    imageSrc: '/deejaywg/IMG_8976.jpg',
    featured: true,
    ticketsUrl: 'https://tickets.summerbeatsfestival.com',
    price: {
      min: 45,
      max: 120,
      currency: 'GBP'
    },
    tags: ['Festival', 'Electronic Music', 'Outdoor', 'Summer'],
    organizer: 'Summer Beats Productions',
    expectedAttendance: 12000
  },
  {
    id: '2',
    title: 'Vogue UK Fashion Week Shoot',
    description: 'Jessica Dias stars in an exclusive editorial photoshoot for Vogue UK, showcasing the latest autumn/winter collection from top British designers.',
    type: 'photoshoot',
    status: 'upcoming',
    date: '2025-11-28T09:00:00Z',
    time: '9:00 AM',
    venue: {
      name: 'Vogue Studios',
      address: 'Hanover Square',
      city: 'London',
      country: 'UK'
    },
    talentIds: ['2'], // Jessica Dias
    imageSrc: '/jessicadias/IMG_9214-altered.jpg',
    featured: true,
    price: {
      min: 0,
      currency: 'GBP',
      isFree: true
    },
    tags: ['Fashion', 'Editorial', 'Vogue', 'London'],
    organizer: 'Vogue UK'
  },
  {
    id: '3',
    title: 'Guiné-Bissau Cultural Night',
    description: 'João Rodolfo performs traditional and contemporary Gumbé music at this special cultural celebration, bringing the sounds of Guiné-Bissau to Leeds.',
    type: 'performance',
    status: 'upcoming',
    date: '2025-11-20T19:30:00Z',
    time: '7:30 PM',
    venue: {
      name: 'Leeds Town Hall',
      address: 'The Headrow',
      city: 'Leeds',
      country: 'UK',
      capacity: 1500
    },
    talentIds: ['3'], // João Rodolfo
    imageSrc: '/joaorodolfo/billboard.PNG',
    featured: true,
    ticketsUrl: 'https://leedstownhall.co.uk/events',
    price: {
      min: 25,
      max: 60,
      currency: 'GBP'
    },
    tags: ['World Music', 'Cultural', 'Gumbé', 'Traditional'],
    organizer: 'Leeds Cultural Centre',
    expectedAttendance: 800
  },
  {
    id: '4',
    title: 'Championship Semi-Final',
    description: 'Antonio Monteiro takes the field in this crucial semi-final match that could secure promotion to the Premier League for his team.',
    type: 'match',
    status: 'upcoming',
    date: '2025-11-14T15:00:00Z',
    time: '3:00 PM',
    venue: {
      name: 'Elland Road Stadium',
      address: 'Elland Road',
      city: 'Leeds',
      country: 'UK',
      capacity: 37500,
      website: 'https://www.leedsunited.com'
    },
    talentIds: ['4'], // Antonio Monteiro
    imageSrc: '/antoniomonteiro/Tonecas_1.jpg',
    featured: true,
    ticketsUrl: 'https://leedsunited.com/tickets',
    price: {
      min: 35,
      max: 150,
      currency: 'GBP'
    },
    tags: ['Football', 'Championship', 'Semi-Final', 'Sports'],
    organizer: 'English Football League',
    expectedAttendance: 35000
  },
  {
    id: '5',
    title: 'Music Production Masterclass',
    description: 'Deejay WG shares his expertise in electronic music production, covering Afrobeat fusion techniques and modern mixing methods.',
    type: 'workshop',
    status: 'upcoming',
    date: '2025-12-02T14:00:00Z',
    time: '2:00 PM',
    venue: {
      name: 'Abbey Road Institute',
      address: '6 Mitre Passage',
      city: 'London',
      country: 'UK',
      capacity: 50
    },
    talentIds: ['1'], // Deejay WG
    imageSrc: '/deejaywg/IMG_8987.jpg',
    featured: false,
    ticketsUrl: 'https://abbeyroadinstitute.com/workshops',
    price: {
      min: 95,
      currency: 'GBP'
    },
    tags: ['Workshop', 'Education', 'Music Production', 'Electronic'],
    organizer: 'Abbey Road Institute',
    expectedAttendance: 45
  },
  {
    id: '6',
    title: 'Brand Ambassador Campaign Launch',
    description: 'Jessica Dias unveils her new role as brand ambassador for a major international fashion house at this exclusive launch event.',
    type: 'appearance',
    status: 'upcoming',
    date: '2026-01-10T18:00:00Z',
    time: '6:00 PM',
    venue: {
      name: 'The Shard',
      address: '32 London Bridge Street',
      city: 'London',
      country: 'UK',
      capacity: 200
    },
    talentIds: ['2'], // Jessica Dias
    imageSrc: '/jessicadias/IMG_9365-altered.jpg',
    featured: false,
    price: {
      min: 0,
      currency: 'GBP',
      isFree: true
    },
    tags: ['Fashion', 'Brand Launch', 'Ambassador', 'Exclusive'],
    organizer: 'International Fashion House'
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
  return getUpcomingEvents().filter(event => event.featured);
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
