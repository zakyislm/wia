/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  MapPin,
  Smile,
  X,
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Repeat2,
  Upload,
  Timer,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/user/UserHoverCard";
import { Button } from "@/components/ui/Button";
import { VerifiedBadge, renderWithMentions } from "./PostCard";
import { useDemo } from "@/features/auth/DemoProvider";
import { getEffectiveReportStatus } from "@/features/discovery/filters";
import { mediaError } from "@/lib/validation";
import { LocationSelectorModal } from "@/components/selectors/LocationSelectorModal";
import { EmojiSelectorModal } from "@/components/selectors/EmojiSelectorModal";
import type { Post, Reply } from "@/types/models";

function isVideoMedia(src: string): boolean {
  return src.endsWith("#video") || /\.(mp4|webm)(\?|$)/i.test(src);
}

function formatElapsedSince(startTime?: number, now = Date.now()): string {
  if (!startTime) return "0m";
  const diffSec = Math.max(0, Math.floor((now - startTime) / 1000));
  if (diffSec < 60) return `${diffSec}d`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins < 60) return `${mins}m ${secs}d`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}j ${remMins}m`;
}

export function CommentThread({
  post,
  parentKey,
  depth = 0,
  onReply,
}: {
  post: Post;
  parentKey?: string;
  depth?: number;
  onReply?: (key: string) => void;
}) {
  const { people, user, updatePost } = useDemo();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionModeRole, setActionModeRole] = useState<
    "GOVERNMENT" | "INTERNAL" | null
  >(null);
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const composerRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const root = depth === 0;
  const isReport = post.kind === "report";
  const reportStatus = isReport ? getEffectiveReportStatus(post) : null;
  const isClosed =
    reportStatus === "completed" || reportStatus === "closed_internal";

  const actionReply: Reply | undefined = [...post.replies]
    .reverse()
    .find((r) => r.is_action_taken);

  // Live timer ticker when an action reply is active
  useEffect(() => {
    if (!root || !actionReply || isClosed) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [root, actionReply, isClosed]);

  // Handle "Take Action" triggered from PostMenu (Dot 3)
  useEffect(() => {
    if (!root || !post.pendingTakeActionRole) return;
    const targetRole = post.pendingTakeActionRole;
    setActionModeRole(targetRole);
    setReplyTo(undefined);
    setIsExpanded(true);
    updatePost(post.localKey, (current) => ({
      ...current,
      pendingTakeActionRole: null,
    }));
    setTimeout(() => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      textareaRef.current?.focus();
    }, 60);
  }, [root, post.pendingTakeActionRole, post.localKey, updatePost]);

  // Collapse back to normal when clicking outside the expanded comment input
  useEffect(() => {
    if (!isExpanded) return;
    function handlePointerDown(event: MouseEvent) {
      if (showLocationModal || showEmojiModal) return;
      const target = event.target as Node;
      if (composerRef.current && !composerRef.current.contains(target)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isExpanded, showLocationModal, showEmojiModal]);

  const replies = post.replies.filter((reply) => reply.parentKey === parentKey);

  const replyTargetAuthor = replyTo
    ? people.find(
        (person) =>
          person.localKey ===
          post.replies.find((r) => r.localKey === replyTo)?.authorKey,
      )
    : undefined;

  const actionActor =
    actionModeRole === "INTERNAL"
      ? people.find((p) => p.role === "INTERNAL") ??
        people.find((p) => p.localKey === "zaky_internal") ??
        user
      : people.find(
          (p) =>
            p.localKey === (post.agencyKeys[0] || "pupr") &&
            p.role === "GOVERNMENT",
        ) ??
        people.find((p) => p.role === "GOVERNMENT") ??
        user;

  function expandAndFocus() {
    setIsExpanded(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  function selectReply(key: string) {
    if (onReply) {
      onReply(key);
    } else {
      setReplyTo(key);
      expandAndFocus();
    }
  }

  function handleCancel() {
    images.forEach((src) => URL.revokeObjectURL(src.replace(/#video$/, "")));
    setText("");
    setImages([]);
    setLocation("");
    setError("");
    setReplyTo(undefined);
    setActionModeRole(null);
    setIsExpanded(false);
  }

  function handleInsertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      const next = text.slice(0, start) + emoji + text.slice(end);
      setText(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 10);
    } else {
      setText((prev) => prev + emoji);
    }
  }

  function send() {
    if (!user) return;
    const isTakingAction = !!actionModeRole;
    if (isTakingAction && images.length === 0) {
      setError("Tindak lanjut wajib menyertakan foto atau video bukti.");
      return;
    }
    if (!text.trim() && !images.length) return;

    const effectiveAuthorKey = isTakingAction
      ? actionActor?.localKey || user.localKey
      : user.localKey;

    updatePost(post.localKey, (current) => ({
      ...current,
      reportStatus: isTakingAction ? "in_progress" : current.reportStatus,
      replies: [
        ...current.replies,
        {
          id: "",
          postId: "",
          authorId: "",
          parentId: "",
          localKey: crypto.randomUUID(),
          authorKey: effectiveAuthorKey,
          parentKey: isTakingAction ? undefined : (replyTo ?? parentKey),
          content: text.trim(),
          postedAt: Date.now(),
          images: images.length ? images : undefined,
          location: location || undefined,
          is_action_taken: isTakingAction ? true : undefined,
          actionRole: isTakingAction ? actionModeRole : undefined,
          actionTakenAt: isTakingAction ? Date.now() : undefined,
          upvotesCount: isTakingAction ? 1 : 0,
          downvotesCount: 0,
          vote: null,
        },
      ],
    }));
    setText("");
    setImages([]);
    setLocation("");
    setError("");
    setReplyTo(undefined);
    setActionModeRole(null);
    setIsExpanded(false);
  }

  function voteReply(replyKey: string, direction: "UP" | "DOWN") {
    updatePost(post.localKey, (current) => ({
      ...current,
      replies: current.replies.map((r) =>
        r.localKey === replyKey
          ? {
              ...r,
              vote: r.vote === direction ? null : direction,
            }
          : r,
      ),
    }));
  }

  function toggleRepostReply(replyKey: string) {
    updatePost(post.localKey, (current) => ({
      ...current,
      replies: current.replies.map((r) =>
        r.localKey === replyKey ? { ...r, reposted: !r.reposted } : r,
      ),
    }));
  }

  function scrollToActionResponse() {
    if (!actionReply) return;
    const el = document.getElementById(`comment-${actionReply.localKey}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedKey(actionReply.localKey);
      setTimeout(() => setHighlightedKey(null), 2000);
    }
  }

  // Compute progress bar stats from the `is_action_taken` comment's upvotes vs downvotes
  const actionUpvotes = actionReply
    ? (actionReply.upvotesCount ?? 0) + (actionReply.vote === "UP" ? 1 : 0)
    : 0;
  const actionDownvotes = actionReply
    ? (actionReply.downvotesCount ?? 0) + (actionReply.vote === "DOWN" ? 1 : 0)
    : 0;
  const actionTotalVotes = actionUpvotes + actionDownvotes;
  const actionApprovalPercent =
    actionTotalVotes > 0
      ? Math.round((actionUpvotes / actionTotalVotes) * 100)
      : 100;

  const closedRole =
    post.closedByRole || actionReply?.actionRole || "GOVERNMENT";
  const closerKey =
    post.closedByKey ||
    actionReply?.authorKey ||
    (closedRole === "INTERNAL" ? "zaky_internal" : "pupr");
  const closerPerson =
    people.find((p) => p.localKey === closerKey) ?? people[0];

  const isSubmitDisabled = actionModeRole
    ? images.length === 0
    : !text.trim() && !images.length;

  return (
    <div className={root ? "comments" : "comment-children"}>
      {root && (
        <div className="comment-composer-section">
          {/* 1. Active Validation Progress Bar (Above Tulis balasan... when Diproses) */}
          {isReport && actionReply && !isClosed && (
            <div className="action-validation-box">
              <div className="action-validation-header">
                <div className="action-validation-title">
                  <strong>Validasi Tindak Lanjut</strong>
                  <span className="action-validation-stats">
                    {actionApprovalPercent}% ({actionUpvotes} ↑ ·{" "}
                    {actionDownvotes} ↓)
                  </span>
                </div>
                <div className="action-validation-meta">
                  <span
                    className="action-validation-timer"
                    title="Waktu sejak aparat mengambil tindakan"
                  >
                    <Timer size={13} strokeWidth={1.8} />
                    <span>
                      {formatElapsedSince(
                        actionReply.actionTakenAt ?? actionReply.postedAt,
                        now,
                      )}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="action-validation-link"
                    onClick={scrollToActionResponse}
                  >
                    Lihat Respon
                  </button>
                  <button
                    type="button"
                    className="action-validation-finish-btn"
                    onClick={() => {
                      const role = actionReply.actionRole || "GOVERNMENT";
                      updatePost(post.localKey, (current) => ({
                        ...current,
                        reportStatus:
                          role === "INTERNAL" ? "closed_internal" : "completed",
                        closedByKey: actionReply.authorKey,
                        closedByRole: role,
                        closedAt: Date.now(),
                      }));
                    }}
                  >
                    Tutup Laporan
                  </button>
                </div>
              </div>
              <div
                className="action-progress-slider"
                role="progressbar"
                aria-valuenow={actionApprovalPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Persentase persetujuan tindak lanjut"
              >
                <div
                  className="action-progress-fill"
                  style={{ width: `${actionApprovalPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* 2. Either Closed Banner (Image 1) OR Comment Input (Image 2) */}
          {isReport && isClosed && !actionModeRole ? (
            <div className="closed-thread-banner">
              <div className="closed-thread-left">
                <span className="closed-thread-text">
                  This thread has been closed by
                </span>
                <span className="closed-thread-actor">
                  <Avatar name={closerPerson.name} src={closerPerson.image} />
                  <strong>{closerPerson.name}</strong>
                  <VerifiedBadge role={closedRole} size={18} />
                </span>
              </div>
              <button
                type="button"
                className="closed-thread-view-btn"
                onClick={scrollToActionResponse}
              >
                View Response
              </button>
            </div>
          ) : !isExpanded ? (
            <button
              type="button"
              className="comment-composer-inactive"
              onClick={expandAndFocus}
            >
              <span>{text.trim() ? text : "Tulis balasan..."}</span>
            </button>
          ) : (
            <form
              ref={composerRef}
              className="comment-composer-active"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              {actionModeRole && actionActor && (
                <div className="comment-replying-banner comment-action-mode-banner">
                  <span className="comment-action-mode-label">
                    Tindak Lanjut Resmi sebagai{" "}
                    <strong>{actionActor.name}</strong>
                    <VerifiedBadge role={actionModeRole} size={15} />
                    <span className="comment-action-media-req">
                      · Wajib foto/video
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActionModeRole(null);
                      setError("");
                    }}
                    aria-label="Batal mode tindak lanjut"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {!actionModeRole && replyTargetAuthor && (
                <div className="comment-replying-banner">
                  <span>
                    Membalas{" "}
                    <strong>
                      @{replyTargetAuthor.username || replyTargetAuthor.name}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(undefined)}
                    aria-label="Batal balas spesifik"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                rows={3}
                className="comment-composer-textarea"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setError("");
                }}
                placeholder={
                  actionModeRole
                    ? "Tulis keterangan tindak lanjut & lampirkan bukti foto/video..."
                    : "Tulis balasan..."
                }
              />

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

              {images.length > 0 && (
                <div className="composer-photo-grid">
                  {images.map((src, index) => (
                    <figure key={src} className="composer-photo-thumb">
                      {isVideoMedia(src) ? (
                        <video src={src} controls muted playsInline />
                      ) : (
                        <img src={src} alt={`Lampiran balasan ${index + 1}`} />
                      )}
                      <button
                        type="button"
                        aria-label={`Hapus media ${index + 1}`}
                        onClick={() => {
                          URL.revokeObjectURL(src.replace(/#video$/, ""));
                          setImages((current) =>
                            current.filter((img) => img !== src),
                          );
                        }}
                      >
                        <X size={14} />
                      </button>
                    </figure>
                  ))}
                </div>
              )}

              {error && (
                <p className="composer-error" role="alert">
                  {error}
                </p>
              )}

              <div className="comment-composer-footer">
                <div className="composer-tools">
                  <button
                    type="button"
                    className={`composer-tool-btn ${actionModeRole && images.length === 0 ? "composer-tool-btn--highlight" : ""}`}
                    title="Tambah foto atau video"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon size={20} strokeWidth={1.8} />
                  </button>
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
                        const added = files.map((file) => {
                          const url = URL.createObjectURL(file);
                          return file.type.startsWith("video/") ||
                            /\.(mp4|webm)$/i.test(file.name)
                            ? `${url}#video`
                            : url;
                        });
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
                </div>

                <div className="comment-composer-actions">
                  <button
                    type="button"
                    className="comment-cancel-btn"
                    onClick={handleCancel}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="comment-post-btn"
                    disabled={isSubmitDisabled}
                    title={
                      actionModeRole && images.length === 0
                        ? "Wajib sertakan foto atau video untuk tindak lanjut"
                        : undefined
                    }
                  >
                    Posting
                  </button>
                </div>
              </div>
            </form>
          )}

          <LocationSelectorModal
            isOpen={showLocationModal}
            selectedLocation={location}
            onSelect={(loc) => setLocation(loc)}
            onClose={() => setShowLocationModal(false)}
          />

          <EmojiSelectorModal
            isOpen={showEmojiModal}
            onSelect={handleInsertEmoji}
            onClose={() => setShowEmojiModal(false)}
          />
        </div>
      )}

      {!replies.length && root && (
        <p className="muted comment-empty-state">
          Belum ada komentar pada cabang ini. Mulai percakapannya.
        </p>
      )}
      {replies.map((reply) => {
        const author =
          people.find((person) => person.localKey === reply.authorKey) ??
          people[0];
        const hidden = collapsed.includes(reply.localKey);
        const childrenReplies = post.replies.filter(
          (child) => child.parentKey === reply.localKey,
        );
        const children = childrenReplies.length > 0;
        const badgeRole =
          reply.actionRole ??
          (author.role === "GOVERNMENT" || author.role === "INTERNAL"
            ? author.role
            : undefined);

        const upCount =
          (reply.upvotesCount ?? 0) + (reply.vote === "UP" ? 1 : 0);
        const downCount =
          (reply.downvotesCount ?? 0) + (reply.vote === "DOWN" ? 1 : 0);

        return (
          <article
            className={`comment ${children && !hidden && depth < 2 ? "comment--connected" : ""} ${reply.is_action_taken ? "comment--action-taken" : ""} ${highlightedKey === reply.localKey ? "comment--highlighted" : ""}`}
            id={`comment-${reply.localKey}`}
            key={reply.localKey}
          >
            <div className="comment-body">
              <div className="comment-avatar-col">
                <UserHoverCard person={author}>
                  <Link
                    href={`/profile/${author.username || author.localKey}`}
                    className="post-avatar-link"
                  >
                    <Avatar name={author.name} src={author.image} />
                  </Link>
                </UserHoverCard>
              </div>
              <div className="comment-author-line">
                <strong className="comment-author-name">
                  <UserHoverCard person={author}>
                    <Link
                      href={`/profile/${author.username || author.localKey}`}
                    >
                      {author.name}
                    </Link>
                  </UserHoverCard>
                  <VerifiedBadge role={badgeRole} size={15} />
                </strong>
                <UserHoverCard person={author}>
                  <Link
                    href={`/profile/${author.username || author.localKey}`}
                    className="comment-author-handle"
                  >
                    @{author.username}
                  </Link>
                </UserHoverCard>
                {reply.is_action_taken && (
                  <span className="comment-action-marker">Tindak Lanjut</span>
                )}
              </div>
              {reply.content && (
                <p className="comment-text">
                  {renderWithMentions(reply.content, people)}
                </p>
              )}
              {reply.location && (
                <p className="small muted comment-location-line">
                  <MapPin size={12} /> {reply.location}
                </p>
              )}
              {reply.images && reply.images.length > 0 && (
                <div className="photo-grid comment-photo-grid">
                  {reply.images.map((src, i) =>
                    isVideoMedia(src) ? (
                      <video
                        src={src}
                        controls
                        playsInline
                        key={src}
                        className="comment-video-media"
                      />
                    ) : (
                      <img src={src} alt={`Foto komentar ${i + 1}`} key={src} />
                    ),
                  )}
                </div>
              )}
              <footer className="post-actions comment-post-actions">
                <Button
                  variant="ghost"
                  aria-label="Upvote komentar"
                  aria-pressed={reply.vote === "UP"}
                  onClick={() => voteReply(reply.localKey, "UP")}
                >
                  <ArrowBigUp size={18} strokeWidth={1.8} />
                  {upCount > 0 && <small>{upCount}</small>}
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Downvote komentar"
                  aria-pressed={reply.vote === "DOWN"}
                  onClick={() => voteReply(reply.localKey, "DOWN")}
                >
                  <ArrowBigDown size={18} strokeWidth={1.8} />
                  {downCount > 0 && <small>{downCount}</small>}
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Balas komentar"
                  onClick={() => selectReply(reply.localKey)}
                >
                  <MessageCircle size={18} strokeWidth={1.8} />
                  {childrenReplies.length > 0 && (
                    <small>{childrenReplies.length}</small>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Repost komentar"
                  aria-pressed={!!reply.reposted}
                  onClick={() => toggleRepostReply(reply.localKey)}
                >
                  <Repeat2 size={18} strokeWidth={1.8} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Salin tautan komentar"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/posts/${post.localKey}#comment-${reply.localKey}`,
                      );
                    } catch {
                      // ignore clipboard error in demo
                    }
                  }}
                >
                  <Upload size={18} strokeWidth={1.8} />
                </Button>
                {children && (
                  <Button
                    variant="ghost"
                    aria-expanded={!hidden}
                    onClick={() =>
                      setCollapsed((current) =>
                        hidden
                          ? current.filter((key) => key !== reply.localKey)
                          : [...current, reply.localKey],
                      )
                    }
                  >
                    <small>{hidden ? "Buka balasan" : "Lipat"}</small>
                  </Button>
                )}
              </footer>
            </div>
            {children &&
              !hidden &&
              (depth >= 2 ? (
                <Link
                  className="agency-tags comment-continue"
                  href={`/posts/${post.localKey}/branch/${reply.localKey}`}
                >
                  Lanjutkan percakapan →
                </Link>
              ) : (
                <CommentThread
                  post={post}
                  parentKey={reply.localKey}
                  depth={depth + 1}
                  onReply={selectReply}
                />
              ))}
          </article>
        );
      })}
    </div>
  );
}
