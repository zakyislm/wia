"use client";
import { useState, useEffect } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Composer } from "@/features/posts/Composer";
import { PostCard } from "@/features/posts/PostCard";

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
  const [tab, setTab] = useState("foryou");
  const [composer, setComposer] = useState(false);
  const visible =
    tab === "following"
      ? posts.filter(
          (post) => !post.anonymous && following.includes(post.authorKey),
        )
      : posts;
  const readable = visible.filter((post) => !post.hidden && !post.isDeleted);
  return (
    <ProductShell title="Beranda">
      <section className="feed-surface home-feed">
        <div className="feed-tabs" role="tablist" aria-label="Pilihan feed">
          {[
            { key: "foryou", label: "Untuk Kamu" },
            { key: "following", label: "Mengikuti" },
          ].map((item) => (
            <button
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "selected" : ""}
              key={item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="compact-composer">
          <Avatar name={user?.name ?? "A"} src={user?.image} />
          <button onClick={() => setComposer(true)}>
            Ada cerita apa hari ini?
          </button>
          <Button variant="secondary" onClick={() => setComposer(true)}>
            Post
          </Button>
        </div>
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
