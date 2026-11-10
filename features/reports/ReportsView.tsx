"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { PostCard } from "@/features/posts/PostCard";
import { getEffectiveReportStatus } from "@/features/discovery/filters";
import type { Person, Post, Role } from "@/types/models";

export type ReportAuthorityFilter = "all" | "government" | "internal";
export type ReportStatusTab = "all" | "waiting" | "in_progress" | "completed";

export interface FilterOption<T extends string> {
  id: T;
  label: string;
}

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
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node)
      ) {
        setFilterMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [filterMenuOpen]);

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

  const activeFilterLabel =
    filterOptions.find((opt) => opt.id === filterValue)?.label ??
    filterOptions[0]?.label ??
    "Semua";
  const defaultFilter = filterOptions[0]?.id;
  const isFiltered =
    Boolean(query) ||
    (defaultFilter !== undefined && filterValue !== defaultFilter) ||
    statusTab !== "all";

  return (
    <section className="feed-surface laporan-surface">
      <div className="chat-list-top">
        <div className="chat-search-box">
          <Search size={16} className="chat-search-icon" />
          <input
            type="text"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="quick-search-clear-btn"
              aria-label="Hapus pencarian"
              onClick={() => onQueryChange("")}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="laporan-filter-wrap" ref={filterMenuRef}>
          <button
            type="button"
            className={`chat-compose-btn laporan-filter-btn ${defaultFilter !== undefined && filterValue !== defaultFilter ? "is-active" : ""}`.trim()}
            aria-label={`${filterAriaLabel}: ${activeFilterLabel}`}
            aria-haspopup="menu"
            aria-expanded={filterMenuOpen}
            title={`Filter: ${activeFilterLabel}`}
            onClick={() => setFilterMenuOpen((prev) => !prev)}
          >
            <SlidersHorizontal size={18} strokeWidth={1.8} />
            {defaultFilter !== undefined && filterValue !== defaultFilter && (
              <span className="laporan-filter-dot" aria-hidden="true" />
            )}
          </button>

          {filterMenuOpen && (
            <div
              className="profile-filter-menu laporan-filter-menu"
              role="menu"
              aria-label={filterAriaLabel}
            >
              {filterOptions.map((opt) => {
                const selected = filterValue === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`profile-filter-option ${selected ? "is-selected" : ""}`}
                    onClick={() => {
                      onFilterChange(opt.id);
                      setFilterMenuOpen(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check size={16} strokeWidth={2.2} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="chat-subtabs-wrap">
        <div
          className="notif-segmented-control chat-segmented-control"
          role="tablist"
          aria-label="Status laporan"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusTab === tab.id}
              className={`notif-segment-btn ${statusTab === tab.id ? "active" : ""}`}
              onClick={() => onStatusTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              {counts[tab.id] > 0 && (
                <span className="notif-count-badge">{counts[tab.id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {scopeNote && <p className="tugas-scope-bar">{scopeNote}</p>}

      <section className="explore-feed-section" aria-label="Daftar laporan">
        {visibleReports.map((post) => (
          <PostCard key={post.localKey} post={post} />
        ))}

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
                    onFilterChange(defaultFilter);
                  }
                  onStatusTabChange("all");
                }}
              >
                Atur ulang filter
              </button>
            )}
          </div>
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
    <ProductShell title="Laporan" active="laporan">
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
