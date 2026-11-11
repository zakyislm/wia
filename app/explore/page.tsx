import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreView } from "@/features/explore/ExploreView";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatSearchTitle } from "@/lib/title";
import { db, topics, tags } from "@/db";
import { generateCollectionPageJsonLd } from "@/lib/seo";

async function fetchExploreKeywords(extra?: string): Promise<string[]> {
  try {
    const [dbTopics, dbTags] = await Promise.all([
      db.select({ name: topics.name }).from(topics).limit(8),
      db.select({ name: tags.name }).from(tags).limit(10),
    ]);
    return Array.from(
      new Set([
        ...(extra ? [extra] : []),
        ...dbTopics.map((t) => t.name),
        ...dbTags.map((t) => t.name.replace(/^#/, "")),
        "Jelajah Kavi",
        "Sorotan Topik",
        "Laporan Warga",
      ]),
    );
  } catch {
    return [
      ...(extra ? [extra] : []),
      "Jelajah Kavi",
      "Sorotan Topik",
      "Laporan Warga",
    ];
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] : q;
  if (query?.trim()) {
    const clean = query.trim();
    const titleStr = formatSearchTitle(clean);
    const description = `Hasil penelusuran laporan warga dan topik diskusi untuk "${clean}" di Kavi.`;
    const keywords = await fetchExploreKeywords(clean);
    return {
      title: { absolute: titleStr },
      description,
      keywords,
      openGraph: {
        title: titleStr,
        description,
        type: "website",
        siteName: "Kavi",
      },
    };
  }
  const keywords = await fetchExploreKeywords();
  return {
    title: "Jelajah",
    description:
      "Jelajahi topik sorotan, laporan warga terhangat, dan instansi publik di Kavi.",
    keywords,
  };
}

export default async function ExplorePage() {
  const keywords = await fetchExploreKeywords();
  const schema = generateCollectionPageJsonLd({
    title: "Jelajah — Kavi",
    description:
      "Jelajahi topik sorotan, laporan warga terhangat, dan instansi publik di Kavi.",
    path: "/explore",
    keywords,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Suspense fallback={<PageSkeleton variant="directory" />}>
        <ExploreView />
      </Suspense>
    </>
  );
}
