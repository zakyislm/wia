"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { matchesJurisdiction } from "@/lib/regions";
import { formatPageTitle, formatSearchTitle } from "@/lib/title";
import {
  ReportDirectoryShell,
  matchesReportAuthority,
  matchesReportSearch,
  matchesReportStatusTab,
  type FilterOption,
  type ReportStatusTab,
} from "@/features/reports/ReportsView";
import type { Person, Post } from "@/types/models";

export type TaskScopeFilter =
  | "all"
  | "region"
  | "tagged"
  | "government"
  | "internal";

const GOV_FILTER_OPTIONS: FilterOption<TaskScopeFilter>[] = [
  { id: "all", label: "Semua" },
  { id: "region", label: "Wilayah Sekitar" },
  { id: "tagged", label: "Ditandai @tag" },
];

const INTERNAL_FILTER_OPTIONS: FilterOption<TaskScopeFilter>[] = [
  { id: "all", label: "Semua" },
  { id: "government", label: "Pemerintah" },
  { id: "internal", label: "Internal" },
];

export function filterTasksList(
  posts: Post[],
  people: Person[],
  user: Person | null | undefined,
  {
    query,
    scopeFilter,
    statusTab,
  }: {
    query: string;
    scopeFilter: TaskScopeFilter;
    statusTab: ReportStatusTab;
  },
): Post[] {
  if (!user || (user.role !== "GOVERNMENT" && user.role !== "INTERNAL")) {
    return [];
  }

  const isInternalGod = user.role === "INTERNAL";

  return posts
    .filter((post) => {
      if (post.isDeleted || post.hidden || post.kind !== "report") {
        return false;
      }

      if (isInternalGod) {
        if (
          (scopeFilter === "government" || scopeFilter === "internal") &&
          !matchesReportAuthority(post, scopeFilter, people)
        ) {
          return false;
        }
      } else {
        const isTagged = post.agencyKeys.includes(user.localKey);
        const inRegion = matchesJurisdiction(
          post.locationName || post.content,
          post.province,
          user.region || "Indonesia",
        );
        if (scopeFilter === "tagged" && !isTagged) return false;
        if (scopeFilter === "region" && !inRegion) return false;
        if (scopeFilter === "all" && !isTagged && !inRegion) return false;
      }

      return (
        matchesReportSearch(post, query, people) &&
        matchesReportStatusTab(post, statusTab)
      );
    })
    .sort((a, b) => b.postedAt - a.postedAt);
}

export function TasksView() {
  const { user, posts, people } = useDemo();
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<TaskScopeFilter>("all");
  const [statusTab, setStatusTab] = useState<ReportStatusTab>("all");

  const hasAccess =
    user?.role === "GOVERNMENT" || user?.role === "INTERNAL";
  const isInternal = user?.role === "INTERNAL";

  const baseReports = useMemo(
    () =>
      filterTasksList(posts, people, user, {
        query,
        scopeFilter,
        statusTab: "all",
      }),
    [posts, people, user, query, scopeFilter],
  );

  const scopeNote = isInternal
    ? `Mode Internal · Akses penuh seluruh wilayah (${baseReports.length} laporan)`
    : `Cakupan wilayah: ${user?.region || "Indonesia"} · ${baseReports.length} tugas`;

  return (
    <ProductShell
      title="Tugas"
      active="tugas"
      documentTitle={
        query.trim()
          ? formatSearchTitle(query, "Tugas")
          : formatPageTitle("Tugas")
      }
    >
      {!hasAccess ? (
        <section className="feed-surface">
          <div className="empty-state">
            <h2>Akses terbatas</h2>
            <p>
              Halaman tugas hanya tersedia untuk instansi pemerintah dan tim
              internal. Laporan publik dapat dilihat di halaman Laporan.
            </p>
            <Link href="/laporan" className="button button--secondary">
              Lihat semua laporan →
            </Link>
          </div>
        </section>
      ) : (
        <ReportDirectoryShell<TaskScopeFilter>
          baseReports={baseReports}
          query={query}
          onQueryChange={setQuery}
          filterValue={scopeFilter}
          onFilterChange={setScopeFilter}
          filterOptions={isInternal ? INTERNAL_FILTER_OPTIONS : GOV_FILTER_OPTIONS}
          filterAriaLabel={
            isInternal ? "Filter pihak penangan" : "Filter cakupan tugas"
          }
          searchPlaceholder="Cari tugas laporan..."
          statusTab={statusTab}
          onStatusTabChange={setStatusTab}
          scopeNote={scopeNote}
          emptyTitle="Tidak ada tugas ditemukan"
          emptyFilteredMessage="Coba ubah kata kunci pencarian atau filter tugas."
          emptyIdleMessage="Belum ada laporan dalam cakupan tugas instansi saat ini."
        />
      )}
    </ProductShell>
  );
}
