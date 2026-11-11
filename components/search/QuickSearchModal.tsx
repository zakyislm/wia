"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  TrendingUp,
  History,
  X,
  ArrowRight,
  Tag as TagIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useDemo } from "@/features/auth/DemoProvider";
import { defaultTopics } from "@/components/selectors/TopicSelectorModal";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

import type { Person, Post, Topic } from "@/types/models";

export function filterQuickSearchPeople(
  people: Person[],
  rawQuery: string,
): Person[] {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) return [];
  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).trim();
    if (!handle) return people;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(handle) ||
        p.username.toLowerCase().includes(handle) ||
        `@${p.username.toLowerCase()}`.includes(trimmed),
    );
  }
  return people.filter(
    (p) =>
      p.name.toLowerCase().includes(trimmed) ||
      p.username.toLowerCase().includes(trimmed) ||
      p.bio.toLowerCase().includes(trimmed),
  );
}

export function filterQuickSearchTopics(
  topics: Topic[],
  rawQuery: string,
): Topic[] {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed || trimmed.startsWith("@")) return [];
  return topics.filter(
    (t) =>
      t.name.toLowerCase().includes(trimmed) ||
      t.slug.toLowerCase().includes(trimmed),
  );
}

export function filterQuickSearchPosts(
  posts: Post[],
  people: Person[],
  rawQuery: string,
): Post[] {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) return [];
  const valid = posts.filter((p) => !p.isDeleted && !p.hidden);
  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).trim();
    if (!handle) return [];
    const matchingAuthorKeys = new Set(
      people
        .filter(
          (p) =>
            p.username.toLowerCase().includes(handle) ||
            p.name.toLowerCase().includes(handle),
        )
        .map((p) => p.localKey),
    );
    return valid
      .filter(
        (p) =>
          p.content.toLowerCase().includes(trimmed) ||
          (!p.anonymous && matchingAuthorKeys.has(p.authorKey)),
      )
      .slice(0, 4);
  }
  return valid
    .filter((p) => p.content.toLowerCase().includes(trimmed))
    .slice(0, 4);
}

const initialTrending = [
  { label: "Bencana & Darurat", href: "/explore/topics/bencana-darurat" },
  { label: "Infrastruktur", href: "/explore/topics/infrastruktur" },
  { label: "Trotoar yang aman untuk semua", href: "/posts/trotoar-merdeka" },
  { label: "Komunitas Kota Kita", href: "/explore/topics/komunitas" },
  { label: "Ruang kecil, perubahan besar", href: "/posts/ruang-kecil" },
];

export function SearchTriggerButton({
  onClick,
  className = "",
  query = "",
  placeholder = "Cari di Kavi",
}: {
  onClick?: () => void;
  className?: string;
  query?: string;
  placeholder?: string;
}) {
  const trimmed = query.trim();
  return (
    <button
      type="button"
      className={`search-box search-box-trigger ${trimmed ? "has-query" : ""} ${className}`.trim()}
      onClick={onClick}
      aria-label={placeholder}
    >
      <div className="search-box-left">
        <Search size={16} />
        <span className={trimmed ? "search-box-query" : ""}>
          {trimmed || placeholder}
        </span>
      </div>
    </button>
  );
}

const defaultHistory = [
  "#Kebersihan",
  "Trotoar Rusak Bandung",
];

export function QuickSearchModal({
  isOpen,
  onClose,
  initialQuery = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const router = useRouter();
  const { people, posts } = useDemo();
  const [query, setQuery] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>(defaultHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  function removeHistoryItem(item: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = history.filter((h) => h !== item);
    setHistory(updated);
  }

  function addHistoryItem(item: string) {
    const trimmed = item.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, 6);
    setHistory(updated);
  }

  function handleSearchSubmit(searchVal: string) {
    if (!searchVal.trim()) return;
    addHistoryItem(searchVal);
    onClose();
    router.push(`/explore?q=${encodeURIComponent(searchVal.trim())}`);
  }

  // Filtered results when user types (debounced)
  const debouncedQuery = useDebouncedValue(query, 250);
  const activeFilterQuery = query === "" ? "" : debouncedQuery;

  const filteredPeople = useMemo(
    () => filterQuickSearchPeople(people, activeFilterQuery),
    [people, activeFilterQuery],
  );

  const filteredTopics = useMemo(
    () => filterQuickSearchTopics(defaultTopics, activeFilterQuery),
    [activeFilterQuery],
  );

  const filteredPosts = useMemo(
    () => filterQuickSearchPosts(posts, people, activeFilterQuery),
    [posts, people, activeFilterQuery],
  );

  if (!isOpen) return null;

  return (
    <Dialog
      title="Pencarian Cepat"
      onClose={onClose}
      hideHeader
      className="quick-search-modal"
    >
      <div className="quick-search-container">
        {/* Fixed Top Search Bar (Height 56px) */}
        <div
          className="quick-search-header"
          onClick={() => inputRef.current?.focus()}
        >
          <Search size={20} className="quick-search-icon" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            className="quick-search-input"
            placeholder="Cari warga, topik, atau cerita..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchSubmit(query);
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className="quick-search-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Hapus kata kunci"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* Fixed Profile Suggestions Bar (NOT inside vertical scroll, never cut in half) */}
        {!query.trim() && (
          <div className="quick-search-people-bar">
            {people.slice(0, 8).map((person) => (
              <button
                key={person.localKey}
                type="button"
                className="quick-search-person-card"
                onClick={() => {
                  addHistoryItem(person.name);
                  onClose();
                  router.push(`/profile/${person.localKey}`);
                }}
              >
                <Avatar name={person.name} src={person.image} />
                <span className="quick-search-person-name">
                  {person.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Dedicated Scroll Area for Trending / History or Search Results */}
        <div className="quick-search-scroll-area">
          {!query.trim() ? (
            <div className="quick-search-list">
              {initialTrending.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="quick-search-item"
                  onClick={() => {
                    addHistoryItem(item.label);
                    onClose();
                    router.push(item.href);
                  }}
                >
                  <div className="quick-search-item-left">
                    <span className="quick-search-badge-icon">
                      <TrendingUp size={15} />
                    </span>
                    <span className="quick-search-item-text">{item.label}</span>
                  </div>
                </button>
              ))}

              {history.map((hist) => (
                <div
                  key={hist}
                  className="quick-search-item quick-search-item-history"
                  onClick={() => handleSearchSubmit(hist)}
                >
                  <div className="quick-search-item-left">
                    <span className="quick-search-badge-icon muted">
                      <History size={15} />
                    </span>
                    <span className="quick-search-item-text">{hist}</span>
                  </div>
                  <button
                    type="button"
                    className="quick-search-remove-btn"
                    onClick={(e) => removeHistoryItem(hist, e)}
                    aria-label="Hapus dari riwayat"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Results when query is typed */
            <div className="quick-search-results">
              {filteredPeople.length > 0 && (
                <div className="quick-search-section">
                  <span className="quick-search-section-label">Warga &amp; Instansi</span>
                  {filteredPeople
                    .slice(0, query.trim().startsWith("@") ? 8 : 3)
                    .map((person) => (
                      <button
                        key={person.localKey}
                        type="button"
                        className="quick-search-result-row"
                        onClick={() => {
                          addHistoryItem(person.name);
                          onClose();
                          router.push(`/profile/${person.localKey}`);
                        }}
                      >
                        <Avatar name={person.name} src={person.image} />
                        <div className="quick-search-user-info">
                          <strong>
                            {person.name}
                            <VerifiedBadge role={person.role} size={15} />
                          </strong>
                          <small>@{person.username}</small>
                        </div>
                      </button>
                    ))}
                </div>
              )}

              {filteredTopics.length > 0 && (
                <div className="quick-search-section">
                  <span className="quick-search-section-label">Topik Makro</span>
                  {filteredTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className="quick-search-result-row"
                      onClick={() => {
                        addHistoryItem(topic.name);
                        onClose();
                        router.push(`/explore/topics/${topic.slug}`);
                      }}
                    >
                      <TagIcon size={16} className="muted" />
                      <span>{topic.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredPosts.length > 0 && (
                <div className="quick-search-section">
                  <span className="quick-search-section-label">Postingan &amp; Isu</span>
                  {filteredPosts.map((post) => (
                    <button
                      key={post.localKey}
                      type="button"
                      className="quick-search-result-row"
                      onClick={() => {
                        onClose();
                        router.push(`/posts/${post.localKey}`);
                      }}
                    >
                      <div className="quick-search-post-snippet">
                        <strong>{post.content.split("\n\n")[0]}</strong>
                        <small className="muted">{post.province || "Nasional"}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredPeople.length === 0 &&
                filteredTopics.length === 0 &&
                filteredPosts.length === 0 && (
                  <p className="small muted profile-search-empty-note">
                    Tidak ada hasil untuk &ldquo;{query.trim()}&rdquo;.
                  </p>
                )}
            </div>
          )}
        </div>

        {query.trim() && (
          <button
            type="button"
            className="quick-search-submit-row"
            onClick={() => handleSearchSubmit(query)}
          >
            <span>Cari &ldquo;{query.trim()}&rdquo; di Jelajah</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </Dialog>
  );
}
