"use client";
import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { PostCard } from "@/features/posts/PostCard";
import { defaultTopics } from "@/components/selectors/TopicSelectorModal";

const fallbackThumbnails = [
  "/footer-landscape.jpg",
  "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=360&auto=format&fit=crop",
  "/chalkboard.jpg",
];

const allPillTopics = [
  ...defaultTopics.map((t) => ({
    id: t.id,
    name: t.name,
    href: `/topics/${t.slug}`,
  })),
  {
    id: "top_transportasi",
    name: "Transportasi",
    href: "/explore?q=%23TransportasiUmum",
  },
  {
    id: "top_kebersihan",
    name: "Kebersihan",
    href: "/explore?q=%23Kebersihan",
  },
  {
    id: "top_fasilitas",
    name: "Fasilitas Publik",
    href: "/explore?q=%23FasilitasPublik",
  },
  {
    id: "top_keamanan",
    name: "Keselamatan Warga",
    href: "/explore?q=%23KeselamatanWarga",
  },
  {
    id: "top_tatakota",
    name: "Tata Kota",
    href: "/explore?q=%23TataKota",
  },
];

const trendingTopics = [
  {
    category: "Trending di Indonesia",
    topic: "#Jokowi",
    count: "48,2 rb postingan",
    query: "#Jokowi",
  },
  {
    category: "Trending di Jawa Barat",
    topic: "#TrotoarRusak",
    count: "14,1 rb postingan",
    query: "#TrotoarRusak",
  },
  {
    category: "Trending di DKI Jakarta",
    topic: "#IndonesiaMaju",
    count: "9.350 postingan",
    query: "#IndonesiaMaju",
  },
  {
    category: "Trending di Kota Bandung",
    topic: "#AksesAman",
    count: "6.120 postingan",
    query: "#AksesAman",
  },
  {
    category: "Trending di Sukajadi",
    topic: "#Kebersihan",
    count: "5.410 postingan",
    query: "#Kebersihan",
  },
  {
    category: "Trending di Pulau Jawa",
    topic: "#RuangTerbukaHijau",
    count: "3.240 postingan",
    query: "#RuangTerbukaHijau",
  },
];

function formatNewsTitle(content: string) {
  const line = content.split("\n\n")[0]?.trim() || "Kabar Isu Publik";
  const match = line.match(/^([^,.]+[,.]?)\s*(.*)$/);
  if (match && match[1] && match[2]) {
    return (
      <>
        <strong>{match[1]}</strong> {match[2]}
      </>
    );
  }
  const words = line.split(" ");
  if (words.length > 2) {
    return (
      <>
        <strong>{words.slice(0, 2).join(" ")}</strong> {words.slice(2).join(" ")}
      </>
    );
  }
  return <strong>{line}</strong>;
}

export function ExploreView() {
  const { posts } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const handlePillClick = (href: string) => {
    if (hasMovedRef.current) return;
    router.push(href);
  };

  // Topic pills drag & scroll state
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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !scrollRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    // Note: Do NOT setPointerCapture on pointerdown, otherwise child <button> onClick will be swallowed!
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Only scroll when user is actually pressing and holding mouse button (e.buttons === 1)
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
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  // 1. News of the day items (top 3 posts in list format)
  const newsItems = useMemo(() => {
    const validPosts = posts.filter((p) => !p.isDeleted && !p.hidden);
    return validPosts.slice(0, 3).map((post, idx) => {
      const img =
        post.images && post.images.length > 0
          ? post.images[0]
          : fallbackThumbnails[idx % fallbackThumbnails.length];
      return {
        post,
        image: img,
      };
    });
  }, [posts]);

  // 2. Feed posts (either filtered by query or all posts like home)
  const feedPosts = useMemo(() => {
    const valid = posts.filter((p) => !p.isDeleted && !p.hidden);
    if (!queryParam.trim()) {
      return valid;
    }
    const q = queryParam.trim().toLowerCase();
    const cleanQ = q.replace(/^#/, "");
    return valid.filter((p) => {
      const matchContent = p.content.toLowerCase().includes(q);
      const matchCategory = p.category?.toLowerCase().includes(cleanQ);
      const matchTags = p.tags?.some(
        (t) =>
          t.toLowerCase().includes(cleanQ) ||
          `#${t.toLowerCase()}`.includes(q),
      );
      return matchContent || matchCategory || matchTags;
    });
  }, [posts, queryParam]);

  return (
    <ProductShell active="explore" hideHeader>
      <section className="feed-surface explore-surface">
        {/* Horizontal Topic Pill Buttons (Substack-style Drag & Scroll) */}
        <div className="explore-pills-wrapper">
          {/* Left Fade & Navigation Arrow */}
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
              className="explore-pill active"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onClick={() => handlePillClick("/explore")}
            >
              Explore
            </button>
            {allPillTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="explore-pill inactive"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onClick={() => handlePillClick(topic.href)}
              >
                {topic.name}
              </button>
            ))}
          </div>

          {/* Right Fade & Navigation Arrow */}
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

        {/* If no search query active, display News of the day & Trending */}
        {!queryParam ? (
          <>
            {/* News of the Day (List format with right thumbnail) */}
            <section className="explore-section">
              <div className="explore-section-header">
                <h2 className="explore-section-title">News of the day</h2>
              </div>
              <div className="explore-news-list">
                {newsItems.map(({ post, image }) => (
                  <Link
                    key={post.localKey}
                    href={`/posts/${post.localKey}`}
                    className="explore-news-item"
                  >
                    <div className="explore-news-text">
                      <p className="explore-news-headline">
                        {formatNewsTitle(post.content)}
                      </p>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                      className="explore-news-thumb"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/footer-landscape.jpg";
                      }}
                    />
                  </Link>
                ))}
              </div>
            </section>

            {/* Trending Section (Twitter/X style) */}
            <section className="explore-section">
              <div className="explore-section-header">
                <h2 className="explore-section-title">Highlight</h2>
              </div>
              <div className="explore-trending-list">
                {trendingTopics.map((trend, idx) => (
                  <Link
                    key={idx}
                    href={`/explore?q=${encodeURIComponent(trend.query)}`}
                    className="explore-trending-item"
                  >
                    <div className="explore-trending-content">
                      <span className="explore-trending-category">
                        {trend.category}
                      </span>
                      <strong className="explore-trending-topic">
                        {trend.topic}
                      </strong>
                      <span className="explore-trending-count">
                        {trend.count}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="explore-trending-more-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      aria-label="Opsi tren"
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* Search Results Filter Banner */
          <div className="explore-feed-header">
            <span className="explore-feed-title">
              Hasil untuk &ldquo;{queryParam}&rdquo; ({feedPosts.length})
            </span>
            <Link href="/explore" className="explore-feed-reset">
              Tampilkan semua
            </Link>
          </div>
        )}

        {/* Regular Random / Timeline Feed */}
        <section className="explore-feed-section" aria-label="Feed Jelajah">
          {feedPosts.map((post) => (
            <PostCard key={post.localKey} post={post} />
          ))}

          {feedPosts.length === 0 && (
            <div className="empty-state">
              <h2>Tidak ada postingan ditemukan</h2>
              <p>Coba gunakan kata kunci lain atau lihat semua postingan.</p>
              <Link href="/explore" className="button button--secondary">
                Lihat semua postingan
              </Link>
            </div>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
