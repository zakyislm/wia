import { NextRequest, NextResponse } from "next/server";
import { db, comments, posts, votes, notifications } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";
import { shouldAutoCloseAction } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: commentId } = await params;
    const currentUser = await getSessionUser(req);
    const body = await req.json();

    const voteType = body?.voteType?.toUpperCase();
    if (voteType !== "UP" && voteType !== "DOWN") {
      return NextResponse.json(
        { success: false, error: "voteType must be 'UP' or 'DOWN'" },
        { status: 400 }
      );
    }

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

    // Lookup in comments table or Option A unified posts table
    const [targetComment, targetReplyPost] = await Promise.all([
      db.query.comments.findFirst({
        where: and(eq(comments.id, commentId), eq(comments.isDeleted, false)),
      }),
      db.query.posts.findFirst({
        where: and(eq(posts.id, commentId), eq(posts.isDeleted, false)),
      }),
    ]);

    if (!targetComment && !targetReplyPost) {
      return NextResponse.json(
        { success: false, error: "Comment not found" },
        { status: 404 }
      );
    }

    const authorId = targetComment?.authorId || targetReplyPost!.authorId;
    const rootPostId =
      targetComment?.postId || targetReplyPost?.rootPostId || targetReplyPost?.parentPostId || null;

    // Check existing vote
    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(votes.userId, currentUser.id),
        eq(votes.targetType, "COMMENT"),
        eq(votes.targetId, commentId)
      ),
    });

    let action: "ADDED" | "SWITCHED" | "REMOVED";
    let currentVote: "UP" | "DOWN" | null = null;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Cancel vote
        await db
          .delete(votes)
          .where(
            and(
              eq(votes.userId, currentUser.id),
              eq(votes.targetType, "COMMENT"),
              eq(votes.targetId, commentId)
            )
          );

        if (voteType === "UP") {
          await Promise.all([
            db
              .update(comments)
              .set({ upvotesCount: sql`MAX(${comments.upvotesCount} - 1, 0)` })
              .where(eq(comments.id, commentId)),
            db
              .update(posts)
              .set({ upvotesCount: sql`MAX(${posts.upvotesCount} - 1, 0)` })
              .where(eq(posts.id, commentId)),
          ]);
        } else {
          await Promise.all([
            db
              .update(comments)
              .set({ downvotesCount: sql`MAX(${comments.downvotesCount} - 1, 0)` })
              .where(eq(comments.id, commentId)),
            db
              .update(posts)
              .set({ downvotesCount: sql`MAX(${posts.downvotesCount} - 1, 0)` })
              .where(eq(posts.id, commentId)),
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
              eq(votes.targetType, "COMMENT"),
              eq(votes.targetId, commentId)
            )
          );

        if (voteType === "UP") {
          await Promise.all([
            db
              .update(comments)
              .set({
                upvotesCount: sql`${comments.upvotesCount} + 1`,
                downvotesCount: sql`MAX(${comments.downvotesCount} - 1, 0)`,
              })
              .where(eq(comments.id, commentId)),
            db
              .update(posts)
              .set({
                upvotesCount: sql`${posts.upvotesCount} + 1`,
                downvotesCount: sql`MAX(${posts.downvotesCount} - 1, 0)`,
              })
              .where(eq(posts.id, commentId)),
          ]);
        } else {
          await Promise.all([
            db
              .update(comments)
              .set({
                downvotesCount: sql`${comments.downvotesCount} + 1`,
                upvotesCount: sql`MAX(${comments.upvotesCount} - 1, 0)`,
              })
              .where(eq(comments.id, commentId)),
            db
              .update(posts)
              .set({
                downvotesCount: sql`${posts.downvotesCount} + 1`,
                upvotesCount: sql`MAX(${posts.upvotesCount} - 1, 0)`,
              })
              .where(eq(posts.id, commentId)),
          ]);
        }

        action = "SWITCHED";
        currentVote = voteType;
      }
    } else {
      // Add vote
      await db.insert(votes).values({
        userId: currentUser.id,
        targetType: "COMMENT",
        targetId: commentId,
        voteType,
      });

      if (voteType === "UP") {
        await Promise.all([
          db
            .update(comments)
            .set({ upvotesCount: sql`${comments.upvotesCount} + 1` })
            .where(eq(comments.id, commentId)),
          db
            .update(posts)
            .set({ upvotesCount: sql`${posts.upvotesCount} + 1` })
            .where(eq(posts.id, commentId)),
        ]);

        if (authorId !== currentUser.id && rootPostId) {
          await db.insert(notifications).values({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            recipientId: authorId,
            actorId: currentUser.id,
            type: "UPVOTE",
            postId: rootPostId,
            commentId,
            title: `${currentUser.name} menyetujui balasan Anda`,
            href: `/posts/${rootPostId}`,
            isRead: false,
            createdAt: new Date(),
          });
        }
      } else {
        await Promise.all([
          db
            .update(comments)
            .set({ downvotesCount: sql`${comments.downvotesCount} + 1` })
            .where(eq(comments.id, commentId)),
          db
            .update(posts)
            .set({ downvotesCount: sql`${posts.downvotesCount} + 1` })
            .where(eq(posts.id, commentId)),
        ]);
      }

      action = "ADDED";
      currentVote = voteType;
    }

    const [updatedComment, updatedReplyPost] = await Promise.all([
      db.query.comments.findFirst({
        where: eq(comments.id, commentId),
        columns: { upvotesCount: true, downvotesCount: true, isActionTaken: true },
      }),
      db.query.posts.findFirst({
        where: eq(posts.id, commentId),
        columns: { upvotesCount: true, downvotesCount: true, isActionTaken: true },
      }),
    ]);

    const upvotesCount =
      updatedReplyPost?.upvotesCount ?? updatedComment?.upvotesCount ?? 0;
    const downvotesCount =
      updatedReplyPost?.downvotesCount ?? updatedComment?.downvotesCount ?? 0;
    const isAction = Boolean(
      updatedReplyPost?.isActionTaken || updatedComment?.isActionTaken
    );

    // Auto-close parent report when action-taken response reaches >= 40 votes and >= 83% approval
    let autoClosed = false;
    if (isAction && rootPostId && shouldAutoCloseAction(upvotesCount, downvotesCount)) {
      const now = new Date();
      await db
        .update(posts)
        .set({
          status: "CLOSED",
          closeType: "SOLVED",
          reportStatus: "completed",
          closedById: authorId,
          closedAt: now,
          resolutionCommentId: commentId,
          updatedAt: now,
        })
        .where(eq(posts.id, rootPostId));
      autoClosed = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        currentVote,
        upvotesCount,
        downvotesCount,
        autoClosed,
      },
    });
  } catch (error) {
    console.error("POST /api/comments/[id]/vote error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to vote on comment" },
      { status: 500 }
    );
  }
}
