import { Suspense } from "react";
import { PostDetail } from "@/features/posts/PostDetail";
import { PageSkeleton } from "@/components/ui/Skeleton";

async function Detail({
  params,
}: {
  params: Promise<{ postKey: string; branchKey: string }>;
}) {
  const keys = await params;
  return <PostDetail {...keys} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ postKey: string; branchKey: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <Detail params={params} />
    </Suspense>
  );
}
