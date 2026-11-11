import { NextRequest, NextResponse } from "next/server";
import { db, posts, topics, tags, postTags, users, follows } from "@/db";
import { eq, and, desc, isNull, sql, ne } from "drizzle-orm";
import { getOptionalSessionUser } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "hot").toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 10);

    const currentUser = await getOptionalSessionUser(req);

    // 1. Fetch top trending topics
    const trendingTopics = await db
      .select({
        id: topics.id,
        name: topics.name,
        slug: topics.slug,
        isTrending: topics.isTrending,
      })
      .from(topics)
      .orderBy(desc(topics.isTrending))
      .limit(limit);

    // 2. Fetch dynamic trending tags by post count + engagement
    const trendingTagsRaw = await db
      .select({
        id: tags.id,
        name: tags.name,
        postCount: sql<number>`count(${postTags.postId})`,
        totalEngagement: sql<number>`coalesce(sum(${posts.upvotesCount} + ${posts.commentsCount}), 0)`,
      })
      .from(tags)
      .innerJoin(postTags, eq(tags.id, postTags.tagId))
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(and(eq(posts.isDeleted, false), isNull(posts.parentPostId)))
      .groupBy(tags.id, tags.name)
      .orderBy(
        desc(sql`count(${postTags.postId})`),
        desc(sql`coalesce(sum(${posts.upvotesCount} + ${posts.commentsCount}), 0)`)
      )
      .limit(limit);

    // 3. Fetch dynamic trending locations / provinces
    const trendingLocationsRaw = await db
      .select({
        province: posts.province,
        postCount: sql<number>`count(*)`,
        reportCount: sql<number>`count(case when ${posts.kind} = 'report' then 1 end)`,
      })
      .from(posts)
      .where(and(eq(posts.isDeleted, false), isNull(posts.parentPostId)))
      .groupBy(posts.province)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    // 4. Fetch dynamic suggested accounts ("Temukan suara baru")
    const followedSet = new Set<string>();
    if (currentUser?.id) {
      const fList = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, currentUser.id));
      fList.forEach((f) => followedSet.add(f.followingId));
    }

    const candidateUsers = await db.query.users.findMany({
      where: currentUser?.id
        ? and(eq(users.isBanned, false), ne(users.id, currentUser.id))
        : eq(users.isBanned, false),
      orderBy: [desc(users.followerCount), desc(users.postCount)],
      limit: 16,
      columns: {
        id: true,
        name: true,
        username: true,
        image: true,
        role: true,
        bio: true,
        region: true,
        agencyName: true,
        jurisdictionProvince: true,
        followerCount: true,
        postCount: true,
      },
    });

    const suggestedUsers = candidateUsers
      .filter((u) => !followedSet.has(u.id))
      .slice(0, 6)
      .map((u) => ({
        id: u.id,
        localKey: u.id,
        name: u.name,
        username: u.username,
        image: u.image || undefined,
        role: u.role,
        bio: u.bio || "",
        region: u.region || u.jurisdictionProvince || undefined,
        followersCount: u.followerCount,
        postCount: u.postCount,
      }));

    // 5. Fetch trending reports based on mode
    const trendingPostsRaw = await db.query.posts.findMany({
      where: and(
        eq(posts.isDeleted, false),
        isNull(posts.parentPostId),
        eq(posts.status, "OPEN")
      ),
      limit,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            username: true,
            image: true,
            role: true,
            agencyName: true,
          },
        },
        topic: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
        postTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy:
        mode === "views"
          ? [desc(posts.viewsCount), desc(posts.postedAt)]
          : mode === "upvotes"
            ? [desc(posts.upvotesCount), desc(posts.postedAt)]
            : [
                desc(posts.upvotesCount),
                desc(posts.viewsCount),
                desc(posts.postedAt),
              ],
    });

    const formattedPosts = trendingPostsRaw.map((p) => ({
      id: p.id,
      title: p.title || p.content.slice(0, 72),
      province: p.province,
      locationName: p.locationName,
      upvotesCount: p.upvotesCount,
      viewsCount: p.viewsCount,
      commentsCount: p.commentsCount,
      postedAt: p.postedAt,
      author: p.author,
      topic: p.topic,
      tags: p.postTags.map((pt) => pt.tag),
    }));

    return NextResponse.json({
      success: true,
      data: {
        mode,
        topics: trendingTopics,
        tags: trendingTagsRaw.map((t) => ({
          id: t.id,
          name: t.name,
          postCount: Number(t.postCount),
          totalEngagement: Number(t.totalEngagement),
        })),
        locations: trendingLocationsRaw
          .filter((l) => Boolean(l.province))
          .map((l) => ({
            province: l.province,
            postCount: Number(l.postCount),
            reportCount: Number(l.reportCount),
          })),
        suggestedUsers,
        posts: formattedPosts,
      },
    });
  } catch (error) {
    console.error("GET /api/trending error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trending data" },
      { status: 500 }
    );
  }
}
