import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// 1. Users & NextAuth Authentication
// -----------------------------------------------------------------------------
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
    image: text("image"),
    bio: text("bio"),
    role: text("role", { enum: ["USER", "GOVERNMENT", "INTERNAL"] })
      .notNull()
      .default("USER"),
    agencyName: text("agency_name"),
    jurisdictionProvince: text("jurisdiction_province"),
    region: text("region"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    postCount: integer("post_count").notNull().default(0),
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    isBanned: integer("is_banned", { mode: "boolean" }).notNull().default(false),
    warningCount: integer("warning_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_users_username").on(table.username),
    uniqueIndex("idx_users_email").on(table.email),
  ]
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("idx_accounts_provider_id").on(table.provider, table.providerAccountId),
  ]
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
);

// -----------------------------------------------------------------------------
// 2. Taxonomy: Macro Topics & Micro Tags
// -----------------------------------------------------------------------------
export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isTrending: integer("is_trending", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// -----------------------------------------------------------------------------
// 3. Posts (Public Issues)
// -----------------------------------------------------------------------------
export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Opsi A: posts, laporan, dan komentar/balasan disatukan di tabel ini.
    kind: text("kind", { enum: ["general", "report", "reply"] })
      .notNull()
      .default("report"),
    parentPostId: text("parent_post_id"),
    rootPostId: text("root_post_id"),
    topicId: text("topic_id").references(() => topics.id, { onDelete: "restrict" }),
    title: text("title"),
    content: text("content").notNull(),
    images: text("images", { mode: "json" }).$type<string[]>(),
    locationName: text("location_name"),
    province: text("province"),
    reportStatus: text("report_status", {
      enum: ["waiting", "in_progress", "completed", "closed_internal"],
    }),
    isActionTaken: integer("is_action_taken", { mode: "boolean" }).notNull().default(false),
    actionRole: text("action_role", { enum: ["GOVERNMENT", "INTERNAL"] }),
    actionTakenAt: integer("action_taken_at", { mode: "timestamp_ms" }),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
    latitude: real("latitude"),
    longitude: real("longitude"),
    status: text("status", { enum: ["OPEN", "CLOSED"] })
      .notNull()
      .default("OPEN"),
    closeType: text("close_type", { enum: ["NONE", "SOLVED", "GENERAL"] })
      .notNull()
      .default("NONE"),
    closedById: text("closed_by_id").references(() => users.id, { onDelete: "set null" }),
    resolutionCommentId: text("resolution_comment_id"),
    quotedPostId: text("quoted_post_id"),
    upvotesCount: integer("upvotes_count").notNull().default(0),
    downvotesCount: integer("downvotes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    repostsCount: integer("reposts_count").notNull().default(0),
    viewsCount: integer("views_count").notNull().default(0),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    postedAt: integer("posted_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_posts_feed_foryou").on(table.status, table.isDeleted, table.postedAt),
    index("idx_posts_province").on(table.province, table.postedAt),
    index("idx_posts_author").on(table.authorId, table.postedAt),
    index("idx_posts_trending_both").on(table.status, table.isDeleted, table.upvotesCount, table.viewsCount),
    index("idx_posts_trending_views").on(table.status, table.isDeleted, table.viewsCount, table.postedAt),
    index("idx_posts_trending_upvotes").on(table.status, table.isDeleted, table.upvotesCount, table.postedAt),
    index("idx_posts_parent").on(table.parentPostId, table.postedAt),
    index("idx_posts_root").on(table.rootPostId, table.postedAt),
    index("idx_posts_kind").on(table.kind, table.isDeleted, table.postedAt),
  ]
);

export const postAgencies = sqliteTable(
  "post_agencies",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    agencyUserId: text("agency_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.agencyUserId] }),
    index("idx_post_agencies_agency").on(table.agencyUserId),
  ]
);

export const postTags = sqliteTable(
  "post_tags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
  ]
);

// -----------------------------------------------------------------------------
// 4. Comments (Nested Discussions & Resolution Comments)
// -----------------------------------------------------------------------------
export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    content: text("content").notNull(),
    images: text("images", { mode: "json" }).$type<string[]>(),
    upvotesCount: integer("upvotes_count").notNull().default(0),
    downvotesCount: integer("downvotes_count").notNull().default(0),
    isActionTaken: integer("is_action_taken", { mode: "boolean" }).notNull().default(false),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
    isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_comments_post").on(table.postId, table.parentId, table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// 5. Interactions: Votes, Reposts, Saved & Hidden Posts
// -----------------------------------------------------------------------------
export const votes = sqliteTable(
  "votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["POST", "COMMENT"] }).notNull(),
    targetId: text("target_id").notNull(),
    voteType: text("vote_type", { enum: ["UP", "DOWN"] }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.targetType, table.targetId] }),
    index("idx_votes_target").on(table.targetType, table.targetId),
  ]
);

export const reposts = sqliteTable(
  "reposts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
  ]
);

export const savedPosts = sqliteTable(
  "saved_posts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
  ]
);

export const hiddenPosts = sqliteTable(
  "hidden_posts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
  ]
);

// -----------------------------------------------------------------------------
// 6. Social Graph: Follows, Mutes & Blocks
// -----------------------------------------------------------------------------
export const follows = sqliteTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
  ]
);

export const mutedUsers = sqliteTable(
  "muted_users",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mutedUserId: text("muted_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mutedUserId] }),
  ]
);

export const blockedUsers = sqliteTable(
  "blocked_users",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: text("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.blockedUserId] }),
  ]
);

// -----------------------------------------------------------------------------
// 7. Moderation: Reports
// -----------------------------------------------------------------------------
export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["POST", "COMMENT", "USER"] }).notNull(),
    targetId: text("target_id").notNull(),
    category: text("category", { enum: ["HOAX", "HATE_SPEECH", "SPAM", "PORNOGRAPHY", "OTHER"] }).notNull(),
    details: text("details"),
    status: text("status", { enum: ["PENDING", "REVIEWED", "ACTIONED", "DISMISSED"] })
      .notNull()
      .default("PENDING"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_reports_status").on(table.status, table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// 8. Notifications
// -----------------------------------------------------------------------------
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["UPVOTE", "COMMENT", "REPLY", "FOLLOW", "RESOLVED", "SYSTEM"] }).notNull(),
    message: text("message"),
    title: text("title"),
    href: text("href"),
    postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
    commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_notifications_recipient").on(table.recipientId, table.isRead, table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// 8b. Direct Messages
// -----------------------------------------------------------------------------
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const conversationParticipants = sqliteTable(
  "conversation_participants",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("idx_conv_participants_user").on(table.userId),
  ]
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    images: text("images", { mode: "json" }).$type<string[]>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_messages_conversation").on(table.conversationId, table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// 8c. Preferences, Drafts & Agency Verification (zero localStorage)
// -----------------------------------------------------------------------------
export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme", { enum: ["light", "dark", "system"] }).notNull().default("light"),
  notificationSocial: integer("notification_social", { mode: "boolean" }).notNull().default(true),
  notificationReports: integer("notification_reports", { mode: "boolean" }).notNull().default(true),
  notificationValidation: integer("notification_validation", { mode: "boolean" }).notNull().default(true),
  notificationEngagement: integer("notification_engagement", { mode: "boolean" }).notNull().default(true),
  notificationMessages: integer("notification_messages", { mode: "boolean" }).notNull().default(true),
  notificationDigest: integer("notification_digest", { mode: "boolean" }).notNull().default(false),
  mutedWords: text("muted_words", { mode: "json" }).$type<string[]>().notNull().default([]),
  preferredTopics: text("preferred_topics", { mode: "json" }).$type<string[]>().notNull().default([]),
  showSensitiveReports: integer("show_sensitive_reports", { mode: "boolean" }).notNull().default(true),
  autoplayVideos: integer("autoplay_videos", { mode: "boolean" }).notNull().default(true),
  privacyMessageRequests: text("privacy_message_requests", {
    enum: ["everyone", "following", "agencies"],
  }).notNull().default("everyone"),
  privacyShowLikes: integer("privacy_show_likes", { mode: "boolean" }).notNull().default(true),
  privacyAllowMentions: integer("privacy_allow_mentions", { mode: "boolean" }).notNull().default(true),
  privacyDefaultAnonymous: integer("privacy_default_anonymous", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const drafts = sqliteTable(
  "drafts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode", { enum: ["post", "report"] }).notNull(),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    topicId: text("topic_id"),
    locationName: text("location_name"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    images: text("images", { mode: "json" }).$type<string[]>().notNull().default([]),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_drafts_user").on(table.userId, table.updatedAt)]
);

export const agencyVerificationRequests = sqliteTable(
  "agency_verification_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agencyName: text("agency_name").notNull(),
    region: text("region").notNull(),
    responsibility: text("responsibility").notNull(),
    channel: text("channel").notNull(),
    documentUrls: text("document_urls", { mode: "json" }).$type<string[]>().notNull().default([]),
    status: text("status", { enum: ["submitted", "approved", "rejected"] })
      .notNull()
      .default("submitted"),
    reviewedById: text("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_verification_status").on(table.status, table.createdAt)]
);

// -----------------------------------------------------------------------------
// 9. Drizzle Relational Model (ORM Query API)
// -----------------------------------------------------------------------------
export const usersRelations = relations(users, ({ one, many }) => ({
  posts: many(posts, { relationName: "authorPosts" }),
  comments: many(comments),
  votes: many(votes),
  reposts: many(reposts),
  savedPosts: many(savedPosts),
  followers: many(follows, { relationName: "userFollowers" }),
  following: many(follows, { relationName: "userFollowing" }),
  notificationsReceived: many(notifications, { relationName: "recipientNotifications" }),
  preferences: one(userPreferences),
  drafts: many(drafts),
  verificationRequests: many(agencyVerificationRequests, { relationName: "applicantVerificationRequests" }),
  conversationParticipations: many(conversationParticipants),
  messagesSent: many(messages),
  taggedPostAgencies: many(postAgencies),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
    relationName: "authorPosts",
  }),
  topic: one(topics, {
    fields: [posts.topicId],
    references: [topics.id],
  }),
  closedBy: one(users, {
    fields: [posts.closedById],
    references: [users.id],
  }),
  parentPost: one(posts, {
    fields: [posts.parentPostId],
    references: [posts.id],
    relationName: "postThreadReplies",
  }),
  replyPosts: many(posts, {
    relationName: "postThreadReplies",
  }),
  comments: many(comments),
  postTags: many(postTags),
  postAgencies: many(postAgencies),
  reposts: many(reposts),
  savedPosts: many(savedPosts),
}));

export const postAgenciesRelations = relations(postAgencies, ({ one }) => ({
  post: one(posts, {
    fields: [postAgencies.postId],
    references: [posts.id],
  }),
  agency: one(users, {
    fields: [postAgencies.agencyUserId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "nestedReplies",
  }),
  replies: many(comments, {
    relationName: "nestedReplies",
  }),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  posts: many(posts),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const savedPostsRelations = relations(savedPosts, ({ one }) => ({
  user: one(users, {
    fields: [savedPosts.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [savedPosts.postId],
    references: [posts.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "userFollowing",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "userFollowers",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "recipientNotifications",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const draftsRelations = relations(drafts, ({ one }) => ({
  user: one(users, {
    fields: [drafts.userId],
    references: [users.id],
  }),
}));

export const agencyVerificationRequestsRelations = relations(agencyVerificationRequests, ({ one }) => ({
  user: one(users, {
    fields: [agencyVerificationRequests.userId],
    references: [users.id],
    relationName: "applicantVerificationRequests",
  }),
  reviewedBy: one(users, {
    fields: [agencyVerificationRequests.reviewedById],
    references: [users.id],
  }),
}));
