import { NextRequest, NextResponse } from "next/server";
import { db, comments, posts, votes, notifications } from "@/db";
import { eq, and, asc, or, sql, inArray } from "drizzle-orm";
import { getOptionalSessionUser, getSessionUser, isDemoUser } from "@/lib/auth-helper";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isDuplicateRequest } from "@/lib/debounce";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: postId } = await params;
    const currentUser = await getOptionalSessionUser(req);
    const userId = currentUser?.id || null;

    // 1. Fetch active comments from both Option A unified `posts` (kind='reply') and `comments` table
    const [rawComments, rawReplyPosts] = await Promise.all([
      db.query.comments.findMany({
        where: and(eq(comments.postId, postId), eq(comments.isDeleted, false)),
        orderBy: [asc(comments.createdAt)],
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
        },
      }),
      db.query.posts.findMany({
        where: and(
          eq(posts.kind, "reply"),
          eq(posts.isDeleted, false),
          or(eq(posts.rootPostId, postId), eq(posts.parentPostId, postId))
        ),
        orderBy: [asc(posts.postedAt)],
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
        },
      }),
    ]);

    // Merge and deduplicate by id (preferring unified `posts` row metadata when present)
    const unifiedMap = new Map<string, any>();
    for (const c of rawComments) {
      unifiedMap.set(c.id, {
        id: c.id,
        postId: c.postId,
        authorId: c.authorId,
        parentId: c.parentId,
        content: c.content,
        images: c.images || [],
        upvotesCount: c.upvotesCount,
        downvotesCount: c.downvotesCount,
        isActionTaken: c.isActionTaken,
        actionRole: c.author?.role === "INTERNAL" ? "INTERNAL" : c.isActionTaken ? "GOVERNMENT" : null,
        isAnonymous: c.isAnonymous,
        isDeleted: c.isDeleted,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        author: c.author,
      });
    }
    for (const p of rawReplyPosts) {
      const parentId =
        p.parentPostId && p.parentPostId !== postId ? p.parentPostId : null;
      unifiedMap.set(p.id, {
        id: p.id,
        postId: p.rootPostId || postId,
        authorId: p.authorId,
        parentId,
        content: p.content,
        images: p.images || [],
        upvotesCount: p.upvotesCount,
        downvotesCount: p.downvotesCount,
        isActionTaken: p.isActionTaken,
        actionRole: p.actionRole,
        actionTakenAt: p.actionTakenAt,
        locationName: p.locationName,
        isAnonymous: p.isAnonymous,
        isDeleted: p.isDeleted,
        createdAt: p.postedAt,
        updatedAt: p.updatedAt,
        author: p.author,
      });
    }

    const mergedList = Array.from(unifiedMap.values());

    // 2. Fetch current user's votes on these replies/comments
    const commentIds = mergedList.map((c) => c.id);
    const userVotes: Record<string, "UP" | "DOWN"> = {};

    if (userId && commentIds.length > 0) {
      const votesData = await db
        .select({ targetId: votes.targetId, voteType: votes.voteType })
        .from(votes)
        .where(
          and(
            eq(votes.userId, userId),
            inArray(votes.targetId, commentIds)
          )
        );
      votesData.forEach((v) => (userVotes[v.targetId] = v.voteType));
    }

    // 3. Build Threads/Reddit style hierarchical tree O(N)
    const map = new Map<string, any>();
    const tree: any[] = [];

    mergedList.forEach((c) => {
      map.set(c.id, {
        ...c,
        images: c.images || [],
        author: c.isAnonymous
          ? {
              id: "anonymous",
              name: "Anonim",
              username: "anonim",
              image: null,
              role: "USER" as const,
              agencyName: null,
            }
          : c.author,
        userInteraction: {
          hasUpvoted: userVotes[c.id] === "UP",
          hasDownvoted: userVotes[c.id] === "DOWN",
        },
        replies: [],
      });
    });

    mergedList.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(node);
      } else {
        tree.push(node);
      }
    });

    return NextResponse.json({
      success: true,
      totalCount: mergedList.length,
      data: tree,
    });
  } catch (error) {
    console.error("GET /api/posts/[id]/comments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: postId } = await params;
    const currentUser = await getSessionUser(req);

    // Rate Limit: Max 20 comments per minute
    const rateLimitError = enforceRateLimit(
      req,
      currentUser.id,
      { limit: 20, windowMs: 60000 },
      "comment"
    );
    if (rateLimitError) return rateLimitError;

    const body = await req.json();

    const {
      id: requestedId,
      content,
      parentId = null,
      images = [],
      location = null,
      isActionTaken = false,
      is_action_taken = false,
      isAnonymous = false,
      is_anonymous = false,
      anonymous = false,
    } = body;
    const actionTakenFlag = Boolean(isActionTaken || is_action_taken);
    const anonFlag = actionTakenFlag
      ? false
      : Boolean(isAnonymous || is_anonymous || anonymous);

    // Prevent double-click duplicate comment
    if (
      isDuplicateRequest(
        `comment:${currentUser.id}:${postId}:${content?.trim()}`,
        1200
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate comment detected. Please wait a moment.",
        },
        { status: 429 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Comment content cannot be empty" },
        { status: 400 }
      );
    }

    if (Array.isArray(images) && images.length > 6) {
      return NextResponse.json(
        { success: false, error: "Maximum 6 images allowed per comment" },
        { status: 400 }
      );
    }

    if (actionTakenFlag) {
      if (currentUser.role !== "GOVERNMENT" && currentUser.role !== "INTERNAL") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only GOVERNMENT or INTERNAL accounts can submit an action-taken response",
          },
          { status: 403 }
        );
      }
      if (!Array.isArray(images) || images.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Action-taken response requires at least 1 photo or video attachment",
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const commentId =
      requestedId && typeof requestedId === "string"
        ? requestedId
        : `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Demo sandbox accounts never write to Turso DB
    if (isDemoUser(currentUser)) {
      return NextResponse.json(
        {
          success: true,
          demo: true,
          data: {
            id: commentId,
            postId,
            parentId,
            content: content.trim(),
            images: Array.isArray(images) ? images : [],
            isActionTaken: actionTakenFlag,
            isAnonymous: anonFlag,
            createdAt: now,
          },
        },
        { status: 201 }
      );
    }

    // Check post exists
    const targetPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!targetPost || targetPost.isDeleted) {
      return NextResponse.json(
        { success: false, error: "Post not found or deleted" },
        { status: 404 }
      );
    }

    const actionRole =
      actionTakenFlag &&
      (currentUser.role === "GOVERNMENT" || currentUser.role === "INTERNAL")
        ? (currentUser.role as "GOVERNMENT" | "INTERNAL")
        : null;

    // 1. Insert Option A unified reply in `posts` (kind: "reply")
    await db
      .insert(posts)
      .values({
        id: commentId,
        authorId: currentUser.id,
        kind: "reply",
        parentPostId: parentId || postId,
        rootPostId: postId,
        topicId: targetPost.topicId,
        title: null,
        content: content.trim(),
        images: Array.isArray(images) ? images : [],
        locationName: location || targetPost.locationName || null,
        province: targetPost.province || "Indonesia",
        status: "OPEN",
        closeType: "NONE",
        isActionTaken: actionTakenFlag,
        actionRole,
        actionTakenAt: actionTakenFlag ? now : null,
        isAnonymous: anonFlag,
        postedAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Also insert into `comments` table for compatibility
    await db
      .insert(comments)
      .values({
        id: commentId,
        postId,
        authorId: currentUser.id,
        parentId: parentId || null,
        content: content.trim(),
        images: Array.isArray(images) ? images : [],
        upvotesCount: 0,
        downvotesCount: 0,
        isActionTaken: actionTakenFlag,
        isAnonymous: anonFlag,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 3. Increment root post comments count (and update reportStatus if actionTakenFlag)
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`,
        ...(actionTakenFlag
          ? {
              reportStatus:
                targetPost.reportStatus === "waiting"
                  ? "in_progress"
                  : targetPost.reportStatus,
              resolutionCommentId: commentId,
              updatedAt: now,
            }
          : {}),
      })
      .where(eq(posts.id, postId));

    // 4. Send notification (if not commenting on own content)
    const recipientId = targetPost.authorId;
    if (recipientId !== currentUser.id) {
      await db.insert(notifications).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId,
        actorId: currentUser.id,
        type: actionTakenFlag ? "RESOLVED" : parentId ? "REPLY" : "COMMENT",
        postId,
        commentId,
        title: actionTakenFlag
          ? `${currentUser.agencyName || currentUser.name} mengirim pembaruan tindakan`
          : `${anonFlag ? "Anonim" : currentUser.name} membalas di diskusi Anda`,
        message: content.trim().slice(0, 140),
        href: `/posts/${postId}${actionTakenFlag ? "#evidence" : ""}`,
        isRead: false,
        createdAt: now,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: commentId,
          postId,
          parentId,
          content: content.trim(),
          images: Array.isArray(images) ? images : [],
          isActionTaken: actionTakenFlag,
          actionRole,
          isAnonymous: anonFlag,
          author: anonFlag
            ? {
                id: "anonymous",
                name: "Anonim",
                username: "anonim",
                image: null,
                role: "USER",
                agencyName: null,
              }
            : {
                id: currentUser.id,
                name: currentUser.name,
                username: currentUser.username,
                image: currentUser.image,
                role: currentUser.role,
                agencyName: currentUser.agencyName,
              },
          createdAt: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/posts/[id]/comments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
