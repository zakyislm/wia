import { NextRequest, NextResponse } from "next/server";
import { db, posts, users, votes, savedPosts, reposts } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth-helper";
import { recordPostViewBuffered } from "@/lib/redis";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const currentUser = await getSessionUser(req);

    // 1. Fetch post with relations
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), eq(posts.isDeleted, false)),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            username: true,
            image: true,
            bio: true,
            role: true,
            agencyName: true,
            jurisdictionProvince: true,
            postCount: true,
            followerCount: true,
          },
        },
        topic: true,
        postTags: {
          with: {
            tag: true,
          },
        },
        closedBy: {
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

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found or has been removed" },
        { status: 404 }
      );
    }

    // 2. Increment views in Redis buffer (Zero SQL writes to Turso)
    const pendingViews = await recordPostViewBuffered(id);

    // 3. Check current user interactions
    const [userVote, userSaved, userReposted] = await Promise.all([
      db
        .select({ voteType: votes.voteType })
        .from(votes)
        .where(and(eq(votes.userId, currentUser.id), eq(votes.targetType, "POST"), eq(votes.targetId, id)))
        .limit(1),
      db
        .select({ postId: savedPosts.postId })
        .from(savedPosts)
        .where(and(eq(savedPosts.userId, currentUser.id), eq(savedPosts.postId, id)))
        .limit(1),
      db
        .select({ postId: reposts.postId })
        .from(reposts)
        .where(and(eq(reposts.userId, currentUser.id), eq(reposts.postId, id)))
        .limit(1),
    ]);

    const formatted = {
      id: post.id,
      title: post.title,
      content: post.content,
      images: post.images || [],
      locationName: post.locationName,
      province: post.province,
      latitude: post.latitude,
      longitude: post.longitude,
      status: post.status,
      closeType: post.closeType,
      resolutionCommentId: post.resolutionCommentId,
      upvotesCount: post.upvotesCount,
      downvotesCount: post.downvotesCount,
      commentsCount: post.commentsCount,
      repostsCount: post.repostsCount,
      viewsCount: (post.viewsCount ?? 0) + pendingViews,
      isAnonymous: post.isAnonymous,
      isPinned: post.isPinned,
      postedAt: post.postedAt,
      author: post.isAnonymous
        ? {
            id: "anonymous",
            name: "Anonim",
            username: "anonim",
            image: null,
            bio: null,
            role: "USER",
            agencyName: null,
            jurisdictionProvince: null,
            postCount: 0,
            followerCount: 0,
          }
        : post.author,
      topic: post.topic,
      tags: post.postTags.map((pt) => pt.tag),
      closedBy: post.closedBy,
      userInteraction: {
        hasUpvoted: userVote[0]?.voteType === "UP",
        hasDownvoted: userVote[0]?.voteType === "DOWN",
        hasSaved: userSaved.length > 0,
        hasReposted: userReposted.length > 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("GET /api/posts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const currentUser = await getSessionUser(req);

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, id),
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // Only post author or INTERNAL team can delete
    const isAuthor = post.authorId === currentUser.id;
    const isInternal = currentUser.role === "INTERNAL";

    if (!isAuthor && !isInternal) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You do not have permission to delete this post" },
        { status: 403 }
      );
    }

    // Soft delete
    await db
      .update(posts)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(posts.id, id));

    // Decrement author's post count
    await db
      .update(users)
      .set({ postCount: sql`MAX(${users.postCount} - 1, 0)` })
      .where(eq(users.id, post.authorId));

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
