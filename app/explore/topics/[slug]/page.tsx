import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { TopicDetail } from "@/features/topics/TopicDetail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { findTopicNameBySlug } from "@/lib/topics";
import { formatSearchTitle } from "@/lib/title";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { q } = await searchParams;
  const topicName = findTopicNameBySlug(slug);
  const query = Array.isArray(q) ? q[0] : q;
  if (query?.trim()) {
    return { title: { absolute: formatSearchTitle(query, topicName) } };
  }
  return { title: topicName };
}

async function Content({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  return <TopicDetail slug={slug} />;
}

export default function ExploreTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <Content params={params} />
    </Suspense>
  );
}
