import "dotenv/config";
import { client, db, posts } from "../db";
import { sql } from "drizzle-orm";

async function checkDatabase() {
  console.log("=== KAVI DATABASE HEALTH CHECK ===");
  try {
    const startTime = Date.now();
    const summaryRes = await client.execute(`
      SELECT
        (SELECT count(*) FROM users) AS users_count,
        (SELECT count(*) FROM users WHERE is_demo = 1) AS demo_users_count,
        (SELECT count(*) FROM users WHERE post_count > 0) AS active_posters_count,
        (SELECT count(*) FROM posts WHERE parent_post_id IS NULL) AS root_posts_count,
        (SELECT count(*) FROM posts) AS all_posts_count,
        (SELECT count(*) FROM comments) AS comments_count,
        (SELECT count(*) FROM topics) AS topics_count,
        (SELECT count(*) FROM tags) AS tags_count,
        (SELECT count(*) FROM post_agencies) AS post_agencies_count,
        (SELECT count(*) FROM votes) AS votes_count,
        (SELECT count(*) FROM notifications) AS notifs_count,
        (SELECT count(*) FROM reports) AS reports_count,
        (SELECT count(*) FROM conversations) AS convs_count,
        (SELECT count(*) FROM conversation_participants) AS conv_parts_count,
        (SELECT count(*) FROM messages) AS messages_count,
        (SELECT count(*) FROM user_preferences) AS prefs_count,
        (SELECT count(*) FROM drafts) AS drafts_count,
        (SELECT count(*) FROM agency_verification_requests) AS verif_count
    `);
    const latency = Date.now() - startTime;
    console.log(`✓ Turso Connection: OK (${latency}ms)`);

    const row = (summaryRes.rows[0] || {}) as Record<string, unknown>;
    const kindBreakdown = await db
      .select({
        kind: posts.kind,
        count: sql<number>`count(*)`,
      })
      .from(posts)
      .groupBy(posts.kind);

    const reportStatusBreakdown = await db
      .select({
        reportStatus: posts.reportStatus,
        count: sql<number>`count(*)`,
      })
      .from(posts)
      .where(sql`${posts.kind} = 'report'`)
      .groupBy(posts.reportStatus);

    const totalU = Number(row.users_count ?? 0);
    const activeU = Number(row.active_posters_count ?? 0);
    const activePct = totalU > 0 ? ((activeU / totalU) * 100).toFixed(1) : "0.0";

    console.log("----------------------------------");
    console.log(
      `Users (Total)          : ${totalU} (Demo: ${row.demo_users_count ?? 0}, Active Posters: ${activeU} [${activePct}%])`
    );
    console.log(
      `Root Posts             : ${row.root_posts_count ?? 0} (All Posts+Replies: ${row.all_posts_count ?? 0})`
    );
    console.log(`Post Kind Breakdown    : ${JSON.stringify(kindBreakdown)}`);
    console.log(`Report Status Breakdown: ${JSON.stringify(reportStatusBreakdown)}`);
    console.log(`Legacy Comments Table  : ${row.comments_count ?? 0}`);
    console.log(`Macro Topics           : ${row.topics_count ?? 0}`);
    console.log(`Micro Tags             : ${row.tags_count ?? 0}`);
    console.log(`Post Agencies (@Dinas) : ${row.post_agencies_count ?? 0}`);
    console.log(`Votes Cast             : ${row.votes_count ?? 0}`);
    console.log(`Notifications          : ${row.notifs_count ?? 0}`);
    console.log(`Moderation Reports     : ${row.reports_count ?? 0}`);
    console.log(
      `Conversations / Parts  : ${row.convs_count ?? 0} / ${row.conv_parts_count ?? 0}`
    );
    console.log(`Direct Messages        : ${row.messages_count ?? 0}`);
    console.log(`User Preferences       : ${row.prefs_count ?? 0}`);
    console.log(`Saved Drafts           : ${row.drafts_count ?? 0}`);
    console.log(`Verification Requests  : ${row.verif_count ?? 0}`);
    console.log("----------------------------------");
    console.log("✓ All tables intact and queryable.");
  } catch (error) {
    console.error("✗ Database check failed:", error);
    process.exitCode = 1;
  }
}

checkDatabase();
