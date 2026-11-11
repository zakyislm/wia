import "dotenv/config";
import { db, posts, comments, topics, notifications } from "../db";
import { eq, and, desc } from "drizzle-orm";
import assert from "assert";

async function runPhase3Tests() {
  console.log("=== [TEST SUITE] PHASE 3: RESOLUTION & TRENDING WIDGET ===");

  const now = new Date();
  const testPostId = `test_p3_post_${Date.now()}`;
  const allTopics = await db.select().from(topics);
  assert(allTopics.length > 0, "Topics must exist");

  // Create temporary post in Kaltara
  await db.insert(posts).values({
    id: testPostId,
    authorId: "alya",
    topicId: allTopics[0].id,
    title: "Jembatan Rusak Berat di Bulungan Menunggu Tindak Lanjut",
    content: "Akses warga terputus karena jembatan kayu ambles. Butuh jembatan darurat.",
    locationName: "Kecamatan Tanjung Palas, Bulungan",
    province: "Kalimantan Utara",
    status: "OPEN",
    closeType: "NONE",
    upvotesCount: 350,
    viewsCount: 1800,
    postedAt: now,
    updatedAt: now,
  });

  // Test 1: Government Resolution (Solve Thread)
  console.log("-> Test 1: Testing Government Official Resolution (Solve)...");
  const resCommentId = `test_p3_res_comment_${Date.now()}`;
  await db.insert(comments).values({
    id: resCommentId,
    postId: testPostId,
    authorId: "pupr",
    content: "Dinas PUPR Kaltara telah memasang jembatan bailey darurat per siang ini. Akses sudah normal.",
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(posts)
    .set({
      status: "CLOSED",
      closeType: "SOLVED",
      closedById: "pupr",
      resolutionCommentId: resCommentId,
      updatedAt: now,
    })
    .where(eq(posts.id, testPostId));

  const solvedPost = await db.query.posts.findFirst({
    where: eq(posts.id, testPostId),
    with: { closedBy: true },
  });

  assert(solvedPost, "Post must exist");
  assert.strictEqual(solvedPost.status, "CLOSED", "Post status must be CLOSED");
  assert.strictEqual(solvedPost.closeType, "SOLVED", "closeType must be SOLVED");
  assert.strictEqual(solvedPost.resolutionCommentId, resCommentId, "Resolution comment ID must match");
  assert.strictEqual(solvedPost.closedBy?.agencyName, "Dinas PUPR Bandung");
  console.log("   PASS: Government resolution linked to official response comment");

  // Test 2: Pin / Unpin Toggle
  console.log("-> Test 2: Testing Emergency Pin Toggle...");
  await db.update(posts).set({ isPinned: true }).where(eq(posts.id, testPostId));
  let pinCheck = await db.query.posts.findFirst({ where: eq(posts.id, testPostId) });
  assert.strictEqual(pinCheck?.isPinned, true, "Post should be pinned");

  await db.update(posts).set({ isPinned: false }).where(eq(posts.id, testPostId));
  pinCheck = await db.query.posts.findFirst({ where: eq(posts.id, testPostId) });
  assert.strictEqual(pinCheck?.isPinned, false, "Post should be unpinned");
  console.log("   PASS: Pin toggle verified");

  // Test 3: Trending Widget Queries
  console.log("-> Test 3: Querying Trending Widget Data...");
  const trendingTopics = await db
    .select()
    .from(topics)
    .orderBy(desc(topics.isTrending))
    .limit(5);
  assert(trendingTopics.length > 0, "Trending topics should return results");

  const trendingPosts = await db.query.posts.findMany({
    where: and(eq(posts.isDeleted, false), eq(posts.status, "OPEN")),
    orderBy: [desc(posts.upvotesCount), desc(posts.viewsCount)],
    limit: 5,
  });
  console.log(`   PASS: Trending widget returned ${trendingTopics.length} topics & ${trendingPosts.length} posts`);

  // Cleanup test data
  await db.delete(comments).where(eq(comments.id, resCommentId));
  await db.delete(posts).where(eq(posts.id, testPostId));
  console.log("   PASS: Cleanup completed");

  console.log("=== ALL PHASE 3 TESTS PASSED SUCCESSFULLY ===");
}

runPhase3Tests().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
