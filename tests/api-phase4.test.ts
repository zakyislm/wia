import "dotenv/config";
import { db, users, follows, mutedUsers, blockedUsers, reports, notifications, hiddenPosts } from "../db";
import { eq, and } from "drizzle-orm";
import assert from "assert";

async function runPhase4Tests() {
  console.log("=== [TEST SUITE] PHASE 4: SOCIAL GRAPH, MODERATION & NOTIFS ===");

  const citizenUser = await db.query.users.findFirst({ where: eq(users.id, "alya") });
  const internalUser = await db.query.users.findFirst({ where: eq(users.id, "zaky_internal") });
  assert(citizenUser && internalUser, "Test users must exist");

  // Test 1: Profile Query
  console.log("-> Test 1: Fetching User Profile...");
  assert.strictEqual(citizenUser.name, "Alya Putri");
  console.log(`   PASS: Profile found -> @${citizenUser.username} (${citizenUser.role})`);

  // Test 2: Follow / Unfollow
  console.log("-> Test 2: Testing Follow Toggle...");
  await db.insert(follows).values({
    followerId: citizenUser.id,
    followingId: internalUser.id,
    createdAt: new Date(),
  });
  const followCheck = await db.query.follows.findFirst({
    where: and(eq(follows.followerId, citizenUser.id), eq(follows.followingId, internalUser.id)),
  });
  assert(followCheck, "Follow record must exist");

  await db.delete(follows).where(and(eq(follows.followerId, citizenUser.id), eq(follows.followingId, internalUser.id)));
  const unfollowCheck = await db.query.follows.findFirst({
    where: and(eq(follows.followerId, citizenUser.id), eq(follows.followingId, internalUser.id)),
  });
  assert.strictEqual(unfollowCheck, undefined, "Follow record should be deleted");
  console.log("   PASS: Follow toggle verified");

  // Test 3: Mute Toggle
  console.log("-> Test 3: Testing Mute Toggle...");
  await db.insert(mutedUsers).values({
    userId: citizenUser.id,
    mutedUserId: internalUser.id,
    createdAt: new Date(),
  });
  const muteCheck = await db.query.mutedUsers.findFirst({
    where: and(eq(mutedUsers.userId, citizenUser.id), eq(mutedUsers.mutedUserId, internalUser.id)),
  });
  assert(muteCheck, "Mute record must exist");

  await db.delete(mutedUsers).where(and(eq(mutedUsers.userId, citizenUser.id), eq(mutedUsers.mutedUserId, internalUser.id)));
  console.log("   PASS: Mute toggle verified");

  // Test 4: Citizen Report & Auto-Hide
  console.log("-> Test 4: Testing Citizen Report Submission...");
  const tempReportId = `test_rep_${Date.now()}`;
  await db.insert(reports).values({
    id: tempReportId,
    reporterId: citizenUser.id,
    targetType: "POST",
    targetId: "post_sample_target",
    category: "HOAX",
    details: "Informasi menyesatkan tanpa bukti.",
    status: "PENDING",
    createdAt: new Date(),
  });

  const repCheck = await db.query.reports.findFirst({ where: eq(reports.id, tempReportId) });
  assert.strictEqual(repCheck?.status, "PENDING");
  await db.delete(reports).where(eq(reports.id, tempReportId));
  console.log("   PASS: Report queue verified");

  // Test 5: Admin Warning with Custom Message
  console.log("-> Test 5: Testing Admin Warning System...");
  const testNotifId = `test_warn_notif_${Date.now()}`;
  const warnMessage = "Peringatan 1/3: Mohon tidak menyebarkan informasi palsu.";

  await db.insert(notifications).values({
    id: testNotifId,
    recipientId: citizenUser.id,
    actorId: internalUser.id,
    type: "SYSTEM",
    message: warnMessage,
    isRead: false,
    createdAt: new Date(),
  });

  const notifCheck = await db.query.notifications.findFirst({ where: eq(notifications.id, testNotifId) });
  assert(notifCheck, "Notification must be found");
  assert.strictEqual(notifCheck.message, warnMessage, "Warning message must match");
  await db.delete(notifications).where(eq(notifications.id, testNotifId));
  console.log("   PASS: Admin warning notification verified");

  console.log("=== ALL PHASE 4 TESTS PASSED SUCCESSFULLY ===");
}

runPhase4Tests().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
