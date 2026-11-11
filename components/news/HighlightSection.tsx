"use client";
import Link from "next/link";
import { useDemo } from "@/features/auth/DemoProvider";
import { useMemo } from "react";

interface HighlightItem {
  location: string;
  tag: string;
  href: string;
}

const defaultHighlights: HighlightItem[] = [
  {
    location: "Kota Bandung",
    tag: "#TrotoarRusak",
    href: "/explore?q=%23TrotoarRusak",
  },
  {
    location: "Jawa Barat",
    tag: "#Kebersihan",
    href: "/explore?q=%23Kebersihan",
  },
  {
    location: "DKI Jakarta",
    tag: "#TransportasiUmum",
    href: "/explore?q=%23TransportasiUmum",
  },
  {
    location: "Indonesia",
    tag: "#FasilitasPublik",
    href: "/explore?q=%23FasilitasPublik",
  },
];

const fallbackLocations = [
  "Kota Bandung",
  "Jawa Barat",
  "DKI Jakarta",
  "Indonesia",
];

export function HighlightSection() {
  const { posts } = useDemo();

  const highlights = useMemo<HighlightItem[]>(() => {
    const list: HighlightItem[] = [];
    const seenTags = new Set<string>();

    // Strictly extract post tags (NOT topics)
    posts.forEach((post) => {
      if (post.isDeleted || post.hidden) return;

      post.tags?.forEach((tag) => {
        const cleanTag = tag.replace(/^#/, "").trim();
        if (!cleanTag) return;
        const lower = cleanTag.toLowerCase();
        if (!seenTags.has(lower)) {
          seenTags.add(lower);

          // Assign realistic varied locations across Indonesia
          let loc = post.province || "Indonesia";
          if (cleanTag.toLowerCase() === "bandung") {
            loc = "Jawa Barat";
          } else if (cleanTag.toLowerCase() === "trotoarrusak" || cleanTag.toLowerCase() === "aksesaman") {
            loc = "Kota Bandung";
          } else if (cleanTag.toLowerCase() === "transportasiumum" || cleanTag.toLowerCase() === "haltebus") {
            loc = "DKI Jakarta";
          } else if (cleanTag.toLowerCase() === "fasilitaspublik") {
            loc = "Indonesia";
          } else if (list.some((item) => item.location === loc)) {
            // Avoid repeating identical location for every item
            const nextLoc = fallbackLocations.find(
              (candidate) => !list.some((item) => item.location === candidate),
            );
            if (nextLoc) loc = nextLoc;
          }

          list.push({
            location: loc,
            tag: `#${cleanTag}`,
            href: `/explore?q=${encodeURIComponent("#" + cleanTag)}`,
          });
        }
      });
    });

    const merged = [
      ...list,
      ...defaultHighlights.filter(
        (d) => !seenTags.has(d.tag.replace(/^#/, "").toLowerCase()),
      ),
    ];

    // Return 4 items (3-5 items per spec)
    return merged.slice(0, 4);
  }, [posts]);

  return (
    <section className="highlight-section" aria-label="Topik sorotan">
      <h2 className="highlight-section-title">Sorotan</h2>
      <div className="highlight-list">
        {highlights.map((item, idx) => (
          <Link key={idx} href={item.href} className="highlight-item">
            <span className="highlight-caption">
              Ramai di {item.location}
            </span>
            <span className="highlight-tag">{item.tag}</span>
          </Link>
        ))}
      </div>
      <Link href="/explore" className="highlight-more-link">
        Lebih banyak
      </Link>
    </section>
  );
}
