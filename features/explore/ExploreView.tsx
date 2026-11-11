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
import { LazyLoadSentinel, useLazySlice } from "@/components/ui/LazyFeed";
import { filterQuickSearchPeople } from "@/components/search/QuickSearchModal";
import {
  ExploreTopicsBar,
  ExploreSearchBar,
} from "@/features/explore/ExploreChrome";

export function ExploreView() {
  const { people, posts, topics } = useDemo();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const matchedPeople = useMemo(
    () => filterQuickSearchPeople(people, queryParam),
    [people, queryParam],
  );

  // Sorotan fetched & aggregated directly from `topics` table in Turso DB
  const dynamicTrends = useMemo(() => {
    const activePosts = posts.filter((p) => !p.isDeleted && !p.hidden);

    return topics
      .map((topic) => {
        const matchingPosts = activePosts.filter(
          (p) =>
            p.topicId === topic.id ||
            p.category?.toLowerCase() === topic.name.toLowerCase(),
        );

        let interactions = 0;
        const provinceFreq = new Map<string, number>();

        for (const p of matchingPosts) {
          const eng =
            (p.upvotesCount || 0) +
            (p.downvotesCount || 0) +
            (p.replies?.length || 0) * 3;
          interactions += eng;
          const prov = (p.province || "Indonesia").trim();
          if (prov) {
            provinceFreq.set(prov, (provinceFreq.get(prov) || 0) + 1 + eng * 0.05);
          }
        }

        let topProvince = "Indonesia";
        let bestWeight = -1;
        for (const [prov, weight] of provinceFreq.entries()) {
          if (weight > bestWeight) {
            bestWeight = weight;
            topProvince = prov;
          }
        }

        const score =
          (topic.isTrending ? 50 : 0) +
          interactions +
          matchingPosts.length * 15;

        return {
          id: topic.id,
          category: `Ramai di ${topProvince}`,
          topic: topic.name,
          count: `${interactions} interaksi · ${matchingPosts.length} postingan`,
          query: topic.name,
          postCount: matchingPosts.length,
          score,
        };
      })
      .filter((t) => t.postCount > 0 || topics.length <= 6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [topics, posts]);

  const feedPosts = useMemo(() => {
    const nowMs = Date.now();
    const rankExplorePost = (p: (typeof posts)[number]) => {
      const heat =
        (p.upvotesCount || 0) * 2.5 +
        (p.downvotesCount || 0) +
        (p.replies?.length || 0) * 4 +
        (p.reposted ? 5 : 0);
      const ageHours = Math.max(0.5, (nowMs - p.postedAt) / (1000 * 60 * 60));
      const civicBoost = p.kind === "report" ? 1.25 : 1.0;
      return (heat * civicBoost) / Math.pow(ageHours + 3, 0.85);
    };

    const valid = posts
      .filter((p) => !p.isDeleted && !p.hidden)
      .sort((a, b) => rankExplorePost(b) - rankExplorePost(a));

    if (!queryParam.trim()) {
      return valid;
    }
    const q = queryParam.trim().toLowerCase();
    const cleanQ = q.replace(/^[@#]/, "");
    const matchingAuthorKeys = new Set(matchedPeople.map((p) => p.localKey));
    const matchingTopicIds = new Set(
      topics
        .filter(
          (t) =>
            t.name.toLowerCase().includes(cleanQ) ||
            t.slug.toLowerCase().includes(cleanQ),
        )
        .map((t) => t.id),
    );

    return valid.filter((p) => {
      if (q.startsWith("@")) {
        return (
          p.content.toLowerCase().includes(q) ||
          (!p.anonymous && matchingAuthorKeys.has(p.authorKey))
        );
      }
      const matchContent = p.content.toLowerCase().includes(q);
      const matchCategory = p.category?.toLowerCase().includes(cleanQ);
      const matchTopic = Boolean(p.topicId && matchingTopicIds.has(p.topicId));
      const matchTags = p.tags?.some(
        (t) =>
          t.toLowerCase().includes(cleanQ) ||
          `#${t.toLowerCase()}`.includes(q),
      );
      return matchContent || matchCategory || matchTopic || matchTags;
    });
  }, [posts, topics, queryParam, matchedPeople]);

  const displayedPeople = useMemo(
    () => (queryParam.trim() ? matchedPeople.slice(0, 6) : []),
    [queryParam, matchedPeople],
  );

  const {
    visibleItems: visibleFeedPosts,
    hasMore,
    isLoadingMore,
    sentinelRef,
  } = useLazySlice(feedPosts, {
    initialCount: 4,
    batchSize: 4,
    resetKey: queryParam,
  });

  return (
    <ProductShell active="explore" hideHeader searchQuery={queryParam}>
      <section className="feed-surface explore-surface">
        <ExploreSearchBar query={queryParam} />
        <ExploreTopicsBar />

        {!queryParam ? (
          <section className="explore-section">
            <div className="explore-section-header">
              <h2 className="explore-section-title">Sorotan</h2>
            </div>
            <div className="explore-trending-list">
              {dynamicTrends.map((trend) => (
                <Link
                  key={trend.id}
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

        <section className="explore-feed-section" aria-label="Linimasa Jelajah">
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

          {visibleFeedPosts.map((post) => (
            <PostCard key={post.localKey} post={post} />
          ))}
          <LazyLoadSentinel
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            sentinelRef={sentinelRef}
          />

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
