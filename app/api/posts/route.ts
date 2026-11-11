import { NextRequest, NextResponse } from "next/server";
import {
  db,
  posts,
  comments,
  users,
  topics,
  tags,
  postTags,
  postAgencies,
  votes,
  savedPosts,
  reposts,
  hiddenPosts,
  mutedUsers,
  blockedUsers,
  follows,
  notifications,
} from "@/db";
import { eq, and, desc, notInArray, inArray, isNull, sql } from "drizzle-orm";
import { getOptionalSessionUser, getSessionUser, isDemoUser } from "@/lib/auth-helper";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isDuplicateRequest } from "@/lib/debounce";

/**
 * Dynamic For-You feed scoring algorithm:
 * Combines engagement velocity, recency decay, regional affinity, and social graph affinity.
 */
function computeForYouScore(
  post: any,
  opts: {
    userProvince?: string | null;
    followingSet: Set<string>;
    preferredTopics: Set<string>;
    nowMs: number;
  }
): number {
  const postedMs =
    post.postedAt instanceof Date
      ? post.postedAt.getTime()
      : Number(post.postedAt || opts.nowMs);
  const ageHours = Math.max(0.25, (opts.nowMs - postedMs) / (1000 * 60 * 60));

  const engagement =
    (post.upvotesCount || 0) * 3 +
    (post.commentsCount || 0) * 4.5 +
    (post.repostsCount || 0) * 5 +
    (post.viewsCount || 0) * 0.08 -
    (post.downvotesCount || 0) * 1.5;

  const recencyDecay = Math.pow(ageHours + 2, 1.15);
  let score = engagement / recencyDecay;

  // Affinity boosts
  if (post.isPinned) score += 1000;
  if (opts.followingSet.has(post.authorId)) score += 35;
  if (
    opts.userProvince &&
    post.province &&
    opts.userProvince.toLowerCase().includes(post.province.toLowerCase())
  ) {
    score += 25;
  }
  if (post.topic?.name && opts.preferredTopics.has(post.topic.name.toLowerCase())) {
    score += 20;
  }
  if (post.kind === "report" && post.reportStatus === "in_progress") {
    score += 18;
  }

  return score;
}

/**
 * Dynamic Explore scoring algorithm (semua | ramai | terbaru)
 */
function computeExploreScore(
  post: any,
  sort: string,
  nowMs: number
): number {
  const postedMs =
    post.postedAt instanceof Date
      ? post.postedAt.getTime()
      : Number(post.postedAt || nowMs);

  if (sort === "terbaru") {
    return postedMs;
  }

  const heat =
    (post.upvotesCount || 0) * 2.5 +
    (post.downvotesCount || 0) +
    (post.commentsCount || 0) * 4 +
    (post.repostsCount || 0) * 4.5 +
    (post.viewsCount || 0) * 0.1;

  if (sort === "ramai") {
    return heat * 1000 + postedMs * 0.00001;
  }

  // "semua": balanced discovery score (engagement + recency + civic report relevance)
  const ageHours = Math.max(0.5, (nowMs - postedMs) / (1000 * 60 * 60));
  const civicBoost = post.kind === "report" ? 1.25 : 1.0;
  return (heat * civicBoost) / Math.pow(ageHours + 3, 0.85);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") || "foryou").toLowerCase();
    const province = searchParams.get("province");
    const topicId = searchParams.get("topicId");
    const kindParam = searchParams.get("kind");
    const tag = searchParams.get("tag");
    const sort = (searchParams.get("sort") || "semua").toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const currentUser = await getOptionalSessionUser(req);
    const userId = currentUser?.id || null;

    // 1. Collect user filters if authenticated
    const [hiddenList, mutedList, blockedList, followingList] = userId
      ? await Promise.all([
          db
            .select({ postId: hiddenPosts.postId })
            .from(hiddenPosts)
            .where(eq(hiddenPosts.userId, userId)),
          db
            .select({ mutedId: mutedUsers.mutedUserId })
            .from(mutedUsers)
            .where(eq(mutedUsers.userId, userId)),
          db
            .select({ blockedId: blockedUsers.blockedUserId })
            .from(blockedUsers)
            .where(eq(blockedUsers.userId, userId)),
          db
            .select({ followingId: follows.followingId })
            .from(follows)
            .where(eq(follows.followerId, userId)),
        ])
      : [[], [], [], []];

    const excludedPostIds = hiddenList.map((h) => h.postId);
    const excludedUserIds = Array.from(
      new Set([
        ...mutedList.map((m) => m.mutedId),
        ...blockedList.map((b) => b.blockedId),
      ])
    );
    const followingIds = followingList.map((f) => f.followingId);
    const followingSet = new Set(followingIds);

    // 2. Build where conditions (Option A: only root posts have parentPostId IS NULL)
    const conditions: any[] = [
      eq(posts.isDeleted, false),
      isNull(posts.parentPostId),
    ];

    if (tab === "archive") {
      conditions.push(eq(posts.status, "CLOSED"));
    } else if (tab === "open") {
      conditions.push(eq(posts.status, "OPEN"));
    }

    if (kindParam === "report" || kindParam === "general") {
      conditions.push(eq(posts.kind, kindParam));
    }
    if (province) conditions.push(eq(posts.province, province));
    if (topicId) conditions.push(eq(posts.topicId, topicId));

    if (excludedPostIds.length > 0) {
      conditions.push(notInArray(posts.id, excludedPostIds));
    }
    if (excludedUserIds.length > 0) {
      conditions.push(notInArray(posts.authorId, excludedUserIds));
    }

    if (tab === "following") {
      if (followingIds.length === 0) {
        return NextResponse.json({
          success: true,
          algorithm: "following",
          data: [],
        });
      }
      conditions.push(inArray(posts.authorId, followingIds));
    }

    // 3. Query root posts with relations
    const rawPosts = await db.query.posts.findMany({
      where: and(...conditions),
      orderBy: [desc(posts.isPinned), desc(posts.postedAt)],
      limit: Math.max(limit, 50),
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
            region: true,
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
        postAgencies: true,
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
    const userVotes: Record<string, "UP" | "DOWN"> = {};
    const userSaved = new Set<string>();
    const userReposted = new Set<string>();

    if (userId && postIds.length > 0) {
      const [votesData, savedData, repostsData] = await Promise.all([
        db
          .select({ targetId: votes.targetId, voteType: votes.voteType })
          .from(votes)
          .where(
            and(
              eq(votes.userId, userId),
              eq(votes.targetType, "POST"),
              inArray(votes.targetId, postIds)
            )
          ),
        db
          .select({ postId: savedPosts.postId })
          .from(savedPosts)
          .where(
            and(
              eq(savedPosts.userId, userId),
              inArray(savedPosts.postId, postIds)
            )
          ),
        db
          .select({ postId: reposts.postId })
          .from(reposts)
          .where(
            and(eq(reposts.userId, userId), inArray(reposts.postId, postIds))
          ),
      ]);

      votesData.forEach((v) => (userVotes[v.targetId] = v.voteType));
      savedData.forEach((s) => userSaved.add(s.postId));
      repostsData.forEach((r) => userReposted.add(r.postId));
    }

    // Filter by tag if requested
    let filtered = rawPosts;
    if (tag) {
      filtered = rawPosts.filter((p) =>
        p.postTags.some((pt) => pt.tag.name.toLowerCase() === tag.toLowerCase())
      );
    }

    // 5. Apply Dynamic Feed Algorithm (Home: foryou / following, Explore: semua / ramai / terbaru)
    const nowMs = Date.now();
    const userProvince =
      currentUser?.region || currentUser?.jurisdictionProvince || null;

    const scored = filtered.map((post) => {
      const algorithmScore =
        searchParams.has("sort") || tab === "explore"
          ? computeExploreScore(post, sort, nowMs)
          : tab === "foryou"
            ? computeForYouScore(post, {
                userProvince,
                followingSet,
                preferredTopics: new Set(),
                nowMs,
              })
            : post.postedAt instanceof Date
              ? post.postedAt.getTime()
              : Number(post.postedAt || nowMs);

      return { post, algorithmScore };
    });

    scored.sort((a, b) => b.algorithmScore - a.algorithmScore);
    const sliced = scored.slice(0, limit);

    // 6. Format payload
    const formatted = sliced.map(({ post, algorithmScore }) => ({
      id: post.id,
      localKey: post.id,
      kind: post.kind,
      reportStatus: post.reportStatus,
      title: post.title,
      content: post.content,
      images: post.images || [],
      locationName: post.locationName,
      province: post.province || "Indonesia",
      category: post.topic?.name || "Komunitas",
      latitude: post.latitude,
      longitude: post.longitude,
      status: post.status,
      closeType: post.closeType,
      closedById: post.closedById,
      closedAt: post.closedAt,
      resolutionCommentId: post.resolutionCommentId,
      upvotesCount: post.upvotesCount,
      downvotesCount: post.downvotesCount,
      commentsCount: post.commentsCount,
      repostsCount: post.repostsCount,
      viewsCount: post.viewsCount,
      isAnonymous: post.isAnonymous,
      isPinned: post.isPinned,
      postedAt: post.postedAt,
      algorithmScore: Math.round(algorithmScore * 100) / 100,
      agencyKeys: post.postAgencies.map((pa) => pa.agencyUserId),
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
      algorithm: searchParams.has("sort") ? `explore:${sort}` : `home:${tab}`,
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

    // Rate Limit: Max 10 posts per minute per citizen
    const rateLimitError = enforceRateLimit(
      req,
      currentUser.id,
      { limit: 10, windowMs: 60000 },
      "create-post"
    );
    if (rateLimitError) return rateLimitError;

    const body = await req.json();

    const {
      id: requestedId,
      kind: rawKind,
      parentPostId = null,
      rootPostId = null,
      title,
      content,
      topicId,
      category,
      locationName,
      province,
      latitude,
      longitude,
      images = [],
      tags: inputTags = [],
      agencyKeys = [],
      isAnonymous = false,
      anonymous = false,
      isActionTaken = false,
    } = body;

    const kind: "general" | "report" | "reply" =
      rawKind === "general" || rawKind === "report" || rawKind === "reply"
        ? rawKind
        : parentPostId
          ? "reply"
          : agencyKeys?.length > 0 || (title && locationName)
            ? "report"
            : "general";

    const anonFlag = Boolean(isAnonymous || anonymous);

    // Prevent rapid double-click duplicate post submission
    if (
      isDuplicateRequest(
        `post:${currentUser.id}:${kind}:${(title || content || "").trim().slice(0, 40)}`,
        1500
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate submission detected. Please wait a moment.",
        },
        { status: 429 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 }
      );
    }

    if (Array.isArray(images) && images.length > 6) {
      return NextResponse.json(
        { success: false, error: "Maximum 6 images allowed per post" },
        { status: 400 }
      );
    }

    // Demo sandbox accounts never write to Turso DB
    if (isDemoUser(currentUser)) {
      return NextResponse.json(
        {
          success: true,
          demo: true,
          data: {
            id: requestedId || `demo_post_${Date.now()}`,
            kind,
            message: "Demo post simulated in client state",
          },
        },
        { status: 201 }
      );
    }

    const now = new Date();
    const newPostId =
      requestedId && typeof requestedId === "string"
        ? requestedId
        : `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Resolve topicId from category name if needed
    let resolvedTopicId: string | null = topicId || null;
    if (!resolvedTopicId && category) {
      const matchedTopic = await db.query.topics.findFirst({
        where: sql`lower(${topics.name}) = ${String(category).trim().toLowerCase()}`,
      });
      if (matchedTopic) {
        resolvedTopicId = matchedTopic.id;
      }
    }
    if (!resolvedTopicId && kind === "report") {
      const [fallbackTopic] = await db.select({ id: topics.id }).from(topics).limit(1);
      resolvedTopicId = fallbackTopic?.id || "top_infra";
    }

    if (kind === "report") {
      const effectiveLocation = (locationName || province || "").trim();
      const effectiveProvince = (province || locationName || "").trim();
      if (!effectiveLocation || !effectiveProvince) {
        return NextResponse.json(
          {
            success: false,
            error: "Location name and province are required for civic reports",
          },
          { status: 400 }
        );
      }
    }

    const actionTakenFlag =
      Boolean(isActionTaken) &&
      (currentUser.role === "GOVERNMENT" || currentUser.role === "INTERNAL");

    // 1. Insert unified post row (Option A)
    await db.insert(posts).values({
      id: newPostId,
      authorId: currentUser.id,
      kind,
      parentPostId: parentPostId || null,
      rootPostId: rootPostId || parentPostId || null,
      topicId: resolvedTopicId,
      title:
        title?.trim() ||
        (kind === "report"
          ? content.trim().slice(0, 72)
          : null),
      content: content.trim(),
      images: Array.isArray(images) ? images : [],
      locationName: locationName?.trim() || null,
      province: province?.trim() || (kind === "general" ? "Indonesia" : null),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      status: "OPEN",
      closeType: "NONE",
      reportStatus: kind === "report" ? "waiting" : null,
      isActionTaken: actionTakenFlag,
      actionRole: actionTakenFlag
        ? (currentUser.role as "GOVERNMENT" | "INTERNAL")
        : null,
      actionTakenAt: actionTakenFlag ? now : null,
      isAnonymous: anonFlag,
      postedAt: now,
      updatedAt: now,
    });

    // If kind === "reply", mirror into comments table & update root post
    if (kind === "reply" && (rootPostId || parentPostId)) {
      const targetRootId = rootPostId || parentPostId;
      await db
        .insert(comments)
        .values({
          id: newPostId,
          postId: targetRootId,
          authorId: currentUser.id,
          parentId:
            parentPostId && parentPostId !== targetRootId ? parentPostId : null,
          content: content.trim(),
          images: Array.isArray(images) ? images : [],
          isActionTaken: actionTakenFlag,
          isAnonymous: anonFlag,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      await db
        .update(posts)
        .set({
          commentsCount: sql`${posts.commentsCount} + 1`,
          ...(actionTakenFlag
            ? {
                reportStatus: "in_progress",
                resolutionCommentId: newPostId,
                updatedAt: now,
              }
            : {}),
        })
        .where(eq(posts.id, targetRootId));
    }

    // 2. Attach tagged agencies (`postAgencies`) and notify them
    if (Array.isArray(agencyKeys) && agencyKeys.length > 0) {
      for (const agencyId of agencyKeys) {
        if (!agencyId) continue;
        await db
          .insert(postAgencies)
          .values({
            postId: newPostId,
            agencyUserId: String(agencyId),
          })
          .onConflictDoNothing();

        if (agencyId !== currentUser.id) {
          await db.insert(notifications).values({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            recipientId: String(agencyId),
            actorId: currentUser.id,
            type: "SYSTEM",
            postId: newPostId,
            title: "Laporan warga baru menandai instansi Anda",
            message: content.trim().slice(0, 120),
            href: `/posts/${newPostId}`,
            isRead: false,
            createdAt: now,
          });
        }
      }
    }

    // 3. Process and attach micro tags
    if (Array.isArray(inputTags) && inputTags.length > 0) {
      for (const rawTag of inputTags) {
        const cleanName = String(rawTag).replace(/^#/, "").trim();
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
          existingTag = {
            id: newTagId,
            name: cleanName,
            color: null,
            createdAt: now,
          };
        }

        await db
          .insert(postTags)
          .values({
            postId: newPostId,
            tagId: existingTag.id,
          })
          .onConflictDoNothing();
      }
    }

    // 4. Increment author post count for root posts
    if (kind !== "reply") {
      await db
        .update(users)
        .set({ postCount: sql`${users.postCount} + 1` })
        .where(eq(users.id, currentUser.id));
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newPostId,
          kind,
          message: "Post published successfully",
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
