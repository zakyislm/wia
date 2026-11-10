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
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    images: text("images", { mode: "json" }).$type<string[]>(),
    locationName: text("location_name").notNull(),
    province: text("province").notNull(),
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
// 9. Drizzle Relational Model (ORM Query API)
// -----------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts, { relationName: "authorPosts" }),
  comments: many(comments),
  votes: many(votes),
  reposts: many(reposts),
  savedPosts: many(savedPosts),
  followers: many(follows, { relationName: "userFollowers" }),
  following: many(follows, { relationName: "userFollowing" }),
  notificationsReceived: many(notifications, { relationName: "recipientNotifications" }),
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
  comments: many(comments),
  postTags: many(postTags),
  reposts: many(reposts),
  savedPosts: many(savedPosts),
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
