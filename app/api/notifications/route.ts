import { NextRequest, NextResponse } from "next/server";
import { db, notifications } from "@/db";
import { eq, desc, inArray, and } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);

    const list = await db.query.notifications.findMany({
      where: eq(notifications.recipientId, currentUser.id),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
      with: {
        actor: {
          columns: {
            id: true,
            name: true,
            username: true,
            image: true,
            role: true,
            agencyName: true,
          },
        },
        post: {
          columns: {
            id: true,
            title: true,
            content: true,
          },
        },
      },
    });

    const formatted = list.map((n) => ({
      ...n,
      title:
        n.title ||
        (n.type === "RESOLVED"
          ? `${n.actor?.agencyName || n.actor?.name || "Instansi"} menyelesaikan laporan Anda`
          : n.type === "COMMENT" || n.type === "REPLY"
            ? `${n.actor?.name || "Warga"} membalas diskusi Anda`
            : n.type === "UPVOTE"
              ? `${n.actor?.name || "Warga"} menyetujui postingan Anda`
              : n.type === "FOLLOW"
                ? `${n.actor?.name || "Warga"} mulai mengikuti Anda`
                : "Pembaruan aktivitas di Kavi"),
      href:
        n.href ||
        (n.postId
          ? `/posts/${n.postId}`
          : n.actor?.username
            ? `/profile/${n.actor.username}`
            : "/home"),
    }));

    const unreadCount = formatted.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      data: {
        unreadCount,
        notifications: formatted,
      },
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: "Demo notifications marked as read in client state",
      });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationIds } = body;

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.recipientId, currentUser.id),
            inArray(notifications.id, notificationIds)
          )
        );
    } else {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, currentUser.id));
    }

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
      });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationIds } = body;

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.recipientId, currentUser.id),
            inArray(notifications.id, notificationIds)
          )
        );
    } else {
      await db
        .delete(notifications)
        .where(eq(notifications.recipientId, currentUser.id));
    }

    return NextResponse.json({
      success: true,
      message: "Notifications deleted",
    });
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
}
