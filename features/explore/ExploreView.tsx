"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { PostCard } from "@/features/posts/PostCard";
import { filterQuickSearchPeople } from "@/components/search/QuickSearchModal";
import {
  ExploreTopicsBar,
  ExploreSearchBar,
} from "@/features/explore/ExploreChrome";

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

export function ExploreView() {
  const { people, posts } = useDemo();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const matchedPeople = useMemo(
    () => filterQuickSearchPeople(people, queryParam),
    [people, queryParam],
  );

  const feedPosts = useMemo(() => {
    const valid = posts.filter((p) => !p.isDeleted && !p.hidden);
    if (!queryParam.trim()) {
      return valid;
    }
    const q = queryParam.trim().toLowerCase();
    const cleanQ = q.replace(/^[@#]/, "");
    const matchingAuthorKeys = new Set(matchedPeople.map((p) => p.localKey));
    return valid.filter((p) => {
      if (q.startsWith("@")) {
        const displayedPeople = useMemo(
    () => (queryParam.trim() ? matchedPeople.slice(0, 6) : []),
    [queryParam, matchedPeople],
  );

  return (
          p.content.toLowerCase().includes(q) ||
          (!p.anonymous && matchingAuthorKeys.has(p.authorKey))
        );
      }
      const matchContent = p.content.toLowerCase().includes(q);
      const matchCategory = p.category?.toLowerCase().includes(cleanQ);
      const matchTags = p.tags?.some(
        (t) =>
          t.toLowerCase().includes(cleanQ) ||
          `#${t.toLowerCase()}`.includes(q),
      );
      return matchContent || matchCategory || matchTags;
    });
  }, [posts, queryParam, matchedPeople]);

  const displayedPeople = useMemo(
    () => (queryParam.trim() ? matchedPeople.slice(0, 6) : []),
    [queryParam, matchedPeople],
  );

  return (
    <ProductShell active="explore" hideHeader searchQuery={queryParam}>
      <section className="feed-surface explore-surface">
        <ExploreSearchBar query={queryParam} />
        <ExploreTopicsBar />

        {!queryParam ? (
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
                      <MoreHorizontal size={20} />
                    </button>
                  </Link>
                ))}
              </div>
            </section>
        ) : (
          <div className="explore-feed-header">
            <span className="explore-feed-title">
              Hasil untuk &ldquo;{queryParam}&rdquo; (
              {feedPosts.length + displayedPeople.length})
            </span>
            <Link href="/explore" className="explore-feed-reset">
              Tampilkan semua
            </Link>
          </div>
        )}

        <section className="explore-feed-section" aria-label="Feed Jelajah">
          {displayedPeople.length > 0 && (
            <div className="explore-people-results">
              {displayedPeople.map((person) => (
                <Link
                  key={person.localKey}
                  href={`/profile/${person.localKey}`}
                  className="explore-person-row"
                >
                  <Avatar name={person.name} src={person.image} />
                  <div className="quick-search-user-info">
                    <strong>
                      {person.name}
                      <VerifiedBadge role={person.role} size={15} />
                    </strong>
                    <small>@{person.username}</small>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {feedPosts.map((post) => (
            <PostCard key={post.localKey} post={post} />
          ))}

          {feedPosts.length === 0 && displayedPeople.length === 0 && (
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
