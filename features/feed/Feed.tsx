"use client";
import { useState, useEffect, useRef } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Composer } from "@/features/posts/Composer";
import { PostCard } from "@/features/posts/PostCard";
import {
  LazyLoadSentinel,
  useLazySlice,
  useSubtabTransition,
} from "@/components/ui/LazyFeed";
import { SkeletonPostList } from "@/components/ui/Skeleton";
import { ChevronDown, Check } from "lucide-react";

export function Feed() {
  const { posts, user, following, feedScroll, workspace, showToast } =
    useDemo();
  useEffect(() => {
    window.scrollTo(0, feedScroll.current);
    const save = () => {
      feedScroll.current = window.scrollY;
    };
    window.addEventListener("scroll", save);
    return () => window.removeEventListener("scroll", save);
  }, [feedScroll]);

  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setTabDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [composer, setComposer] = useState(false);
  const visible =
    tab === "following"
      ? posts.filter(
          (post) => !post.anonymous && following.includes(post.authorKey),
        )
      : posts;
  const readable = visible.filter((post) => {
    if (post.hidden || post.isDeleted) return false;
    if (
      !post.anonymous &&
      (workspace.mutedUsers.includes(post.authorKey) ||
        workspace.blockedUsers.includes(post.authorKey))
    ) {
      return false;
    }
    if (workspace.mutedWords.length > 0) {
      const lower = post.content.toLowerCase();
      if (workspace.mutedWords.some((word) => lower.includes(word.toLowerCase()))) {
        return false;
      }
    }
    return true;
  });

  const {
    visibleItems: visiblePosts,
    hasMore,
    isLoadingMore,
    sentinelRef,
  } = useLazySlice(readable, {
    initialCount: 4,
    batchSize: 4,
    resetKey: tab,
  });
  const { isSubtabLoading, triggerSubtabSkeleton } = useSubtabTransition(tab, {
    onRateLimited: () =>
      showToast("Tunggu 1 detik sebelum ganti tab.", "info"),
  });

  function selectTab(nextTab: "foryou" | "following") {
    if (!triggerSubtabSkeleton(nextTab)) {
      setTabDropdownOpen(false);
      return;
    }
    setTab(nextTab);
    setTabDropdownOpen(false);
  }

  return (
    <ProductShell active="home" hideHeader>
      <section className="feed-surface home-feed">
        <button
          type="button"
          className="compact-composer"
          onClick={() => setComposer(true)}
          aria-label="Buat postingan baru"
        >
          <Avatar name={user?.name ?? "A"} src={user?.image} />
          <span className="compact-composer-prompt">
            Ada cerita apa hari ini?
          </span>
        </button>

        {/* Substack-style small filter dropdown below the composer box */}
        <div className="substack-filter-bar" ref={dropdownRef}>
          <button
            type="button"
            className="substack-filter-btn"
            onClick={() => setTabDropdownOpen((prev) => !prev)}
            aria-expanded={tabDropdownOpen}
            aria-label="Filter beranda"
          >
            <span>{tab === "foryou" ? "Untuk Kamu" : "Mengikuti"}</span>
            <ChevronDown
              size={14}
              className={tabDropdownOpen ? "rotated" : ""}
            />
          </button>

          {tabDropdownOpen && (
            <div className="subtab-dropdown-menu substack-dropdown">
              <button
                type="button"
                className={tab === "foryou" ? "active" : ""}
                onClick={() => selectTab("foryou")}
              >
                <span>Untuk Kamu</span>
                {tab === "foryou" && <Check size={13} />}
              </button>
              <button
                type="button"
                className={tab === "following" ? "active" : ""}
                onClick={() => selectTab("following")}
              >
                <span>Mengikuti</span>
                {tab === "following" && <Check size={13} />}
              </button>
            </div>
          )}
        </div>

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
            {!readable.length && (
              <div className="empty-state">
                <h2>Belum ada yang kamu ikuti</h2>
                <p>
                  Ikuti akun dari rekomendasi untuk menemukan cerita mereka di sini.
                </p>
                <Button variant="secondary" onClick={() => selectTab("foryou")}>
                  Jelajahi Untuk Kamu
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      {composer && <Composer initialMode="post" onClose={() => setComposer(false)} />}
    </ProductShell>
  );
}
