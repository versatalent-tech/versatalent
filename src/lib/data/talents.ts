export type Industry = 'acting' | 'modeling' | 'music' | 'culinary' | 'sports';

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  url: string;  // For images: direct image URL, for videos: YouTube/Vimeo embed URL
  date?: string;
  category?: string; // e.g., "Commercial", "Film", "Print", "Performance"
  photographer?: string;
  location?: string;
  client?: string;
  year?: number;
  featured?: boolean;
  professional?: boolean; // Agency-shot vs self-submitted
  tags?: string[];
  downloadUrl?: string; // For authorized downloads
  metadata?: {
    camera?: string;
    lens?: string;
    iso?: string;
    aperture?: string;
  };
}

export interface PreviousClub {
  years: string;
  team: string;
  appearances: number;
  goals: number;
}

export interface Talent {
  id: string;
  name: string;
  industry: Industry;
  gender: 'male' | 'female' | 'non-binary';
  ageGroup: 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';
  profession: string;
  location: string;
  bio: string;
  tagline: string;
  skills: string[];
  imageSrc: string;
  featured: boolean;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
    linkedin?: string;
    tiktok?: string;
  };
  portfolio?: PortfolioItem[];
  previousClubs?: PreviousClub[];
}

export const talents: Talent[] = [
  {
    id: '1',
    name: 'Deejay WG',
    industry: 'music',
    gender: 'male',
    ageGroup: 'adult',
    profession: 'Deejay',
    location: 'Leeds, UK',
    bio: 'With contagious energy and unique versatility, Deejay WG transforms any event into an unforgettable experience. Specializing in blending genres such as afrobeat, dancehall, hip hop, amapiano, house, and more, he adapts seamlessly to any audience and environment — from private parties and weddings to clubs, festivals, and corporate events. He delivers dynamic performances, personalized sets, and total mastery of the dancefloor, ensuring everyone dances until the very last beat. If you\'re looking for a DJ who reads the vibe, elevates the energy, and leaves a lasting impact, Deejay WG is the perfect choice.',
    tagline: 'The right vibe, at the right time.',
    skills: ['Amapiano', 'Afrohouse', 'Kizomba', 'Afrobeats', 'and more'],
    imageSrc: '/deejaywg/IMG_8999.jpg',
    featured: true,
    socialLinks: {
      instagram: 'https://instagram.com/deejaywg_',
      tiktok: 'https://tiktok.com/@deejaywg_',
      youtube: 'https://www.youtube.com/@deejaywg4051',
    },
    portfolio: [
      {
        id: 'dj1',
        title: 'Travel Edition Series',
        description: 'Deejay WG Live Mix in Portugal',
        type: 'video',
        thumbnailUrl: '/deejaywg/IMG_8976.jpg',
        url: 'https://youtu.be/nmTRSG5K7wU',
        date: '2025',
        category: 'Performance'
      },
      {
        id: 'dj2',
        title: 'Summer Festival Performance',
        description: 'Headlining at Lisbon Electronic Festival',
        type: 'image',
        url: '/deejaywg/IMG_8976.jpg',
        date: '2024',
        category: 'Performance',
        photographer: 'Festival Media Team',
        location: 'Lisbon, Portugal',
        client: 'Lisbon Electronic Festival',
        year: 2024,
        featured: true,
        professional: true,
        tags: ['festival', 'performance', 'headliner', 'electronic']
      },
      {
        id: 'dj3',
        title: 'Studio Session',
        description: 'Creating new tracks for upcoming EP',
        type: 'image',
        url: '/deejaywg/IMG_8987.jpg',
        date: '2023',
        category: 'Production'
      },
      {
        id: 'dj4',
        title: 'Ibiza Club Night',
        description: 'Guest DJ at renowned Ibiza nightclub',
        type: 'image',
        url: '/deejaywg/IMG_8992.jpg',
        date: '2024',
        category: 'Performance'
      },
      {
        id: 'dj5',
        title: 'Album Cover Photoshoot',
        description: 'Behind the scenes of "Electronic Horizons" album artwork',
        type: 'image',
        url: '/deejaywg/IMG_8996.jpg',
        date: '2023',
        category: 'Promotion'
      },
      {
        id: 'dj6',
        title: 'Radio Interview',
        description: 'Discussing music influences and upcoming projects',
        type: 'image',
        url: '/deejaywg/IMG_8999.jpg',
        date: '2024',
        category: 'Media'
      }
    ],
  },
  {
    id: '2',
    name: 'Jessica Dias',
    industry: 'modeling',
    gender: 'female',
    ageGroup: 'adult',
    profession: 'Model',
    location: 'Leeds, UK',
    bio: 'Jéssica Dias is a model with a striking presence and natural elegance that stands out both on the runway and in front of the camera. With an expressive gaze and a versatility that allows her to adapt to different styles and concepts, Jéssica brings authenticity and professionalism to every project. From editorial fashion to commercial campaigns, her charisma and ability to embody creative visions make her the ideal choice for brands seeking impact, beauty, and attitude in one face.',
    tagline: 'More than an image, an identity.',
    skills: ['Runway', 'Photoshoot', 'Commercial', 'Music Video Modeling', 'and more'],
    imageSrc: '/jessicadias/IMG_9288-altered.jpg',
    featured: true,
    socialLinks: {
      instagram: 'https://instagram.com/miss_chocolatinha/',
      tiktok: 'https://tiktok.com/@miss_chocolatinha',
    },
    portfolio: [
      {
        id: 'jd1',
        title: 'Summer Campaign 2025',
        description: 'Lead model for exclusive beachwear collection',
        type: 'image',
        url: '/jessicadias/IMG_9193-altered.jpg',
        date: '2025',
        category: 'Campaign'
      },
      {
        id: 'jd2',
        title: 'Vogue Brasil Editorial',
        description: 'Featured in "Colors of Brazil" spread',
        type: 'image',
        url: '/jessicadias/IMG_9214-altered.jpg',
        date: '2024',
        category: 'Editorial'
      },
      {
        id: 'jd3',
        title: 'Paris Fashion Week',
        description: 'Runway for top designer spring collection',
        type: 'image',
        url: '/jessicadias/IMG_9288-altered.jpg',
        date: '2024',
        category: 'Runway'
      },
      {
        id: 'jd4',
        title: 'Luxury Brand Accessories',
        description: 'Jewelry and accessories campaign',
        type: 'image',
        url: '/jessicadias/IMG_9365-altered.jpg',
        date: '2023',
        category: 'Commercial'
      },
      {
        id: 'jd5',
        title: 'Behind the Scenes',
        description: 'NYC photoshoot for fashion magazine',
        type: 'image',
        url: '/jessicadias/IMG_9380-altered.jpg',
        date: '2023',
        category: 'Editorial'
      },
      {
        id: 'jd6',
        title: 'Summer Cosmetics',
        description: 'Featured in makeup campaign for international brand',
        type: 'image',
        url: '/jessicadias/IMG_9412-altered.jpg',
        date: '2024',
        category: 'Commercial'
      }
    ],
  },
  {
    id: '3',
    name: 'Joao Rodolfo',
    industry: 'music',
    gender: 'male',
    ageGroup: 'senior',
    profession: 'Singer-Songwriter',
    location: 'Leeds, UK',
    bio: 'João Rodolfo is one of the voices in Guiné-Bissau\'s music scene, deeply rooted in gumbé - a genre rich in identity, rhythm, and tradition. Through his music and an authentic presence, João Rodolfo addresses sensitive themes with courage and sensitivity, turning silenced stories into living art. More than just singing, João Rodolfo gives voice to the soul of a culture.',
    tagline: 'From the heart to the world.',
    skills: ['Vocals', 'Guitar', 'Songwriting', 'Live Performance'],
    imageSrc: '/joaorodolfo/JROD_2.jpg',
    featured: true,
    socialLinks: {
      instagram: 'https://instagram.com/joaorodolfo_official/',
      tiktok: 'https://tiktok.com/@joaorodolfo_official',
    },
    portfolio: [
      {
        id: 'jr1',
        title: 'Stage Performance',
        description: 'Live concert.',
        type: 'image',
        url: '/joaorodolfo/JROD_1.jpg',
        date: '2025',
        category: 'Performance'
      },
      {
        id: 'jr2',
        title: 'Interview Session',
        description: 'In-house interview.',
        type: 'video',
        thumbnailUrl: '/joaorodolfo/JROD_2.jpg',
        url: 'https://youtu.be/33YE8piwpM8?si=kwRIzM_1HPuk21-U',
        date: '2025',
        category: 'Studio'
      }
    ],
  },
  {
    id: '4',
    name: 'Antonio Monteiro',
    industry: 'sports',
    gender: 'male',
    ageGroup: 'adult',
    profession: 'football player',
    location: 'Leeds, UK',
    bio: "Antonio Monteiro is a semi-professional footballer whose calm presence, work ethic, and fast tactical understanding set him apart. With natural composure and a sharp footballing mind, he seamlessly adapts to multiple roles across the pitch, always focused on contributing to the team's success. Primarily playing as a central midfielder (CM) and defensive midfielder (CDM), Antonio is also highly effective at left back (LB) and right back (RB). Though not his preferred role, he can also step into a centre-back (CB) position when needed, demonstrating reliability and positional awareness. Known for his humility, dedication, and consistency, Antonio is the kind of player who leads through action, not noise — a true asset to any squad.",
    tagline: 'Smart on the ball. Solid in every role.',
    skills: ['Ball Distribution', 'Tempo Control', 'Defensive Awareness', 'Overlapping Runs', 'Positioning', 'Interceptions', 'Calm Under Pressure'],
    imageSrc: '/antoniomonteiro/Tonecas_1.jpg',
    featured: true,
    socialLinks: {
      instagram: 'https://instagram.com/antoniolaflare98',
    },
    previousClubs: [
      { years: '2025–Present', team: 'South Leeds FC', appearances: 1, goals: 0 },
      { years: '2023–2024', team: 'Shirebrook Town FC', appearances: 23, goals: 3 },
    ],
    portfolio: [
      {
        id: 'am1',
        title: 'Match Action 1',
        description: 'Midfield battle',
        type: 'image',
        url: '/antoniomonteiro/Tonecas_1.jpg',
        date: '2024',
        category: 'Match'
      },
      {
        id: 'am2',
        title: 'Match Action 2',
        description: 'Dribbling past opponent',
        type: 'image',
        url: '/antoniomonteiro/Tonecas_2.jpg',
        date: '2024',
        category: 'Match'
      },
      {
        id: 'am3',
        title: 'Match Action 3',
        description: 'Pressing forward',
        type: 'image',
        url: '/antoniomonteiro/Tonecas_3.jpg',
        date: '2024',
        category: 'Match'
      },
      {
        id: 'am4',
        title: 'Coach Talk',
        description: 'Receiving tactical instructions',
        type: 'image',
        url: '/antoniomonteiro/Tonecas_4.jpg',
        date: '2024',
        category: 'Training'
      },
      {
        id: 'am5',
        title: 'Tunnel Focus',
        description: 'Focused before kickoff',
        type: 'image',
        url: '/antoniomonteiro/Tonecas_5.jpg',
        date: '2024',
        category: 'Portrait'
      }
    ],
  },
];

export function getFeaturedTalents(): Talent[] {
  return talents.filter(talent => talent.featured);
}

export function getTalentsByIndustry(industry: Industry): Talent[] {
  return talents.filter(talent => talent.industry === industry);
}

export function getTalentById(id: string): Talent | undefined {
  return talents.find(talent => talent.id === id);
}
