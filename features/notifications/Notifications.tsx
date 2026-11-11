"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
import {
  LazyLoadSentinel,
  useLazySlice,
  useSubtabTransition,
} from "@/components/ui/LazyFeed";
import { SkeletonNotificationList } from "@/components/ui/Skeleton";
import { CheckCheck, Check, Trash2 } from "lucide-react";

type NotifFilter = "all" | "unread" | "replies" | "activity";

interface NotifItem {
  key: string;
  actor: string;
  title: string;
  body: string;
  href: string;
  category: "replies" | "activity";
  time: string;
}

export function Notifications() {
  const {
    workspace,
    setWorkspace,
    people,
    posts,
    user,
    dbNotifications = [],
    isDemoAccount,
    showToast,
  } = useDemo();
  const [tab, setTab] = useState<NotifFilter>("all");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());

  // 100% DB-backed notifications + live session replies
  const mergedNotifItems = useMemo<NotifItem[]>(() => {
    const items: NotifItem[] = [];
    const seenKeys = new Set<string>();

    for (const dbn of dbNotifications) {
      if (seenKeys.has(dbn.key)) continue;
      seenKeys.add(dbn.key);
      const ageMin = Math.max(1, Math.round((Date.now() - dbn.createdAt) / 60000));
      const timeStr =
        ageMin < 5
          ? "Baru saja"
          : ageMin < 60
            ? `${ageMin}m`
            : `${Math.round(ageMin / 60)}j`;
      items.push({
        key: dbn.key,
        actor: dbn.actorKey || "pupr",
        title: dbn.title,
        body: dbn.body,
        href: dbn.href,
        category:
          dbn.title.toLowerCase().includes("membalas") ||
          dbn.title.toLowerCase().includes("balasan")
            ? "replies"
            : "activity",
        time: timeStr,
      });
    }

    // Also derive live notifications from replies on current user's posts
    if (user) {
      for (const post of posts) {
        if (post.authorKey !== user.localKey) continue;
        for (const reply of post.replies || []) {
          if (reply.authorKey === user.localKey) continue;
          const k = `live_reply_${reply.localKey}`;
          if (seenKeys.has(k)) continue;
          seenKeys.add(k);
          const actorPerson = people.find((p) => p.localKey === reply.authorKey);
          items.push({
            key: k,
            actor: reply.authorKey,
            title: reply.is_action_taken
              ? `${actorPerson?.name || "Instansi"} menindaklanjuti laporan Anda`
              : `${actorPerson?.name || "Warga"} membalas di diskusi Anda`,
            body: reply.content.slice(0, 120),
            href: `/posts/${post.localKey}`,
            category: reply.is_action_taken ? "activity" : "replies",
            time: "Baru saja",
          });
        }
      }
    }

    return items;
  }, [dbNotifications, posts, people, user]);

  // Filter out deleted items
  const activeItems = useMemo(() => {
    return mergedNotifItems.filter((item) => !deletedKeys.has(item.key));
  }, [mergedNotifItems, deletedKeys]);

  // Counts for each tab
  const counts = useMemo(() => {
    const all = activeItems.length;
    const unread = activeItems.filter(
      (item) => !workspace.readNotifications.includes(item.key),
    ).length;
    const replies = activeItems.filter((item) => item.category === "replies").length;
    const activity = activeItems.filter((item) => item.category === "activity").length;
    return { all, unread, replies, activity };
  }, [activeItems, workspace.readNotifications]);

  // Items for currently active tab
  const displayedItems = useMemo(() => {
    return activeItems.filter((item) => {
      if (tab === "all") return true;
      if (tab === "unread") return !workspace.readNotifications.includes(item.key);
      if (tab === "replies") return item.category === "replies";
      if (tab === "activity") return item.category === "activity";
      return true;
    });
  }, [activeItems, tab, workspace.readNotifications]);

  const {
    visibleItems: visibleNotifs,
    hasMore,
    isLoadingMore,
    sentinelRef,
  } = useLazySlice(displayedItems, {
    initialCount: 5,
    batchSize: 5,
    resetKey: tab,
  });
  const { isSubtabLoading, triggerSubtabSkeleton } = useSubtabTransition(tab, {
    onRateLimited: () =>
      showToast("Tunggu 1 detik sebelum ganti tab.", "info"),
  });

  function selectNotifTab(nextTab: NotifFilter) {
    if (!triggerSubtabSkeleton(nextTab)) return;
    setTab(nextTab);
  }

  const isAllSelected =
    displayedItems.length > 0 &&
    displayedItems.every((item) => selectedKeys.has(item.key));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        displayedItems.forEach((i) => next.delete(i.key));
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        displayedItems.forEach((i) => next.add(i.key));
        return next;
      });
    }
  };

  const handleToggleItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleToggleSelectionMode = () => {
    setIsSelecting((prev) => {
      if (prev) {
        setSelectedKeys(new Set());
        return false;
      }
      return true;
    });
  };

  const handleMarkSelectedRead = () => {
    const keys = Array.from(selectedKeys);
    setWorkspace((current) => ({
      ...current,
      readNotifications: Array.from(
        new Set([...current.readNotifications, ...keys]),
      ),
    }));
    if (!isDemoAccount) {
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: keys }),
      }).catch(() => {});
    }
    setSelectedKeys(new Set());
    setIsSelecting(false);
  };

  const handleDeleteSelected = () => {
    const keys = Array.from(selectedKeys);
    setDeletedKeys((prev) => new Set([...prev, ...keys]));
    if (!isDemoAccount) {
      void fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: keys }),
      }).catch(() => {});
    }
    setSelectedKeys(new Set());
    setIsSelecting(false);
  };

  function readSingle(key: string) {
    if (isSelecting) return;
    setWorkspace((current) => ({
      ...current,
      readNotifications: [...new Set([...current.readNotifications, key])],
    }));
    if (!isDemoAccount) {
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [key] }),
      }).catch(() => {});
    }
  }

  return (
    <ProductShell title="Notifikasi" active="notifications">
      <section className="feed-surface notif-surface">
        {/* Toolbar Row: Segmented Pills + Select Mode Toggle */}
        <header className="notif-page-header">
          <div className="notif-header-top">
            <div className="notif-segmented-control" role="tablist" aria-label="Filter notifikasi">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "all"}
                className={`notif-segment-btn ${tab === "all" ? "active" : ""}`}
                onClick={() => selectNotifTab("all")}
              >
                <span>Semua</span>
                {counts.all > 0 && (
                  <span className="notif-count-badge">{counts.all}</span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "unread"}
                className={`notif-segment-btn ${tab === "unread" ? "active" : ""}`}
                onClick={() => selectNotifTab("unread")}
              >
                <span>Belum Dibaca</span>
                {counts.unread > 0 && (
                  <span className="notif-count-badge">{counts.unread}</span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "replies"}
                className={`notif-segment-btn ${tab === "replies" ? "active" : ""}`}
                onClick={() => selectNotifTab("replies")}
              >
                <span>Balasan</span>
                {counts.replies > 0 && (
                  <span className="notif-count-badge">{counts.replies}</span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "activity"}
                className={`notif-segment-btn ${tab === "activity" ? "active" : ""}`}
                onClick={() => selectNotifTab("activity")}
              >
                <span>Aktivitas</span>
                {counts.activity > 0 && (
                  <span className="notif-count-badge">{counts.activity}</span>
                )}
              </button>
            </div>
            <button
              type="button"
              className={`notif-check-mode-btn ${isSelecting ? "active" : ""}`}
              onClick={handleToggleSelectionMode}
              aria-label="Pilih notifikasi"
              title={isSelecting ? "Selesai memilih" : "Pilih notifikasi"}
            >
              <CheckCheck size={20} />
            </button>
          </div>

          {/* Selection Toolbar */}
          {isSelecting && (
            <div className="notif-selection-bar">
              <button
                type="button"
                className="notif-select-all-btn"
                onClick={handleToggleSelectAll}
              >
                <span
                  className={`notif-select-indicator ${isAllSelected ? "is-checked" : ""}`}
                >
                  {isAllSelected && <Check size={12} strokeWidth={3} />}
                </span>
                <span>Pilih Semua</span>
              </button>

              <span className="notif-selected-summary">
                {selectedKeys.size > 0
                  ? `${selectedKeys.size} dipilih`
                  : "0 dipilih"}
              </span>

              <button
                type="button"
                className="notif-cancel-btn"
                onClick={() => {
                  setIsSelecting(false);
                  setSelectedKeys(new Set());
                }}
              >
                Batal
              </button>
            </div>
          )}
        </header>

        {/* Notifications List */}
        <div className="notif-items-list">
          {isSubtabLoading ? (
            <SkeletonNotificationList count={4} />
          ) : (
            <>
              {visibleNotifs.map((item) => {
                const actor = people.find(
                  (person) => person.localKey === item.actor,
                ) || { name: "Pengguna", image: undefined };
                const isRead = workspace.readNotifications.includes(item.key);
                const isSelected = selectedKeys.has(item.key);

                return (
                  <div
                    key={item.key}
                    onClick={(e) => {
                      if (isSelecting) {
                        e.preventDefault();
                        handleToggleItem(item.key);
                      }
                    }}
                    className={`notification-row ${isRead ? "" : "is-unread"} ${
                      isSelecting ? "is-selectable" : ""
                    } ${isSelected ? "is-selected" : ""}`}
                  >
                    {/* Checkbox indicator in selection mode */}
                    {isSelecting && (
                      <span
                        className={`notif-item-checkbox ${
                          isSelected ? "is-checked" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleItem(item.key);
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                    )}

                    <Avatar name={actor.name} src={actor.image} />
                    <div className="notif-content-col">
                      {isSelecting ? (
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.body}</p>
                          <small className="muted">{item.time}</small>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => readSingle(item.key)}
                          className="notif-row-link"
                        >
                          <strong>{item.title}</strong>
                          <p>{item.body}</p>
                          <small className="muted">{item.time}</small>
                        </Link>
                      )}
                    </div>

                    {!isRead && (
                      <span className="unread-dot" aria-label="Belum dibaca" />
                    )}
                  </div>
                );
              })}
              <LazyLoadSentinel
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                sentinelRef={sentinelRef}
                variant="notification"
              />

              {!displayedItems.length && (
                <div className="empty-state">
                  <h2>Tidak ada notifikasi</h2>
                  <p>
                    {tab === "unread"
                      ? "Semua notifikasi sudah Anda baca."
                      : "Belum ada notifikasi pada kategori ini."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Action Modal: Terbaca & Hapus */}
        {isSelecting && selectedKeys.size > 0 && (
          <div
            className="notif-floating-modal"
            role="dialog"
            aria-label="Aksi notifikasi yang dipilih"
          >
            <div className="notif-floating-content">
              <span className="notif-floating-badge">
                {selectedKeys.size} dipilih
              </span>
              <div className="notif-floating-divider" />
              <button
                type="button"
                className="notif-action-btn notif-action-btn--read"
                onClick={handleMarkSelectedRead}
              >
                <Check size={16} strokeWidth={2.4} />
                <span>Terbaca</span>
              </button>
              <button
                type="button"
                className="notif-action-btn notif-action-btn--delete"
                onClick={handleDeleteSelected}
              >
                <Trash2 size={16} strokeWidth={2} />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </ProductShell>
  );
}
