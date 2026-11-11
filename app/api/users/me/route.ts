import { NextRequest, NextResponse } from "next/server";
import { db, users, posts } from "@/db";
import { eq, and, ne, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth-helper";
import { enforceRateLimit } from "@/lib/rate-limit";

// Username rules: Char & Num only, min 4, max 30 chars
const USERNAME_REGEX = /^[a-zA-Z0-9]{4,30}$/;

/**
 * GET /api/users/me - Retrieve current logged-in user profile & personal civic stats
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
      columns: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        role: true,
        agencyName: true,
        jurisdictionProvince: true,
        postCount: true,
        followerCount: true,
        followingCount: true,
        warningCount: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // Calculate user's civic impact statistics
    const [solvedStats, upvoteStats] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(
          and(
            eq(posts.authorId, currentUser.id),
            eq(posts.isDeleted, false),
            eq(posts.status, "CLOSED"),
            eq(posts.closeType, "SOLVED")
          )
        ),
      db
        .select({ totalUpvotes: sql<number>`coalesce(sum(${posts.upvotesCount}), 0)` })
        .from(posts)
        .where(and(eq(posts.authorId, currentUser.id), eq(posts.isDeleted, false))),
    ]);

    const solvedReportsCount = Number(solvedStats[0]?.count || 0);
    const totalUpvotesReceived = Number(upvoteStats[0]?.totalUpvotes || 0);

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        stats: {
          postCount: user.postCount,
          followerCount: user.followerCount,
          followersCount: user.followerCount,
          followingCount: user.followingCount,
          solvedReportsCount,
          totalUpvotesReceived,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me - Update user profile & customize username
 */
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);

    // Rate Limit: Max 10 updates per minute
    const rateLimitError = enforceRateLimit(
      req,
      currentUser.id,
      { limit: 10, windowMs: 60000 },
      "profile-update"
    );
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    // 1. Validate & normalize username (Char & num only, min 4 char)
    if (body.username !== undefined) {
      const raw = String(body.username).replace(/^@/, "").trim();

      if (!USERNAME_REGEX.test(raw)) {
        return NextResponse.json(
          {
            success: false,
            error: "Username must be 4-30 characters long and contain only letters and numbers (no symbols or spaces).",
          },
          { status: 400 }
        );
      }

      const normalizedUsername = raw.toLowerCase();

      // Check uniqueness against other users
      const existing = await db.query.users.findFirst({
        where: and(
          eq(users.username, normalizedUsername),
          ne(users.id, currentUser.id)
        ),
        columns: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Username @${normalizedUsername} is already taken.` },
          { status: 409 }
        );
      }

      updateData.username = normalizedUsername;
    }

    // 2. Validate Name
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json(
          { success: false, error: "Name must be at least 2 characters long." },
          { status: 400 }
        );
      }
      updateData.name = name;
    }

    // 3. Bio & Image (Avatar URL from R2)
    if (body.bio !== undefined) updateData.bio = String(body.bio).trim();
    if (body.image !== undefined) updateData.image = String(body.image).trim();

    // 4. Government / Agency / Region fields
    if (body.agencyName !== undefined) updateData.agencyName = String(body.agencyName).trim();
    if (body.region !== undefined) {
      updateData.region = String(body.region).trim();
      if (body.jurisdictionProvince === undefined) {
        updateData.jurisdictionProvince =
          String(body.region).split(",").pop()?.trim() || String(body.region).trim();
      }
    }
    if (body.jurisdictionProvince !== undefined) {
      updateData.jurisdictionProvince = String(body.jurisdictionProvince).trim();
    }

    // Perform database update
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, currentUser.id));

    // Return fresh updated profile
    const updated = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
      columns: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        role: true,
        agencyName: true,
        jurisdictionProvince: true,
        postCount: true,
        followerCount: true,
        followingCount: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/users/me error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
