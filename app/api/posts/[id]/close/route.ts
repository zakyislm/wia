import { NextRequest, NextResponse } from "next/server";
import { db, posts, notifications } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: postId } = await params;
    const currentUser = await getSessionUser(req);

    if (currentUser.role !== "GOVERNMENT" && currentUser.role !== "INTERNAL") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden: Only Government agencies or Internal team can close threads.",
        },
        { status: 403 }
      );
    }

    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          postId,
          status: "CLOSED",
          closeType: "GENERAL",
          reportStatus:
            currentUser.role === "INTERNAL" ? "closed_internal" : "completed",
          closedById: currentUser.id,
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

    const now = new Date();
    const reportStatus =
      currentUser.role === "INTERNAL" ? "closed_internal" : "completed";

    await db
      .update(posts)
      .set({
        status: "CLOSED",
        closeType: "GENERAL",
        reportStatus,
        closedById: currentUser.id,
        closedAt: now,
        updatedAt: now,
      })
      .where(eq(posts.id, postId));

    if (targetPost.authorId !== currentUser.id) {
      await db.insert(notifications).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId: targetPost.authorId,
        actorId: currentUser.id,
        type: "SYSTEM",
        postId,
        title: "Laporan ditutup",
        message: `Utas laporan Anda telah ditutup oleh ${currentUser.agencyName || currentUser.name}.`,
        href: `/posts/${postId}`,
        isRead: false,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        postId,
        status: "CLOSED",
        closeType: "GENERAL",
        reportStatus,
        closedById: currentUser.id,
      },
    });
  } catch (error) {
    console.error("POST /api/posts/[id]/close error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to close thread" },
      { status: 500 }
    );
  }
}
