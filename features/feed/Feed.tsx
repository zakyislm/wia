"use client";
import { useState, useEffect, useRef } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Composer } from "@/features/posts/Composer";
import { PostCard } from "@/features/posts/PostCard";
import { ChevronDown, Check } from "lucide-react";

export function Feed() {
  const { posts, user, following, feedScroll } = useDemo();
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
  const readable = visible.filter((post) => !post.hidden && !post.isDeleted);

  return (
    <ProductShell
      title={
        <div className="feed-header-title" ref={dropdownRef}>
          <h1>Beranda</h1>
          <button
            type="button"
            className="subtab-arrow-btn"
            onClick={() => setTabDropdownOpen((prev) => !prev)}
            aria-label="Pilih subtab feed"
          >
            <ChevronDown size={16} className={tabDropdownOpen ? "rotated" : ""} />
          </button>
          {tabDropdownOpen && (
            <div className="subtab-dropdown-menu">
              <button
                type="button"
                className={tab === "foryou" ? "active" : ""}
                onClick={() => {
                  setTab("foryou");
                  setTabDropdownOpen(false);
                }}
              >
                <span>Untuk Kamu</span>
                {tab === "foryou" && <Check size={13} />}
              </button>
              <button
                type="button"
                className={tab === "following" ? "active" : ""}
                onClick={() => {
                  setTab("following");
                  setTabDropdownOpen(false);
                }}
              >
                <span>Mengikuti</span>
                {tab === "following" && <Check size={13} />}
              </button>
            </div>
          )}
        </div>
      }
    >
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
        {readable.map((post) => (
          <PostCard key={post.localKey} post={post} />
        ))}
        {!readable.length && (
          <div className="empty-state">
            <h2>Belum ada yang kamu ikuti</h2>
            <p>
              Ikuti akun dari rekomendasi untuk menemukan cerita mereka di sini.
            </p>
            <Button variant="secondary" onClick={() => setTab("foryou")}>
              Jelajahi Untuk Kamu
            </Button>
          </div>
        )}
      </section>
      {composer && <Composer onClose={() => setComposer(false)} />}
    </ProductShell>
  );
}
