"use client";
import Link from "next/link";
import type { Post } from "@/types/models";

export function NewsOfTheDayCard({ post }: { post?: Post | null }) {
  if (!post) return null;

  // Extract headline only (line 1)
  const lines = post.content
    .split("\n\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const heading = lines[0] || "Isu Terhangat Hari Ini";

  // Image source: first post image, or civic landscape fallback
  const imageUrl =
    post.images && post.images.length > 0
      ? post.images[0]
      : "/footer-landscape.jpg";

  return (
    <section className="news-section">
      <h2 className="news-section-title">News of the day</h2>
      <article className="news-card">
        <Link href={`/posts/${post.localKey}`} className="news-card-link">
          {/* Full-bleed background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={heading}
            className="news-card-bg-img"
            loading="lazy"
          />

          {/* Gradient overlay with headline only */}
          <div className="news-card-overlay">
            <h3 className="news-card-headline">{heading}</h3>
          </div>
        </Link>
      </article>
    </section>
  );
}
