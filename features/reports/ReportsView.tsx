"use client";
import { useMemo, useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import {
  DirectoryToolbar,
  type DirectoryToolbarOption,
} from "@/components/ui/DirectoryToolbar";
import { PostCard } from "@/features/posts/PostCard";
import {
  LazyLoadSentinel,
  useLazySlice,
  useSubtabTransition,
} from "@/components/ui/LazyFeed";
import { SkeletonPostList } from "@/components/ui/Skeleton";
import { getEffectiveReportStatus } from "@/features/discovery/filters";
import { formatPageTitle, formatSearchTitle } from "@/lib/title";
import type { Person, Post, Role } from "@/types/models";

export type ReportAuthorityFilter = "all" | "government" | "internal";
export type ReportStatusTab = "all" | "waiting" | "in_progress" | "completed";

export type FilterOption<T extends string> = DirectoryToolbarOption<T>;

const AUTHORITY_OPTIONS: FilterOption<ReportAuthorityFilter>[] = [
  { id: "all", label: "Semua" },
  { id: "government", label: "Pemerintah" },
  { id: "internal", label: "Internal" },
];

export const STATUS_TABS: { id: ReportStatusTab; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "waiting", label: "Menunggu" },
  { id: "in_progress", label: "Diproses" },
  { id: "completed", label: "Selesai" },
];

export function matchesReportAuthority(
  post: Post,
  authority: ReportAuthorityFilter,
  people: Person[],
): boolean {
  if (authority === "all") return true;
  const targetRole: Role =
    authority === "government" ? "GOVERNMENT" : "INTERNAL";
  const roleByKey = new Map(people.map((p) => [p.localKey, p.role]));

  if (post.closedByRole === targetRole) return true;
  if (
    authority === "internal" &&
    getEffectiveReportStatus(post) === "closed_internal"
  ) {
    return true;
  }
  if (
    post.replies.some(
      (reply) =>
        reply.is_action_taken &&
        (reply.actionRole === targetRole ||
          roleByKey.get(reply.authorKey) === targetRole),
    )
  ) {
    return true;
  }
  if (
    authority === "government" &&
    post.resolutions.some((res) => roleByKey.get(res.agencyKey) === "GOVERNMENT")
  ) {
    return true;
  }
  return post.agencyKeys.some((key) => roleByKey.get(key) === targetRole);
}

export function matchesReportStatusTab(
  post: Post,
  statusTab: ReportStatusTab,
): boolean {
  if (statusTab === "all") return true;
  const status = getEffectiveReportStatus(post);
  if (statusTab === "completed") {
    return status === "completed" || status === "closed_internal";
  }
  return status === statusTab;
}

export function matchesReportSearch(
  post: Post,
  query: string,
  people: Person[],
): boolean {
  const clean = query.trim().toLocaleLowerCase("id-ID");
  if (!clean) return true;
  const authorText = post.anonymous
    ? "Anonim"
    : people
        .filter((p) => p.localKey === post.authorKey)
        .map((p) => `${p.name} ${p.username}`)
        .join(" ");
  const agencyText = people
    .filter((p) => post.agencyKeys.includes(p.localKey))
    .map((p) => `${p.name} ${p.username}`)
    .join(" ");
  const tagsText = post.tags?.map((t) => `#${t} ${t}`).join(" ") ?? "";
  return `${post.content} ${tagsText} ${post.locationName ?? ""} ${post.province} ${post.topicName ?? post.category} ${authorText} ${agencyText}`
    .toLocaleLowerCase("id-ID")
    .includes(clean);
}

export function filterReportsList(
  posts: Post[],
  people: Person[],
  {
    query,
    roleFilter,
    statusTab,
  }: {
    query: string;
    roleFilter: ReportAuthorityFilter;
    statusTab: ReportStatusTab;
  },
): Post[] {
  return posts
    .filter(
      (post) =>
        !post.isDeleted &&
        !post.hidden &&
        post.kind === "report" &&
        matchesReportAuthority(post, roleFilter, people) &&
        matchesReportSearch(post, query, people) &&
        matchesReportStatusTab(post, statusTab),
    )
    .sort((a, b) => b.postedAt - a.postedAt);
}

export function ReportDirectoryShell<T extends string>({
  baseReports,
  query,
  onQueryChange,
  filterValue,
  onFilterChange,
  filterOptions,
  filterAriaLabel,
  searchPlaceholder,
  statusTab,
  onStatusTabChange,
  scopeNote,
  emptyTitle = "Tidak ada laporan ditemukan",
  emptyFilteredMessage = "Coba ubah kata kunci pencarian atau filter status laporan.",
  emptyIdleMessage = "Belum ada laporan warga yang tercatat saat ini.",
}: {
  baseReports: Post[];
  query: string;
  onQueryChange: (value: string) => void;
  filterValue: T;
  onFilterChange: (value: T) => void;
  filterOptions: FilterOption<T>[];
  filterAriaLabel: string;
  searchPlaceholder: string;
  statusTab: ReportStatusTab;
  onStatusTabChange: (tab: ReportStatusTab) => void;
  scopeNote?: string;
  emptyTitle?: string;
  emptyFilteredMessage?: string;
  emptyIdleMessage?: string;
}) {
  const { showToast } = useDemo();
  const counts = useMemo(
    () => ({
      all: baseReports.length,
      waiting: baseReports.filter((p) => matchesReportStatusTab(p, "waiting"))
        .length,
      in_progress: baseReports.filter((p) =>
        matchesReportStatusTab(p, "in_progress"),
      ).length,
      completed: baseReports.filter((p) =>
        matchesReportStatusTab(p, "completed"),
      ).length,
    }),
    [baseReports],
  );

  const visibleReports = useMemo(
    () => baseReports.filter((p) => matchesReportStatusTab(p, statusTab)),
    [baseReports, statusTab],
  );

  const {
    visibleItems: renderedReports,
    hasMore,
    isLoadingMore,
    sentinelRef,
  } = useLazySlice(visibleReports, {
    initialCount: 3,
    batchSize: 4,
    resetKey: `${query}:${String(filterValue)}:${statusTab}`,
  });

  const subtabKey = `${String(filterValue)}:${statusTab}`;
  const { isSubtabLoading, triggerSubtabSkeleton } = useSubtabTransition(
    subtabKey,
    {
      onRateLimited: () =>
        showToast("Tunggu 1 detik sebelum ganti tab.", "info"),
    },
  );

  function handleFilterChange(next: T) {
    if (!triggerSubtabSkeleton(`${String(next)}:${statusTab}`)) return;
    onFilterChange(next);
  }

  function handleStatusTabChange(next: ReportStatusTab) {
    if (!triggerSubtabSkeleton(`${String(filterValue)}:${next}`)) return;
    onStatusTabChange(next);
  }

  const defaultFilter = filterOptions[0]?.id;
  const isFiltered =
    Boolean(query) ||
    (defaultFilter !== undefined && filterValue !== defaultFilter) ||
    statusTab !== "all";

  return (
    <section className="feed-surface laporan-surface">
      <DirectoryToolbar
        query={query}
        onQueryChange={onQueryChange}
        searchPlaceholder={searchPlaceholder}
        filterValue={filterValue}
        onFilterChange={handleFilterChange}
        filterOptions={filterOptions}
        filterAriaLabel={filterAriaLabel}
        tabs={STATUS_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count: counts[tab.id],
        }))}
        activeTab={statusTab}
        onTabChange={handleStatusTabChange}
        tabsAriaLabel="Status laporan"
      />

      {scopeNote && <p className="tugas-scope-bar">{scopeNote}</p>}

      <section className="explore-feed-section" aria-label="Daftar laporan">
        {isSubtabLoading ? (
          <SkeletonPostList count={3} isReport />
        ) : (
          <>
            {renderedReports.map((post) => (
              <PostCard key={post.localKey} post={post} />
            ))}
            <LazyLoadSentinel
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              sentinelRef={sentinelRef}
            />

            {visibleReports.length === 0 && (
              <div className="empty-state">
                <h2>{emptyTitle}</h2>
                <p>{isFiltered ? emptyFilteredMessage : emptyIdleMessage}</p>
                {isFiltered && (
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => {
                      onQueryChange("");
                      if (defaultFilter !== undefined) {
                        handleFilterChange(defaultFilter);
                      }
                      handleStatusTabChange("all");
                    }}
                  >
                    Atur ulang filter
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}

export function ReportsView() {
  const { posts, people } = useDemo();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<ReportAuthorityFilter>("all");
  const [statusTab, setStatusTab] = useState<ReportStatusTab>("all");

  const baseReports = useMemo(
    () =>
      filterReportsList(posts, people, {
        query,
        roleFilter,
        statusTab: "all",
      }),
    [posts, people, query, roleFilter],
  );

  return (
    <ProductShell
      title="Laporan"
      active="laporan"
      documentTitle={
        query.trim()
          ? formatSearchTitle(query, "Laporan")
          : formatPageTitle("Laporan")
      }
    >
      <ReportDirectoryShell<ReportAuthorityFilter>
        baseReports={baseReports}
        query={query}
        onQueryChange={setQuery}
        filterValue={roleFilter}
        onFilterChange={setRoleFilter}
        filterOptions={AUTHORITY_OPTIONS}
        filterAriaLabel="Filter pihak penangan"
        searchPlaceholder="Cari laporan..."
        statusTab={statusTab}
        onStatusTabChange={setStatusTab}
      />
    </ProductShell>
  );
}
