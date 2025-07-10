import { notFound } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { BlogPostContent } from "@/components/talents/BlogPostContent";

// Sample blog posts data
const blogPosts = [
  {
    id: "1",
    title: "Behind the Scenes: Fashion Week with Our Models",
    excerpt: "Go backstage with VersaTalent's models as they navigate the glamorous chaos of New York Fashion Week.",
    content: `
      <p>Fashion Week—it's the pinnacle of the modeling world, where careers are made and trends are born. For our VersaTalent models, it's both an exhilarating opportunity and an intense challenge that requires stamina, professionalism, and adaptability.</p>

      <h2>The Preparation</h2>
      <p>Weeks before the runway lights turn on, our models begin a rigorous preparation process. Physical conditioning, nutrition planning, and fittings fill their schedules. "It's not just about looking your best," shares Marcus Chen, one of our top models. "It's about building the endurance to handle multiple shows a day, sometimes with just minutes to transform from one designer's vision to another's."</p>

      <p>Our agency works closely with each talent to ensure they're mentally and physically prepared for the demands ahead. This includes everything from arranging transportation between venues to providing on-call support for any challenges that arise.</p>

      <h2>Backstage Reality</h2>
      <p>While the runway presents a polished, seamless display, backstage tells a different story. It's organized chaos—designers making last-minute adjustments, makeup artists working at lightning speed, and production staff coordinating precise timing.</p>

      <p>"People would be surprised at how technical it all is," notes Sophia Wu, who walked in six shows during the recent New York Fashion Week. "There's a whole language to runway walking that changes for each designer. One might want powerful strides, while another needs a more fluid, ethereal movement."</p>

      <h2>The Business Behind the Glamour</h2>
      <p>Fashion Week isn't just about artistic expression—it's a sophisticated business operation. For our models, it's an opportunity to build relationships with designers, photographers, and creative directors that can lead to campaign work and long-term partnerships.</p>

      <p>At VersaTalent, we ensure our models approach these events strategically. "We coach our talent to understand the business side of modeling," explains Emma Richards, our Modeling Division Director. "Which connections to nurture, how to follow up professionally, and how to leverage runway work into broader career opportunities."</p>

      <h2>Self-Care in the Spotlight</h2>
      <p>With early call times, late-night events, and high-pressure situations, Fashion Week can be physically and emotionally draining. Our agency prioritizes our models' wellbeing, ensuring they have access to nutrition, rest, and mental health support throughout.</p>

      <p>"The secret to surviving Fashion Week is balance," shares Marcus. "For every high-energy runway moment, you need a quiet recovery period. Our agency actually schedules these in for us, which is something I really value about working with VersaTalent."</p>

      <h2>Beyond the Runway</h2>
      <p>As Fashion Week continues to evolve in the digital age, so do the opportunities for our models. Many now document their Fashion Week experiences for social media, creating valuable content for both personal branding and the designers they represent.</p>

      <p>This intersection of traditional modeling and digital content creation represents the future of the industry—a space where VersaTalent models are thriving by bringing authenticity and professionalism to both worlds.</p>

      <p>As we look toward next season, our team is already preparing for an even stronger presence on the global runway circuit, continuing to showcase the exceptional talent that defines VersaTalent.</p>
    `,
    date: "April 12, 2025",
    author: "Emma Richards",
    authorRole: "Modeling Division Director",
    authorImage: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
    category: "Modeling",
    image: "https://images.unsplash.com/photo-1520228504846-3762f4240df8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
    relatedPosts: ["2", "6"],
  },
  {
    id: "2",
    title: "From Script to Screen: Our Actors' Journey",
    excerpt: "Follow the transformative process our actors go through when preparing for complex roles.",
    content: "This is a placeholder for the full article content.",
    date: "April 5, 2025",
    author: "Michael Chen",
    authorRole: "Acting Division Lead",
    authorImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
    category: "Acting",
    image: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
    relatedPosts: ["1", "5"],
  },
  {
    id: "3",
    title: "The Art of Culinary Storytelling",
    excerpt: "How our culinary artists blend cultural heritage with innovative techniques to create memorable dining experiences.",
    content: "This is a placeholder for the full article content.",
    date: "March 28, 2025",
    author: "Sofia Rodríguez",
    authorRole: "Culinary Talent Manager",
    authorImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
    category: "Culinary",
    image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
    relatedPosts: ["4", "6"],
  },
  {
    id: "4",
    title: "Mental Conditioning for Elite Athletes",
    excerpt: "Our sports talents share their psychological approaches to maintaining peak performance under pressure.",
    content: "This is a placeholder for the full article content.",
    date: "March 21, 2025",
    author: "Jamal Washington",
    authorRole: "Sports Division Director",
    authorImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
    category: "Sports",
    image: "https://images.unsplash.com/photo-1517649763962-0c62306601d4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
    relatedPosts: ["3", "5"],
  },
  {
    id: "5",
    title: "Finding Your Voice: A Songwriter's Perspective",
    excerpt: "One of our musicians discusses the creative process behind developing a distinctive sound in a crowded industry.",
    content: "This is a placeholder for the full article content.",
    date: "March 14, 2025",
    author: "Zara Collins",
    authorRole: "Music Artist",
    authorImage: "https://images.unsplash.com/photo-1534126511268-a1b2bec5ff7b?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
    category: "Music",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
    relatedPosts: ["2", "4"],
  },
  {
    id: "6",
    title: "The Evolution of Brand Partnerships",
    excerpt: "How the relationship between talent and brands has transformed in the digital age, creating new opportunities.",
    content: "This is a placeholder for the full article content.",
    date: "March 7, 2025",
    author: "Emma Richards",
    authorRole: "Modeling Division Director",
    authorImage: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
    category: "Industry Insights",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
    relatedPosts: ["1", "3"],
  },
  {
    id: "7",
    title: "João Rodolfo: From Gumbé Roots to Global Goals – Exclusive Interview",
    excerpt: "In an intimate chat, João shares his journey from Guinea-Bissau to the UK, the cultural heartbeat behind his music, and where he hopes it takes him next.",
    content: `
      <p>Earlier this month our very own João Rodolfo sat down with our in-house channel <strong>VersaTalent Talks</strong> to talk about life, music, and the road that led him from the vibrant streets of Bissau to the stages of Europe.</p>

      <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin:2rem 0;">
        <iframe src="https://www.youtube.com/embed/33YE8piwpM8" title="João Rodolfo Interview" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
      </div>

      <h2>Crossing Continents</h2>
      <p>Moving to the UK was both liberating and daunting. Language barriers, cultural shock, and the hustle of a new music scene demanded resilience. João credits his tight-knit community and an unwavering belief in the stories he carries for helping him push through.</p>

      <h2>The Message Behind the Music</h2>
      <p>João’s songwriting is rooted in social commentary: from diaspora identity to everyday joys and struggles. “If one listener feels seen by my lyrics, that’s success,” he notes.</p>

      <h2>What’s Next?</h2>
      <ul>
        <li><strong>Debut EP:</strong> A fusion of gumbé, afro-soul, and contemporary folk, slated for late 2025.</li>
        <li><strong>Dont miss out!</strong> Stay tuned to know the latest news about João Rodolfo</li>
      </ul>

      <p>Watch the full interview above for João’s thoughts on staying authentic, and the power of music to bridge cultures.</p>
    `,
    date: "June 5, 2025",
    author: "VersaTalent Team",
    authorRole: "Editorial",
    authorImage: "/images/versatalent-new-logo.png",
    category: "Music",
    image: "/joaorodolfo/JROD_2.jpg",
    relatedPosts: ["5"],
  },
  {
    id: "8",
    title: "Deejay WG’s Travel Edition: A Genre-Blending Journey Around the Globe",
    excerpt: "From Afrobeat sunsets to Amapiano nights, explore WG’s new mix series proving no dancefloor is too far.",
    content: `
      <p>When Deejay WG boards a plane, he packs two essentials: open-format curiosity and a USB full of rhythms from every corner of the world. His new <strong>Travel Edition</strong> playlist <a href="https://www.youtube.com/playlist?list=PLxfg5R2jNuFWtd22OFRxHKgm3sqY7R_PY" target="_blank">(listen here)</a> is both a postcard and a passport— with mixes recorded live in Portugal,and in the UK.</p>

      <div style="position:relative;padding-bottom:56.25%;height:0;margin:2rem 0;">
        <iframe src="https://www.youtube.com/embed/videoseries?list=PLxfg5R2jNuFWtd22OFRxHKgm3sqY7R_PY" title="Travel Edition Playlist" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
      </div>

      <h2>Mix Highlights</h2>
      <ul>
        <li><strong>Lisbon Sunset:</strong> A seamless ride from Semba classics to pumping Afro-house.</li>
        <li><strong>UK Vibes:</strong> Afrobeats riddims washed down with a hint of portuguese grooves.</li>
      </ul>

      <h2>Why It Works</h2>
      <p>WG’s philosophy is simple: <em>“Every city has a heartbeat — my job is to plug the speakers straight into it.”</em> By layering familiar hooks with unexpected transitions, he breaks genre walls and builds new sonic bridges.</p>

      <h2>What’s Next?</h2>
      <p>With more tour dates on the horizon, expect fresh episodes featuring different music styles, and surprise guest MCs. Follow the playlist to keep up—each new city adds another stamp to the Travel Edition passport.</p>
    `,
    date: "June 6, 2025",
    author: "VersaTalent Team",
    authorRole: "Editorial",
    authorImage: "/images/versatalent-new-logo.png",
    category: "Music",
    image: "/deejaywg/IMG_8999.jpg",
    relatedPosts: ["7", "5"],
  },
  {
    id: "9",
    title: "Jessica Dias: From Uniquee Runway to Graduate Fashion Showcase Star",
    excerpt: "VersaTalent’s rising model discusses her runway wins, creative ambitions, and what’s next after landing a spot in the 2025 Graduate Fashion Comms Showcase.",
    content: `
      <p>Jessica Dias embodies poise and power in equal measure. Already a familiar face on Leeds’ creative scene, she broke out with back-to-back appearances at the <strong>Uniquee Fashion Show</strong>—first dazzling crowds in the inaugural edition and then levelling-up her presence for the sequel.</p>

      <h2>Runway Highlights</h2>
      <p><em>Uniquee Fashion Show – 1st Edition</em></p>
      <iframe src="https://www.instagram.com/reel/C7ej4W-i_Gp/embed" title="Uniquee 1st Edition" class="w-full aspect-video my-6"></iframe>

      <p><em>Uniquee Fashion Show – 2nd Edition</em></p>
      <iframe src="https://www.instagram.com/reel/DJUz5pDCs00/embed" title="Uniquee 2nd Edition" class="w-full aspect-video mb-6"></iframe>

      <h2>Versatility on Display</h2>
      <p>From sharp tailoring to flowing avant-garde silhouettes, Jessica adapts instantly. Designers praise her for “reading” the garment—knowing when to command the stage and when to let the fabric speak.</p>

      <h2>Aspiring Content Creator &amp; UGC Partner</h2>
      <p>Outside the catwalk Jessica curates lifestyle reels that spotlight sustainable fashion and everyday elegance. Brands value her creative eye and audience engagement, making her an ideal UGC collaborator.</p>

      <h2>Next Stop: Graduate Fashion Comms Showcase 2025</h2>
      <p>Jessica has been invited to model at the joint <strong>Leeds Beckett × Liverpool John Moores Graduate Fashion Comms Showcase</strong> on <strong>6&nbsp;June&nbsp;2025</strong>. Expect bold concepts, fresh designers—and Jessica bringing their visions to life.</p>

      <h2>Bonus Behind-the-Scenes</h2>
      <iframe src="https://www.instagram.com/reel/DJXdxOWiGS3/embed" title="Uniquee BTS" class="w-full aspect-video my-6"></iframe>

      <p>Follow along as Jessica continues to turn runway moments into lasting brand stories.</p>
    `,
    date: "June 6, 2025",
    author: "VersaTalent Team",
    authorRole: "Editorial",
    authorImage: "/images/versatalent-new-logo.png",
    category: "Modeling",
    image: "/jessicadias/IMG_9193-altered.jpg",
    relatedPosts: ["1", "7"],
  },
  {
    id: "10",
    title: "Antonio Monteiro: Resilience Beyond the Spot-Kick",
    excerpt: "After Shirebrook Town’s penalty heartbreak, our versatile midfielder reflects on lessons learned and goals for next season.",
    content: `
      <p><a href="https://www.chad.co.uk/sport/penalty-curse-strikes-shirebrook-town-again-4793797" target="_blank">Local coverage</a> captured every nerve-racking moment as Shirebrook Town once again fell to a penalty curse. For 90 minutes plus extra time, Antonio Monteiro patrolled midfield with trademark calm: breaking lines, recycling possession, and tracking back when danger loomed.</p>

      <h2>Reading the Game</h2>
      <p>Fans noted Antonio’s ability to slow the tempo when Shirebrook needed composure, then ignite quick overlap runs when space appeared. “Tempo control is half the battle,” he said post-match. “You earn the right to attack by first dictating rhythm.”</p>

      <h2>Learning from Heartbreak</h2>
      <p>Penalty defeats sting, but Antonio views them as growth opportunities: “Pressure exposes details we must refine—technique, breathing, routine. We’ll be back stronger.”</p>

      <h2>Versatility Value</h2>
      <p>Whether shielding the back four or pushing into half-spaces, Antonio’s football IQ and positional discipline make him a manager’s dream. His stats this season include:</p>
      <ul>
        <li>87% pass accuracy (third highest in the league)</li>
        <li>31 interceptions</li>
        <li>12 key passes leading to shots</li>
      </ul>

      <h2>Aspirations</h2>
      <p>Off-season plans include specialised finishing drills—yes, even midfielders need ice-cold penalties—plus elite conditioning ahead of pre-season friendlies where scouts from higher divisions will watch.</p>

      <p>Follow Antonio’s journey as he turns setback into fuel for the season ahead.</p>
    `,
    date: "June 6, 2025",
    author: "VersaTalent Team",
    authorRole: "Editorial",
    authorImage: "/images/versatalent-new-logo.png",
    category: "Sports",
    image: "/antoniomonteiro/Tonecas_1.jpg",
    relatedPosts: ["4", "8"],
  },
  {
    id: "11",
    title: "Spotlight on Jessica Dias: From Runway to Content Creation",
    excerpt: "Discover Jessica Dias' journey as a rising model and creator — from Uniquee Fashion Show to the 2025 Graduate Showcase.",
    content: `
      <p>Jessica Dias is the definition of elegance in motion. With her striking presence, calm confidence, and undeniable charisma, she has carved a name for herself in the fashion world, while also setting her sights on content creation and brand collaborations.</p>

      <h2>Uniquee Fashion Show: Where It All Began</h2>
      <p>Jessica’s modeling career began gaining attention when she took part in the <strong>1st Edition of the Uniquee Fashion Show</strong>. Her grace on the runway and natural command of the spotlight instantly made her one to watch. <a href="https://www.instagram.com/reel/C7ej4W-i_Gp/?igsh=MW9kZDNveG80cWkyNg==" target="_blank">Watch the 1st Edition here</a>.</p>

      <p>She returned for the <strong>2nd Edition</strong>, even more polished and powerful. Her walk exuded confidence, and her evolving personal style drew the attention of both designers and the audience alike. <a href="https://www.instagram.com/reel/DJUz5pDCs00/?igsh=amdkM3U3YmxsMGdz" target="_blank">See the 2nd Edition highlight here</a>.</p>

      <p>Want a glimpse of Jessica behind the scenes? <a href="https://www.instagram.com/reel/DJXdxOWiGS3/?igsh=aW40ZWt0dmhnaGZt" target="_blank">Watch this bonus clip</a> where she shares a personal moment from the show.</p>

      <h2>Beyond the Runway: A Vision for Creation</h2>
      <p>Jessica isn’t just a model — she’s a modern muse with a creative spark. Her interest in <strong>UGC (User Generated Content)</strong> and visual storytelling makes her a unique voice in today’s digital landscape. Whether she's walking a runway or shooting lifestyle content, Jessica understands the power of authenticity and aesthetic.</p>

      <p>She has already collaborated with several brands, bringing professionalism and a fresh perspective to each campaign. Her growing portfolio includes partnerships with brands like <strong>On The Silk</strong>, <strong>Ugly Pants</strong>, and others — where her ability to translate brand identity into relatable content has stood out.</p>

      <h2>Next Stop: 2025 Graduate Fashion Comms Showcase</h2>
      <p>Jessica’s next major appearance will be at the <strong>Leeds Beckett x Liverpool John Moores: 2025 Graduate Fashion Comms Showcase</strong> on <strong>6th June 2025</strong> — a prestigious event that brings together emerging creative talent from across the North. This is a major milestone for her career and another opportunity to shine in front of industry leaders.</p>

      <h2>The Future Is Bright</h2>
      <p>With a growing portfolio and a genuine passion for visual expression, Jessica Dias is not only defining her space in fashion but also building a path in content creation. From curated campaigns to runway elegance, she represents the future of modern modeling.</p>

      <p>Stay tuned — this is only the beginning.</p>
    `,
    date: "June 2, 2025",
    author: "VersaTalent Team",
    authorRole: "Editorial",
    authorImage: "/images/versatalent-new-logo.png",
    category: "Modeling",
    image: "/jessicadias/IMG_9412-altered.jpg",
    relatedPosts: ["1", "6"]
  },
  {
    id: "12",
    title: "João Rodolfo Returns with Re-Release of Impactful Album 'Pedofilia'",
    excerpt: "Singer João Rodolfo is back with a bold re-release of his powerful album 'Pedofilia', available August 1st on all platforms.",
    content: `
      <p>João Rodolfo is more than an artist; he's a voice for reality. With his unique style, João uses music as a medium to tell stories that matter. As a passionate singer-songwriter, his goal has always been to bring awareness, spark reflection, and elevate the cultural identity of his homeland.</p>

      <h2>Reintroducing 'Pedofilia': An Album With a Message</h2>
      <p>Originally created to challenge, provoke, and educate, <strong>'Pedofilia'</strong> is one of João Rodolfo's most heartfelt and socially conscious projects. The album is now being re-released with renewed energy and visibility — featuring <strong>7 deeply reflective tracks</strong> that explore themes of injustice, community struggle, and everyday life in Guine-Bissau.</p>

      <p>This isn't just music — it's a documentary in sound. Each track represents a chapter, a story that gives voice to the voiceless, anchored in raw truth and lived experience.</p>

      <h2>Mark Your Calendars: August 1st</h2>
      <p>The re-release of 'Pedofilia' will be available on <strong>August 1st, 2025</strong> across all digital platforms — including Spotify, Apple Music, YouTube, and more. Distributed via DistroKid, the album aims to reach global audiences with its message of awareness and cultural pride.</p>

      <p><img src="/joaorodolfo/camera.PNG" alt="João Rodolfo - Pedofilia Album" style="width:100%; max-width:700px; border-radius:12px; margin-top:20px;" /></p>

      <h2>Looking Ahead</h2>
      <p>João Rodolfo continues to pave the way for conscious music in Lusophone Africa. As he builds his legacy, his aspirations include reaching broader audiences, creating space for dialogue, and collaborating with other artists who share a mission to tell the truth through art.</p>

      <p>If you haven't heard 'Pedofilia' before, now is the time. And if you have — listen again, this time with new ears and an open heart.</p>

      <h2>Call to Action</h2>
      <p><strong>Save the date:</strong> August 1st. Stream, share, and support 'Pedofilia' on all major platforms. Let João Rodolfo's message be heard far and wide.</p>

      <p>Follow him on social media and stay tuned for visuals, behind-the-scenes stories, and exclusive content surrounding the re-release.</p>
    `,
    date: "July 4, 2025",
    author: "VersaTalent Team",
    authorRole: "Editorial",
    authorImage: "/images/versatalent-new-logo.png",
    category: "Music",
    image: "/joaorodolfo/Joao_Rodolfo_-_Album_Cover.png",
    relatedPosts: ["7", "3"]
  },
];

// Generate static paths for all blog posts
export function generateStaticParams() {
  return blogPosts.map((post) => ({
    id: post.id,
  }));
}

export default function BlogPostPage({ params }: { params: { id: string } }) {
  // Find the blog post by ID
  const post = blogPosts.find((post) => post.id === params.id);

  // If the post is not found, return 404
  if (!post) {
    notFound();
  }

  // Get related posts
  const relatedPosts = post.relatedPosts
    ? blogPosts.filter((relPost) => post.relatedPosts.includes(relPost.id))
    : [];

  return (
    <MainLayout>
      <BlogPostContent post={post} relatedPosts={relatedPosts} />
    </MainLayout>
  );
}
