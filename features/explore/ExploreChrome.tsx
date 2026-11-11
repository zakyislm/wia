"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchModal } from "@/components/layout/ProductShell";
import {
  QuickSearchModal,
  SearchTriggerButton,
} from "@/components/search/QuickSearchModal";
import { defaultTopics } from "@/components/selectors/TopicSelectorModal";

/** Horizontal scrollable topic bar shared across /explore and /explore/topics/[slug]. */
export function ExploreTopicsBar({ activeSlug }: { activeSlug?: string }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  useEffect(() => {
    if (!activeSlug || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector<HTMLElement>(
      `[data-topic-slug="${activeSlug}"]`,
    );
    activeEl?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [activeSlug]);

  const handlePillClick = (href: string) => {
    if (hasMovedRef.current) return;
    router.push(href);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !scrollRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || e.buttons !== 1 || !scrollRef.current) {
      isDraggingRef.current = false;
      return;
    }
    const diff = e.clientX - startXRef.current;
    if (Math.abs(diff) > 5) {
      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
      }
      scrollRef.current.scrollLeft = scrollLeftRef.current - diff;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {}
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 60);
  };

  const scrollByAmount = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div className="explore-pills-wrapper">
      {canScrollLeft && (
        <div className="explore-fade-edge left">
          <button
            type="button"
            className="explore-nav-arrow"
            onClick={() => scrollByAmount(-200)}
            aria-label="Geser ke kiri"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
        </div>
      )}

      <div
        className="explore-pills-scroll"
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <button
          type="button"
          className={`explore-pill ${!activeSlug ? "active" : "inactive"}`}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onClick={() => handlePillClick("/explore")}
        >
          Jelajah
        </button>
        {defaultTopics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            data-topic-slug={topic.slug}
            className={`explore-pill ${activeSlug === topic.slug ? "active" : "inactive"}`}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={() => handlePillClick(`/explore/topics/${topic.slug}`)}
          >
            {topic.name}
          </button>
        ))}
      </div>

      {canScrollRight && (
        <div className="explore-fade-edge right">
          <button
            type="button"
            className="explore-nav-arrow"
            onClick={() => scrollByAmount(200)}
            aria-label="Geser ke kanan"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Inline search trigger shown when right sidebar is hidden (<= 1023px) or query is active. */
export function ExploreSearchBar({ query }: { query?: string }) {
  const searchCtx = useSearchModal();
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const activeQuery = (query ?? searchCtx?.query ?? "").trim();

  return (
    <div className="explore-inline-search-wrapper">
      <SearchTriggerButton
        className="explore-inline-search-btn"
        query={activeQuery}
        onClick={() =>
          searchCtx ? searchCtx.openSearch() : setFallbackOpen(true)
        }
      />
      {!searchCtx && (
        <QuickSearchModal
          isOpen={fallbackOpen}
          initialQuery={activeQuery}
          onClose={() => setFallbackOpen(false)}
        />
      )}
    </div>
  );
}
