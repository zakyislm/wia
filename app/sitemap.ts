import { MetadataRoute } from "next";
import { db, posts, topics } from "@/db";
import { eq, desc } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://kavi.id").replace(/\/$/, "");

  // 1. Static high-level routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.9,
    },
  ];

  try {
    // 2. Fetch latest active posts (up to 500 for Google index)
    const activePosts = await db.query.posts.findMany({
      where: eq(posts.isDeleted, false),
      columns: {
        id: true,
        status: true,
        updatedAt: true,
      },
      orderBy: [desc(posts.updatedAt)],
      limit: 500,
    });

    const postRoutes: MetadataRoute.Sitemap = activePosts.map((post) => ({
      url: `${baseUrl}/posts/${post.id}`,
      lastModified: post.updatedAt,
      changeFrequency: post.status === "CLOSED" ? "monthly" : "hourly",
      priority: post.status === "CLOSED" ? 0.7 : 0.9,
    }));

    // 3. Fetch all topics
    const allTopics = await db.query.topics.findMany({
      columns: {
        slug: true,
        createdAt: true,
      },
    });

    const topicRoutes: MetadataRoute.Sitemap = allTopics.map((topic) => ({
      url: `${baseUrl}/explore/topics/${topic.slug}`,
      lastModified: topic.createdAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [...staticRoutes, ...postRoutes, ...topicRoutes];
  } catch (error) {
    console.error("sitemap.ts generation error:", error);
    return staticRoutes;
  }
}
