import { NextRequest, NextResponse } from "next/server";
import { db, posts, comments, votes, notifications } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";
import { enforceRateLimit } from "@/lib/rate-limit";
import { shouldAutoCloseAction } from "@/lib/validation";
import {
  acquireActionLock,
  getCachedUserVote,
  setCachedUserVote,
  setCachedPostCounters,
} from "@/lib/redis";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: postId } = await params;
    const currentUser = await getSessionUser(req);

    const body = await req.json();
    const voteType = body?.voteType?.toUpperCase();
    if (voteType !== "UP" && voteType !== "DOWN") {
      return NextResponse.json(
        { success: false, error: "voteType must be 'UP' or 'DOWN'" },
        { status: 400 }
      );
    }

    // Demo sandbox accounts never write to Turso DB or Redis
    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          action: "ADDED",
          currentVote: voteType,
          upvotesCount: 1,
          downvotesCount: 0,
        },
      });
    }

    // 1. Anti-spam double-click lock in Redis (300ms window)
    const lockAcquired = await acquireActionLock(
      `vote:${currentUser.id}:${postId}`,
      300
    );
    if (!lockAcquired) {
      return NextResponse.json(
        { success: false, error: "Please wait a moment before voting again" },
        { status: 429 }
      );
    }

    // 2. Sliding window Rate Limit: Max 40 votes per minute
    const rateLimitError = enforceRateLimit(
      req,
      currentUser.id,
      { limit: 40, windowMs: 60000 },
      "vote"
    );
    if (rateLimitError) return rateLimitError;

    const targetPost = await db.query.posts.findFirst({
      where: and(eq(posts.id, postId), eq(posts.isDeleted, false)),
    });

    if (!targetPost) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // 3. Fast state check (Redis cache -> Turso fallback)
    const cachedVote = await getCachedUserVote(currentUser.id, postId);
    let existingVoteType: "UP" | "DOWN" | null = null;

    if (cachedVote !== null) {
      existingVoteType = cachedVote === "NONE" ? null : cachedVote;
    } else {
      const existingVote = await db.query.votes.findFirst({
        where: and(
          eq(votes.userId, currentUser.id),
          eq(votes.targetType, "POST"),
          eq(votes.targetId, postId)
        ),
      });
      existingVoteType = existingVote
        ? (existingVote.voteType as "UP" | "DOWN")
        : null;
    }

    let action: "ADDED" | "SWITCHED" | "REMOVED";
    let currentVote: "UP" | "DOWN" | null = null;

    if (existingVoteType) {
      if (existingVoteType === voteType) {
        // Cancel vote (toggle off)
        await db
          .delete(votes)
          .where(
            and(
              eq(votes.userId, currentUser.id),
              eq(votes.targetType, "POST"),
              eq(votes.targetId, postId)
            )
          );

        if (voteType === "UP") {
          await Promise.all([
            db
              .update(posts)
              .set({ upvotesCount: sql`MAX(${posts.upvotesCount} - 1, 0)` })
              .where(eq(posts.id, postId)),
            db
              .update(comments)
              .set({ upvotesCount: sql`MAX(${comments.upvotesCount} - 1, 0)` })
              .where(eq(comments.id, postId)),
          ]);
        } else {
          await Promise.all([
            db
              .update(posts)
              .set({ downvotesCount: sql`MAX(${posts.downvotesCount} - 1, 0)` })
              .where(eq(posts.id, postId)),
            db
              .update(comments)
              .set({ downvotesCount: sql`MAX(${comments.downvotesCount} - 1, 0)` })
              .where(eq(comments.id, postId)),
          ]);
        }

        action = "REMOVED";
        currentVote = null;
      } else {
        // Switch vote
        await db
          .update(votes)
          .set({ voteType })
          .where(
            and(
              eq(votes.userId, currentUser.id),
              eq(votes.targetType, "POST"),
              eq(votes.targetId, postId)
            )
          );

        if (voteType === "UP") {
          await Promise.all([
            db
              .update(posts)
              .set({
                upvotesCount: sql`${posts.upvotesCount} + 1`,
                downvotesCount: sql`MAX(${posts.downvotesCount} - 1, 0)`,
              })
              .where(eq(posts.id, postId)),
            db
              .update(comments)
              .set({
                upvotesCount: sql`${comments.upvotesCount} + 1`,
                downvotesCount: sql`MAX(${comments.downvotesCount} - 1, 0)`,
              })
              .where(eq(comments.id, postId)),
          ]);
        } else {
          await Promise.all([
            db
              .update(posts)
              .set({
                downvotesCount: sql`${posts.downvotesCount} + 1`,
                upvotesCount: sql`MAX(${posts.upvotesCount} - 1, 0)`,
              })
              .where(eq(posts.id, postId)),
            db
              .update(comments)
              .set({
                downvotesCount: sql`${comments.downvotesCount} + 1`,
                upvotesCount: sql`MAX(${comments.upvotesCount} - 1, 0)`,
              })
              .where(eq(comments.id, postId)),
          ]);
        }

        action = "SWITCHED";
        currentVote = voteType;
      }
    } else {
      // New vote
      await db.insert(votes).values({
        userId: currentUser.id,
        targetType: "POST",
        targetId: postId,
        voteType,
      });

      if (voteType === "UP") {
        await Promise.all([
          db
            .update(posts)
            .set({ upvotesCount: sql`${posts.upvotesCount} + 1` })
            .where(eq(posts.id, postId)),
          db
            .update(comments)
            .set({ upvotesCount: sql`${comments.upvotesCount} + 1` })
            .where(eq(comments.id, postId)),
        ]);

        if (targetPost.authorId !== currentUser.id) {
          const rootId = targetPost.rootPostId || postId;
          await db.insert(notifications).values({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            recipientId: targetPost.authorId,
            actorId: currentUser.id,
            type: "UPVOTE",
            postId: rootId,
            title: `${currentUser.name} menyetujui postingan Anda`,
            href: `/posts/${rootId}`,
            isRead: false,
            createdAt: new Date(),
          });
        }
      } else {
        await Promise.all([
          db
            .update(posts)
            .set({ downvotesCount: sql`${posts.downvotesCount} + 1` })
            .where(eq(posts.id, postId)),
          db
            .update(comments)
            .set({ downvotesCount: sql`${comments.downvotesCount} + 1` })
            .where(eq(comments.id, postId)),
        ]);
      }

      action = "ADDED";
      currentVote = voteType;
    }

    const updatedPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: {
        upvotesCount: true,
        downvotesCount: true,
        repostsCount: true,
        isActionTaken: true,
        rootPostId: true,
        authorId: true,
      },
    });

    const finalUpvotes = updatedPost?.upvotesCount ?? 0;
    const finalDownvotes = updatedPost?.downvotesCount ?? 0;
    const finalReposts = updatedPost?.repostsCount ?? 0;

    // Auto-close root report if this was an Option A `isActionTaken` reply reaching >= 40 votes & >= 83% approval
    if (
      updatedPost?.isActionTaken &&
      updatedPost.rootPostId &&
      shouldAutoCloseAction(finalUpvotes, finalDownvotes)
    ) {
      const now = new Date();
      await db
        .update(posts)
        .set({
          status: "CLOSED",
          closeType: "SOLVED",
          reportStatus: "completed",
          closedById: updatedPost.authorId,
          closedAt: now,
          resolutionCommentId: postId,
          updatedAt: now,
        })
        .where(eq(posts.id, updatedPost.rootPostId));
    }

    await Promise.all([
      setCachedUserVote(currentUser.id, postId, currentVote || "NONE"),
      setCachedPostCounters(postId, {
        upvotesCount: finalUpvotes,
        downvotesCount: finalDownvotes,
        repostsCount: finalReposts,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        action,
        currentVote,
        upvotesCount: finalUpvotes,
        downvotesCount: finalDownvotes,
      },
    });
  } catch (error) {
    console.error("POST /api/posts/[id]/vote error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process vote" },
      { status: 500 }
    );
  }
}
