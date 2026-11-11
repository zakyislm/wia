import "dotenv/config";
import { db, posts, comments, votes, savedPosts, reposts } from "../db";
import { eq, and } from "drizzle-orm";
import assert from "assert";

async function runPhase2Tests() {
  console.log("=== [TEST SUITE] PHASE 2: DISCUSSIONS & INTERACTIONS ===");

  // Find an active post
  const activePost = await db.query.posts.findFirst({
    where: eq(posts.status, "OPEN"),
  });
  assert(activePost, "Must have at least one active post for testing");
  const postId = activePost.id;
  const testUserId = "alya";
  const now = new Date();

  // Test 1: Add Parent Comment
  console.log("-> Test 1: Creating Parent Comment...");
  const parentCommentId = `test_cmt_parent_${Date.now()}`;
  await db.insert(comments).values({
    id: parentCommentId,
    postId,
    authorId: testUserId,
    parentId: null,
    content: "Top-level parent comment test for Threads-like tree.",
    createdAt: now,
    updatedAt: now,
  });
  console.log("   PASS: Parent comment created");

  // Test 2: Add Nested Child Reply
  console.log("-> Test 2: Creating Nested Child Reply...");
  const childCommentId = `test_cmt_child_${Date.now()}`;
  await db.insert(comments).values({
    id: childCommentId,
    postId,
    authorId: testUserId,
    parentId: parentCommentId,
    content: "Child reply connecting vertically to parent comment.",
    createdAt: new Date(Date.now() + 1000),
    updatedAt: now,
  });
  console.log("   PASS: Child reply created");

  // Test 3: Verify Tree Structure
  console.log("-> Test 3: Verifying Tree Transformation Logic...");
  const postComments = await db.query.comments.findMany({
    where: and(eq(comments.postId, postId), eq(comments.isDeleted, false)),
  });

  const map = new Map<string, any>();
  const tree: any[] = [];
  postComments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  postComments.forEach((c) => {
    const node = map.get(c.id);
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId).replies.push(node);
    } else {
      tree.push(node);
    }
  });

  const parentInTree = map.get(parentCommentId);
  assert(parentInTree, "Parent comment must exist in map");
  assert.strictEqual(parentInTree.replies.length, 1, "Parent should have exactly 1 child reply");
  assert.strictEqual(parentInTree.replies[0].id, childCommentId, "Child reply ID must match");
  console.log("   PASS: Hierarchical comment tree assembled correctly (1 level deep)");

  // Test 4: Upvote and Toggle Logic on Post
  console.log("-> Test 4: Testing 3-State Voting Logic on Post...");
  // Step A: Upvote
  await db.insert(votes).values({
    userId: testUserId,
    targetType: "POST",
    targetId: postId,
    voteType: "UP",
  });
  const voteCheck = await db.query.votes.findFirst({
    where: and(eq(votes.userId, testUserId), eq(votes.targetType, "POST"), eq(votes.targetId, postId)),
  });
  assert.strictEqual(voteCheck?.voteType, "UP", "Vote must be recorded as UP");

  // Step B: Cancel vote
  await db.delete(votes).where(and(eq(votes.userId, testUserId), eq(votes.targetType, "POST"), eq(votes.targetId, postId)));
  const cancelledCheck = await db.query.votes.findFirst({
    where: and(eq(votes.userId, testUserId), eq(votes.targetType, "POST"), eq(votes.targetId, postId)),
  });
  assert.strictEqual(cancelledCheck, undefined, "Vote should be removed on cancel");
  console.log("   PASS: Voting toggle and cancel logic verified");

  // Test 5: Bookmark & Repost Toggle
  console.log("-> Test 5: Testing Bookmark & Repost...");
  await db.insert(savedPosts).values({ userId: testUserId, postId, createdAt: now });
  await db.insert(reposts).values({ userId: testUserId, postId, createdAt: now });

  const hasSaved = await db.query.savedPosts.findFirst({ where: and(eq(savedPosts.userId, testUserId), eq(savedPosts.postId, postId)) });
  const hasReposted = await db.query.reposts.findFirst({ where: and(eq(reposts.userId, testUserId), eq(reposts.postId, postId)) });
  assert(hasSaved, "Post must be bookmarked");
  assert(hasReposted, "Post must be reposted");

  // Cleanup test data
  await db.delete(savedPosts).where(and(eq(savedPosts.userId, testUserId), eq(savedPosts.postId, postId)));
  await db.delete(reposts).where(and(eq(reposts.userId, testUserId), eq(reposts.postId, postId)));
  await db.delete(comments).where(eq(comments.id, childCommentId));
  await db.delete(comments).where(eq(comments.id, parentCommentId));
  console.log("   PASS: Bookmark & Repost verified, test data cleaned up");

  console.log("=== ALL PHASE 2 TESTS PASSED SUCCESSFULLY ===");
}

runPhase2Tests().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
