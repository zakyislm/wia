import "dotenv/config";
import {
  db,
  users,
  posts,
  comments,
  topics,
  tags,
  votes,
  notifications,
  reports,
  postAgencies,
  conversations,
  conversationParticipants,
  messages,
  userPreferences,
  drafts,
  agencyVerificationRequests,
} from "../db";
import { sql, isNull } from "drizzle-orm";

async function checkDatabase() {
  console.log("=== KAVI DATABASE HEALTH CHECK ===");
  try {
    const startTime = Date.now();
    await db.run(sql`SELECT 1`);
    const latency = Date.now() - startTime;
    console.log(`✓ Turso Connection: OK (${latency}ms)`);

    const [
      usersCount,
      demoUsersCount,
      rootPostsCount,
      allPostsCount,
      commentsCount,
      topicsCount,
      tagsCount,
      postAgenciesCount,
      votesCount,
      notifsCount,
      reportsCount,
      convsCount,
      convPartsCount,
      messagesCount,
      prefsCount,
      draftsCount,
      verifCount,
      kindBreakdown,
      reportStatusBreakdown,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.isDemo} = 1`),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(isNull(posts.parentPostId)),
      db.select({ count: sql<number>`count(*)` }).from(posts),
      db.select({ count: sql<number>`count(*)` }).from(comments),
      db.select({ count: sql<number>`count(*)` }).from(topics),
      db.select({ count: sql<number>`count(*)` }).from(tags),
      db.select({ count: sql<number>`count(*)` }).from(postAgencies),
      db.select({ count: sql<number>`count(*)` }).from(votes),
      db.select({ count: sql<number>`count(*)` }).from(notifications),
      db.select({ count: sql<number>`count(*)` }).from(reports),
      db.select({ count: sql<number>`count(*)` }).from(conversations),
      db.select({ count: sql<number>`count(*)` }).from(conversationParticipants),
      db.select({ count: sql<number>`count(*)` }).from(messages),
      db.select({ count: sql<number>`count(*)` }).from(userPreferences),
      db.select({ count: sql<number>`count(*)` }).from(drafts),
      db.select({ count: sql<number>`count(*)` }).from(agencyVerificationRequests),
      db
        .select({
          kind: posts.kind,
          count: sql<number>`count(*)`,
        })
        .from(posts)
        .groupBy(posts.kind),
      db
        .select({
          reportStatus: posts.reportStatus,
          count: sql<number>`count(*)`,
        })
        .from(posts)
        .where(sql`${posts.kind} = 'report'`)
        .groupBy(posts.reportStatus),
    ]);

    console.log("----------------------------------");
    console.log(`Users (Total)          : ${usersCount[0]?.count ?? 0} (Demo: ${demoUsersCount[0]?.count ?? 0})`);
    console.log(`Root Posts             : ${rootPostsCount[0]?.count ?? 0} (All Posts+Replies: ${allPostsCount[0]?.count ?? 0})`);
    console.log(`Post Kind Breakdown    : ${JSON.stringify(kindBreakdown)}`);
    console.log(`Report Status Breakdown: ${JSON.stringify(reportStatusBreakdown)}`);
    console.log(`Legacy Comments Table  : ${commentsCount[0]?.count ?? 0}`);
    console.log(`Macro Topics           : ${topicsCount[0]?.count ?? 0}`);
    console.log(`Micro Tags             : ${tagsCount[0]?.count ?? 0}`);
    console.log(`Post Agencies (@Dinas) : ${postAgenciesCount[0]?.count ?? 0}`);
    console.log(`Votes Cast             : ${votesCount[0]?.count ?? 0}`);
    console.log(`Notifications          : ${notifsCount[0]?.count ?? 0}`);
    console.log(`Moderation Reports     : ${reportsCount[0]?.count ?? 0}`);
    console.log(`Conversations / Parts  : ${convsCount[0]?.count ?? 0} / ${convPartsCount[0]?.count ?? 0}`);
    console.log(`Direct Messages        : ${messagesCount[0]?.count ?? 0}`);
    console.log(`User Preferences       : ${prefsCount[0]?.count ?? 0}`);
    console.log(`Saved Drafts           : ${draftsCount[0]?.count ?? 0}`);
    console.log(`Verification Requests  : ${verifCount[0]?.count ?? 0}`);
    console.log("----------------------------------");
    console.log("✓ All tables intact and queryable.");
  } catch (error) {
    console.error("✗ Database check failed:", error);
    process.exitCode = 1;
  }
}

checkDatabase();
