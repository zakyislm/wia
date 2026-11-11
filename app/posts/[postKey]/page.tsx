import { Suspense } from "react";
import { PostDetail } from "@/features/posts/PostDetail";
import { PageSkeleton } from "@/components/ui/Skeleton";

async function Detail({ params }: { params: Promise<{ postKey: string }> }) {
  const keys = await params;
  return <PostDetail postKey={keys.postKey} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ postKey: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <Detail params={params} />
    </Suspense>
  );
}
