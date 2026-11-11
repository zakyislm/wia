import "dotenv/config";
import { db, posts, topics } from "../db";
import {
  recordPostViewBuffered,
  recordPostVoteBuffered,
  recordPostRepostBuffered,
  getPostBufferedDeltas,
  flushBufferedCountersToDb,
} from "../lib/redis";
import { eq } from "drizzle-orm";
import assert from "assert";

async function runBufferedCounterTests() {
  console.log("=== [TEST SUITE] WRITE-BEHIND BUFFERED COUNTERS (REDIS -> TURSO) ===");

  const firstTopic = await db.query.topics.findFirst();
  assert(firstTopic, "At least one topic must exist");

  const testPostId = `post_buf_test_${Date.now()}`;
  const now = new Date();

  // 1. Create temporary post directly in Turso
  await db.insert(posts).values({
    id: testPostId,
    authorId: "alya",
    topicId: String(firstTopic.id),
    title: "Buffered Counter Test Post",
    content: "Testing Redis write-behind buffer",
    locationName: "Jakarta",
    province: "DKI Jakarta",
    status: "OPEN",
    viewsCount: 10,
    upvotesCount: 5,
    downvotesCount: 1,
    repostsCount: 2,
    postedAt: now,
    updatedAt: now,
  });

  try {
    // 2. Buffer 5 views in Redis (Zero Turso SQL writes!)
    console.log("-> Test 1: Buffering multiple views in Redis...");
    await recordPostViewBuffered(testPostId);
    await recordPostViewBuffered(testPostId);
    await recordPostViewBuffered(testPostId);

    // 3. Buffer vote and repost deltas
    console.log("-> Test 2: Buffering votes & repost deltas...");
    await recordPostVoteBuffered(testPostId, 2, 0); // +2 upvotes
    await recordPostRepostBuffered(testPostId, 1); // +1 repost

    // 4. Verify deltas in Redis
    const deltas = await getPostBufferedDeltas(testPostId);
    assert.strictEqual(deltas.views, 3, "Buffered views in Redis must be 3");
    assert.strictEqual(deltas.upvotes, 2, "Buffered upvotes in Redis must be 2");
    assert.strictEqual(deltas.reposts, 1, "Buffered reposts in Redis must be 1");
    console.log("   PASS: High-velocity interactions successfully absorbed in Redis buffer");

    // Verify Turso has NOT been touched yet (still has initial numbers)
    const dbBeforeFlush = await db.query.posts.findFirst({
      where: eq(posts.id, testPostId),
      columns: { viewsCount: true, upvotesCount: true },
    });
    assert.strictEqual(dbBeforeFlush?.viewsCount, 10, "Turso views must remain untouched before flush");
    assert.strictEqual(dbBeforeFlush?.upvotesCount, 5, "Turso upvotes must remain untouched before flush");
    console.log("   PASS: Turso database was spared from immediate SQL queries (Zero write overhead)");

    // 5. Trigger hourly flush to Turso
    console.log("-> Test 3: Executing hourly sync flush (Redis -> Turso)...");
    const flushResult = await flushBufferedCountersToDb();
    assert(flushResult.syncedCount >= 1, "Flush must sync at least our dirty post");

    // 6. Verify Turso now has the consolidated counters!
    const dbAfterFlush = await db.query.posts.findFirst({
      where: eq(posts.id, testPostId),
      columns: { viewsCount: true, upvotesCount: true, repostsCount: true },
    });
    assert.strictEqual(dbAfterFlush?.viewsCount, 13, "Turso views should be 10 + 3 = 13");
    assert.strictEqual(dbAfterFlush?.upvotesCount, 7, "Turso upvotes should be 5 + 2 = 7");
    assert.strictEqual(dbAfterFlush?.repostsCount, 3, "Turso reposts should be 2 + 1 = 3");
    console.log("   PASS: Turso database updated with consolidated counters in single batch");

    // 7. Verify Redis deltas are reset after flush
    const deltasAfter = await getPostBufferedDeltas(testPostId);
    assert.strictEqual(deltasAfter.views, 0, "Buffered views in Redis must be reset to 0");
    assert.strictEqual(deltasAfter.upvotes, 0, "Buffered upvotes in Redis must be reset to 0");
    console.log("   PASS: Redis buffer keys cleanly flushed and cleared");

    console.log("=== WRITE-BEHIND BUFFER TESTS PASSED SUCCESSFULLY ===");
  } finally {
    // Cleanup
    await db.delete(posts).where(eq(posts.id, testPostId));
  }
}

runBufferedCounterTests().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
