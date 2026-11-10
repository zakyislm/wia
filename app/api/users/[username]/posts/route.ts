import { NextRequest, NextResponse } from "next/server";
import { db, users, posts, comments } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth-helper";

interface Params {
  params: Promise<{ username: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const rawUsername = (await params).username.replace(/^@/, "").trim();
    const { searchParams } = new URL(req.url);
    const visibility = searchParams.get("visibility");
    const type = searchParams.get("type");

    const user = await db.query.users.findFirst({
      where: eq(users.username, rawUsername),
      columns: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const currentUser = await getSessionUser(req);
    const isOwnProfile = currentUser.id === user.id;

    if (type === "responses" || type === "replies") {
      if (
        type === "responses" &&
        user.role !== "GOVERNMENT" &&
        user.role !== "INTERNAL"
      ) {
        return NextResponse.json({ success: true, data: [] });
      }

      const commentConditions = [
        eq(comments.authorId, user.id),
        eq(comments.isDeleted, false),
      ];
      if (type === "responses") {
        commentConditions.push(eq(comments.isActionTaken, true));
      } else if (!isOwnProfile || visibility === "public") {
        commentConditions.push(eq(comments.isAnonymous, false));
      } else if (visibility === "anonymous") {
        commentConditions.push(eq(comments.isAnonymous, true));
      }

      const userComments = await db.query.comments.findMany({
        where: and(...commentConditions),
        orderBy: [desc(comments.createdAt)],
        with: {
          post: {
            columns: {
              id: true,
              title: true,
              content: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: userComments.map((c) => ({
          id: c.id,
          postId: c.postId,
          parentId: c.parentId,
          content: c.content,
          images: c.images || [],
          isActionTaken: c.isActionTaken,
          isAnonymous: c.isAnonymous,
          upvotesCount: c.upvotesCount,
          downvotesCount: c.downvotesCount,
          createdAt: c.createdAt,
          post: c.post,
        })),
      });
    }

    const conditions = [eq(posts.authorId, user.id), eq(posts.isDeleted, false)];
    if (!isOwnProfile || visibility === "public") {
      conditions.push(eq(posts.isAnonymous, false));
    } else if (visibility === "anonymous") {
      conditions.push(eq(posts.isAnonymous, true));
    }

    const userPosts = await db.query.posts.findMany({
      where: and(...conditions),
      orderBy: [desc(posts.postedAt)],
      with: {
        topic: true,
        postTags: {
          with: {
            tag: true,
          },
        },
        closedBy: {
          columns: {
            name: true,
            agencyName: true,
            role: true,
          },
        },
      },
    });

    const formatted = userPosts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      isAnonymous: p.isAnonymous,
      images: p.images || [],
      locationName: p.locationName,
      province: p.province,
      status: p.status,
      closeType: p.closeType,
      resolutionCommentId: p.resolutionCommentId,
      upvotesCount: p.upvotesCount,
      commentsCount: p.commentsCount,
      viewsCount: p.viewsCount,
      postedAt: p.postedAt,
      topic: p.topic,
      tags: p.postTags.map((pt) => pt.tag),
      closedBy: p.closedBy,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("GET /api/users/[username]/posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user posts" },
      { status: 500 }
    );
  }
}
