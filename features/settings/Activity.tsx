"use client";
import Link from "next/link";
import { useState } from "react";
import { ProductShell } from "@/components/layout/ProductShell";
import { useDemo } from "@/features/auth/DemoProvider";
export function Activity() {
  const { posts, user } = useDemo();
  const [kind, setKind] = useState("all");
  const items = posts
    .filter((post) => !post.isDeleted)
    .flatMap((post) => [
      ...(post.vote
        ? [
            {
              key: `vote-${post.localKey}`,
              kind: "vote",
              label: `${post.vote === "UP" ? "Upvote" : "Downvote"} postingan`,
              href: `/posts/${post.localKey}`,
            },
          ]
        : []),
      ...(post.reposted
        ? [
            {
              key: `repost-${post.localKey}`,
              kind: "repost",
              label: "Repost postingan",
              href: `/posts/${post.localKey}`,
            },
          ]
        : []),
      ...(post.saved
        ? [
            {
              key: `saved-${post.localKey}`,
              kind: "saved",
              label: "Postingan disimpan",
              href: `/posts/${post.localKey}`,
            },
          ]
        : []),
      ...post.replies
        .filter((reply) => reply.authorKey === user?.localKey)
        .map((reply) => ({
          key: reply.localKey,
          kind: "comment",
          label: `Komentar: ${reply.content}`,
          href: `/posts/${post.localKey}#comment-${reply.localKey}`,
        })),
      ...post.resolutions
        .filter((item) => item.choice)
        .map((item) => ({
          key: item.localKey,
          kind: "validation",
          label: `Validasi: ${item.choice === "agree" ? "Setuju" : "Belum selesai"}`,
          href: `/posts/${post.localKey}#evidence`,
        })),
    ]);
  const visible = items.filter((item) => kind === "all" || item.kind === kind);
  return (
    <ProductShell title="Aktivitas pribadi" active="settings">
      <section className="feed-surface">
        <div className="section-pad stack content-toolbar">
          <p className="muted">
            Hanya Anda yang dapat melihat aktivitas sesi demo ini.
          </p>
          <label>
            Jenis aktivitas
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Semua aktivitas</option>
              <option value="vote">Upvote / downvote</option>
              <option value="comment">Komentar / reply</option>
              <option value="repost">Repost</option>
              <option value="saved">Disimpan</option>
              <option value="validation">Validasi penyelesaian</option>
            </select>
          </label>
        </div>
        {visible.map((item) => (
          <Link className="activity-row" key={item.key} href={item.href}>
            <strong>{item.label}</strong>
            <small className="muted">Sesi demo · Buka konten asli →</small>
          </Link>
        ))}
        {!visible.length && (
          <div className="empty-state">
            <h2>Belum ada aktivitas</h2>
            <p>
              Interaksi yang kamu lakukan pada sesi ini akan muncul di sini.
            </p>
            <Link href="/home">Kembali ke beranda →</Link>
          </div>
        )}
      </section>
    </ProductShell>
  );
}
