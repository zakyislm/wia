import { Suspense } from "react";
import { TopicDetail } from "@/features/topics/TopicDetail";
import { PageSkeleton } from "@/components/ui/Skeleton";

async function Content({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
