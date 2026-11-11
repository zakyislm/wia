import { NextRequest, NextResponse } from "next/server";
import { db, posts, comments, notifications } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: postId } = await params;
    const currentUser = await getSessionUser(req);
    const body = await req.json();

    const { content, images = [] } = body;

    // RBAC: Only GOVERNMENT or INTERNAL can solve a report
    if (currentUser.role !== "GOVERNMENT" && currentUser.role !== "INTERNAL") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden: Only verified Government agencies or Internal team can solve issues.",
        },
        { status: 403 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Official resolution response text is required." },
        { status: 400 }
      );
    }

    if (Array.isArray(images) && images.length > 6) {
      return NextResponse.json(
        { success: false, error: "Maximum 6 proof images allowed." },
        { status: 400 }
      );
    }

    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          postId,
          status: "CLOSED",
          closeType: "SOLVED",
          reportStatus: "completed",
          resolutionCommentId: `demo_res_${Date.now()}`,
        },
      });
    }

    const targetPost = await db.query.posts.findFirst({
      where: and(eq(posts.id, postId), eq(posts.isDeleted, false)),
    });

    if (!targetPost) {
      return NextResponse.json(
        { success: false, error: "Post not found or deleted" },
        { status: 404 }
      );
    }

    // Jurisdiction check for GOVERNMENT role
    if (currentUser.role === "GOVERNMENT") {
      if (
        currentUser.jurisdictionProvince &&
        targetPost.province &&
        targetPost.province.toLowerCase() !==
          currentUser.jurisdictionProvince.toLowerCase()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Jurisdiction mismatch: Your agency is registered for ${currentUser.jurisdictionProvince}, but this issue is in ${targetPost.province}.`,
          },
          { status: 403 }
        );
      }
    }

    const now = new Date();
    const resolutionCommentId = `cmt_res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Insert official resolution in Option A unified `posts` (`kind: "reply"`) and `comments`
    await db
      .insert(posts)
      .values({
        id: resolutionCommentId,
        authorId: currentUser.id,
        kind: "reply",
        parentPostId: postId,
        rootPostId: postId,
        topicId: targetPost.topicId,
        content: content.trim(),
        images: Array.isArray(images) ? images : [],
        locationName: targetPost.locationName,
        province: targetPost.province,
        status: "OPEN",
        closeType: "NONE",
        isActionTaken: true,
        actionRole: currentUser.role as "GOVERNMENT" | "INTERNAL",
        actionTakenAt: now,
        postedAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(comments)
      .values({
        id: resolutionCommentId,
        postId,
        authorId: currentUser.id,
        parentId: null,
        content: content.trim(),
        images: Array.isArray(images) ? images : [],
        upvotesCount: 0,
        downvotesCount: 0,
        isActionTaken: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Mark post as SOLVED and closed
    await db
      .update(posts)
      .set({
        status: "CLOSED",
        closeType: "SOLVED",
        reportStatus: "completed",
        closedById: currentUser.id,
        closedAt: now,
        resolutionCommentId,
        updatedAt: now,
      })
      .where(eq(posts.id, postId));

    // 3. Send notification to the citizen reporter
    if (targetPost.authorId !== currentUser.id) {
      await db.insert(notifications).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId: targetPost.authorId,
        actorId: currentUser.id,
        type: "RESOLVED",
        postId,
        commentId: resolutionCommentId,
        title: "Laporan selesai ditindaklanjuti",
        message: `Laporan Anda telah diselesaikan secara resmi oleh ${currentUser.agencyName || currentUser.name}.`,
        href: `/posts/${postId}#evidence`,
        isRead: false,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        postId,
        status: "CLOSED",
        closeType: "SOLVED",
        reportStatus: "completed",
        resolutionCommentId,
        closedBy: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          role: currentUser.role,
          agencyName: currentUser.agencyName,
        },
      },
    });
  } catch (error) {
    console.error("POST /api/posts/[id]/solve error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve post" },
      { status: 500 }
    );
  }
}
