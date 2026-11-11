"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  SkeletonActivityRow,
  SkeletonNotificationRow,
  SkeletonPostCard,
} from "./Skeleton";

/**
 * Incrementally reveals slices of long lists as the sentinel approaches the viewport,
 * showing a 1:1 grayscale skeleton while loading the next batch.
 */
export function useLazySlice<T>(
  items: T[],
  {
    initialCount = 4,
    batchSize = 4,
    resetKey,
  }: {
    initialCount?: number;
    batchSize?: number;
    resetKey?: string | number;
  } = {},
) {
  const [visibleState, setVisibleState] = useState<{
    key: string | number | undefined;
    count: number;
  }>({ key: resetKey, count: initialCount });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCount =
    visibleState.key === resetKey ? visibleState.count : initialCount;
  const effectiveCount = Math.min(items.length, activeCount);
  const hasMore = effectiveCount < items.length;
  const visibleItems = items.slice(0, effectiveCount);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (timerRef.current) return;
        setIsLoadingMore(true);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setVisibleState((prev) => {
            const base = prev.key === resetKey ? prev.count : initialCount;
            return { key: resetKey, count: base + batchSize };
          });
          setIsLoadingMore(false);
        }, 160);
      },
      { rootMargin: "160px 0px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasMore, batchSize, initialCount, resetKey, effectiveCount]);

  return {
    visibleItems,
    hasMore,
    isLoadingMore: hasMore && isLoadingMore,
    sentinelRef,
  };
}

/**
 * Brief 1:1 grayscale skeleton state when switching subtabs or filters,
 * updating only the content region while outer controls remain static.
 */
export function useSubtabTransition(activeKey: string, durationMs = 160) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function triggerSubtabSkeleton(nextKey: string) {
    if (nextKey === activeKey) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPendingKey(nextKey);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setPendingKey(null);
    }, durationMs);
  }

  return {
    isSubtabLoading: pendingKey === activeKey,
    triggerSubtabSkeleton,
  };
}

export function LazyLoadSentinel({
  hasMore,
  isLoadingMore,
  sentinelRef,
  variant = "post",
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  variant?: "post" | "notification" | "activity";
}) {
  if (!hasMore) return null;
  return (
    <div
      ref={sentinelRef}
      className="lazy-load-sentinel"
      role="status"
      aria-live="polite"
      aria-label="Memuat item berikutnya"
    >
      {isLoadingMore ? (
        variant === "notification" ? (
          <>
            <SkeletonNotificationRow />
            <SkeletonNotificationRow />
          </>
        ) : variant === "activity" ? (
          <>
            <SkeletonActivityRow />
            <SkeletonActivityRow />
          </>
        ) : (
          <SkeletonPostCard withMedia={false} />
        )
      ) : (
        <div className="lazy-load-spacer" aria-hidden="true" />
      )}
    </div>
  );
}
