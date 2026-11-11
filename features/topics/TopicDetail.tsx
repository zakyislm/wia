"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { PostCard } from "@/features/posts/PostCard";
import { LazyLoadSentinel, useLazySlice, useSubtabTransition } from "@/components/ui/LazyFeed";
import { SkeletonPostList } from "@/components/ui/Skeleton";
import { formatPageTitle, formatSearchTitle } from "@/lib/title";
import {
  ExploreTopicsBar,
  ExploreSearchBar,
} from "@/features/explore/ExploreChrome";
import {
  findTopicNameBySlug,
  resolveCanonicalTopicSlug,
  toTopicSlug,
} from "@/components/selectors/TopicSelectorModal";
import type { Post } from "@/types/models";

export type TopicSubtab = "semua" | "ramai" | "terbaru";

const TOPIC_SUBTABS: { id: TopicSubtab; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "ramai", label: "Ramai" },
  { id: "terbaru", label: "Terbaru" },
];

const RECENCY_BUCKET_MS = 6 * 3600000;

function seededNoise(key: string, salt: number): number {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Total engagement from upvotes, downvotes, and replies. */
export function getPostRamaiScore(post: Post): number {
  const upvotes = post.upvotesCount + (post.vote === "UP" ? 1 : 0);
  const downvotes = (post.downvotesCount ?? 0) + (post.vote === "DOWN" ? 1 : 0);
  const replies = post.replies?.length ?? 0;
  return upvotes + downvotes + replies;
}

/** Sort topic posts for Semua, Ramai, or Terbaru (closest to nowMs with within-window jitter). */
export function sortTopicPosts(
  list: Post[],
  subtab: TopicSubtab,
  nowMs: number,
  randomSalt = 0,
): Post[] {
  if (subtab === "ramai") {
    return [...list].sort(
      (a, b) =>
        getPostRamaiScore(b) - getPostRamaiScore(a) || b.postedAt - a.postedAt,
    );
  }
  if (subtab === "terbaru") {
    return [...list].sort((a, b) => {
      const bucketA = Math.floor(Math.abs(nowMs - a.postedAt) / RECENCY_BUCKET_MS);
      const bucketB = Math.floor(Math.abs(nowMs - b.postedAt) / RECENCY_BUCKET_MS);
      if (bucketA !== bucketB) return bucketA - bucketB;
      if (randomSalt === 0) {
        return Math.abs(nowMs - a.postedAt) - Math.abs(nowMs - b.postedAt);
      }
      return (
        seededNoise(a.localKey, randomSalt) -
        seededNoise(b.localKey, randomSalt)
      );
    });
  }
  return list;
}

export function TopicDetail({ slug }: { slug: string }) {
  const { posts, showToast } = useDemo();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [subtab, setSubtab] = useState<TopicSubtab>("semua");
  const [nowMs, setNowMs] = useState(1794040000000);
  const [randomSalt, setRandomSalt] = useState(0);

  useEffect(() => {
    setNowMs(Date.now());
    setRandomSalt(Math.floor(Math.random() * 1_000_000) + 1);
  }, []);

  const cleanSlug = resolveCanonicalTopicSlug(slug);
  const compactTarget = cleanSlug.replace(/-/g, "");

  const matchingPosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      if (post.isDeleted || post.hidden) return false;
      const postSlug = resolveCanonicalTopicSlug(
        post.topicSlug ||
          toTopicSlug(post.topicName || post.category || ""),
      );
      return (
        postSlug === cleanSlug ||
        postSlug.replace(/-/g, "") === compactTarget
      );
    });
    return sortTopicPosts(filtered, subtab, nowMs, randomSalt);
  }, [posts, cleanSlug, compactTarget, subtab, nowMs, randomSalt]);

  const topicName = findTopicNameBySlug(cleanSlug);

  const {
    visibleItems: visiblePosts,
    hasMore,
    isLoadingMore,
    sentinelRef,
  } = useLazySlice(matchingPosts, {
    initialCount: 4,
    batchSize: 4,
    resetKey: `${cleanSlug}:${subtab}`,
  });
  const { isSubtabLoading, triggerSubtabSkeleton } = useSubtabTransition(
    subtab,
    {
      onRateLimited: () =>
        showToast("Tunggu 1 detik sebelum ganti tab.", "info"),
    },
  );

  return (
    <ProductShell
      active="explore"
      hideHeader
      title={topicName}
      documentTitle={
        queryParam.trim()
          ? formatSearchTitle(queryParam, topicName)
          : formatPageTitle(topicName)
      }
      searchQuery={queryParam}
    >
      <section className="feed-surface explore-surface">
        <ExploreSearchBar query={queryParam} />
        <ExploreTopicsBar activeSlug={cleanSlug} />

        <div
          className="profile-tabs explore-topic-tabs"
          role="tablist"
          aria-label={`Filter topik ${topicName}`}
        >
          {TOPIC_SUBTABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={subtab === tab.id}
              onClick={() => {
                if (!triggerSubtabSkeleton(tab.id)) return;
                setSubtab(tab.id);
                if (tab.id === "terbaru") {
                  setNowMs(Date.now());
                  setRandomSalt(Math.floor(Math.random() * 1_000_000) + 1);
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section
          className="explore-feed-section"
          aria-label={`Postingan topik ${topicName}`}
        >
          {isSubtabLoading ? (
            <SkeletonPostList count={3} />
          ) : (
            <>
              {visiblePosts.map((post) => (
                <PostCard key={post.localKey} post={post} />
              ))}
              <LazyLoadSentinel
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                sentinelRef={sentinelRef}
              />

              {matchingPosts.length === 0 && (
                <div className="empty-state">
                  <h2>Belum ada postingan</h2>
                  <p>Belum ada laporan atau diskusi untuk topik {topicName}.</p>
                </div>
              )}
            </>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
