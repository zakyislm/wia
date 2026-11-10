"use client";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, Search, Plus, MoreHorizontal, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useDemo } from "@/features/auth/DemoProvider";
import {
  type ComposerDraft,
  loadDrafts,
  deleteDraft,
  formatDraftTime,
} from "./draftsStorage";

interface DraftsViewProps {
  onBack: () => void;
  onSelectDraft: (draft: ComposerDraft) => void;
  onCreateNew: () => void;
  isActive?: boolean;
}

export function DraftsView({
  onBack,
  onSelectDraft,
  onCreateNew,
  isActive = true,
}: DraftsViewProps) {
  const { user } = useDemo();
  const [drafts, setDrafts] = useState<ComposerDraft[]>(() => loadDrafts());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Reload drafts when this slide becomes active
  useEffect(() => {
    if (isActive) {
      setDrafts(loadDrafts());
    }
  }, [isActive]);

  const filteredDrafts = useMemo(() => {
    if (!searchQuery.trim()) return drafts;
    const q = searchQuery.toLowerCase();
    return drafts.filter(
      (d) =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.content && d.content.toLowerCase().includes(q)) ||
        (d.location && d.location.toLowerCase().includes(q)) ||
        (d.topic && d.topic.name.toLowerCase().includes(q)),
    );
  }, [drafts, searchQuery]);

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = deleteDraft(id);
    setDrafts(updated);
    setActiveMenuId(null);
  }

  return (
    <div className="composer-drafts-container">
      {/* Fixed Top Header Row: [<] Drafts */}
      <div className="composer-drafts-header">
        <button
          type="button"
          className="composer-drafts-back-btn"
          onClick={onBack}
          aria-label="Kembali ke editor"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <h2 className="composer-drafts-title">Drafts</h2>
        <div className="composer-drafts-header-spacer" aria-hidden="true" />
      </div>

      {/* Scrollable Body: Search Bar + Create New + Drafts List */}
      <div className="composer-drafts-scroll">
        <div className="composer-drafts-search-box">
          <Search size={16} strokeWidth={2} className="composer-drafts-search-icon" />
          <input
            type="text"
            className="composer-drafts-search-input"
            placeholder="Cari draft..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="composer-drafts-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Hapus pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="composer-drafts-create-btn"
          onClick={onCreateNew}
        >
          <span className="composer-drafts-create-icon">
            <Plus size={18} strokeWidth={2} />
          </span>
          <span className="composer-drafts-create-text">Create new</span>
        </button>

        <div className="composer-drafts-list">
          {filteredDrafts.map((draft) => {
            const previewText =
              draft.title.trim() ||
              draft.content.trim() ||
              "Draft tanpa judul";

            return (
              <div
                key={draft.id}
                className="composer-draft-item"
                onClick={() => onSelectDraft(draft)}
              >
                <div className="composer-draft-avatar-col">
                  <Avatar name={user?.name ?? "User"} src={user?.image} />
                </div>
                <div className="composer-draft-content-col">
                  <strong className="composer-draft-headline">
                    {previewText}
                  </strong>
                  <span className="composer-draft-timestamp">
                    {formatDraftTime(draft.updatedAt)}
                  </span>
                </div>

                {/* Action Menu (Delete) */}
                <div className="composer-draft-action-col">
                  <button
                    type="button"
                    className="composer-draft-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === draft.id ? null : draft.id);
                    }}
                    aria-label="Opsi draft"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {activeMenuId === draft.id && (
                    <div className="composer-draft-menu-popover">
                      <button
                        type="button"
                        className="composer-draft-delete-btn"
                        onClick={(e) => handleDelete(draft.id, e)}
                      >
                        <Trash2 size={14} />
                        <span>Hapus draft</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredDrafts.length === 0 && (
            <div className="composer-drafts-empty">
              <p>
                {searchQuery
                  ? "Tidak ada draft yang cocok dengan pencarian."
                  : "Belum ada draft tersimpan."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
