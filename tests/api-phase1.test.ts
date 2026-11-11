import "dotenv/config";
import { db, posts, topics, tags } from "../db";
import { eq } from "drizzle-orm";
import assert from "assert";

async function runPhase1Tests() {
  console.log("=== [TEST SUITE] PHASE 1: CORE ENGINE & FEEDS ===");

  // Test 1: Macro Topics
  console.log("-> Test 1: Checking Macro Topics...");
  const topicsList = await db.select().from(topics);
  assert(topicsList.length > 0, "Topics table should not be empty");
  console.log(`   PASS: Found ${topicsList.length} topics`);

  // Test 2: Micro Tags
  console.log("-> Test 2: Checking Micro Tags...");
  const tagsList = await db.select().from(tags);
  assert(tagsList.length > 0, "Tags table should not be empty");
  console.log(`   PASS: Found ${tagsList.length} tags`);

  // Test 3: Active Feed Query (Open Posts)
  console.log("-> Test 3: Querying Open Feed Posts...");
  const openPosts = await db.query.posts.findMany({
    where: eq(posts.status, "OPEN"),
    with: { author: true, topic: true, postTags: { with: { tag: true } } },
  });
  console.log(`   PASS: Found ${openPosts.length} open reports`);

  // Test 4: Archive Feed Query (Closed/Solved Posts)
  console.log("-> Test 4: Querying Archive / Solved Posts...");
  const archivePosts = await db.query.posts.findMany({
    where: eq(posts.status, "CLOSED"),
    with: { author: true, closedBy: true },
  });
  console.log(`   PASS: Found ${archivePosts.length} archived reports`);
  if (archivePosts.length > 0) {
    const solvedPost = archivePosts.find((p) => p.closeType === "SOLVED");
    if (solvedPost) {
      assert(solvedPost.resolutionCommentId, "Solved post must have a resolution comment ID");
      console.log(`   PASS: Solved post resolution linked -> ${solvedPost.resolutionCommentId}`);
    }
  }

  // Test 5: Post Lifecycle (Create, Read, Soft Delete)
  console.log("-> Test 5: Testing Full Post Lifecycle...");
  const tempId = `lifecycle_test_${Date.now()}`;
  const now = new Date();

  await db.insert(posts).values({
    id: tempId,
    authorId: "alya",
    topicId: topicsList[0].id,
    title: "Unit Test Automated Post",
    content: "Testing automatic post lifecycle and database constraints.",
    locationName: "Test Location, DKI Jakarta",
    province: "DKI Jakarta",
    status: "OPEN",
    closeType: "NONE",
    postedAt: now,
    updatedAt: now,
  });

  const checkCreated = await db.query.posts.findFirst({ where: eq(posts.id, tempId) });
  assert.strictEqual(checkCreated?.id, tempId, "Created post ID must match");

  // Soft delete
  await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, tempId));
  const checkDeleted = await db.query.posts.findFirst({ where: eq(posts.id, tempId) });
  assert.strictEqual(checkDeleted?.isDeleted, true, "Post must be soft deleted");

  // Hard cleanup test row
  await db.delete(posts).where(eq(posts.id, tempId));
  console.log("   PASS: Post lifecycle (Create, Read, Soft-Delete, Cleanup) verified");

  console.log("=== ALL PHASE 1 TESTS PASSED SUCCESSFULLY ===");
}

runPhase1Tests().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
