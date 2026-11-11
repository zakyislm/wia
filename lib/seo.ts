import { Metadata } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.kavi.jeki.me").replace(/\/$/, "");

export interface PostSeoData {
  id: string;
  title: string;
  content: string;
  images?: string[] | null;
  locationName?: string | null;
  province?: string | null;
  status: string;
  closeType?: string | null;
  upvotesCount: number;
  commentsCount: number;
  postedAt: Date | number;
  updatedAt: Date | number;
  tags?: string[];
  author: {
    name: string;
    username: string;
    image?: string | null;
    role?: string;
    agencyName?: string | null;
  };
  topic?: {
    name: string;
    slug: string;
  } | null;
  resolutionComment?: {
    content: string;
    createdAt: Date | number;
    author: {
      name: string;
      agencyName?: string | null;
    };
  } | null;
}

/**
 * Builds deduplicated dynamic SEO keywords from DB entity fields
 */
export function generatePostKeywords(post: PostSeoData): string[] {
  const raw = [
    post.topic?.name,
    post.province,
    post.locationName,
    ...(post.tags || []).map((t) => t.replace(/^#/, "")),
    post.author.agencyName || post.author.name,
    post.status === "CLOSED" && post.closeType === "SOLVED"
      ? "Laporan Selesai"
      : "Laporan Warga",
    post.resolutionComment?.author.agencyName,
    "Kavi",
    "Pengaduan Masyarakat",
    "Aspirasi Publik Indonesia",
  ];
  return Array.from(
    new Set(
      raw
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

/**
 * Generates automated clean 160-char description for SEO meta tags
 */
export function generateSmartDescription(post: PostSeoData): string {
  const statusBadge =
    post.status === "CLOSED"
      ? post.closeType === "SOLVED"
        ? "[SOLVED]"
        : "[SELESAI]"
      : "[LAPORAN AKTIF]";

  const locationPart = post.locationName
    ? `${post.locationName}, ${post.province || ""}`.trim()
    : post.province || "Indonesia";

  const cleanBody = post.content.replace(/\s+/g, " ").trim();
  const summaryPrefix = `${statusBadge} ${locationPart} — ${cleanBody}`;

  if (summaryPrefix.length <= 155) {
    return summaryPrefix;
  }

  return summaryPrefix.slice(0, 152) + "...";
}

/**
 * Generates dynamic Next.js Metadata for civic report detail pages
 */
export function generatePostMetadata(post: PostSeoData): Metadata {
  const title = `${post.title} | Kavi`;
  const description = generateSmartDescription(post);
  const canonicalUrl = `${baseUrl}/posts/${post.id}`;
  const ogImages = post.images && post.images.length > 0 ? post.images : undefined;
  const keywords = generatePostKeywords(post);

  return {
    title,
    description,
    authors: [
      {
        name: post.author.name,
        url: `${baseUrl}/profile/${post.author.username}`,
      },
    ],
    creator: post.author.name,
    publisher: "Kavi",
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Kavi",
      locale: "id_ID",
      type: "article",
      images: ogImages,
      publishedTime: new Date(post.postedAt).toISOString(),
      modifiedTime: new Date(post.updatedAt).toISOString(),
      authors: [post.author.name],
      section: post.topic?.name || "Isu Publik",
      tags: keywords,
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages,
    },
  };
}

/**
 * Generates Schema.org JSON-LD Structured Data for Google Rich Snippets
 * Uses DiscussionForumPosting & GovernmentService representation
 */
export function generatePostJsonLd(post: PostSeoData): Record<string, any> {
  const isSolved = post.status === "CLOSED" && post.closeType === "SOLVED";
  const keywords = generatePostKeywords(post);

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `${baseUrl}/posts/${post.id}#posting`,
    headline: post.title,
    articleBody: post.content,
    url: `${baseUrl}/posts/${post.id}`,
    datePublished: new Date(post.postedAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    keywords: keywords.join(", "),
    author: {
      "@type": post.author.role === "INSTANSI" ? "GovernmentOrganization" : "Person",
      name: post.author.agencyName || post.author.name,
      url: `${baseUrl}/profile/${post.author.username}`,
    },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.upvotesCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.commentsCount,
      },
    ],
  };

  if (post.topic?.name) {
    schema.about = {
      "@type": "Thing",
      name: post.topic.name,
    };
  }

  if (post.images && post.images.length > 0) {
    schema.image = post.images;
  }

  if (post.locationName || post.province) {
    schema.contentLocation = {
      "@type": "Place",
      name: post.locationName || post.province,
      address: {
        "@type": "PostalAddress",
        addressRegion: post.province,
        addressCountry: "ID",
      },
    };
  }

  // Official Government Resolution Answer (bikin Google nampilin Answer/Solved badge!)
  if (isSolved && post.resolutionComment) {
    schema.acceptedAnswer = {
      "@type": "Answer",
      text: post.resolutionComment.content,
      dateCreated: new Date(post.resolutionComment.createdAt).toISOString(),
      author: {
        "@type": "GovernmentOrganization",
        name: post.resolutionComment.author.agencyName || post.resolutionComment.author.name,
      },
      url: `${baseUrl}/posts/${post.id}#resolution`,
    };
  }

  return schema;
}

/**
 * Generates BreadcrumbList Schema.org JSON-LD
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
): Record<string, any> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };
}

/**
 * Generates WebSite & Organization Schema.org JSON-LD for root layout
 */
export function generateWebsiteJsonLd(keywords: string[]): Record<string, any> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Kavi — Ruang Suara & Laporan Warga",
        description:
          "Platform laporan warga, diskusi publik, dan pemantauan tindak lanjut instansi secara terbuka dan terverifikasi di Indonesia.",
        inLanguage: "id-ID",
        keywords: keywords.join(", "),
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${baseUrl}/explore?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Kavi",
        url: baseUrl,
        logo: `${baseUrl}/kavi.png`,
      },
    ],
  };
}

/**
 * Generates ProfilePage Schema.org JSON-LD for user/agency profile pages
 */
export function generateProfileJsonLd(profile: {
  id: string;
  name: string;
  username: string;
  bio?: string | null;
  image?: string | null;
  region?: string | null;
  role?: string | null;
  agencyName?: string | null;
}): Record<string, any> {
  const isAgency = profile.role === "INSTANSI" || Boolean(profile.agencyName);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${baseUrl}/profile/${profile.id}#profile`,
    url: `${baseUrl}/profile/${profile.id}`,
    mainEntity: {
      "@type": isAgency ? "GovernmentOrganization" : "Person",
      name: profile.agencyName || profile.name,
      alternateName: `@${profile.username}`,
      description:
        profile.bio ||
        `Profil publik ${profile.name} (@${profile.username}) di Kavi.`,
      image: profile.image || `${baseUrl}/kavi.png`,
      ...(profile.region
        ? {
            address: {
              "@type": "PostalAddress",
              addressRegion: profile.region,
              addressCountry: "ID",
            },
          }
        : {}),
    },
  };
}

/**
 * Generates CollectionPage Schema.org JSON-LD for feed/directory pages
 */
export function generateCollectionPageJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  keywords: string[];
}): Record<string, any> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}${opts.path}#collection`,
    name: opts.title,
    description: opts.description,
    url: `${baseUrl}${opts.path}`,
    inLanguage: "id-ID",
    keywords: opts.keywords.join(", "),
  };
}
