import type { Metadata } from "next";
import { PostDetail } from "@/features/posts/PostDetail";
import { db, posts } from "@/db";
import { eq, and } from "drizzle-orm";
import {
  generatePostMetadata,
  generatePostJsonLd,
  generateBreadcrumbJsonLd,
  type PostSeoData,
} from "@/lib/seo";

async function fetchPostSeoData(postKey: string): Promise<PostSeoData | null> {
  try {
    const [dbPost, resolutionReply] = await Promise.all([
      db.query.posts.findFirst({
        where: eq(posts.id, postKey),
        with: {
          author: true,
          topic: true,
          postTags: {
            with: { tag: true },
          },
        },
      }),
      db.query.posts.findFirst({
        where: and(
          eq(posts.rootPostId, postKey),
          eq(posts.isActionTaken, true),
          eq(posts.isDeleted, false),
        ),
        with: {
          author: true,
        },
      }),
    ]);

    if (!dbPost || dbPost.isDeleted) return null;

    const authorName = dbPost.isAnonymous
      ? "Warga Anonim"
      : dbPost.author?.name || "Warga Kavi";
    const authorUsername = dbPost.isAnonymous
      ? "anonim"
      : dbPost.author?.username || dbPost.authorId;
    const rawSnippet = dbPost.content.replace(/\s+/g, " ").trim().slice(0, 72);
    const derivedTitle =
      dbPost.title?.trim() || `${authorName}: "${rawSnippet}"`;
    const tagNames = (dbPost.postTags || [])
      .map((pt) => pt.tag?.name)
      .filter((n): n is string => Boolean(n));

    return {
      id: dbPost.id,
      title: derivedTitle,
      content: dbPost.content,
      images: Array.isArray(dbPost.images) ? dbPost.images : [],
      locationName: dbPost.locationName,
      province: dbPost.province,
      status: dbPost.status,
      closeType: dbPost.closeType,
      upvotesCount: dbPost.upvotesCount || 0,
      commentsCount: dbPost.commentsCount || 0,
      postedAt: dbPost.postedAt,
      updatedAt: dbPost.updatedAt,
      tags: tagNames,
      author: {
        name: authorName,
        username: authorUsername,
        image: dbPost.isAnonymous ? null : dbPost.author?.image,
        role: dbPost.author?.role,
        agencyName: dbPost.author?.agencyName,
      },
      topic: dbPost.topic
        ? { name: dbPost.topic.name, slug: dbPost.topic.slug }
        : null,
      resolutionComment: resolutionReply
        ? {
            content: resolutionReply.content,
            createdAt: resolutionReply.postedAt,
            author: {
              name: resolutionReply.author?.name || "Instansi Terkait",
              agencyName:
                resolutionReply.author?.agencyName ||
                resolutionReply.author?.name,
            },
          }
        : null,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postKey: string }>;
}): Promise<Metadata> {
  const { postKey } = await params;
  const seoData = await fetchPostSeoData(postKey);
  if (seoData) {
    const meta = generatePostMetadata(seoData);
    return {
      ...meta,
      title: { absolute: String(meta.title) },
    };
  }

  return {
    title: "Postingan",
    description: "Detail laporan dan diskusi publik warga di Kavi.",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ postKey: string }>;
}) {
  const keys = await params;
  const seoData = await fetchPostSeoData(keys.postKey);
  const schemas = seoData
    ? [
        generatePostJsonLd(seoData),
        generateBreadcrumbJsonLd([
          { name: "Beranda", path: "/home" },
          ...(seoData.topic
            ? [
                {
                  name: seoData.topic.name,
                  path: `/explore/topics/${seoData.topic.slug}`,
                },
              ]
            : []),
          { name: seoData.title, path: `/posts/${seoData.id}` },
        ]),
      ]
    : null;

  return (
    <>
      {schemas && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
        />
      )}
      <PostDetail postKey={keys.postKey} />
    </>
  );
}
