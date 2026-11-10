import { NextRequest, NextResponse } from "next/server";
import { db, comments, posts, users, votes, notifications } from "@/db";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth-helper";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isDuplicateRequest } from "@/lib/debounce";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: postId } = await params;
    const currentUser = await getSessionUser(req);

    // 1. Fetch all active comments for this post
    const rawComments = await db.query.comments.findMany({
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
    });

    // 2. Fetch current user's votes on these comments
    const commentIds = rawComments.map((c) => c.id);
    let userVotes: Record<string, "UP" | "DOWN"> = {};

    if (commentIds.length > 0) {
      const votesData = await db
        .select({ targetId: votes.targetId, voteType: votes.voteType })
        .from(votes)
        .where(
          and(
            eq(votes.userId, currentUser.id),
            eq(votes.targetType, "COMMENT"),
            inArray(votes.targetId, commentIds)
          )
        );
      votesData.forEach((v) => (userVotes[v.targetId] = v.voteType));
    }

    // 3. Build Threads/Reddit style hierarchical tree O(N)
    type CommentNode = (typeof rawComments)[0] & {
      userInteraction: { hasUpvoted: boolean; hasDownvoted: boolean };
      replies: CommentNode[];
    };

    const map = new Map<string, CommentNode>();
    const tree: CommentNode[] = [];

    // First pass: instantiate nodes
    rawComments.forEach((c) => {
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

    // Second pass: link parent-children
    rawComments.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(node);
      } else {
        tree.push(node);
      }
    });

    return NextResponse.json({
      success: true,
      totalCount: rawComments.length,
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

    // Rate Limit: Max 15 comments per minute
    const rateLimitError = enforceRateLimit(req, currentUser.id, { limit: 15, windowMs: 60000 }, "comment");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();

    const {
      content,
      parentId = null,
      images = [],
      isActionTaken = false,
      is_action_taken = false,
      isAnonymous = false,
      is_anonymous = false,
    } = body;
    const actionTakenFlag = Boolean(isActionTaken || is_action_taken);
    const anonFlag = actionTakenFlag ? false : Boolean(isAnonymous || is_anonymous);

    // Prevent double-click duplicate comment
    if (isDuplicateRequest(`comment:${currentUser.id}:${postId}:${content?.trim()}`, 1500)) {
      return NextResponse.json(
        { success: false, error: "Duplicate comment detected. Please wait a moment." },
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
          { success: false, error: "Only GOVERNMENT or INTERNAL accounts can submit an action-taken response" },
          { status: 403 }
        );
      }
      if (!Array.isArray(images) || images.length === 0) {
        return NextResponse.json(
          { success: false, error: "Action-taken response requires at least 1 photo or video attachment" },
          { status: 400 }
        );
      }
    }

    // Check post status
    const targetPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!targetPost || targetPost.isDeleted) {
      return NextResponse.json(
        { success: false, error: "Post not found or deleted" },
        { status: 404 }
      );
    }

    if (targetPost.status === "CLOSED") {
      return NextResponse.json(
        { success: false, error: "This thread has been closed. No further citizen comments can be posted." },
        { status: 403 }
      );
    }

    // Verify parent comment if replying
    let parentComment = null;
    if (parentId) {
      parentComment = await db.query.comments.findFirst({
        where: and(eq(comments.id, parentId), eq(comments.postId, postId)),
      });
      if (!parentComment) {
        return NextResponse.json(
          { success: false, error: "Parent comment not found on this post" },
          { status: 404 }
        );
      }
    }

    const now = new Date();
    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Insert comment
    await db.insert(comments).values({
      id: commentId,
      postId,
      authorId: currentUser.id,
      parentId,
      content: content.trim(),
      images: Array.isArray(images) ? images : [],
      upvotesCount: 0,
      downvotesCount: 0,
      isActionTaken: actionTakenFlag,
      isAnonymous: anonFlag,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Increment post comments count (and record resolutionCommentId if actionTakenFlag)
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`,
        ...(actionTakenFlag ? { resolutionCommentId: commentId, updatedAt: now } : {}),
      })
      .where(eq(posts.id, postId));

    // 3. Send notification (if not commenting on own content)
    const recipientId = parentComment ? parentComment.authorId : targetPost.authorId;
    if (recipientId !== currentUser.id) {
      await db.insert(notifications).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId,
        actorId: currentUser.id,
        type: parentComment ? "REPLY" : "COMMENT",
        postId,
        commentId,
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
