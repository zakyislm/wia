import type { CSSProperties } from "react";

export type PageSkeletonVariant =
  | "feed"
  | "directory"
  | "detail"
  | "messages"
  | "notifications"
  | "profile"
  | "settings"
  | "activity"
  | "auth";

export function SkeletonBlock({
  width,
  height = 12,
  radius = 8,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-block ${className}`.trim()}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof radius === "number" ? `${radius}px` : radius,
        ...style,
      }}
    />
  );
}

export function SkeletonCircle({
  size = 38,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <SkeletonBlock
      width={size}
      height={size}
      radius="50%"
      className={`skeleton-circle ${className}`.trim()}
    />
  );
}

/** 1:1 grayscale skeleton matching `.post-card` grid, typography rows, tags, media, and action bar. */
export function SkeletonPostCard({
  withMedia = false,
  isReport = false,
}: {
  withMedia?: boolean;
  isReport?: boolean;
}) {
  return (
    <article className="post-card skeleton-post-card" aria-hidden="true">
      <div className="post-avatar-col">
        <SkeletonCircle size={38} />
      </div>
      <div className="skeleton-post-main">
        <div className="skeleton-post-header">
          <div className="skeleton-row">
            <SkeletonBlock width={116} height={14} radius={4} />
            <SkeletonBlock width={72} height={12} radius={4} />
          </div>
          <div className="skeleton-row">
            {isReport && <SkeletonBlock width={24} height={24} radius={8} />}
            <SkeletonCircle size={20} />
          </div>
        </div>
        {isReport && <SkeletonBlock width="74%" height={16} radius={4} />}
        <div className="skeleton-lines">
          <SkeletonBlock width="94%" height={12} radius={4} />
          <SkeletonBlock width="82%" height={12} radius={4} />
          <SkeletonBlock width="58%" height={12} radius={4} />
        </div>
        <div className="skeleton-row skeleton-tags-row">
          <SkeletonBlock width={68} height={12} radius={4} />
          <SkeletonBlock width={84} height={12} radius={4} />
          <SkeletonBlock width={60} height={12} radius={4} />
        </div>
        {withMedia && (
          <SkeletonBlock
            width="100%"
            height={220}
            radius={12}
            className="skeleton-post-media"
          />
        )}
        <div className="skeleton-actions-row">
          <SkeletonBlock width={36} height={20} radius={8} />
          <SkeletonBlock width={32} height={20} radius={8} />
          <SkeletonBlock width={32} height={20} radius={8} />
          <SkeletonBlock width={28} height={20} radius={8} />
          <SkeletonBlock width={28} height={20} radius={8} />
        </div>
      </div>
    </article>
  );
}

/** 1:1 grayscale skeleton list for post streams and subtab switches. */
export function SkeletonPostList({
  count = 3,
  isReport = false,
}: {
  count?: number;
  isReport?: boolean;
}) {
  return (
    <div
      className="skeleton-content-group"
      role="status"
      aria-live="polite"
      aria-label="Memuat daftar konten"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonPostCard
          key={index}
          isReport={isReport}
          withMedia={index === 0}
        />
      ))}
    </div>
  );
}

/** 1:1 grayscale skeleton matching `.notification-row`. */
export function SkeletonNotificationRow() {
  return (
    <div className="notification-row skeleton-notif-row" aria-hidden="true">
      <SkeletonCircle size={38} />
      <div className="skeleton-lines skeleton-flex-1">
        <SkeletonBlock width="58%" height={14} radius={4} />
        <SkeletonBlock width="84%" height={12} radius={4} />
        <SkeletonBlock width={64} height={12} radius={4} />
      </div>
    </div>
  );
}

export function SkeletonNotificationList({ count = 4 }: { count?: number }) {
  return (
    <div
      className="skeleton-content-group"
      role="status"
      aria-live="polite"
      aria-label="Memuat notifikasi"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonNotificationRow key={index} />
      ))}
    </div>
  );
}

/** 1:1 grayscale skeleton matching `.conversation-item`. */
export function SkeletonMessageRow() {
  return (
    <div className="conversation-item skeleton-message-row" aria-hidden="true">
      <SkeletonCircle size={40} />
      <div className="skeleton-lines skeleton-flex-1">
        <div className="skeleton-row-between">
          <SkeletonBlock width={120} height={14} radius={4} />
          <SkeletonBlock width={36} height={12} radius={4} />
        </div>
        <SkeletonBlock width="78%" height={12} radius={4} />
      </div>
    </div>
  );
}

export function SkeletonMessageList({ count = 4 }: { count?: number }) {
  return (
    <div
      className="skeleton-content-group"
      role="status"
      aria-live="polite"
      aria-label="Memuat daftar obrolan"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonMessageRow key={index} />
      ))}
    </div>
  );
}

/** 1:1 grayscale skeleton matching `.activity-row`. */
export function SkeletonActivityRow() {
  return (
    <div className="activity-row skeleton-activity-row" aria-hidden="true">
      <SkeletonBlock width={36} height={36} radius={12} />
      <div className="skeleton-lines skeleton-flex-1">
        <SkeletonBlock width="52%" height={14} radius={4} />
        <SkeletonBlock width="82%" height={12} radius={4} />
        <SkeletonBlock width={116} height={12} radius={4} />
      </div>
    </div>
  );
}

export function SkeletonActivityList({ count = 4 }: { count?: number }) {
  return (
    <div
      className="skeleton-content-group"
      role="status"
      aria-live="polite"
      aria-label="Memuat aktivitas"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonActivityRow key={index} />
      ))}
    </div>
  );
}

/** 1:1 grayscale skeleton matching `.settings-row`. */
export function SkeletonSettingRow({
  hasSwitch = false,
}: {
  hasSwitch?: boolean;
}) {
  return (
    <div className="settings-row skeleton-setting-row" aria-hidden="true">
      <div className="skeleton-lines skeleton-flex-1">
        <SkeletonBlock width="46%" height={14} radius={4} />
        <SkeletonBlock width="72%" height={12} radius={4} />
      </div>
      {hasSwitch ? (
        <SkeletonBlock width={36} height={20} radius={999} />
      ) : (
        <SkeletonBlock width={18} height={18} radius={4} />
      )}
    </div>
  );
}

/**
 * 1:1 pure grayscale content-only page skeleton for loading.tsx & Suspense fallbacks.
 * Keeps surrounding shell space calm without blinking fake sidebar or rail chrome.
 */
export function PageSkeleton({
  variant = "feed",
}: {
  variant?: PageSkeletonVariant;
}) {
  if (variant === "auth") {
    return (
      <main
        className="auth-page"
        role="status"
        aria-live="polite"
        aria-label="Memuat halaman"
      >
        <section className="auth-card stack">
          <SkeletonBlock width={180} height={22} radius={4} />
          <SkeletonBlock width={220} height={14} radius={4} />
          <SkeletonBlock width="100%" height={44} radius={12} />
          <SkeletonBlock width="100%" height={44} radius={12} />
          <SkeletonBlock width="100%" height={44} radius={12} />
        </section>
      </main>
    );
  }

  return (
    <main
      className="reading-column skeleton-reading-column"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Memuat konten"
    >
      {variant === "feed" && (
        <section className="feed-surface home-feed skeleton-feed-body">
          <SkeletonPostList count={3} />
        </section>
      )}

      {variant === "directory" && (
        <section className="feed-surface skeleton-feed-body">
          <SkeletonPostList count={3} isReport />
        </section>
      )}

      {variant === "detail" && (
        <section className="feed-surface post-detail-surface skeleton-feed-body">
          <SkeletonPostCard isReport withMedia />
          <div className="comments">
            <SkeletonPostCard withMedia={false} />
            <SkeletonPostCard withMedia={false} />
          </div>
        </section>
      )}

      {variant === "messages" && (
        <div className="messaging">
          <section className="conversation-list">
            <div className="conversation-items-scroll skeleton-inbox-body">
              <SkeletonMessageList count={5} />
            </div>
          </section>
        </div>
      )}

      {variant === "notifications" && (
        <section className="feed-surface notif-surface skeleton-feed-body">
          <div className="notif-items-list">
            <SkeletonNotificationList count={5} />
          </div>
        </section>
      )}

      {variant === "profile" && (
        <section className="feed-surface profile-surface">
          <header className="profile-header">
            <div className="profile-identity">
              <div className="skeleton-lines skeleton-flex-1">
                <SkeletonBlock width={144} height={20} radius={4} />
                <SkeletonBlock width={96} height={14} radius={4} />
              </div>
              <SkeletonCircle size={84} />
            </div>
            <div className="skeleton-lines skeleton-mt-12">
              <SkeletonBlock width="78%" height={14} radius={4} />
              <SkeletonBlock width="48%" height={14} radius={4} />
            </div>
          </header>
          <SkeletonPostList count={2} />
        </section>
      )}

      {variant === "activity" && (
        <section className="feed-surface laporan-surface skeleton-feed-body">
          <SkeletonActivityList count={5} />
        </section>
      )}

      {variant === "settings" && (
        <section className="feed-surface settings-page">
          <div className="settings-section">
            <SkeletonSettingRow />
            <SkeletonSettingRow hasSwitch />
            <SkeletonSettingRow hasSwitch />
          </div>
          <div className="settings-section">
            <SkeletonSettingRow hasSwitch />
            <SkeletonSettingRow />
          </div>
        </section>
      )}
    </main>
  );
}
