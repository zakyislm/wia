import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreView } from "@/features/explore/ExploreView";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatSearchTitle } from "@/lib/title";

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
    const description = `Hasil penelusuran laporan warga dan topik diskusi untuk "${clean}" di KAVI.`;
    return {
      title: { absolute: titleStr },
      description,
      keywords: [clean, "Jelajah KAVI", "Topik Laporan Warga"],
      openGraph: {
        title: titleStr,
        description,
        type: "website",
      },
    };
  }
  return {
    title: "Jelajah",
    description:
      "Jelajahi topik sorotan, laporan warga terhangat, dan instansi publik di KAVI.",
  };
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <ExploreView />
    </Suspense>
  );
}
