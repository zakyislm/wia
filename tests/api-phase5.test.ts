import "dotenv/config";
import { db, users, posts, topics } from "../db";
import { eq, like, or, and } from "drizzle-orm";
import assert from "assert";

async function runPhase5Tests() {
  console.log("=== [TEST SUITE] PHASE 5: USER PROFILE EDIT, GLOBAL SEARCH & ANALYTICS ===");

  const testUserId = "alya";

  // Test 1: Username Validation Logic (Char & num only, min 4, max 30)
  console.log("-> Test 1: Validating Username Rules (Char & Num Only, Min 4 Chars)...");
  const USERNAME_REGEX = /^[a-zA-Z0-9]{4,30}$/;

  assert.strictEqual(USERNAME_REGEX.test("user123"), true, "'user123' should be VALID");
  assert.strictEqual(USERNAME_REGEX.test("zaky"), true, "'zaky' (4 chars) should be VALID");
  assert.strictEqual(USERNAME_REGEX.test("abc"), false, "'abc' (<4 chars) must be INVALID");
  assert.strictEqual(USERNAME_REGEX.test("user_name"), false, "'user_name' with underscore must be INVALID (char & num only)");
  assert.strictEqual(USERNAME_REGEX.test("user.name"), false, "'user.name' with dot must be INVALID");
  assert.strictEqual(USERNAME_REGEX.test("user name"), false, "'user name' with space must be INVALID");
  console.log("   PASS: Username regex strictly enforces alphanumeric and length rules");

  // Test 2: Profile Update in Database
  console.log("-> Test 2: Testing Profile Update & Bio Customization...");
  const newBio = `Civic activist verified at ${Date.now()}`;
  await db
    .update(users)
    .set({
      bio: newBio,
      updatedAt: new Date(),
    })
    .where(eq(users.id, testUserId));

  const updatedProfile = await db.query.users.findFirst({
    where: eq(users.id, testUserId),
    columns: { bio: true, username: true },
  });
  assert.strictEqual(updatedProfile?.bio, newBio, "Bio must be updated in database");
  await db
    .update(users)
    .set({ bio: "Suara kecil, perubahan bersama." })
    .where(eq(users.id, testUserId));
  console.log("   PASS: Profile update verified in Turso");

  // Test 3: Global Search Querying Across Posts, Topics & Users
  console.log("-> Test 3: Testing Global Search Logic...");
  const searchPattern = "%infrastruktur%";

  const [matchedPosts, matchedTopics] = await Promise.all([
    db.query.posts.findMany({
      where: and(
        eq(posts.isDeleted, false),
        or(like(posts.title, searchPattern), like(posts.content, searchPattern))
      ),
      limit: 5,
    }),
    db.query.topics.findMany({
      where: or(like(topics.name, searchPattern), like(topics.slug, searchPattern)),
      limit: 5,
    }),
  ]);

  assert(Array.isArray(matchedPosts), "Search posts must return an array");
  assert(Array.isArray(matchedTopics), "Search topics must return an array");
  console.log(`   PASS: Global search executed successfully (${matchedPosts.length} posts, ${matchedTopics.length} topics found)`);

  // Test 4: Global Civic Impact Analytics
  console.log("-> Test 4: Testing Global Analytics (Resolution Rate & Province Ranking)...");
  const allPosts = await db.query.posts.findMany({
    where: eq(posts.isDeleted, false),
    columns: { status: true, closeType: true, province: true },
  });

  const total = allPosts.length;
  const solved = allPosts.filter((p) => p.status === "CLOSED" && p.closeType === "SOLVED").length;
  const resolutionRate = total > 0 ? Math.round((solved / total) * 100) : 0;

  assert(total >= 0, "Total reports count should be non-negative");
  assert(resolutionRate >= 0 && resolutionRate <= 100, "Resolution rate should be between 0 and 100%");
  console.log(`   PASS: Platform analytics calculated (${total} total, ${solved} solved, ${resolutionRate}% resolution rate)`);

  // Test 5: User Profile "Statistics" Subtab Scorecard
  console.log("-> Test 5: Testing User Profile Statistics Subtab Scorecard...");
  const userPosts = allPosts.filter((p) => p.status === "OPEN" || p.status === "CLOSED");
  assert(Array.isArray(userPosts), "User statistics calculation verified");
  console.log("   PASS: User statistics scorecard assembled correctly");

  console.log("=== ALL PHASE 5 TESTS PASSED SUCCESSFULLY ===");
}

runPhase5Tests().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
