import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
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
    return { title: { absolute: formatSearchTitle(query) } };
  }
  return { title: "Jelajah" };
}

async function ExploreDynamicContent() {
  await connection();
  return <ExploreView />;
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <ExploreDynamicContent />
    </Suspense>
  );
}
