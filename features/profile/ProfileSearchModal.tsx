"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import { formatDraftTime } from "@/features/posts/draftsStorage";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { Person, Post, Reply } from "@/types/models";

export interface ProfileSearchMatches {
  posts: Post[];
  replies: Array<{ reply: Reply; post: Post }>;
}

/** Pick single-line snippet ensuring an active search match stays visible before truncation. */
export function buildMatchSnippet(
  primaryText: string,
  extraFields: string[],
  rawQuery: string,
  fallback: string,
): string {
  const cleanFirstLine = primaryText.split("\n\n")[0]?.replace(/\s+/g, " ").trim() ?? "";
  const fullNormalized = primaryText.replace(/\s+/g, " ").trim();
  const base = cleanFirstLine || fullNormalized || fallback;
  const cleanQuery = rawQuery.trim().toLowerCase();
  if (!cleanQuery) return base;

  const firstIdx = cleanFirstLine.toLowerCase().indexOf(cleanQuery);
  if (firstIdx !== -1) {
    return firstIdx > 36
      ? `...${cleanFirstLine.slice(Math.max(0, firstIdx - 16))}`
      : cleanFirstLine;
  }

  const fullIdx = fullNormalized.toLowerCase().indexOf(cleanQuery);
  if (fullIdx !== -1) {
    return fullIdx > 24
      ? `...${fullNormalized.slice(Math.max(0, fullIdx - 16))}`
      : fullNormalized;
  }

  const matchedExtra = extraFields.find(
    (field) => field && field.toLowerCase().includes(cleanQuery),
  );
  return matchedExtra ? `${matchedExtra} · ${base}` : base;
}

/** Split text into plain and matched segments case-insensitively without RegExp escaping issues. */
export function splitMatchSegments(
  text: string,
  rawQuery: string,
): Array<{ text: string; matched: boolean }> {
  const cleanQuery = rawQuery.trim();
  if (!cleanQuery || !text) return [{ text, matched: false }];

  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const segments: Array<{ text: string; matched: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      segments.push({ text: text.slice(cursor), matched: false });
      break;
    }
    if (idx > cursor) {
      segments.push({ text: text.slice(cursor, idx), matched: false });
    }
    segments.push({
      text: text.slice(idx, idx + cleanQuery.length),
      matched: true,
    });
    cursor = idx + cleanQuery.length;
  }

  return segments;
}

function HighlightedHeadline({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return <strong className="composer-draft-headline">{text}</strong>;
  }
  const segments = splitMatchSegments(text, cleanQuery);
  return (
    <span className="composer-draft-headline profile-search-headline--searching">
      {segments.map((seg, idx) =>
        seg.matched ? (
          <mark key={idx} className="profile-search-match">
            {seg.text}
          </mark>
        ) : (
          <span key={idx}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

function ProfileSearchResultItem({
  person,
  anonymous,
  headline,
  query,
  postedAt,
  onClick,
}: {
  person: Person;
  anonymous?: boolean;
  headline: string;
  query: string;
  postedAt: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="composer-draft-item profile-search-draft-item"
      onClick={onClick}
    >
      <div className="composer-draft-avatar-col">
        {anonymous ? (
          <Avatar name="Anonim" />
        ) : (
          <Avatar name={person.name} src={person.image} />
        )}
      </div>
      <div className="composer-draft-content-col">
        <HighlightedHeadline text={headline} query={query} />
        <span className="composer-draft-timestamp">
          {formatDraftTime(postedAt, "Diposting pada")}
        </span>
      </div>
    </button>
  );
}

export function matchesProfilePostQuery(post: Post, cleanLowerQuery: string): boolean {
  if (!cleanLowerQuery) return true;
  const tagsStr = post.tags?.map((t) => `#${t} ${t}`).join(" ") ?? "";
  return `${post.content} ${tagsStr} ${post.topicName ?? post.category} ${post.locationName ?? ""} ${post.province}`
    .toLowerCase()
    .includes(cleanLowerQuery);
}

export function matchesProfileReplyQuery(
  reply: Reply,
  post: Post,
  cleanLowerQuery: string,
): boolean {
  if (!cleanLowerQuery) return true;
  return `${reply.content} ${reply.location ?? ""} ${post.content}`
    .toLowerCase()
    .includes(cleanLowerQuery);
}

export function isReplyVisibleInProfileSearch(
  reply: Reply,
  post: Post,
  personKey: string,
  own: boolean,
): boolean {
  const isReplyAnon = Boolean(reply.anonymous) && !reply.is_action_taken;
  const isOwnAnonParent = post.anonymous && post.authorKey === personKey;
  return own || (!isReplyAnon && !isOwnAnonParent);
}

/** Search strictly inside one user's authored posts, reports, and comments (respecting anonymity). */
export function searchUserProfileContent(
  allPosts: Post[],
  person: Person | undefined,
  rawQuery: string,
  own: boolean,
): ProfileSearchMatches {
  if (!person) return { posts: [], replies: [] };
  const clean = rawQuery.trim().toLowerCase();

  const authoredPosts = allPosts.filter(
    (p) =>
      !p.isDeleted &&
      !p.hidden &&
      p.authorKey === person.localKey &&
      (!p.anonymous || own),
  );

  const authoredReplies: Array<{ reply: Reply; post: Post }> = [];
  for (const post of allPosts) {
    if (post.isDeleted || post.hidden) continue;
    for (const reply of post.replies) {
      if (reply.authorKey !== person.localKey) continue;
      if (!isReplyVisibleInProfileSearch(reply, post, person.localKey, own)) {
        continue;
      }
      authoredReplies.push({ reply, post });
    }
  }

  if (!clean) {
    return {
      posts: authoredPosts.slice(0, 4),
      replies: [],
    };
  }

  const matchedPosts = authoredPosts.filter((p) =>
    matchesProfilePostQuery(p, clean),
  );

  const matchedReplies = authoredReplies.filter(({ reply, post }) =>
    matchesProfileReplyQuery(reply, post, clean),
  );

  return {
    posts: matchedPosts.slice(0, 6),
    replies: matchedReplies.slice(0, 6),
  };
}

export function ProfileSearchModal({
  isOpen,
  onClose,
  person,
  own,
  posts,
  initialQuery = "",
  onApplyQuery,
}: {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  own: boolean;
  posts: Post[];
  initialQuery?: string;
  onApplyQuery: (query: string) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  const debouncedQuery = useDebouncedValue(query, 250);
  const activeFilterQuery = query === "" ? "" : debouncedQuery;

  const matches = useMemo(
    () => searchUserProfileContent(posts, person, activeFilterQuery, own),
    [posts, person, activeFilterQuery, own],
  );

  if (!isOpen) return null;

  const trimmed = query.trim();

  return (
    <Dialog
      title={`Cari di profil @${person.username}`}
      onClose={onClose}
      hideHeader
      className="quick-search-modal"
    >
      <div className="quick-search-container">
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
            placeholder={`Cari di @${person.username}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onApplyQuery(trimmed);
                onClose();
              }
            }}
          />
          {query && (
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
          )}
        </div>

        <div className="quick-search-scroll-area">
          {!trimmed ? (
            <div className="quick-search-results">
              {matches.posts.length > 0 ? (
                <div className="quick-search-section">
                  <span className="quick-search-section-label">
                    {own
                      ? `Terbaru dari @${person.username}`
                      : `Postingan publik @${person.username}`}
                  </span>
                  {matches.posts.map((post) => (
                    <ProfileSearchResultItem
                      key={post.localKey}
                      person={person}
                      anonymous={post.anonymous}
                      headline={buildMatchSnippet(
                        post.content,
                        [],
                        "",
                        "Postingan",
                      )}
                      query=""
                      postedAt={post.postedAt}
                      onClick={() => {
                        onClose();
                        router.push(`/posts/${post.localKey}`);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="small muted profile-search-empty-note">
                  {own
                    ? "Ketik kata kunci untuk mencari postingan, laporan, atau balasan di profil ini."
                    : `Belum ada postingan publik dari @${person.username}.`}
                </p>
              )}
            </div>
          ) : (
            <div className="quick-search-results">
              {matches.posts.length > 0 && (
                <div className="quick-search-section">
                  <span className="quick-search-section-label">
                    Postingan &amp; Laporan
                  </span>
                  {matches.posts.map((post) => {
                    const extraFields = [
                      ...(post.tags?.map((t) => `#${t}`) ?? []),
                      post.topicName ?? post.category,
                      post.locationName ?? "",
                      post.province ?? "",
                    ].filter(Boolean);
                    return (
                      <ProfileSearchResultItem
                        key={post.localKey}
                        person={person}
                        anonymous={post.anonymous}
                        headline={buildMatchSnippet(
                          post.content,
                          extraFields,
                          trimmed,
                          "Postingan",
                        )}
                        query={trimmed}
                        postedAt={post.postedAt}
                        onClick={() => {
                          onClose();
                          router.push(`/posts/${post.localKey}`);
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {matches.replies.length > 0 && (
                <div className="quick-search-section">
                  <span className="quick-search-section-label">
                    Balasan &amp; Respon
                  </span>
                  {matches.replies.map(({ reply, post }) => {
                    const isReplyAnon =
                      Boolean(reply.anonymous) && !reply.is_action_taken;
                    return (
                      <ProfileSearchResultItem
                        key={`${post.localKey}-${reply.localKey}`}
                        person={person}
                        anonymous={isReplyAnon}
                        headline={buildMatchSnippet(
                          reply.content,
                          [
                            reply.location ?? "",
                            post.content.split("\n\n")[0] ?? "",
                          ].filter(Boolean),
                          trimmed,
                          "Balasan",
                        )}
                        query={trimmed}
                        postedAt={reply.postedAt ?? post.postedAt}
                        onClick={() => {
                          onClose();
                          router.push(
                            `/posts/${post.localKey}#comment-${reply.localKey}`,
                          );
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {matches.posts.length === 0 && matches.replies.length === 0 && (
                <p className="small muted profile-search-empty-note">
                  Tidak ada hasil{" "}
                  {own ? "" : "non-anonim "}untuk &ldquo;{trimmed}&rdquo; di
                  profil @{person.username}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
