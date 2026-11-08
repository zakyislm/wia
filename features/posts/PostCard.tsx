/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import Link from "next/link";
import { PostMenu } from "./PostMenu";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Repeat2,
  Upload,
  CheckCircle2,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/user/UserHoverCard";
import { Button } from "@/components/ui/Button";
import { resolutionResult } from "@/lib/validation";
import { useDemo } from "@/features/auth/DemoProvider";
import type { Post } from "@/types/models";
import { useState, useEffect } from "react";

function formatTime(timestamp?: number, currentNow?: number): string {
  if (!timestamp) return "24j";
  const now = currentNow ?? 1794040000000;
  const diff = Math.max(0, now - timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j`;
  const days = Math.floor(hours / 24);
  return `${days}h`;
}

export function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const { people, updatePost } = useDemo();
  const [message, setMessage] = useState("");
  const [timeAgo, setTimeAgo] = useState(() => formatTime(post.postedAt));
  useEffect(() => {
    setTimeAgo(formatTime(post.postedAt, Date.now()));
  }, [post.postedAt]);
  const author = people.find((person) => person.localKey === post.authorKey)!;
  const resolution = post.resolutions.at(-1);
  const result = resolution ? resolutionResult(resolution) : null;
  const closed = result === "success" || result === "automatic";
  const name = post.anonymous ? "Anonim" : author.name;
  const [heading, ...paragraphs] = post.content.split("\n\n");
  const text = paragraphs.length ? (
    <>
      <h3>{heading}</h3>
      <p>{paragraphs.join("\n\n")}</p>
    </>
  ) : (
    post.content
  );
  const href = `/posts/${post.localKey}`;
  function vote(direction: "UP" | "DOWN") {
    updatePost(post.localKey, (current) => ({
      ...current,
      vote: current.vote === direction ? null : direction,
    }));
  }
  return (
    <article className="post-card">
      <header className="post-meta">
        {post.anonymous ? (
          <Avatar name={name} />
        ) : (
          <UserHoverCard person={author}>
            <Link href={`/profile/${author.username || author.localKey}`} className="post-avatar-link">
              <Avatar name={name} src={author.image} />
            </Link>
          </UserHoverCard>
        )}
        <div>
          <div className="post-meta-heading">
            <span className="post-author-name">
              {post.anonymous ? (
                "Anonim"
              ) : (
                <UserHoverCard person={author}>
                  <Link href={`/profile/${author.username || author.localKey}`}>
                    {author.name}
                  </Link>
                </UserHoverCard>
              )}
              {!post.anonymous && author.role === "GOVERNMENT" ? " ✓" : ""}
            </span>
            <span className="post-meta-separator">in</span>
            <span className="post-topic-name">
              <Link href={`/topics/${post.topicSlug || (post.category || "umum").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                {post.topicName || post.category || "Umum"}
              </Link>
            </span>
            <span className="post-meta-dot">·</span>
            <span className="post-meta-time">{timeAgo}</span>
          </div>
          <div className="post-meta-location">
            <MapPin size={12} />
            <span>{post.province || "Nasional"}</span>
          </div>
        </div>
        {post.kind === "report" && (
          <span className={`badge ${closed ? result : ""}`}>
            {closed ? (
              result === "automatic" ? (
                "Ditutup otomatis"
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Case Closed
                </>
              )
            ) : (
              "Laporan"
            )}
          </span>
        )}
        <PostMenu post={post} />
      </header>
      {detail ? (
        <div className="post-content">{text}</div>
      ) : (
        <Link className="post-content post-link" href={href}>
          {text}
        </Link>
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag) => (
            <Link key={tag} href={`/explore?q=${encodeURIComponent('#' + tag)}`} className="post-tag-item">
              #{tag}
            </Link>
          ))}
        </div>
      )}
      {post.kind === "report" && post.agencyKeys.length > 0 && (
        <>
          <p className="agency-tags">
            {post.agencyKeys
              .map(
                (key) =>
                  `@${people.find((person) => person.localKey === key)?.username}`,
              )
              .join("  ")}
          </p>
        </>
      )}
      {!!post.images.length && (
        <div className="photo-grid">
          {post.images.map((src, index) => (
            <img src={src} alt={`Foto postingan ${index + 1}`} key={src} />
          ))}
        </div>
      )}
      {resolution && (
        <Link
          href={`${href}#evidence`}
          className={`evidence-link ${result ?? ""}`}
        >
          {result === "failed" ? (
            <AlertCircle size={16} />
          ) : closed ? (
            <CheckCircle2 size={16} />
          ) : null}
          {result === "failed"
            ? "Pengajuan gagal · Laporan tetap terbuka"
            : result === "automatic"
              ? "Ditutup otomatis · Tidak ada suara"
              : result === "success"
                ? "Ditutup · Lihat hasil validasi"
                : "Pengajuan penyelesaian · Lihat bukti"}{" "}
          →
        </Link>
      )}
      <footer className="post-actions">
        <Button
          variant="ghost"
          aria-label="Upvote"
          aria-pressed={post.vote === "UP"}
          onClick={() => vote("UP")}
        >
          <ArrowBigUp size={18} strokeWidth={1.8} />
          <small>
            {post.upvotesCount +
              (post.vote === "UP" ? 1 : post.vote === "DOWN" ? -1 : 0)}
          </small>
        </Button>
        <Button
          variant="ghost"
          aria-label="Downvote"
          aria-pressed={post.vote === "DOWN"}
          onClick={() => vote("DOWN")}
        >
          <ArrowBigDown size={18} strokeWidth={1.8} />
        </Button>
        <Link href={href} className="button button--ghost" aria-label="Buka komentar">
          <MessageCircle size={18} strokeWidth={1.8} />
          <small>{post.replies.length}</small>
        </Link>
        <Button
          variant="ghost"
          aria-label="Repost"
          aria-pressed={post.reposted}
          onClick={() =>
            updatePost(post.localKey, (current) => ({
              ...current,
              reposted: !current.reposted,
            }))
          }
        >
          <Repeat2 size={18} strokeWidth={1.8} />
        </Button>
        <Button
          variant="ghost"
          aria-label="Salin tautan postingan"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${location.origin}${href}`);
              setMessage("Tautan disalin.");
            } catch {
              setMessage(
                "Tautan tidak dapat disalin. Salin alamat dari halaman detail.",
              );
            }
          }}
        >
          <Upload size={18} strokeWidth={1.8} />
        </Button>
      </footer>
      {message && (
        <p role="status" className="small muted">
          {message}
        </p>
      )}
    </article>
  );
}
