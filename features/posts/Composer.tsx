/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  MapPin,
  Smile,
  ChevronDown,
  X,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Avatar";
import {
  MediaAttachmentPreview,
  createMediaPreviewUrl,
} from "@/components/ui/MediaGallery";
import { useDemo } from "@/features/auth/DemoProvider";
import {
  extractClipboardMediaFiles,
  mediaError,
} from "@/lib/validation";
import type { Post, Topic } from "@/types/models";
import { TopicSelectorModal } from "@/components/selectors/TopicSelectorModal";
import { LocationSelectorModal } from "@/components/selectors/LocationSelectorModal";
import { EmojiSelectorModal } from "@/components/selectors/EmojiSelectorModal";
import { InlineTokenSuggest } from "@/components/selectors/InlineTokenSuggest";
import { DraftsView } from "./DraftsView";
import {
  type ComposerDraft,
  saveDraft,
  deleteDraft,
  loadDrafts,
} from "./draftsStorage";

const TITLE_MAX_LEN = 100;
const CONTENT_MAX_LEN = 500;

interface ComposerProps {
  onClose: () => void;
  initialMode?: "post" | "report";
}

export function Composer({ onClose, initialMode = "report" }: ComposerProps) {
  const { user, people, setPosts, workspace, showToast } = useDemo();

  // Mode: "post" or "report"
  const [mode, setMode] = useState<"post" | "report">(initialMode);
  // View: "editor" or "drafts"
  const [view, setView] = useState<"editor" | "drafts">("editor");

  const [currentDraftId, setCurrentDraftId] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(
    () => initialMode === "report" && workspace.privacyDefaultAnonymous,
  );
  const [activeField, setActiveField] = useState<"title" | "content" | null>(
    initialMode === "report" ? "title" : "content",
  );
  const [shakeField, setShakeField] = useState<"title" | "content" | null>(null);
  const [error, setError] = useState("");
  const [draftCount, setDraftCount] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);

  // Selector modals
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const published = useRef(false);
  const baselineRef = useRef({
    mode: initialMode,
    title: "",
    content: "",
    topicId: null as string | null,
    location: "",
    tagsKey: "",
    imagesKey: "",
    anonymous: initialMode === "report" && workspace.privacyDefaultAnonymous,
  });

  // Auto-resize report title textarea as it wraps (capped at max-height via CSS)
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 68)}px`;
  }, [title, mode, view]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (images.length > 0) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    } else {
      el.style.height = "";
    }
  }, [content, images.length, view]);

  // Update draft count on mount and view changes
  useEffect(() => {
    setDraftCount(loadDrafts().length);
  }, [view]);

  // Clean up object URLs
  useEffect(
    () => () => {
      if (!published.current)
        urls.current.forEach((url) =>
          URL.revokeObjectURL(url.replace(/#video$/, "")),
        );
    },
    [],
  );

  // Handle selecting a draft from DraftsView
  const handleSelectDraft = useCallback((draft: ComposerDraft) => {
    const nextAnon = Boolean(draft.anonymous);
    const nextTitle = draft.title || "";
    const nextContent = draft.content || "";
    const nextTopic = draft.topic || null;
    const nextLocation = draft.location || "";
    const nextTags = draft.tags || [];
    const nextImages = draft.images || [];
    setCurrentDraftId(draft.id);
    setMode(draft.mode);
    setTitle(nextTitle);
    setContent(nextContent);
    setSelectedTopic(nextTopic);
    setLocation(nextLocation);
    setTags(nextTags);
    setImages(nextImages);
    setIsAnonymous(nextAnon);
    baselineRef.current = {
      mode: draft.mode,
      title: nextTitle,
      content: nextContent,
      topicId: nextTopic?.id ?? null,
      location: nextLocation,
      tagsKey: nextTags.join("|"),
      imagesKey: nextImages.join("|"),
      anonymous: nextAnon,
    };
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
    setIsAnonymous(false);
    baselineRef.current = {
      mode,
      title: "",
      content: "",
      topicId: null,
      location: "",
      tagsKey: "",
      imagesKey: "",
      anonymous: false,
    };
    setError("");
    setView("editor");
  }, [mode]);

  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerShake(field: "title" | "content") {
    setShakeField(null);
    requestAnimationFrame(() => {
      setShakeField(field);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setShakeField(null);
      }, 300);
    });
  }

  function handleEmojiSelect(emoji: string) {
    const textarea = textareaRef.current;
    if (content.length + emoji.length > CONTENT_MAX_LEN) {
      triggerShake("content");
      return;
    }
    if (!textarea) {
      setContent((prev) => (prev + emoji).slice(0, CONTENT_MAX_LEN));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent = (
      content.substring(0, start) +
      emoji +
      content.substring(end)
    ).slice(0, CONTENT_MAX_LEN);
    setContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      setActiveField("content");
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
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

    // Extract inline #hashtags from content
    const inlineTags = Array.from(
      fullContent.matchAll(/#([a-zA-Z0-9_]+)/g),
      (m) => m[1],
    );
    const mergedTags = Array.from(
      new Set([
        ...tags.map((t) => t.replace(/^#/, "")),
        ...inlineTags,
      ]),
    );

    // Extract inline @agency mentions from content
    const inlineMentions = Array.from(
      fullContent.matchAll(/@([a-zA-Z0-9_]+)/g),
      (m) => m[1].toLowerCase(),
    );
    const matchedAgencies = people
      .filter(
        (p) =>
          p.role === "GOVERNMENT" &&
          (inlineMentions.includes(p.username.toLowerCase()) ||
            inlineMentions.includes(p.localKey.toLowerCase())),
      )
      .map((p) => p.localKey);

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
      reportStatus: mode === "report" ? "waiting" : undefined,
      anonymous: isAnonymous,
      content: fullContent,
      province: location.split(",").pop()?.trim() || location,
      locationName: location,
      category: topicName,
      tags: mergedTags.length ? mergedTags : undefined,
      agencyKeys: matchedAgencies,
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
    showToast(
      mode === "report"
        ? "Laporan berhasil dipublikasikan."
        : "Postingan berhasil dipublikasikan.",
      "success",
    );
    onClose();
  }

  function hasUnsavedChanges(): boolean {
    const base = baselineRef.current;
    const hasContent = Boolean(
      title.trim() ||
        content.trim() ||
        location.trim() ||
        selectedTopic ||
        tags.length > 0 ||
        images.length > 0,
    );
    if (!hasContent) return false;
    return (
      mode !== base.mode ||
      title !== base.title ||
      content !== base.content ||
      (selectedTopic?.id ?? null) !== base.topicId ||
      location !== base.location ||
      tags.join("|") !== base.tagsKey ||
      images.join("|") !== base.imagesKey ||
      isAnonymous !== base.anonymous
    );
  }

  function handleRequestClose() {
    if (hasUnsavedChanges()) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  function handleSaveDraftAndClose() {
    saveDraft({
      id: currentDraftId,
      mode,
      title,
      content,
      topic: selectedTopic,
      location,
      tags,
      images,
      anonymous: isAnonymous,
      updatedAt: Date.now(),
    });
    published.current = true;
    setConfirmClose(false);
    showToast("Draf disimpan.", "success");
    onClose();
  }

  function handleDiscardAndClose() {
    setConfirmClose(false);
    onClose();
  }

  // Can post check
  const isPostDisabled =
    mode === "report"
      ? !title.trim() ||
        !selectedTopic ||
        !location.trim() ||
        (!content.trim() && !images.length)
      : !content.trim() && !images.length;

  const activeRemaining =
    activeField === "title" && mode === "report"
      ? TITLE_MAX_LEN - title.length
      : activeField === "content"
        ? CONTENT_MAX_LEN - content.length
        : null;
  const showCharIndicator =
    activeRemaining !== null && activeRemaining <= 3;

  function appendMediaFiles(files: File[]) {
    if (files.length === 0) return;
    const message = mediaError(files, images.length);
    if (message) {
      setError(message);
      return;
    }
    const added = files.map(createMediaPreviewUrl);
    urls.current.push(...added);
    setImages((current) => [...current, ...added]);
    setError("");
  }

  function handlePasteMedia(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = extractClipboardMediaFiles(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    appendMediaFiles(files);
  }

  return (
    <>
      <Dialog
        title={mode === "report" ? "Lapor Warga" : "Buat Postingan"}
        onClose={handleRequestClose}
        hideHeader
        className={`composer-dialog-container ${view === "drafts" ? "composer-dialog-container--drafts" : ""} ${view === "editor" && images.length > 0 ? "composer-dialog-container--has-media" : ""}`.trim()}
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
                                  <span className="required-star">*</span>Pilih
                                  Topik{" "}
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
                        Draf {draftCount > 0 ? `(${draftCount})` : ""}
                      </button>
                    </div>

                    {/* Title Row (Report Mode ONLY) */}
                    {mode === "report" && (
                      <div
                        className={`composer-title-row ${shakeField === "title" ? "is-shaking" : ""}`}
                      >
                        <span className="required-star">*</span>
                        <textarea
                          ref={titleRef}
                          rows={1}
                          autoFocus
                          className="composer-title-input"
                          placeholder="Judul laporan"
                          value={title}
                          onPaste={handlePasteMedia}
                          onFocus={() => setActiveField("title")}
                          onBlur={() =>
                            setActiveField((prev) =>
                              prev === "title" ? null : prev,
                            )
                          }
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(
                              /[\r\n]+/g,
                              " ",
                            );
                            if (cleaned.length > TITLE_MAX_LEN) {
                              setTitle(cleaned.slice(0, TITLE_MAX_LEN));
                              triggerShake("title");
                            } else {
                              setTitle(cleaned);
                            }
                            setError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              textareaRef.current?.focus();
                              return;
                            }
                            const el = e.currentTarget;
                            const hasSelection =
                              el.selectionStart !== el.selectionEnd;
                            const isPrintable =
                              e.key.length === 1 &&
                              !e.ctrlKey &&
                              !e.metaKey &&
                              !e.altKey;
                            if (
                              isPrintable &&
                              !hasSelection &&
                              title.length >= TITLE_MAX_LEN
                            ) {
                              e.preventDefault();
                              triggerShake("title");
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Body Textarea (Left-aligned with User Name) */}
                    <div className="composer-body-row">
                      <textarea
                        ref={textareaRef}
                        autoFocus={mode === "post"}
                        className={`composer-textarea ${shakeField === "content" ? "is-shaking" : ""}`}
                        placeholder={
                          mode === "report"
                            ? "Ceritakan kendala warga dengan jelas... (ketik # untuk tagar atau @ untuk sebut akun)"
                            : "Ada cerita apa hari ini? (ketik # untuk tagar)"
                        }
                        value={content}
                        onPaste={handlePasteMedia}
                        onFocus={() => setActiveField("content")}
                        onBlur={() =>
                          setActiveField((prev) =>
                            prev === "content" ? null : prev,
                          )
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length > CONTENT_MAX_LEN) {
                            setContent(val.slice(0, CONTENT_MAX_LEN));
                            triggerShake("content");
                          } else {
                            setContent(val);
                          }
                          setError("");
                        }}
                        onKeyDown={(e) => {
                          const el = e.currentTarget;
                          const hasSelection =
                            el.selectionStart !== el.selectionEnd;
                          const isPrintable =
                            (e.key.length === 1 || e.key === "Enter") &&
                            !e.ctrlKey &&
                            !e.metaKey &&
                            !e.altKey;
                          if (
                            isPrintable &&
                            !hasSelection &&
                            content.length >= CONTENT_MAX_LEN
                          ) {
                            e.preventDefault();
                            triggerShake("content");
                          }
                        }}
                        rows={images.length > 0 ? 1 : 4}
                      />

                      {/* Active Chips (Location) */}
                      {location && (
                        <div className="composer-chips-row">
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
                        </div>
                      )}

                      {/* Attached Images/Videos */}
                      <MediaAttachmentPreview
                        media={images}
                        altPrefix="Lampiran"
                        onRemove={(src) => {
                          URL.revokeObjectURL(src.replace(/#video$/, ""));
                          setImages((current) =>
                            current.filter((image) => image !== src),
                          );
                        }}
                      />

                      {error && (
                        <p className="composer-error" role="alert">
                          {error}
                        </p>
                      )}
                    </div>

                    <InlineTokenSuggest
                      value={content}
                      textareaRef={textareaRef}
                      onInsert={(nextValue, nextCursor) => {
                        setContent(nextValue);
                        setTimeout(() => {
                          const el = textareaRef.current;
                          if (el) {
                            el.focus();
                            el.setSelectionRange(nextCursor, nextCursor);
                          }
                        }, 10);
                      }}
                    />
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
                        appendMediaFiles(Array.from(event.target.files ?? []));
                        event.target.value = "";
                      }}
                    />

                    <button
                      type="button"
                      className={`composer-tool-btn ${location ? "active" : ""} ${
                        mode === "report" && !location
                          ? "required-highlight"
                          : ""
                      }`}
                      title={
                        mode === "report"
                          ? "*Pilih lokasi (wajib)"
                          : "Pilih lokasi"
                      }
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

                    {/* Anonymous Switch + Help Tooltip grouped with left tools */}
                    <div className="composer-anon-control">
                      <span
                        className={`composer-anon-icon ${isAnonymous ? "is-active" : ""}`}
                        aria-hidden="true"
                      >
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 18a2 2 0 0 0-4 0" />
                          <path d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11" />
                          <path d="M2 11h20" />
                          <circle cx="17" cy="18" r="3" />
                          <circle cx="7" cy="18" r="3" />
                        </svg>
                      </span>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isAnonymous}
                        aria-label="Posting secara anonim"
                        className={`composer-anon-switch ${isAnonymous ? "is-on" : ""}`}
                        onClick={() => setIsAnonymous((prev) => !prev)}
                      >
                        <span className="composer-anon-switch-thumb" />
                      </button>

                      <div className="composer-anon-help-wrap">
                        <button
                          type="button"
                          className="composer-anon-help"
                          aria-label="Info posting secara anonim"
                        >
                          ?
                        </button>
                        <div className="composer-anon-tooltip" role="tooltip">
                          Posting secara anonim
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center: Dynamic Remaining Character Indicator (<= 3 chars on active field) */}
                  <div className="composer-char-center-slot">
                    {showCharIndicator && (
                      <span
                        className={`composer-char-indicator ${activeRemaining === 0 ? "is-zero" : ""} ${shakeField ? "is-shaking" : ""}`}
                        aria-live="polite"
                      >
                        {activeRemaining}
                      </span>
                    )}
                  </div>

                  <div className="composer-footer-actions">
                    <button
                      type="button"
                      className="composer-cancel-btn"
                      onClick={handleRequestClose}
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

      {confirmClose && (
        <Dialog
          title="Simpan ke draf?"
          onClose={() => setConfirmClose(false)}
          className="composer-confirm-dialog"
        >
          <div className="composer-confirm-body">
            <p>
              Tulisan ini belum dipublikasikan. Simpan sebagai draf sebelum
              menutup?
            </p>
            <div className="composer-confirm-actions">
              <button
                type="button"
                className="composer-cancel-btn"
                onClick={() => setConfirmClose(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="settings-danger-btn"
                onClick={handleDiscardAndClose}
              >
                Buang
              </button>
              <button
                type="button"
                className="composer-post-btn"
                onClick={handleSaveDraftAndClose}
              >
                Simpan
              </button>
            </div>
          </div>
        </Dialog>
      )}

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
    </>
  );
}
