"use client";
import { useState, useMemo } from "react";
import { Search, X, Tag as TagIcon, Plus, Check } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";

const suggestedTags = [
  "Kebersihan",
  "Warga",
  "KotaKita",
  "AksesAman",
  "LampuJalan",
  "FasilitasPublik",
  "JalanRusak",
  "Karhutla",
  "SuaraRakyat",
  "PelayananPublik",
  "Lingkungan",
  "BantuanSosial",
];

export function TagSelectorModal({
  isOpen,
  onClose,
  selectedTags,
  onToggleTag,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "");
    if (!q) return suggestedTags;
    return suggestedTags.filter((t) => t.toLowerCase().includes(q));
  }, [search]);

  if (!isOpen) return null;

  const cleanInput = search.trim().replace(/^#/, "").replace(/\s+/g, "");

  return (
    <Dialog title="Tambah Tag" onClose={onClose} hideHeader className="selector-modal">
      <div className="selector-container">
        <div className="selector-header">
          <div className="selector-search-box">
            <input
              type="text"
              autoFocus
              placeholder="Cari atau buat tag baru..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cleanInput) {
                  e.preventDefault();
                  onToggleTag(cleanInput);
                  setSearch("");
                }
              }}
              className="selector-search-input"
            />
            <Search size={18} className="selector-search-icon" />
          </div>
          <button type="button" className="selector-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {cleanInput && !suggestedTags.some((t) => t.toLowerCase() === cleanInput.toLowerCase()) && (
          <div className="selector-action-row">
            <button
              type="button"
              className="selector-locate-btn"
              onClick={() => {
                onToggleTag(cleanInput);
                setSearch("");
              }}
            >
              <Plus size={16} />
              <span>Buat #{cleanInput}</span>
            </button>
          </div>
        )}

        <div className="selector-list">
          <span className="selector-section-title">Tag Populer</span>
          <div className="selector-tags-wrap">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`selector-tag-chip ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggleTag(tag)}
                >
                  <TagIcon size={12} />
                  <span>#{tag}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
