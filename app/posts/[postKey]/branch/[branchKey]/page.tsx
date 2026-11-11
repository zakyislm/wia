import type { Metadata } from "next";
import { PostDetail } from "@/features/posts/PostDetail";
import { formatPostPageTitle } from "@/lib/title";
import { db, posts } from "@/db";
import { eq } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postKey: string; branchKey: string }>;
}): Promise<Metadata> {
  const { postKey, branchKey } = await params;
  try {
    const [dbPost, dbReply] = await Promise.all([
      db.query.posts.findFirst({
        where: eq(posts.id, postKey),
        with: { author: true },
      }),
      db.query.posts.findFirst({
        where: eq(posts.id, branchKey),
        with: { author: true },
      }),
    ]);
    if (!dbPost) return { title: "Balasan" };
    const authorName = dbReply?.isAnonymous
      ? "Warga Anonim"
      : dbReply?.author?.name || dbPost.author?.name || "Warga KAVI";
    const titleStr = formatPostPageTitle(
      {
        content: dbPost.content,
        anonymous: Boolean(dbPost.isAnonymous),
        kind: dbPost.kind === "report" ? "report" : "general",
      },
      dbPost.author?.name,
      dbReply?.content ?? "",
    );
    const description = (dbReply?.content || dbPost.content).slice(0, 160);
    return {
      title: {
        absolute: titleStr,
      },
      description,
      authors: [{ name: authorName }],
      creator: authorName,
      publisher: "KAVI",
      alternates: {
        canonical: `/posts/${postKey}/branch/${branchKey}`,
      },
      openGraph: {
        type: "article",
        locale: "id_ID",
        siteName: "KAVI",
        title: titleStr,
        description,
        url: `/posts/${postKey}/branch/${branchKey}`,
        authors: [authorName],
      },
      twitter: {
        card: "summary",
        title: titleStr,
        description,
      },
    };
  } catch {
    return { title: "Balasan" };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ postKey: string; branchKey: string }>;
}) {
  const keys = await params;
  return <PostDetail {...keys} />;
}
