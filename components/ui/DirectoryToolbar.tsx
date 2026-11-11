"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";

export interface DirectoryToolbarOption<T extends string = string> {
  id: T;
  label: string;
}

export interface DirectoryToolbarTab<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

/** Shared search bar, filter popover, and segmented tabs for Laporan, Tugas, and Aktivitas. */
export function DirectoryToolbar<
  TFilter extends string = string,
  TTab extends string = string,
>({
  query,
  onQueryChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
  filterAriaLabel,
  tabs,
  activeTab,
  onTabChange,
  tabsAriaLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  filterValue: TFilter;
  onFilterChange: (value: TFilter) => void;
  filterOptions: readonly DirectoryToolbarOption<TFilter>[];
  filterAriaLabel: string;
  tabs: readonly DirectoryToolbarTab<TTab>[];
  activeTab: TTab;
  onTabChange: (tab: TTab) => void;
  tabsAriaLabel: string;
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

  const activeFilterLabel =
    filterOptions.find((opt) => opt.id === filterValue)?.label ??
    filterOptions[0]?.label ??
    "Semua";
  const defaultFilter = filterOptions[0]?.id;
  const hasActiveFilter =
    defaultFilter !== undefined && filterValue !== defaultFilter;

  return (
    <>
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
            className={`chat-compose-btn laporan-filter-btn ${hasActiveFilter ? "is-active" : ""}`.trim()}
            aria-label={`${filterAriaLabel}: ${activeFilterLabel}`}
            aria-haspopup="menu"
            aria-expanded={filterMenuOpen}
            title={`Filter: ${activeFilterLabel}`}
            onClick={() => setFilterMenuOpen((prev) => !prev)}
          >
            <SlidersHorizontal size={18} strokeWidth={1.8} />
            {hasActiveFilter && (
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
          aria-label={tabsAriaLabel}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`notif-segment-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="notif-count-badge">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
