import { NextRequest, NextResponse } from "next/server";
import { db, posts, users, topics, tags, postTags, votes, savedPosts, reposts, hiddenPosts, mutedUsers, blockedUsers, follows } from "@/db";
import { eq, and, desc, notInArray, inArray, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth-helper";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isDuplicateRequest } from "@/lib/debounce";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") || "foryou").toLowerCase();
    const province = searchParams.get("province");
    const topicId = searchParams.get("topicId");
    const tag = searchParams.get("tag");
    const sort = (searchParams.get("sort") || "semua").toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const currentUser = await getSessionUser(req);
    const userId = currentUser.id;

    // 1. Collect user filters: hidden posts, muted users, blocked users
    const [hiddenList, mutedList, blockedList, followingList] = await Promise.all([
      db.select({ postId: hiddenPosts.postId }).from(hiddenPosts).where(eq(hiddenPosts.userId, userId)),
      db.select({ mutedId: mutedUsers.mutedUserId }).from(mutedUsers).where(eq(mutedUsers.userId, userId)),
      db.select({ blockedId: blockedUsers.blockedUserId }).from(blockedUsers).where(eq(blockedUsers.userId, userId)),
      tab === "following"
        ? db.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, userId))
        : Promise.resolve([]),
    ]);

    const excludedPostIds = hiddenList.map((h) => h.postId);
    const excludedUserIds = Array.from(
      new Set([...mutedList.map((m) => m.mutedId), ...blockedList.map((b) => b.blockedId)])
    );

    // 2. Build where conditions
    const conditions = [
      eq(posts.isDeleted, false),
      tab === "archive" ? eq(posts.status, "CLOSED") : eq(posts.status, "OPEN"),
    ];

    if (province) conditions.push(eq(posts.province, province));
    if (topicId) conditions.push(eq(posts.topicId, topicId));

    if (excludedPostIds.length > 0) {
      conditions.push(notInArray(posts.id, excludedPostIds));
    }
    if (excludedUserIds.length > 0) {
      conditions.push(notInArray(posts.authorId, excludedUserIds));
    }

    if (tab === "following") {
      const followingIds = followingList.map((f) => f.followingId);
      if (followingIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      conditions.push(inArray(posts.authorId, followingIds));
    }

    const orderBy =
      sort === "ramai"
        ? [
            desc(sql`${posts.upvotesCount} + ${posts.downvotesCount} + ${posts.commentsCount}`),
            desc(posts.postedAt),
          ]
        : sort === "terbaru"
          ? [desc(posts.postedAt)]
          : [desc(posts.isPinned), desc(posts.postedAt)];

    // 3. Query posts with relation joins
    const rawPosts = await db.query.posts.findMany({
      where: and(...conditions),
      orderBy,
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
            jurisdictionProvince: true,
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
        closedBy: {
          columns: {
            id: true,
            name: true,
            username: true,
            image: true,
            role: true,
            agencyName: true,
          },
        },
      },
    });

    // 4. Batch check current user engagement (votes, saved, reposted)
    const postIds = rawPosts.map((p) => p.id);
    let userVotes: Record<string, "UP" | "DOWN"> = {};
    let userSaved: Set<string> = new Set();
    let userReposted: Set<string> = new Set();

    if (postIds.length > 0) {
      const [votesData, savedData, repostsData] = await Promise.all([
        db
          .select({ targetId: votes.targetId, voteType: votes.voteType })
          .from(votes)
          .where(and(eq(votes.userId, userId), eq(votes.targetType, "POST"), inArray(votes.targetId, postIds))),
        db
          .select({ postId: savedPosts.postId })
          .from(savedPosts)
          .where(and(eq(savedPosts.userId, userId), inArray(savedPosts.postId, postIds))),
        db
          .select({ postId: reposts.postId })
          .from(reposts)
          .where(and(eq(reposts.userId, userId), inArray(reposts.postId, postIds))),
      ]);

      votesData.forEach((v) => (userVotes[v.targetId] = v.voteType));
      savedData.forEach((s) => userSaved.add(s.postId));
      repostsData.forEach((r) => userReposted.add(r.postId));
    }

    // Filter by tag if requested
    let result = rawPosts;
    if (tag) {
      result = rawPosts.filter((p) =>
        p.postTags.some((pt) => pt.tag.name.toLowerCase() === tag.toLowerCase())
      );
    }

    // 5. Format payload
    const formatted = result.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      images: post.images || [],
      locationName: post.locationName,
      province: post.province,
      latitude: post.latitude,
      longitude: post.longitude,
      status: post.status,
      closeType: post.closeType,
      resolutionCommentId: post.resolutionCommentId,
      upvotesCount: post.upvotesCount,
      downvotesCount: post.downvotesCount,
      commentsCount: post.commentsCount,
      repostsCount: post.repostsCount,
      viewsCount: post.viewsCount,
      isAnonymous: post.isAnonymous,
      isPinned: post.isPinned,
      postedAt: post.postedAt,
      author: post.isAnonymous
        ? {
            id: "anonymous",
            name: "Anonim",
            username: "anonim",
            image: null,
            role: "USER",
            agencyName: null,
            jurisdictionProvince: null,
          }
        : post.author,
      topic: post.topic,
      tags: post.postTags.map((pt) => pt.tag),
      closedBy: post.closedBy,
      userInteraction: {
        hasUpvoted: userVotes[post.id] === "UP",
        hasDownvoted: userVotes[post.id] === "DOWN",
        hasSaved: userSaved.has(post.id),
        hasReposted: userReposted.has(post.id),
      },
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);

    // Rate Limit: Max 5 posts per minute per citizen
    const rateLimitError = enforceRateLimit(req, currentUser.id, { limit: 5, windowMs: 60000 }, "create-post");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();

    const {
      title,
      content,
      topicId,
      locationName,
      province,
      latitude,
      longitude,
      images = [],
      tags: inputTags = [],
      isAnonymous = false,
    } = body;

    // Prevent rapid double-click duplicate post submission
    if (isDuplicateRequest(`post:${currentUser.id}:${title?.trim()}`, 2000)) {
      return NextResponse.json(
        { success: false, error: "Duplicate submission detected. Please wait a moment." },
        { status: 429 }
      );
    }

    // Validations
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Title is required (minimum 3 characters)" },
        { status: 400 }
      );
    }
    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Content is required (minimum 10 characters)" },
        { status: 400 }
      );
    }
    if (!topicId || typeof topicId !== "string") {
      return NextResponse.json(
        { success: false, error: "Macro Topic is required" },
        { status: 400 }
      );
    }
    if (!locationName || !province) {
      return NextResponse.json(
        { success: false, error: "Location name and province are required" },
        { status: 400 }
      );
    }
    if (Array.isArray(images) && images.length > 6) {
      return NextResponse.json(
        { success: false, error: "Maximum 6 images allowed per post" },
        { status: 400 }
      );
    }

    const now = new Date();
    const newPostId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Insert post
    await db.insert(posts).values({
      id: newPostId,
      authorId: currentUser.id,
      topicId,
      title: title.trim(),
      content: content.trim(),
      images: Array.isArray(images) ? images : [],
      locationName: locationName.trim(),
      province: province.trim(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      status: "OPEN",
      closeType: "NONE",
      isAnonymous: Boolean(isAnonymous),
      postedAt: now,
      updatedAt: now,
    });

    // 2. Process and attach micro tags
    if (Array.isArray(inputTags) && inputTags.length > 0) {
      for (const rawTag of inputTags) {
        const cleanName = rawTag.replace(/^#/, "").trim();
        if (!cleanName) continue;

        let existingTag = await db.query.tags.findFirst({
          where: eq(tags.name, cleanName),
        });

        if (!existingTag) {
          const newTagId = `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await db.insert(tags).values({
            id: newTagId,
            name: cleanName,
            color: null,
            createdAt: now,
          });
          existingTag = { id: newTagId, name: cleanName, color: null, createdAt: now };
        }

        await db.insert(postTags).values({
          postId: newPostId,
          tagId: existingTag.id,
        });
      }
    }

    // 3. Increment author post count
    await db
      .update(users)
      .set({ postCount: sql`${users.postCount} + 1` })
      .where(eq(users.id, currentUser.id));

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newPostId,
          message: "Report published successfully",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}
