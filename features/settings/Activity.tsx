"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import { ProductShell } from "@/components/layout/ProductShell";
import {
  DirectoryToolbar,
  type DirectoryToolbarOption,
} from "@/components/ui/DirectoryToolbar";
import {
  LazyLoadSentinel,
  useLazySlice,
  useSubtabTransition,
} from "@/components/ui/LazyFeed";
import { SkeletonActivityList } from "@/components/ui/Skeleton";
import { useDemo } from "@/features/auth/DemoProvider";
import { formatPageTitle, formatSearchTitle } from "@/lib/title";

type ActivityKind = "vote" | "comment" | "repost" | "saved" | "validation";
type ActivityFilter = "all" | ActivityKind;
type ActivityTab = "all" | "vote" | "comment" | "other";

interface ActivityEntry {
  key: string;
  kind: ActivityKind;
  direction?: "UP" | "DOWN";
  label: string;
  targetPreview: string;
  href: string;
}

const ACTIVITY_FILTER_OPTIONS: readonly DirectoryToolbarOption<ActivityFilter>[] =
  [
    { id: "all", label: "Semua jenis" },
    { id: "vote", label: "Dukungan naik / turun" },
    { id: "comment", label: "Komentar & balasan" },
    { id: "repost", label: "Bagikan ulang" },
    { id: "saved", label: "Disimpan" },
    { id: "validation", label: "Validasi penyelesaian" },
  ];

const ACTIVITY_TABS: { id: ActivityTab; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "vote", label: "Dukungan" },
  { id: "comment", label: "Komentar" },
  { id: "other", label: "Lainnya" },
];

function matchesActivityTab(item: ActivityEntry, tab: ActivityTab): boolean {
  if (tab === "all") return true;
  if (tab === "other") {
    return (
      item.kind === "repost" ||
      item.kind === "saved" ||
      item.kind === "validation"
    );
  }
  return item.kind === tab;
}

function ActivityIcon({ item }: { item: ActivityEntry }) {
  if (item.kind === "vote") {
    return item.direction === "DOWN" ? (
      <ArrowBigDown size={18} strokeWidth={1.8} />
    ) : (
      <ArrowBigUp size={18} strokeWidth={1.8} />
    );
  }
  if (item.kind === "comment") {
    return <MessageCircle size={18} strokeWidth={1.8} />;
  }
  if (item.kind === "repost") {
    return <Repeat2 size={18} strokeWidth={1.8} />;
  }
  if (item.kind === "saved") {
    return <Bookmark size={18} strokeWidth={1.8} />;
  }
  return <CheckCircle2 size={18} strokeWidth={1.8} />;
}

export function Activity() {
  const { posts, user, showToast } = useDemo();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ActivityFilter>("all");
  const [activeTab, setActiveTab] = useState<ActivityTab>("all");

  const allItems = useMemo<ActivityEntry[]>(() => {
    return posts
      .filter((post) => !post.isDeleted)
      .flatMap((post) => {
        const preview = post.content.trim() || post.category;
        return [
          ...(post.vote
            ? [
                {
                  key: `vote-${post.localKey}`,
                  kind: "vote" as const,
                  direction: post.vote,
                  label:
                    post.vote === "UP"
                      ? "Dukung naik postingan"
                      : "Dukung turun postingan",
                  targetPreview: preview,
                  href: `/posts/${post.localKey}`,
                },
              ]
            : []),
          ...(post.reposted
            ? [
                {
                  key: `repost-${post.localKey}`,
                  kind: "repost" as const,
                  label: "Bagikan ulang postingan",
                  targetPreview: preview,
                  href: `/posts/${post.localKey}`,
                },
              ]
            : []),
          ...(post.saved
            ? [
                {
                  key: `saved-${post.localKey}`,
                  kind: "saved" as const,
                  label: "Postingan disimpan",
                  targetPreview: preview,
                  href: `/posts/${post.localKey}`,
                },
              ]
            : []),
          ...post.replies
            .filter((reply) => reply.authorKey === user?.localKey)
            .map((reply) => ({
              key: reply.localKey,
              kind: "comment" as const,
              label: `Komentar: ${reply.content}`,
              targetPreview: preview,
              href: `/posts/${post.localKey}#comment-${reply.localKey}`,
            })),
          ...post.resolutions
            .filter((item) => item.choice)
            .map((item) => ({
              key: item.localKey,
              kind: "validation" as const,
              label: `Validasi: ${item.choice === "agree" ? "Setuju" : "Belum selesai"}`,
              targetPreview: preview,
              href: `/posts/${post.localKey}#evidence`,
            })),
        ];
      });
  }, [posts, user?.localKey]);

  const baseItems = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase("id-ID");
    return allItems.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (!cleanQuery) return true;
      return `${item.label} ${item.targetPreview}`
        .toLocaleLowerCase("id-ID")
        .includes(cleanQuery);
    });
  }, [allItems, kindFilter, query]);

  const counts = useMemo(
    () => ({
      all: baseItems.length,
      vote: baseItems.filter((item) => matchesActivityTab(item, "vote")).length,
      comment: baseItems.filter((item) => matchesActivityTab(item, "comment"))
        .length,
      other: baseItems.filter((item) => matchesActivityTab(item, "other"))
        .length,
    }),
    [baseItems],
  );

  const visible = useMemo(
    () => baseItems.filter((item) => matchesActivityTab(item, activeTab)),
    [baseItems, activeTab],
  );

  const {
    visibleItems: renderedActivity,
    hasMore,
    isLoadingMore,
    sentinelRef,
  } = useLazySlice(visible, {
    initialCount: 6,
    batchSize: 6,
    resetKey: `${query}:${kindFilter}:${activeTab}`,
  });
  const activitySubtabKey = `${kindFilter}:${activeTab}`;
  const { isSubtabLoading, triggerSubtabSkeleton } = useSubtabTransition(
    activitySubtabKey,
    {
      onRateLimited: () =>
        showToast("Tunggu 1 detik sebelum ganti tab.", "info"),
    },
  );

  function selectActivityTab(nextTab: ActivityTab) {
    if (!triggerSubtabSkeleton(`${kindFilter}:${nextTab}`)) return;
    setActiveTab(nextTab);
  }

  function selectKindFilter(nextFilter: ActivityFilter) {
    if (!triggerSubtabSkeleton(`${nextFilter}:all`)) return;
    setKindFilter(nextFilter);
    setActiveTab("all");
  }

  const isFiltered =
    Boolean(query.trim()) || kindFilter !== "all" || activeTab !== "all";

  return (
    <ProductShell
      title="Aktivitas pribadi"
      active="settings"
      documentTitle={
        query.trim()
          ? formatSearchTitle(query, "Aktivitas")
          : formatPageTitle("Aktivitas")
      }
    >
      <section className="feed-surface laporan-surface">
        <DirectoryToolbar<ActivityFilter, ActivityTab>
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Cari aktivitas..."
          filterValue={kindFilter}
          onFilterChange={selectKindFilter}
          filterOptions={ACTIVITY_FILTER_OPTIONS}
          filterAriaLabel="Filter jenis aktivitas"
          tabs={ACTIVITY_TABS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            count: counts[tab.id],
          }))}
          activeTab={activeTab}
          onTabChange={selectActivityTab}
          tabsAriaLabel="Kategori aktivitas"
        />

        <p className="tugas-scope-bar">
          Hanya kamu yang dapat melihat aktivitas sesi demo ini ·{" "}
          {visible.length} aktivitas
        </p>

        <section
          className="explore-feed-section"
          aria-label="Daftar aktivitas pribadi"
        >
          {isSubtabLoading ? (
            <SkeletonActivityList count={4} />
          ) : (
            <>
              {renderedActivity.map((item) => (
                <Link className="activity-row" key={item.key} href={item.href}>
                  <span className="settings-icon-badge" aria-hidden="true">
                    <ActivityIcon item={item} />
                  </span>
                  <div className="activity-row-body">
                    <strong className="activity-row-title">{item.label}</strong>
                    <span className="activity-row-preview">
                      {item.targetPreview}
                    </span>
                    <small className="muted">Sesi demo · Buka konten asli →</small>
                  </div>
                  <ChevronRight size={18} className="settings-chevron" />
                </Link>
              ))}
              <LazyLoadSentinel
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                sentinelRef={sentinelRef}
                variant="activity"
              />

              {!visible.length && (
                <div className="empty-state">
                  <h2>
                    {isFiltered
                      ? "Tidak ada aktivitas ditemukan"
                      : "Belum ada aktivitas"}
                  </h2>
                  <p>
                    {isFiltered
                      ? "Coba ubah kata kunci pencarian atau filter jenis aktivitas."
                      : "Interaksi yang kamu lakukan pada sesi ini akan muncul di sini."}
                  </p>
                  {isFiltered ? (
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => {
                        setQuery("");
                        selectKindFilter("all");
                      }}
                    >
                      Atur ulang filter
                    </button>
                  ) : (
                    <Link href="/home">Kembali ke beranda →</Link>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
