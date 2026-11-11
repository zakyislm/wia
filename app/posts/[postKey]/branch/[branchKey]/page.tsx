import type { Metadata } from "next";
import { PostDetail } from "@/features/posts/PostDetail";
import { formatPostPageTitle } from "@/lib/title";
import { db, posts } from "@/db";
import { eq } from "drizzle-orm";
import { generateBreadcrumbJsonLd } from "@/lib/seo";

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
        with: { author: true, topic: true, postTags: { with: { tag: true } } },
      }),
      db.query.posts.findFirst({
        where: eq(posts.id, branchKey),
        with: { author: true },
      }),
    ]);
    if (!dbPost) return { title: "Balasan" };
    const authorName = dbReply?.isAnonymous
      ? "Warga Anonim"
      : dbReply?.author?.name || dbPost.author?.name || "Warga Kavi";
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
    const tagNames = (dbPost.postTags || [])
      .map((pt) => pt.tag?.name)
      .filter((n): n is string => Boolean(n));
    const keywords = [
      dbPost.topic?.name,
      dbPost.province,
      ...tagNames,
      authorName,
      "Kavi",
      "Balasan Diskusi Warga",
    ].filter((k): k is string => Boolean(k));

    return {
      title: {
        absolute: titleStr,
      },
      description,
      authors: [{ name: authorName }],
      creator: authorName,
      publisher: "Kavi",
      keywords,
      alternates: {
        canonical: `/posts/${postKey}/branch/${branchKey}`,
      },
      openGraph: {
        type: "article",
        locale: "id_ID",
        siteName: "Kavi",
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
  const breadcrumb = generateBreadcrumbJsonLd([
    { name: "Beranda", path: "/home" },
    { name: "Postingan", path: `/posts/${keys.postKey}` },
    { name: "Balasan", path: `/posts/${keys.postKey}/branch/${keys.branchKey}` },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PostDetail {...keys} />
    </>
  );
}
