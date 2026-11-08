"use client";
import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { PostCard } from "@/features/posts/PostCard";

const knownTopics: Record<string, string> = {
  "bencana-nasional": "BencanaNasional",
  infrastruktur: "Infrastruktur",
  "lingkungan-hidup": "LingkunganHidup",
  "pelayanan-publik": "PelayananPublik",
  kesehatan: "Kesehatan",
  pendidikan: "Pendidikan",
  komunitas: "Komunitas",
};

export function TopicDetail({ slug }: { slug: string }) {
  const { posts } = useDemo();
  const cleanSlug = slug.toLowerCase();

  const matchingPosts = posts.filter((post) => {
    if (post.isDeleted) return false;
    const postSlug =
      post.topicSlug ||
      (post.category || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return (
      postSlug === cleanSlug ||
      post.category?.toLowerCase() === cleanSlug.replace(/-/g, "")
    );
  });

  const topicName =
    matchingPosts[0]?.topicName ||
    matchingPosts[0]?.category ||
    knownTopics[cleanSlug] ||
    cleanSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");

  return (
    <ProductShell title={`Topik: ${topicName}`}>
      <section className="feed-surface">
        <Link href="/home" className="back-link">
          <ArrowLeft size={18} />
          Kembali ke beranda
        </Link>
        <div className="topic-header section-pad">
          <span className="topic-badge">
            <Tag size={12} /> Topik Makro
          </span>
          <h1>{topicName}</h1>
          <p className="muted">
            Kanal resmi dan kurasi laporan warga seputar topik {topicName}.
          </p>
        </div>
        <div>
          {matchingPosts.map((post) => (
            <PostCard key={post.localKey} post={post} />
          ))}
          {matchingPosts.length === 0 && (
            <div className="empty-state">
              <h2>Belum ada postingan</h2>
              <p>Belum ada laporan atau diskusi untuk topik {topicName}.</p>
            </div>
          )}
        </div>
      </section>
    </ProductShell>
  );
}
