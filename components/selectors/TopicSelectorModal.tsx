"use client";
import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  defaultTopics,
  findTopicNameBySlug,
  resolveCanonicalTopicSlug,
  toTopicSlug,
} from "@/lib/topics";
import type { Topic } from "@/types/models";

export {
  defaultTopics,
  findTopicNameBySlug,
  resolveCanonicalTopicSlug,
  toTopicSlug,
};

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
  const debouncedSearch = useDebouncedValue(search, 200);
  const activeSearch = search === "" ? "" : debouncedSearch;

  const filteredTopics = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();
    if (!q) return defaultTopics;
    return defaultTopics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
    );
  }, [activeSearch]);

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
