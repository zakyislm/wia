import type { Metadata } from "next";
import { Suspense } from "react";
import { PostDetail } from "@/features/posts/PostDetail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { people, seedPosts } from "@/mocks/data";
import { formatPostPageTitle } from "@/lib/title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postKey: string }>;
}): Promise<Metadata> {
  const { postKey } = await params;
  const post = seedPosts().find((item) => item.localKey === postKey);
  if (!post) return { title: "Postingan" };
  const author = people.find((person) => person.localKey === post.authorKey);
  return { title: { absolute: formatPostPageTitle(post, author?.name) } };
}

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
