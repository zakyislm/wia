/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  MapPin,
  Smile,
  Tag as TagIcon,
  ChevronDown,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Avatar";
import { useDemo } from "@/features/auth/DemoProvider";
import { mediaError } from "@/lib/validation";
import type { Post, Topic } from "@/types/models";
import { TopicSelectorModal } from "@/components/selectors/TopicSelectorModal";
import { LocationSelectorModal } from "@/components/selectors/LocationSelectorModal";
import { EmojiSelectorModal } from "@/components/selectors/EmojiSelectorModal";
import { TagSelectorModal } from "@/components/selectors/TagSelectorModal";
import { DraftsView } from "./DraftsView";
import {
  type ComposerDraft,
  saveDraft,
  deleteDraft,
  loadDrafts,
} from "./draftsStorage";

interface ComposerProps {
  onClose: () => void;
  initialMode?: "post" | "report";
}

export function Composer({ onClose, initialMode = "report" }: ComposerProps) {
  const { user, setPosts } = useDemo();
  const router = useRouter();

  // Mode: "post" or "report"
  const [mode, setMode] = useState<"post" | "report">(initialMode);
  // View: "editor" or "drafts"
  const [view, setView] = useState<"editor" | "drafts">("editor");

  const [currentDraftId, setCurrentDraftId] = useState<string>(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [draftCount, setDraftCount] = useState(0);

  // Selector modals
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const published = useRef(false);

  // Update draft count on mount and view changes
  useEffect(() => {
    setDraftCount(loadDrafts().length);
  }, [view]);

  // Clean up object URLs
  useEffect(
    () => () => {
      if (!published.current)
        urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  // Autosave whenever content changes (debounced 600ms)
  useEffect(() => {
    const hasData =
      title.trim() ||
      content.trim() ||
      location.trim() ||
      selectedTopic ||
      tags.length > 0;

    if (!hasData) return;

    const timer = setTimeout(() => {
      saveDraft({
        id: currentDraftId,
        mode,
        title,
        content,
        topic: selectedTopic,
        location,
        tags,
        images,
        updatedAt: Date.now(),
      });
      setDraftCount(loadDrafts().length);
    }, 600);

    return () => clearTimeout(timer);
  }, [currentDraftId, mode, title, content, selectedTopic, location, tags, images]);

  // Handle selecting a draft from DraftsView
  const handleSelectDraft = useCallback((draft: ComposerDraft) => {
    setCurrentDraftId(draft.id);
    setMode(draft.mode);
    setTitle(draft.title || "");
    setContent(draft.content || "");
    setSelectedTopic(draft.topic || null);
    setLocation(draft.location || "");
    setTags(draft.tags || []);
    setImages(draft.images || []);
    setError("");
    setView("editor");
  }, []);

  // Handle create new draft
  const handleCreateNew = useCallback(() => {
    setCurrentDraftId(crypto.randomUUID());
    setTitle("");
    setContent("");
    setSelectedTopic(null);
    setLocation("");
    setTags([]);
    setImages([]);
    setError("");
    setView("editor");
  }, []);

  function handleEmojiSelect(emoji: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent = content.substring(0, start) + emoji + content.substring(end);
    setContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  }

  function handleToggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function publish() {
    if (!user) return;

    if (mode === "report") {
      if (!title.trim()) {
        setError("Judul laporan wajib diisi.");
        return;
      }
      if (!selectedTopic) {
        setError("Topik laporan wajib dipilih.");
        return;
      }
      if (!location.trim()) {
        setError("Lokasi laporan wajib dipilih.");
        return;
      }
      if (!content.trim() && !images.length) {
        setError("Deskripsi atau lampiran foto wajib diisi.");
        return;
      }
    } else {
      // Standard post validation
      if (!content.trim() && !images.length) {
        setError("Tulis cerita atau lampirkan foto/video.");
        return;
      }
    }

    const fullContent =
      mode === "report" && title.trim()
        ? `${title.trim()}\n\n${content.trim()}`
        : content.trim();

    const topicId = selectedTopic?.id || "top_komunitas";
    const topicSlug = selectedTopic?.slug || "komunitas";
    const topicName = selectedTopic?.name || "Komunitas";

    const newPost: Post = {
      id: "",
      authorId: "",
      topicId,
      topicSlug,
      topicName,
      localKey: crypto.randomUUID(),
      authorKey: user.localKey,
      postedAt: Date.now(),
      kind: mode === "report" ? "report" : "general",
      anonymous: false,
      content: fullContent,
      province: location.split(",").pop()?.trim() || location,
      category: topicName,
      tags: tags.length ? tags : undefined,
      agencyKeys: [],
      images,
      upvotesCount: 0,
      vote: null,
      reposted: false,
      replies: [],
      resolutions: [],
    };

    setPosts((current) => [newPost, ...current]);
    published.current = true;
    deleteDraft(currentDraftId);
    onClose();
    router.push("/home");
  }

  // Can post check
  const isPostDisabled =
    mode === "report"
      ? !title.trim() || !selectedTopic || !location.trim() || (!content.trim() && !images.length)
      : !content.trim() && !images.length;

  return (
    <>
      <Dialog
        title={mode === "report" ? "Lapor Warga" : "Buat Postingan"}
        onClose={onClose}
        hideHeader
        className="composer-dialog-container"
      >
        <div className="composer-slider-container" data-view={view}>
          <div className="composer-slider-track">
            {/* Slide 1: Editor */}
            <div
              className="composer-slide composer-slide-editor"
              aria-hidden={view !== "editor"}
            >
              <div className="composer-card">
                {/* Split Layout: Avatar on Left, Inputs aligned with user name on Right */}
                <div className="composer-split-layout">
                  {/* Left Column: Avatar */}
                  <div className="composer-avatar-col">
                <Avatar name={user?.name ?? "User"} src={user?.image} />
              </div>

              {/* Right Column: Name, Topic/Status, Form Fields */}
              <div className="composer-main-col">
                {/* Header Row: User Name • Topic + Drafts */}
                <div className="composer-header-row">
                  <div className="composer-user-meta">
                    <span className="composer-user-name">
                      {user?.name ?? "User"}
                    </span>

                    {mode === "report" && (
                      <>
                        <span className="composer-dot">•</span>
                        <button
                          type="button"
                          className="composer-topic-trigger"
                          onClick={() => setShowTopicModal(true)}
                        >
                          {selectedTopic ? (
                            <span className="composer-topic-active">
                              {selectedTopic.name}{" "}
                              <ChevronDown size={15} strokeWidth={1.8} />
                            </span>
                          ) : (
                            <span className="composer-topic-empty">
                              <span className="required-star">*</span>Pilih Topik{" "}
                              <ChevronDown size={15} strokeWidth={1.8} />
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    className="composer-drafts-btn"
                    onClick={() => setView("drafts")}
                  >
                    Drafts {draftCount > 0 ? `(${draftCount})` : ""}
                  </button>
                </div>

                {/* Title Row (Report Mode ONLY) */}
                {mode === "report" && (
                  <div className="composer-title-row">
                    <span className="required-star">*</span>
                    <input
                      type="text"
                      autoFocus
                      className="composer-title-input"
                      placeholder="Judul laporan"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setError("");
                      }}
                    />
                  </div>
                )}

                {/* Body Textarea (Left-aligned with User Name) */}
                <div className="composer-body-row">
                  <textarea
                    ref={textareaRef}
                    autoFocus={mode === "post"}
                    className="composer-textarea"
                    placeholder={
                      mode === "report"
                        ? "Jelaskan permasalahan atau aduan warga..."
                        : "Ada cerita apa hari ini?"
                    }
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setError("");
                    }}
                    rows={4}
                  />

                  {/* Active Chips (Location, Tags) */}
                  {(location || tags.length > 0) && (
                    <div className="composer-chips-row">
                      {location && (
                        <div className="composer-chip composer-location-chip">
                          <MapPin size={13} />
                          <span>{location}</span>
                          <button
                            type="button"
                            onClick={() => setLocation("")}
                            aria-label="Hapus lokasi"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      {tags.map((tag) => (
                        <div key={tag} className="composer-chip composer-tag-chip">
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            aria-label={`Hapus tag ${tag}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Images/Videos */}
                  {images.length > 0 && (
                    <div className="composer-photo-grid">
                      {images.map((src, index) => {
                        const isVideo =
                          src.match(/\.(mp4|webm)($|\?)/i) || src.includes("video");
                        return (
                          <figure key={src} className="composer-photo-thumb">
                            {isVideo ? (
                              <video src={src} muted autoPlay loop playsInline />
                            ) : (
                              <img src={src} alt={`Lampiran ${index + 1}`} />
                            )}
                            <button
                              type="button"
                              aria-label={`Hapus media ${index + 1}`}
                              onClick={() => {
                                URL.revokeObjectURL(src);
                                setImages((current) =>
                                  current.filter((image) => image !== src),
                                );
                              }}
                            >
                              <X size={14} />
                            </button>
                          </figure>
                        );
                      })}
                    </div>
                  )}

                  {error && (
                    <p className="composer-error" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar: Spans FULL WIDTH across the card (aligned with card padding) */}
            <div className="composer-card-footer">
              <div className="composer-tools">
                <button
                  type="button"
                  className="composer-tool-btn"
                  title="Tambah foto/video"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={20} strokeWidth={1.8} />
                </button>
                {/* Native file input strictly hidden */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                  multiple
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    const message = mediaError(files, images.length);
                    if (message) setError(message);
                    else {
                      const added = files.map((file) =>
                        URL.createObjectURL(file),
                      );
                      urls.current.push(...added);
                      setImages((current) => [...current, ...added]);
                      setError("");
                    }
                    event.target.value = "";
                  }}
                />

                <button
                  type="button"
                  className={`composer-tool-btn ${location ? "active" : ""} ${
                    mode === "report" && !location ? "required-highlight" : ""
                  }`}
                  title={mode === "report" ? "*Pilih lokasi (wajib)" : "Pilih lokasi"}
                  onClick={() => setShowLocationModal(true)}
                >
                  <MapPin size={20} strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  className="composer-tool-btn"
                  title="Tambah emoji"
                  onClick={() => setShowEmojiModal(true)}
                >
                  <Smile size={20} strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  className={`composer-tool-btn ${tags.length > 0 ? "active" : ""}`}
                  title="Tambah tag"
                  onClick={() => setShowTagModal(true)}
                >
                  <TagIcon size={20} strokeWidth={1.8} />
                </button>
              </div>

              <div className="composer-footer-actions">
                <button
                  type="button"
                  className="composer-cancel-btn"
                  onClick={onClose}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="composer-post-btn"
                  disabled={isPostDisabled}
                  onClick={publish}
                >
                  {mode === "report" ? "Kirim Laporan" : "Posting"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 2: Drafts */}
        <div
          className="composer-slide composer-slide-drafts"
          aria-hidden={view !== "drafts"}
        >
          <DraftsView
            isActive={view === "drafts"}
            onBack={() => setView("editor")}
            onSelectDraft={handleSelectDraft}
            onCreateNew={handleCreateNew}
          />
        </div>
      </div>
    </div>
  </Dialog>

      {/* Sub-selector modals */}
      <TopicSelectorModal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        onSelect={(topic) => {
          setSelectedTopic(topic);
          setError("");
        }}
        selectedSlug={selectedTopic?.slug}
      />

      <LocationSelectorModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelect={(loc) => {
          setLocation(loc);
          setError("");
        }}
        selectedLocation={location}
      />

      <EmojiSelectorModal
        isOpen={showEmojiModal}
        onClose={() => setShowEmojiModal(false)}
        onSelect={handleEmojiSelect}
      />

      <TagSelectorModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        selectedTags={tags}
        onToggleTag={handleToggleTag}
      />
    </>
  );
}
