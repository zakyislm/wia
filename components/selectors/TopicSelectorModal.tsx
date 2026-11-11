"use client";
import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import type { Topic } from "@/types/models";

export const defaultTopics: Topic[] = [
  { id: "top_infra", name: "Infrastruktur", slug: "infrastruktur", isTrending: true },
  { id: "top_transportasi", name: "Transportasi", slug: "transportasi", isTrending: true },
  { id: "top_lingkungan", name: "Lingkungan & Kebersihan", slug: "lingkungan-kebersihan", isTrending: true },
  { id: "top_kesehatan", name: "Kesehatan", slug: "kesehatan", isTrending: false },
  { id: "top_pendidikan", name: "Pendidikan", slug: "pendidikan", isTrending: false },
  { id: "top_keamanan", name: "Keamanan & Ketertiban", slug: "keamanan-ketertiban", isTrending: false },
  { id: "top_bencana", name: "Bencana & Darurat", slug: "bencana-darurat", isTrending: false },
  { id: "top_layanan", name: "Layanan Publik", slug: "layanan-publik", isTrending: false },
  { id: "top_sosial", name: "Sosial & Warga", slug: "sosial-warga", isTrending: false },
  { id: "top_tatakelola", name: "Tata Kelola & Hukum", slug: "tata-kelola-hukum", isTrending: false },
  { id: "top_utilitas", name: "Air & Utilitas", slug: "air-utilitas", isTrending: false },
  { id: "top_komunitas", name: "Komunitas", slug: "komunitas", isTrending: false },
];

const topicSlugAliases: Record<string, string> = {
  "bencana-nasional": "bencana-darurat",
  "lingkungan-hidup": "lingkungan-kebersihan",
  "ruang-terbuka-hijau": "lingkungan-kebersihan",
  kebersihan: "lingkungan-kebersihan",
  "pelayanan-publik": "layanan-publik",
  "keselamatan-warga": "keamanan-ketertiban",
  koruptor: "tata-kelola-hukum",
  "fasilitas-publik": "infrastruktur",
  "tata-kota": "infrastruktur",
};

export function resolveCanonicalTopicSlug(slug: string): string {
  const clean = decodeURIComponent(slug).trim().toLowerCase();
  return topicSlugAliases[clean] ?? clean;
}

export function toTopicSlug(value: string): string {
  const slug = value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return topicSlugAliases[slug] ?? slug;
}

export function findTopicNameBySlug(slug: string): string {
  const clean = resolveCanonicalTopicSlug(slug);
  const matched = defaultTopics.find((t) => t.slug === clean);
  if (matched) return matched.name;
  return clean
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function TopicSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedSlug,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (topic: Topic) => void;
  selectedSlug?: string;
}) {
  const [search, setSearch] = useState("");

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return defaultTopics;
    return defaultTopics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <Dialog title="Pilih Topik" onClose={onClose} hideHeader className="selector-modal">
      <div className="selector-container">
        <div className="selector-header">
          <div className="selector-search-box">
            <input
              type="text"
              autoFocus
              placeholder="Cari topik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="selector-search-input"
            />
            <Search size={18} className="selector-search-icon" />
          </div>
          <button type="button" className="selector-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="selector-list">
          {filteredTopics.map((topic) => {
            const isSelected = selectedSlug === topic.slug;
            return (
              <button
                key={topic.id}
                type="button"
                className={`selector-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelect(topic);
                  onClose();
                }}
              >
                <span className="selector-item-name">{topic.name}</span>
                <span className="selector-item-meta">
                  {topic.isTrending && <span className="selector-trending-badge">Ramai</span>}
                  {isSelected && <Check size={16} className="selector-check-icon" />}
                </span>
              </button>
            );
          })}

          {filteredTopics.length === 0 && search.trim() && (
            <button
              type="button"
              className="selector-item selector-item-custom"
              onClick={() => {
                const customName = search.trim().replace(/[^a-zA-Z0-9]/g, "");
                const customSlug = customName.toLowerCase();
                onSelect({
                  id: `top_${customSlug}`,
                  name: customName || search.trim(),
                  slug: customSlug || "topik-kustom",
                });
                onClose();
              }}
            >
              <span>Gunakan topik &ldquo;{search.trim()}&rdquo;</span>
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
