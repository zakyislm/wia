"use client";
import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

const DEFAULT_TAGS = [
  "TrotoarRusak",
  "Bandung",
  "PejalanKaki",
  "RuangPublik",
  "Kebersihan",
  "AksesAman",
  "LampuJalan",
  "FasilitasPublik",
  "TransportasiUmum",
  "HalteBus",
  "Lingkungan",
  "RuangTerbukaHijau",
  "PelayananPublik",
  "Warga",
  "KotaKita",
];

interface InlineTokenSuggestProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (nextValue: string, nextCursorPos: number) => void;
}

interface ActiveToken {
  trigger: "#" | "@";
  query: string;
  startIndex: number;
  endIndex: number;
  top: number;
  left: number;
}

function getTokenCaretCoords(
  el: HTMLTextAreaElement,
  textBeforeToken: string,
  tokenStr: string,
): { top: number; left: number } {
  const style = window.getComputedStyle(el);
  const mirror = document.createElement("div");
  mirror.style.position = "fixed";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.top = "-9999px";
  mirror.style.left = "-9999px";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.width = `${el.clientWidth}px`;
  mirror.style.font = style.font;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.padding = style.padding;

  const textNode = document.createTextNode(textBeforeToken);
  const span = document.createElement("span");
  span.textContent = tokenStr || "#";

  mirror.appendChild(textNode);
  mirror.appendChild(span);
  document.body.appendChild(mirror);

  const offsetParent =
    (el.closest(".composer-main-col, .comment-composer-active") as HTMLElement | null) ??
    (el.offsetParent as HTMLElement | null) ??
    el.parentElement;
  const elRect = el.getBoundingClientRect();
  const parentRect = offsetParent ? offsetParent.getBoundingClientRect() : elRect;
  const relTop = elRect.top - parentRect.top;
  const relLeft = elRect.left - parentRect.left;

  const lineHeight = parseFloat(style.lineHeight) || 22;
  const top = relTop + span.offsetTop - el.scrollTop + lineHeight + 2;
  const popoverWidth = 220;
  const rawLeft = relLeft + span.offsetLeft;
  const maxLeft = Math.max(0, relLeft + el.clientWidth - popoverWidth);
  const left = Math.max(0, Math.min(rawLeft, maxLeft));

  document.body.removeChild(mirror);
  return { top, left };
}

export function InlineTokenSuggest({
  value,
  textareaRef,
  onInsert,
}: InlineTokenSuggestProps) {
  const { posts, people } = useDemo();
  const [debouncedToken, setDebouncedToken] = useState<ActiveToken | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = textareaRef.current;
      if (!el || document.activeElement !== el) {
        setDebouncedToken(null);
        return;
      }
      const cursor = el.selectionStart ?? value.length;
      const beforeCursor = value.slice(0, cursor);
      const match = beforeCursor.match(/(?:^|\s)([#@])([a-zA-Z0-9_]*)$/);
      if (!match) {
        setDebouncedToken(null);
        return;
      }
      const trigger = match[1] as "#" | "@";
      const query = match[2] || "";
      const startIndex = cursor - query.length - 1;
      const coords = getTokenCaretCoords(
        el,
        value.slice(0, startIndex),
        `${trigger}${query}`,
      );
      setDebouncedToken({
        trigger,
        query,
        startIndex,
        endIndex: cursor,
        top: coords.top,
        left: coords.left,
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [value, textareaRef]);

  const allTags = useMemo(() => {
    const set = new Set<string>(DEFAULT_TAGS);
    posts.forEach((p) => {
      if (p.isDeleted) return;
      p.tags?.forEach((t) => {
        const clean = t.replace(/^#/, "").trim();
        if (clean) set.add(clean);
      });
    });
    return Array.from(set);
  }, [posts]);

  const matchingTags = useMemo(() => {
    if (!debouncedToken || debouncedToken.trigger !== "#") return [];
    const q = debouncedToken.query.toLowerCase();
    return allTags
      .filter((tag) => tag.toLowerCase().includes(q))
      .slice(0, 5);
  }, [allTags, debouncedToken]);

  const matchingPeople = useMemo(() => {
    if (!debouncedToken || debouncedToken.trigger !== "@") return [];
    const q = debouncedToken.query.toLowerCase();
    return people
      .filter(
        (p) =>
          p.username.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [people, debouncedToken]);

  if (!debouncedToken) return null;

  function applyToken(tokenText: string) {
    if (!debouncedToken) return;
    const prefix = value.slice(0, debouncedToken.startIndex);
    const suffix = value.slice(debouncedToken.endIndex);
    const inserted = `${debouncedToken.trigger}${tokenText} `;
    const nextValue = prefix + inserted + suffix;
    const nextCursor = prefix.length + inserted.length;
    setDebouncedToken(null);
    onInsert(nextValue, nextCursor);
  }

  const popoverStyle: React.CSSProperties = {
    position: "absolute",
    top: `${debouncedToken.top}px`,
    left: `${debouncedToken.left}px`,
  };

  if (debouncedToken.trigger === "#") {
    const q = debouncedToken.query.trim();
    const hasExact = matchingTags.some(
      (t) => t.toLowerCase() === q.toLowerCase(),
    );
    if (!q && matchingTags.length === 0) return null;

    return (
      <div
        className="inline-token-popover"
        style={popoverStyle}
        role="listbox"
        aria-label="Saran tag"
      >
        {q && !hasExact && (
          <button
            type="button"
            className="inline-token-item inline-token-item--new"
            onMouseDown={(e) => {
              e.preventDefault();
              applyToken(q);
            }}
          >
            <span className="inline-token-main">#{q}</span>
            <span className="inline-token-sub">+ Tag topik baru</span>
          </button>
        )}
        {matchingTags.map((tag) => (
          <button
            type="button"
            key={tag}
            className="inline-token-item"
            onMouseDown={(e) => {
              e.preventDefault();
              applyToken(tag);
            }}
          >
            <span className="inline-token-main">#{tag}</span>
          </button>
        ))}
      </div>
    );
  }

  if (debouncedToken.trigger === "@") {
    if (matchingPeople.length === 0) return null;
    return (
      <div
        className="inline-token-popover"
        style={popoverStyle}
        role="listbox"
        aria-label="Saran akun"
      >
        {matchingPeople.map((person) => (
          <button
            type="button"
            key={person.localKey}
            className="inline-token-item inline-token-item--person"
            onMouseDown={(e) => {
              e.preventDefault();
              applyToken(person.username);
            }}
          >
            <Avatar name={person.name} src={person.image} />
            <div className="inline-token-person-meta">
              <span className="inline-token-main">
                {person.name}
                <VerifiedBadge role={person.role} size={14} />
              </span>
              <span className="inline-token-sub">@{person.username}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return null;
}
