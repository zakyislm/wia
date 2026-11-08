/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import { useRef, useState, useEffect } from "react";
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

export function Composer({ onClose }: { onClose: () => void }) {
  const { user, setPosts } = useDemo();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  // Modal open states
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const published = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("kavi_composer_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.content) setContent(parsed.content);
        if (parsed.topic) setSelectedTopic(parsed.topic);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.tags) setTags(parsed.tags);
      } catch {}
    }
  }, []);

  useEffect(
    () => () => {
      if (!published.current)
        urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function handleSaveDraft() {
    localStorage.setItem(
      "kavi_composer_draft",
      JSON.stringify({
        title,
        content,
        topic: selectedTopic,
        location,
        tags,
      })
    );
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }

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
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function publish() {
    if (!user) return;
    if (!title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    if (!selectedTopic) {
      setError("Pilih topik terlebih dahulu.");
      return;
    }
    if (!content.trim() && !images.length) {
      setError("Isi teks atau lampirkan foto/video.");
      return;
    }

    const fullContent = `${title.trim()}\n\n${content.trim()}`;
    const newPost: Post = {
      id: "",
      authorId: "",
      topicId: selectedTopic.id,
      topicSlug: selectedTopic.slug,
      topicName: selectedTopic.name,
      localKey: crypto.randomUUID(),
      authorKey: user.localKey,
      postedAt: Date.now(),
      kind: location ? "report" : "general",
      anonymous: false,
      content: fullContent,
      province: location.split(",").pop()?.trim() || location,
      category: selectedTopic.name,
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
    localStorage.removeItem("kavi_composer_draft");
    onClose();
    router.push("/home");
  }

  return (
    <>
      <Dialog
        title="Buat Postingan"
        onClose={onClose}
        hideHeader
        className="composer-dialog-container"
      >
        <div className="composer-card">
          {/* Top Header Row: [Avatar] Name • *Select Topic ⌵    Drafts */}
          <div className="composer-card-header">
            <div className="composer-user-meta">
              <Avatar name={user?.name ?? "User"} src={user?.image} />
              <span className="composer-user-name">{user?.name ?? "User"}</span>
              <span className="composer-dot">•</span>
              <button
                type="button"
                className="composer-topic-trigger"
                onClick={() => setShowTopicModal(true)}
              >
                {selectedTopic ? (
                  <span className="composer-topic-active">
                    {selectedTopic.name} <ChevronDown size={15} strokeWidth={1.8} />
                  </span>
                ) : (
                  <span className="composer-topic-empty">
                    <span className="required-star">*</span>Select Topic{" "}
                    <ChevronDown size={15} strokeWidth={1.8} />
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              className="composer-drafts-btn"
              onClick={handleSaveDraft}
            >
              {draftSaved ? "Saved" : "Drafts"}
            </button>
          </div>

          {/* Title Row: *Title with underline */}
          <div className="composer-title-row">
            <span className="required-star">*</span>
            <input
              type="text"
              autoFocus
              className="composer-title-input"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Body Content Area */}
          <div className="composer-body-row">
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="What's happening around you?"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.max(180, e.target.scrollHeight)}px`;
              }}
              rows={4}
            />
          </div>

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
                  <span>#{tag}</span>
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
                const isVideo = src.match(/\.(mp4|webm)($|\?)/i) || src.includes("video");
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
                          current.filter((image) => image !== src)
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

          {/* Bottom Bar: Tools & Post Button */}
          <div className="composer-card-footer">
            <div className="composer-tools">
              <button
                type="button"
                className="composer-tool-btn"
                title="Tambah media"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={22} strokeWidth={1.6} />
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
                    const added = files.map((file) => URL.createObjectURL(file));
                    urls.current.push(...added);
                    setImages((current) => [...current, ...added]);
                    setError("");
                  }
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className={`composer-tool-btn ${location ? "active" : ""}`}
                title="Pilih lokasi"
                onClick={() => setShowLocationModal(true)}
              >
                <MapPin size={22} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                className="composer-tool-btn"
                title="Tambah emoji"
                onClick={() => setShowEmojiModal(true)}
              >
                <Smile size={22} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                className={`composer-tool-btn ${tags.length > 0 ? "active" : ""}`}
                title="Tambah tag"
                onClick={() => setShowTagModal(true)}
              >
                <TagIcon size={22} strokeWidth={1.6} />
              </button>
            </div>

            <button
              type="button"
              className="composer-post-btn"
              disabled={!title.trim() || !selectedTopic}
              onClick={publish}
            >
              Post
            </button>
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
