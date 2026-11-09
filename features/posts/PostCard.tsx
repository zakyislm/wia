/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostMenu } from "./PostMenu";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Repeat2,
  Upload,
  CheckCircle2,
  XCircle,
  Timer,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/user/UserHoverCard";
import { Button } from "@/components/ui/Button";
import { getEffectiveReportStatus } from "@/features/discovery/filters";
import { useDemo } from "@/features/auth/DemoProvider";
import type { Person, Post, Role } from "@/types/models";
import { useState, useEffect, type ReactNode } from "react";

export function VerifiedBadge({
  role,
  size = 16,
}: {
  role?: Role;
  size?: number;
}) {
  if (role === "GOVERNMENT") {
    return (
      <BadgeCheck
        size={size}
        fill="#10b981"
        color="#ffffff"
        className="verified-badge-icon"
        aria-label="Terverifikasi Aparat"
      />
    );
  }
  if (role === "INTERNAL") {
    return (
      <BadgeCheck
        size={size}
        fill="#991b1b"
        color="#ffffff"
        className="verified-badge-icon"
        aria-label="Tim Internal"
      />
    );
  }
  return null;
}

export function renderWithMentions(
  content: string,
  people: Person[],
): ReactNode {
  const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@") && part.length > 1) {
      const clean = part.slice(1).toLowerCase();
      const matched = people.find(
        (p) =>
          p.username.toLowerCase() === clean ||
          p.localKey.toLowerCase() === clean,
      );
      if (matched) {
        return (
          <UserHoverCard person={matched} key={`${part}-${index}`}>
            <Link
              href={`/profile/${matched.username || matched.localKey}`}
              className="mention-link"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          </UserHoverCard>
        );
      }
    }
    return part;
  });
}

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
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [timeAgo, setTimeAgo] = useState(() => formatTime(post.postedAt));
  useEffect(() => {
    setTimeAgo(formatTime(post.postedAt, Date.now()));
  }, [post.postedAt]);

  const author =
    people.find((person) => person.localKey === post.authorKey) ?? people[0];
  const name = post.anonymous ? "Anonim" : author.name;
  const isReport = post.kind === "report";
  const reportStatus = isReport ? getEffectiveReportStatus(post) : null;

  const [heading, ...paragraphs] = post.content.split("\n\n");
  const text =
    isReport && paragraphs.length ? (
      <>
        <h3>{renderWithMentions(heading, people)}</h3>
        <p>{renderWithMentions(paragraphs.join("\n\n"), people)}</p>
      </>
    ) : (
      <div className="post-general-text">
        {post.content.split("\n\n").map((para, i) => (
          <p key={i}>{renderWithMentions(para, people)}</p>
        ))}
      </div>
    );
  const href = `/posts/${post.localKey}`;
  function vote(direction: "UP" | "DOWN") {
    updatePost(post.localKey, (current) => ({
      ...current,
      vote: current.vote === direction ? null : direction,
    }));
  }
  return (
    <article
      className={`post-card ${isReport ? "post-card--report" : "post-card--general"}`}
    >
      <div className="post-avatar-col">
        {post.anonymous ? (
          <Avatar name={name} />
        ) : (
          <UserHoverCard person={author}>
            <Link
              href={`/profile/${author.username || author.localKey}`}
              className="post-avatar-link"
            >
              <Avatar name={name} src={author.image} />
            </Link>
          </UserHoverCard>
        )}
      </div>
      <header className="post-meta">
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
              {!post.anonymous && <VerifiedBadge role={author.role} size={15} />}
            </span>
            {!post.anonymous && author.username && (
              <UserHoverCard person={author}>
                <Link
                  href={`/profile/${author.username || author.localKey}`}
                  className="post-author-username"
                >
                  @{author.username}
                </Link>
              </UserHoverCard>
            )}
            {isReport ? (
              <>
                <span className="post-meta-separator">in</span>
                <span className="post-topic-name">
                  <Link
                    href={`/topics/${post.topicSlug || (post.category || "umum").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    {post.topicName || post.category || "Umum"}
                  </Link>
                </span>
              </>
            ) : null}
            <span className="post-meta-dot">·</span>
            <span className="post-meta-time">{timeAgo}</span>
          </div>
          {isReport && (
            <div className="post-meta-location">
              <MapPin size={12} />
              <span>{post.province || "Nasional"}</span>
            </div>
          )}
        </div>
        {isReport && reportStatus && (
          <span
            className={`report-status-badge report-status-badge--${reportStatus}`}
          >
            {reportStatus === "completed" ? (
              <>
                <CheckCircle2 size={13} strokeWidth={2} />
                <span>Selesai</span>
              </>
            ) : reportStatus === "closed_internal" ? (
              <>
                <XCircle size={13} strokeWidth={2} />
                <span>Ditutup</span>
              </>
            ) : reportStatus === "in_progress" ? (
              <>
                <Timer size={13} strokeWidth={2} />
                <span>Diproses</span>
              </>
            ) : (
              <>
                <Timer size={13} strokeWidth={2} />
                <span>Menunggu</span>
              </>
            )}
          </span>
        )}
        <PostMenu post={post} />
      </header>
      {detail ? (
        <div className="post-content">{text}</div>
      ) : (
        <div
          className="post-content post-link"
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            if (
              !(e.target as HTMLElement).closest(
                "a, button, .user-hover-trigger-wrap",
              )
            ) {
              router.push(href);
            }
          }}
        >
          {text}
        </div>
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/explore?q=${encodeURIComponent("#" + tag)}`}
              className="post-tag-item"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
      {post.kind === "report" && post.agencyKeys.length > 0 && (
        <div className="agency-tags">
          {post.agencyKeys.map((key) => {
            const agency = people.find((person) => person.localKey === key);
            if (!agency) return null;
            return (
              <UserHoverCard person={agency} key={key}>
                <Link
                  href={`/profile/${agency.username || agency.localKey}`}
                  className="mention-link"
                >
                  @{agency.username}
                </Link>
              </UserHoverCard>
            );
          })}
        </div>
      )}
      {!!post.images.length && (
        <div className="photo-grid">
          {post.images.map((src, index) => (
            <img src={src} alt={`Foto postingan ${index + 1}`} key={src} />
          ))}
        </div>
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
        <Link
          href={href}
          className="button button--ghost"
          aria-label="Buka komentar"
        >
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
