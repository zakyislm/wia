"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
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

const baseNotifItems: NotifItem[] = [
  {
    key: "evidence",
    actor: "pupr",
    title: "Dinas PUPR mengajukan penyelesaian",
    body: "Lihat bukti dan ikut menilai hasilnya.",
    href: "/posts/trotoar-merdeka#evidence",
    category: "activity",
    time: "Baru saja",
  },
  {
    key: "reply-1",
    actor: "komunitas",
    title: "Balasan baru dalam percakapan",
    body: "Percakapan warga terus berlanjut di laporan trotoar.",
    href: "/posts/trotoar-merdeka",
    category: "replies",
    time: "15m",
  },
  {
    key: "closed",
    actor: "pupr",
    title: "Validasi selesai · Laporan Closed",
    body: "Lihat bukti, hasil validasi dan riwayat percakapan.",
    href: "/posts/contoh-success#evidence",
    category: "activity",
    time: "1j",
  },
  {
    key: "reply-2",
    actor: "nadia",
    title: "Nadia membalas komentar Anda",
    body: "Setuju banget, akhir pekan ini kita gotong royong bareng ya!",
    href: "/posts/trotoar-merdeka",
    category: "replies",
    time: "2j",
  },
  {
    key: "follow",
    actor: "nadia",
    title: "Nadia mulai mengikutimu",
    body: "Temukan cerita dan suara baru dari warga sekitar.",
    href: "/profile/nadia",
    category: "activity",
    time: "3j",
  },
  {
    key: "report-status",
    actor: "dishub",
    title: "Dishub memperbarui status fasilitas",
    body: "Pekerjaan lapangan telah dijadwalkan oleh dinas terkait.",
    href: "/posts/trotoar-merdeka",
    category: "activity",
    time: "1h",
  },
];

export function Notifications() {
  const { workspace, setWorkspace, people } = useDemo();
  const [tab, setTab] = useState<NotifFilter>("all");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());

  // Filter out deleted items
  const activeItems = useMemo(() => {
    return baseNotifItems.filter((item) => !deletedKeys.has(item.key));
  }, [deletedKeys]);

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
    setSelectedKeys(new Set());
    setIsSelecting(false);
  };

  const handleDeleteSelected = () => {
    const keys = Array.from(selectedKeys);
    setDeletedKeys((prev) => new Set([...prev, ...keys]));
    setSelectedKeys(new Set());
    setIsSelecting(false);
  };

  function readSingle(key: string) {
    if (isSelecting) return;
    setWorkspace((current) => ({
      ...current,
      readNotifications: [...new Set([...current.readNotifications, key])],
    }));
  }

  return (
    <ProductShell title="Notifikasi" active="notifications" hideHeader>
      <section className="feed-surface notif-surface">
        {/* Custom Header matching Substack / Image 2 */}
        <header className="notif-page-header">
          <div className="notif-header-top">
            <h1 className="notif-page-title">Notifikasi</h1>
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

          {/* Segmented Control Pill Bar */}
          <div className="notif-segmented-control" role="tablist" aria-label="Filter notifikasi">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "all"}
              className={`notif-segment-btn ${tab === "all" ? "active" : ""}`}
              onClick={() => setTab("all")}
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
              onClick={() => setTab("unread")}
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
              onClick={() => setTab("replies")}
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
              onClick={() => setTab("activity")}
            >
              <span>Aktivitas</span>
              {counts.activity > 0 && (
                <span className="notif-count-badge">{counts.activity}</span>
              )}
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
          {displayedItems.map((item) => {
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
