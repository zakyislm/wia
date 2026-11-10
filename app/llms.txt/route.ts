import { NextResponse } from "next/server";
import { db, topics, posts } from "@/db";
import { eq, desc } from "drizzle-orm";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://kavi.id").replace(/\/$/, "");

export async function GET() {
  try {
    // 1. Fetch live macro topics
    const allTopics = await db.query.topics.findMany({
      orderBy: [desc(topics.createdAt)],
    });

    // 2. Fetch latest verified/solved civic issues from Turso
    const latestSolvedPosts = await db.query.posts.findMany({
      where: eq(posts.status, "CLOSED"),
      columns: {
        id: true,
        title: true,
        locationName: true,
        province: true,
        upvotesCount: true,
        postedAt: true,
      },
      orderBy: [desc(posts.postedAt)],
      limit: 5,
    });

    // 3. Assemble clean llms.txt Markdown format
    const markdown = `# Kavi — Indonesian Civic Reporting & Public Transparency Platform

> Kavi is an open-data civic technology platform designed to bridge Indonesian citizens with local and national government agencies for reporting public infrastructure, health, environmental, and public service issues across Indonesia's 38 provinces.

## Core Mission
- **Citizen Empowerment:** Transparent reporting of public issues with verified visual evidence (Cloudflare R2).
- **Public Accountability:** Reddit/Threads-style threaded discussions with community upvoting.
- **Government Resolution:** Verified official responses directly from regional government agencies (e.g., Dinas PUPR, Dinas Kesehatan) marked as SOLVED upon completion.
- **High-Velocity Performance:** LibSQL/Turso database paired with Upstash Redis write-behind buffers.

## Public REST API Endpoints
- **Feeds & Issue Exploration:**
  - \`GET ${baseUrl}/api/posts\`: Retrieve civic issues feed. Filters: \`mode=foryou|following|archive\`, \`province={province}\`, \`topic={slug}\`, \`tag={tag}\`.
  - \`GET ${baseUrl}/api/posts/{id}\`: Full issue detail, author profile, visual evidence list, and current resolution status.
  - \`GET ${baseUrl}/api/posts/{id}/comments\`: Hierarchical recursive comment and discussion tree (Threads-style).
- **Discovery & Search:**
  - \`GET ${baseUrl}/api/trending\`: Twitter-style trending civic issues and hot topics widget.
  - \`GET ${baseUrl}/api/search?q={query}&type=all|posts|topics|users\`: Multi-entity search across citizen reports, government agencies, and macro topics.
- **Civic Analytics:**
  - \`GET ${baseUrl}/api/analytics\`: National resolution rate, status breakdown, and province activity rankings.
  - \`GET ${baseUrl}/api/analytics?username={username}\`: Individual citizen scorecard and civic resolution rate.

## Macro Topics (Taxonomy)
${allTopics.map((t) => `- [${t.name}](${baseUrl}/explore/topics/${t.slug})`).join("\n")}

## Recently Resolved Civic Reports (Proof of Work)
${
  latestSolvedPosts.length > 0
    ? latestSolvedPosts
        .map(
          (p) =>
            `- [SOLVED: ${p.title}](${baseUrl}/posts/${p.id}): ${p.locationName || ""}, ${p.province} (${p.upvotesCount} citizen upvotes)`
        )
        .join("\n")
    : "- Belum ada laporan terselesaikan pada cache live."
}

## Technical Stack
- **Framework:** Next.js (App Router), React 19
- **Database:** Turso (libSQL SQLite Cloud) + Drizzle ORM
- **Cache & Write-Behind:** Upstash Redis (REST API)
- **Object Storage:** Cloudflare R2 (S3-compatible)
- **Authentication:** NextAuth v5 (Google OAuth)
- **License:** Open Civic Initiative
`;

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("GET /llms.txt error:", error);
    return new Response("# Kavi Civic Tech Platform\nError generating live llms.txt", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
