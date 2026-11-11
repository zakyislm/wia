"use client";
import Link from "next/link";
import { useDemo } from "@/features/auth/DemoProvider";
import { useMemo } from "react";

interface HighlightItem {
  id: string;
  location: string;
  topicName: string;
  href: string;
  score: number;
}

export function HighlightSection() {
  const { topics, posts } = useDemo();

  const highlights = useMemo<HighlightItem[]>(() => {
    const activePosts = posts.filter((p) => !p.isDeleted && !p.hidden);

    const topicItems: HighlightItem[] = topics.map((topic) => {
      const matchingPosts = activePosts.filter(
        (p) =>
          p.topicId === topic.id ||
          p.category?.toLowerCase() === topic.name.toLowerCase()
      );

      let score = topic.isTrending ? 20 : 0;
      const provinceFreq = new Map<string, number>();

      for (const p of matchingPosts) {
        const eng =
          (p.upvotesCount || 0) +
          (p.downvotesCount || 0) +
          (p.replies?.length || 0) * 3;
        score += 10 + eng;
        const prov = (p.province || "Indonesia").trim();
        if (prov) {
          provinceFreq.set(prov, (provinceFreq.get(prov) || 0) + 1 + eng * 0.05);
        }
      }

      let topProvince = "Indonesia";
      let bestWeight = -1;
      for (const [prov, weight] of provinceFreq.entries()) {
        if (weight > bestWeight) {
          bestWeight = weight;
          topProvince = prov;
        }
      }

      return {
        id: topic.id,
        location: topProvince,
        topicName: topic.name,
        href: `/explore?q=${encodeURIComponent(topic.name)}`,
        score,
      };
    });

    return topicItems.sort((a, b) => b.score - a.score).slice(0, 4);
  }, [topics, posts]);

  return (
    <section className="highlight-section" aria-label="Topik sorotan">
      <h2 className="highlight-section-title">Sorotan</h2>
      <div className="highlight-list">
        {highlights.map((item) => (
          <Link key={item.id} href={item.href} className="highlight-item">
            <span className="highlight-caption">Ramai di {item.location}</span>
            <span className="highlight-tag">{item.topicName}</span>
          </Link>
        ))}
      </div>
      <Link href="/explore" className="highlight-more-link">
        Lebih banyak
      </Link>
    </section>
  );
}
