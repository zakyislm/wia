import { Suspense } from "react";
import { TopicDetail } from "@/features/topics/TopicDetail";

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
    <Suspense fallback={<p role="status">Memuat topik…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
