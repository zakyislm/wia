import { NextRequest, NextResponse } from "next/server";
import {
  db,
  users,
  posts,
  topics,
  tags,
  postTags,
  postAgencies,
  votes,
  savedPosts,
  reposts,
  hiddenPosts,
  mutedUsers,
  blockedUsers,
  follows,
  notifications,
  conversations,
  conversationParticipants,
  messages,
  userPreferences,
  agencyVerificationRequests,
} from "@/db";
import { eq, asc, desc, inArray } from "drizzle-orm";
import { getOptionalSessionUser, isDemoUser } from "@/lib/auth-helper";
import { seedWorkspace } from "@/features/workspace/state";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUserKey = searchParams.get("userKey")?.trim();

    let currentUser = await getOptionalSessionUser(req);
    if (!currentUser && requestedUserKey && requestedUserKey !== "anonymous") {
      currentUser =
        (await db.query.users.findFirst({
          where: eq(users.id, requestedUserKey),
        })) || null;
    }

    const userId = currentUser?.id || null;

    // 1. Fetch core dataset in parallel
    const [
      allUsers,
      allTopics,
      allTags,
      allPostTags,
      allPostAgencies,
      allPostsRows,
    ] = await Promise.all([
      db.select().from(users).orderBy(asc(users.createdAt)),
      db.select().from(topics),
      db.select().from(tags),
      db.select().from(postTags),
      db.select().from(postAgencies),
      db.select().from(posts).orderBy(desc(posts.postedAt)),
    ]);

    // 2. Fetch user-specific state if authenticated
    const [
      userVotesList,
      userSavedList,
      userRepostsList,
      userHiddenList,
      userMutedList,
      userBlockedList,
      userFollowsList,
      userPrefs,
      userVerif,
      userNotifs,
      myConvParts,
    ] = userId
      ? await Promise.all([
          db.select().from(votes).where(eq(votes.userId, userId)),
          db.select().from(savedPosts).where(eq(savedPosts.userId, userId)),
          db.select().from(reposts).where(eq(reposts.userId, userId)),
          db.select().from(hiddenPosts).where(eq(hiddenPosts.userId, userId)),
          db.select().from(mutedUsers).where(eq(mutedUsers.userId, userId)),
          db.select().from(blockedUsers).where(eq(blockedUsers.userId, userId)),
          db.select().from(follows).where(eq(follows.followerId, userId)),
          db.query.userPreferences.findFirst({
            where: eq(userPreferences.userId, userId),
          }),
          db.query.agencyVerificationRequests.findFirst({
            where: eq(agencyVerificationRequests.userId, userId),
            orderBy: [desc(agencyVerificationRequests.createdAt)],
          }),
          db.query.notifications.findMany({
            where: eq(notifications.recipientId, userId),
            orderBy: [desc(notifications.createdAt)],
            limit: 50,
          }),
          db
            .select()
            .from(conversationParticipants)
            .where(eq(conversationParticipants.userId, userId)),
        ])
      : [[], [], [], [], [], [], [], null, null, [], []];

    // Map lookup tables
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const topicMap = new Map(allTopics.map((t) => [t.id, t]));
    const tagMap = new Map(allTags.map((t) => [t.id, t.name]));

    const postTagsMap = new Map<string, string[]>();
    for (const pt of allPostTags) {
      const tName = tagMap.get(pt.tagId);
      if (!tName) continue;
      const list = postTagsMap.get(pt.postId) || [];
      list.push(tName);
      postTagsMap.set(pt.postId, list);
    }

    const postAgenciesMap = new Map<string, string[]>();
    for (const pa of allPostAgencies) {
      const list = postAgenciesMap.get(pa.postId) || [];
      list.push(pa.agencyUserId);
      postAgenciesMap.set(pa.postId, list);
    }

    const voteMap = new Map<string, "UP" | "DOWN">();
    for (const v of userVotesList) {
      voteMap.set(v.targetId, v.voteType as "UP" | "DOWN");
    }
    const savedSet = new Set(userSavedList.map((s) => s.postId));
    const repostSet = new Set(userRepostsList.map((r) => r.postId));
    const hiddenSet = new Set(userHiddenList.map((h) => h.postId));

    // Separate root posts and Option A reply posts
    const rootPostRows = allPostsRows.filter((p) => !p.parentPostId && !p.isDeleted);
    const replyPostRows = allPostsRows
      .filter((p) => Boolean(p.parentPostId) && !p.isDeleted)
      .sort((a, b) => {
        const tA = a.postedAt instanceof Date ? a.postedAt.getTime() : Number(a.postedAt);
        const tB = b.postedAt instanceof Date ? b.postedAt.getTime() : Number(b.postedAt);
        return tA - tB;
      });

    const repliesByRootMap = new Map<string, typeof replyPostRows>();
    for (const r of replyPostRows) {
      const rootId = r.rootPostId || r.parentPostId!;
      const list = repliesByRootMap.get(rootId) || [];
      list.push(r);
      repliesByRootMap.set(rootId, list);
    }

    // Format People
    const formattedPeople = allUsers.map((u) => ({
      id: "" as const,
      localKey: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      bio: u.bio || "",
      region: u.region || u.jurisdictionProvince || undefined,
      image: u.image || undefined,
      isDemo: Boolean(u.isDemo),
      followersCount: u.followerCount,
      followingCount: u.followingCount,
      postCount: u.postCount,
    }));

    // Format Posts
    const formattedPosts = rootPostRows.map((p) => {
      const topic = p.topicId ? topicMap.get(p.topicId) : undefined;
      const closedByUser = p.closedById ? userMap.get(p.closedById) : undefined;
      const rawReplies = repliesByRootMap.get(p.id) || [];

      const formattedReplies = rawReplies.map((r) => ({
        id: "" as const,
        localKey: r.id,
        authorId: "" as const,
        postId: "" as const,
        parentId: "" as const,
        authorKey: r.authorId,
        parentKey:
          r.parentPostId && r.parentPostId !== p.id ? r.parentPostId : undefined,
        content: r.content,
        postedAt:
          r.postedAt instanceof Date ? r.postedAt.getTime() : Number(r.postedAt),
        images: r.images || [],
        location: r.locationName || undefined,
        is_action_taken: Boolean(r.isActionTaken),
        anonymous: Boolean(r.isAnonymous),
        actionRole:
          (r.actionRole as "GOVERNMENT" | "INTERNAL" | undefined) ||
          (r.isActionTaken ? "GOVERNMENT" : undefined),
        actionTakenAt: r.actionTakenAt
          ? r.actionTakenAt instanceof Date
            ? r.actionTakenAt.getTime()
            : Number(r.actionTakenAt)
          : undefined,
        upvotesCount: r.upvotesCount || 0,
        downvotesCount: r.downvotesCount || 0,
        vote: voteMap.get(r.id) || null,
        reposted: false,
      }));

      const actionReplies = rawReplies.filter((r) => r.isActionTaken);
      const postedAtMs =
        p.postedAt instanceof Date ? p.postedAt.getTime() : Number(p.postedAt);
      const closedAtMs = p.closedAt
        ? p.closedAt instanceof Date
          ? p.closedAt.getTime()
          : Number(p.closedAt)
        : undefined;

      const formattedResolutions = actionReplies.map((r) => {
        const rVote = voteMap.get(r.id);
        return {
          id: "" as const,
          localKey: `res-${r.id}`,
          agencyKey: r.authorId,
          content: r.content,
          images: r.images || [],
          deadline:
            p.status === "CLOSED"
              ? closedAtMs || postedAtMs + 3600000
              : Date.now() + 3 * 86400000,
          agree: r.upvotesCount || 0,
          disagree: r.downvotesCount || 0,
          choice:
            rVote === "UP"
              ? ("agree" as const)
              : rVote === "DOWN"
                ? ("disagree" as const)
                : null,
        };
      });

      // Ensure completed reports without an explicit actionReply still have a resolution object for #evidence & timeline
      if (
        p.kind === "report" &&
        p.reportStatus === "completed" &&
        formattedResolutions.length === 0
      ) {
        const fallbackAgency =
          p.closedById || (postAgenciesMap.get(p.id) || [])[0] || "pupr";
        formattedResolutions.push({
          id: "" as const,
          localKey: `res-${p.id}`,
          agencyKey: fallbackAgency,
          content:
            "Tindak lanjut lapangan telah diselesaikan dan diverifikasi oleh tim teknis instansi terkait.",
          images: p.images?.slice(0, 1) || [],
          deadline: closedAtMs || postedAtMs + 3600000,
          agree: p.id === "contoh-zero" ? 0 : Math.max(p.upvotesCount, 42),
          disagree: p.id === "contoh-zero" ? 0 : 2,
          choice: null,
        });
      }

      const closedByRole: "GOVERNMENT" | "INTERNAL" | undefined =
        closedByUser?.role === "INTERNAL" || p.reportStatus === "closed_internal"
          ? "INTERNAL"
          : closedByUser?.role === "GOVERNMENT" || p.reportStatus === "completed"
            ? "GOVERNMENT"
            : undefined;

      return {
        id: "" as const,
        authorId: "" as const,
        topicId: p.topicId || "top_komunitas",
        topicSlug: topic?.slug || "komunitas",
        topicName: topic?.name || "Komunitas",
        localKey: p.id,
        authorKey: p.authorId,
        postedAt: postedAtMs,
        kind: (p.kind === "report" ? "report" : "general") as "general" | "report",
        reportStatus:
          (p.reportStatus as
            | "waiting"
            | "in_progress"
            | "completed"
            | "closed_internal"
            | undefined) ||
          (p.kind === "report"
            ? p.status === "CLOSED"
              ? p.closeType === "SOLVED"
                ? "completed"
                : "closed_internal"
              : "waiting"
            : undefined),
        closedByKey: p.closedById || undefined,
        closedByRole,
        closedAt: closedAtMs,
        pendingTakeActionRole: null,
        anonymous: Boolean(p.isAnonymous),
        content: p.content,
        province: p.province || "Indonesia",
        locationName: p.locationName || undefined,
        category: topic?.name || "Komunitas",
        tags: postTagsMap.get(p.id) || [],
        agencyKeys: postAgenciesMap.get(p.id) || [],
        images: p.images || [],
        upvotesCount: p.upvotesCount || 0,
        downvotesCount: p.downvotesCount || 0,
        vote: voteMap.get(p.id) || null,
        reposted: repostSet.has(p.id),
        saved: savedSet.has(p.id),
        hidden: hiddenSet.has(p.id),
        isDeleted: Boolean(p.isDeleted),
        replies: formattedReplies,
        resolutions: formattedResolutions,
      };
    });

    // Build Workspace
    const defaultWs = seedWorkspace();
    let formattedConversations = defaultWs.conversations;

    if (userId && myConvParts.length > 0) {
      const convIds = myConvParts.map((c) => c.conversationId);
      const [allParts, allMsgs] = await Promise.all([
        db
          .select()
          .from(conversationParticipants)
          .where(inArray(conversationParticipants.conversationId, convIds)),
        db
          .select()
          .from(messages)
          .where(inArray(messages.conversationId, convIds))
          .orderBy(asc(messages.createdAt)),
      ]);

      formattedConversations = convIds.map((convId) => {
        const myPart = myConvParts.find((c) => c.conversationId === convId);
        const partnerPart = allParts.find(
          (c) => c.conversationId === convId && c.userId !== userId
        );
        const convMsgs = allMsgs
          .filter((m) => m.conversationId === convId)
          .map((m) => ({
            id: "" as const,
            authorId: "" as const,
            localKey: m.id,
            outgoing: m.senderId === userId,
            text: m.content,
            images: m.images || undefined,
            time: new Intl.DateTimeFormat("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            }).format(
              m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)
            ),
          }));

        return {
          id: "" as const,
          localKey: partnerPart?.userId || convId,
          partnerKey: partnerPart?.userId || convId,
          unread: !myPart?.lastReadAt,
          messages: convMsgs,
        };
      });
    }

    const readNotifIds = userNotifs.filter((n) => n.isRead).map((n) => n.id);

    const workspace = {
      ...defaultWs,
      readNotifications: readNotifIds,
      notificationSocial: userPrefs?.notificationSocial ?? true,
      notificationReports: userPrefs?.notificationReports ?? true,
      notificationMessages: userPrefs?.notificationMessages ?? true,
      mutedUsers: userMutedList.map((m) => m.mutedUserId),
      blockedUsers: userBlockedList.map((b) => b.blockedUserId),
      conversations: formattedConversations,
      verification: userVerif
        ? {
            id: "" as const,
            status: "submitted" as const,
            name: userVerif.agencyName,
            region: userVerif.region,
            responsibility: userVerif.responsibility,
            channel: userVerif.channel,
            evidenceName: userVerif.documentUrls?.[0] || "dokumen-resmi.pdf",
          }
        : defaultWs.verification,
    };

    const dbNotifications = userNotifs.map((n) => {
      const actor = n.actorId ? userMap.get(n.actorId) : undefined;
      return {
        key: n.id,
        actorKey: n.actorId || undefined,
        actorName: actor?.agencyName || actor?.name,
        actorImage: actor?.image || undefined,
        title:
          n.title ||
          (n.type === "RESOLVED"
            ? `${actor?.agencyName || actor?.name || "Instansi"} menyelesaikan laporan Anda`
            : n.type === "COMMENT" || n.type === "REPLY"
              ? `${actor?.name || "Warga"} membalas diskusi Anda`
              : "Pembaruan aktivitas di Kavi"),
        body: n.message || "Ketuk untuk melihat detail aktivitas terbaru.",
        href: n.href || (n.postId ? `/posts/${n.postId}` : "/home"),
        createdAt:
          n.createdAt instanceof Date
            ? n.createdAt.getTime()
            : Number(n.createdAt),
        isRead: Boolean(n.isRead),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        currentUser: currentUser
          ? {
              localKey: currentUser.id,
              name: currentUser.name,
              username: currentUser.username,
              role: currentUser.role,
              image: currentUser.image || undefined,
              isDemo: isDemoUser(currentUser),
            }
          : null,
        theme: userPrefs?.theme || "light",
        topics: allTopics.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          isTrending: Boolean(t.isTrending),
        })),
        people: formattedPeople,
        posts: formattedPosts,
        following: userFollowsList.map((f) => f.followingId),
        workspace,
        dbNotifications,
      },
    });
  } catch (error) {
    console.error("GET /api/bootstrap error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bootstrap state from database" },
      { status: 500 }
    );
  }
}
