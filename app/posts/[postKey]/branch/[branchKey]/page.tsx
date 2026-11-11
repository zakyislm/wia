import type { Metadata } from "next";
import { Suspense } from "react";
import { PostDetail } from "@/features/posts/PostDetail";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { people, seedPosts } from "@/mocks/data";
import { formatPostPageTitle } from "@/lib/title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postKey: string; branchKey: string }>;
}): Promise<Metadata> {
  const { postKey, branchKey } = await params;
  const post = seedPosts().find((item) => item.localKey === postKey);
  if (!post) return { title: "Balasan" };
  const author = people.find((person) => person.localKey === post.authorKey);
  const reply = post.replies.find((item) => item.localKey === branchKey);
  return {
    title: {
      absolute: formatPostPageTitle(post, author?.name, reply?.content ?? ""),
    },
  };
}

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
