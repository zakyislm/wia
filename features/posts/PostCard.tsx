/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import Link from "next/link";
import { PostMenu } from "./PostMenu";
import {
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Repeat2,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { resolutionResult } from "@/lib/validation";
import { useDemo } from "@/features/auth/DemoProvider";
import type { Post } from "@/types/models";
import { useState } from "react";

export function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const { people, updatePost } = useDemo();
  const [message, setMessage] = useState("");
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
        <Avatar name={name} src={post.anonymous ? undefined : author.image} />
        <div>
          <strong>
            {post.anonymous ? (
              name
            ) : (
              <Link href={`/profile/${author.localKey}`}>{name}</Link>
            )}
            {!post.anonymous && author.role === "GOVERNMENT" ? " ✓" : ""}
          </strong>
          <small>
            {post.anonymous ? post.province : `@${author.username}`} · Contoh
          </small>
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
      {post.kind === "report" && (
        <>
          <p className="post-context">
            {post.province} · {post.category}
          </p>
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
          <ArrowUp />
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
          <ArrowDown />
        </Button>
        <Link href={href} aria-label="Buka komentar">
          <MessageCircle />
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
          <Repeat2 />
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
          <Send />
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
