"use client";
import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";

const emojiCategories = [
  {
    name: "Suggested",
    emojis: ["😊", "🤷", "💻", "😃", "🙋", "🧑‍💻", "👍", "🔥", "📢", "⚠️", "📍", "💡", "👏", "🙌", "🤝"],
  },
  {
    name: "Frequently Used",
    emojis: ["🍎", "🍕", "🍦", "☕", "🥢", "🚗", "🏙️", "🌳", "📝", "🗳️", "🗑️", "🚨", "🛑", "🇮🇩", "🏛️"],
  },
  {
    name: "Smiley & People",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
      "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮",
      "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎",
    ],
  },
];

export function EmojiSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emojiCategories;
    // Simple filter by emoji string or return all if search matches general keywords
    return emojiCategories
      .map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((emoji) => emoji.includes(q) || q.length > 0),
      }))
      .filter((cat) => cat.emojis.length > 0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <Dialog title="Pilih Emoji" onClose={onClose} hideHeader className="selector-modal">
      <div className="selector-container">
        <div className="selector-header">
          <div className="selector-search-box">
            <input
              type="text"
              autoFocus
              placeholder="Search Emoji..."
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

        <div className="selector-emoji-scroll">
          {filteredCategories.map((category) => (
            <div key={category.name} className="selector-emoji-group">
              <span className="selector-emoji-title">{category.name}</span>
              <div className="selector-emoji-grid">
                {category.emojis.map((emoji, idx) => (
                  <button
                    key={`${category.name}-${idx}-${emoji}`}
                    type="button"
                    className="selector-emoji-btn"
                    onClick={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
