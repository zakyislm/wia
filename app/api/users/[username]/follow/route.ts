import { NextRequest, NextResponse } from "next/server";
import { db, users, follows, notifications } from "@/db";
import { eq, and, or, sql } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

interface Params {
  params: Promise<{ username: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const rawUsername = (await params).username.replace(/^@/, "").trim();
    const currentUser = await getSessionUser(req);

    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: { isFollowing: true },
      });
    }

    const targetUser = await db.query.users.findFirst({
      where: or(eq(users.username, rawUsername), eq(users.id, rawUsername)),
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Target user not found" },
        { status: 404 }
      );
    }

    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    const existingFollow = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, currentUser.id),
        eq(follows.followingId, targetUser.id)
      ),
    });

    if (existingFollow) {
      // Unfollow
      await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, currentUser.id),
            eq(follows.followingId, targetUser.id)
          )
        );

      await Promise.all([
        db
          .update(users)
          .set({ followerCount: sql`MAX(${users.followerCount} - 1, 0)` })
          .where(eq(users.id, targetUser.id)),
        db
          .update(users)
          .set({ followingCount: sql`MAX(${users.followingCount} - 1, 0)` })
          .where(eq(users.id, currentUser.id)),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          isFollowing: false,
          message: `Unfollowed @${targetUser.username}`,
        },
      });
    }

    // Follow
    await db.insert(follows).values({
      followerId: currentUser.id,
      followingId: targetUser.id,
      createdAt: new Date(),
    });

    await Promise.all([
      db
        .update(users)
        .set({ followerCount: sql`${users.followerCount} + 1` })
        .where(eq(users.id, targetUser.id)),
      db
        .update(users)
        .set({ followingCount: sql`${users.followingCount} + 1` })
        .where(eq(users.id, currentUser.id)),
      db.insert(notifications).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId: targetUser.id,
        actorId: currentUser.id,
        type: "FOLLOW",
        title: `${currentUser.name} mulai mengikuti Anda`,
        message: `@${currentUser.username} mulai mengikuti Anda.`,
        href: `/profile/${currentUser.username}`,
        isRead: false,
        createdAt: new Date(),
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        isFollowing: true,
        message: `Now following @${targetUser.username}`,
      },
    });
  } catch (error) {
    console.error("POST /api/users/[username]/follow error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process follow" },
      { status: 500 }
    );
  }
}
