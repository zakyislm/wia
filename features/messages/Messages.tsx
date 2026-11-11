/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  SquarePen,
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Smile,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import {
  MediaGallery,
  isVideoMedia,
  uploadMediaFileToR2,
} from "@/components/ui/MediaGallery";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { EmojiSelectorModal } from "@/components/selectors/EmojiSelectorModal";
import { useSubtabTransition } from "@/components/ui/LazyFeed";
import { SkeletonMessageList } from "@/components/ui/Skeleton";
import { consumePageSwitchSlot } from "@/lib/navigationGuard";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { mediaError } from "@/lib/validation";
import { formatPageTitle, formatSearchTitle } from "@/lib/title";

type ChatSubtab = "all" | "unread" | "sent";

export function Messages({ selectedKey }: { selectedKey?: string }) {
  const { user, people, workspace, setWorkspace, following, setFollowing, showToast } =
    useDemo();
  const pathname = usePathname() || "/messages";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const activeQuery = query === "" ? "" : debouncedQuery;
  const [subtab, setSubtab] = useState<ChatSubtab>("all");
  const { isSubtabLoading, triggerSubtabSkeleton } = useSubtabTransition(
    subtab,
    {
      onRateLimited: () =>
        showToast("Tunggu 1 detik sebelum ganti tab.", "info"),
    },
  );
  const [newMessage, setNew] = useState(false);

  function selectChatSubtab(nextTab: ChatSubtab) {
    if (!triggerSubtabSkeleton(nextTab)) return;
    setSubtab(nextTab);
  }
  const [recipientQuery, setRecipientQuery] = useState("");
  const debouncedRecipientQuery = useDebouncedValue(recipientQuery, 200);
  const activeRecipientQuery =
    recipientQuery === "" ? "" : debouncedRecipientQuery;
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [showEmojiModal, setShowEmojiModal] = useState(false);

  const bottom = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversations = useMemo(
    () =>
      workspace.conversations.filter(
        (item) => item.partnerKey !== user?.localKey,
      ),
    [workspace.conversations, user?.localKey],
  );

  const selected = conversations.find((item) => item.localKey === selectedKey);
  const partner = people.find(
    (person) => person.localKey === selected?.partnerKey,
  );

  // Mark selected conversation as read when opened
  useEffect(() => {
    if (!selectedKey) return;
    const target = workspace.conversations.find(
      (c) => c.localKey === selectedKey,
    );
    if (target?.unread) {
      setWorkspace((current) => ({
        ...current,
        conversations: current.conversations.map((item) =>
          item.localKey === selectedKey ? { ...item, unread: false } : item,
        ),
      }));
    }
  }, [selectedKey, workspace.conversations, setWorkspace]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [selected?.messages.length]);

  const counts = useMemo(() => {
    const all = conversations.length;
    const unread = conversations.filter((c) => Boolean(c.unread)).length;
    const sent = conversations.filter((c) =>
      c.messages.some((m) => m.outgoing),
    ).length;
    return { all, unread, sent };
  }, [conversations]);

  const filtered = useMemo(() => {
    const cleanQuery = activeQuery.toLowerCase();
    return conversations.filter((item) => {
      if (subtab === "unread" && !item.unread) return false;
      if (subtab === "sent" && !item.messages.some((m) => m.outgoing)) {
        return false;
      }
      const person = people.find((p) => p.localKey === item.partnerKey);
      return `${person?.name ?? ""} ${person?.username ?? ""} ${item.messages.at(-1)?.text ?? ""}`
        .toLowerCase()
        .includes(cleanQuery);
    });
  }, [conversations, subtab, people, activeQuery]);

  function open(partnerKey: string) {
    if (!workspace.conversations.some((item) => item.partnerKey === partnerKey))
      setWorkspace((current) => ({
        ...current,
        conversations: [
          {
            id: "",
            localKey: partnerKey,
            partnerKey,
            unread: false,
            messages: [],
          },
          ...current.conversations,
        ],
      }));
    setNew(false);
    setRecipientQuery("");
    router.push(`/messages/${partnerKey}`);
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

  function sendMessage() {
    if (!selected) return;
    const content = text.trim();
    if (!content && images.length === 0) return;

    const sentImages = images.length > 0 ? [...images] : undefined;
    setWorkspace((current) => ({
      ...current,
      conversations: current.conversations.map((item) =>
        item.localKey === selected.localKey
          ? {
              ...item,
              unread: false,
              messages: [
                ...item.messages,
                {
                  id: "",
                  authorId: "",
                  localKey: crypto.randomUUID(),
                  outgoing: true,
                  text: content,
                  images: sentImages,
                  time: new Date().toLocaleTimeString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ],
            }
          : item,
      ),
    }));
    setText("");
    setImages([]);
    setError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  const isFollowingPartner = partner
    ? following.includes(partner.localKey)
    : false;

  return (
    <ProductShell
      title="Obrolan"
      active="messages"
      wide
      documentTitle={
        selected && partner
          ? formatPageTitle(`Obrolan dengan ${partner.name}`)
          : activeQuery.trim()
            ? formatSearchTitle(activeQuery, "Obrolan")
            : formatPageTitle("Obrolan")
      }
    >
      <div className={`messaging ${selectedKey ? "has-conversation" : ""}`}>
        {/* Left Pane: Conversation List */}
        <section className="conversation-list" aria-label="Daftar percakapan">
          <h1 className="sr-only">Obrolan</h1>

          {/* Top Row: Search Box + Compose Button */}
          <div className="chat-list-top">
            <label className="chat-search-box">
              <Search size={16} className="chat-search-icon" />
              <span className="sr-only">Cari percakapan</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari obrolan"
              />
            </label>
            <button
              type="button"
              className="chat-compose-btn"
              aria-label="Pesan baru"
              title="Pesan baru"
              onClick={() => setNew(true)}
            >
              <SquarePen size={18} strokeWidth={1.8} />
            </button>
          </div>

          {/* Subtabs matching Notification Page */}
          <div className="chat-subtabs-wrap">
            <div
              className="notif-segmented-control chat-segmented-control"
              role="tablist"
              aria-label="Filter percakapan"
            >
              <button
                type="button"
                role="tab"
                aria-selected={subtab === "all"}
                className={`notif-segment-btn ${subtab === "all" ? "active" : ""}`}
                onClick={() => selectChatSubtab("all")}
              >
                <span>Semua</span>
                {counts.all > 0 && (
                  <span className="notif-count-badge">{counts.all}</span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={subtab === "unread"}
                className={`notif-segment-btn ${subtab === "unread" ? "active" : ""}`}
                onClick={() => selectChatSubtab("unread")}
              >
                <span>Belum Dibaca</span>
                {counts.unread > 0 && (
                  <span className="notif-count-badge">{counts.unread}</span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={subtab === "sent"}
                className={`notif-segment-btn ${subtab === "sent" ? "active" : ""}`}
                onClick={() => selectChatSubtab("sent")}
              >
                <span>Terkirim</span>
                {counts.sent > 0 && (
                  <span className="notif-count-badge">{counts.sent}</span>
                )}
              </button>
            </div>
          </div>

          {/* Conversation Rows */}
          <div className="conversation-items-scroll">
            {isSubtabLoading ? (
              <SkeletonMessageList count={3} />
            ) : (
              <>
                {filtered.map((item) => {
                  const person =
                    people.find((p) => p.localKey === item.partnerKey) ?? people[0];
                  const lastMsg = item.messages.at(-1);
                  const firstName = person.name.split(" ")[0];
                  const previewText = lastMsg
                    ? `${lastMsg.outgoing ? "Anda: " : `${firstName}: `}${lastMsg.text || (lastMsg.images?.length ? "Lampiran media" : "")}`
                    : "Percakapan baru";

                  return (
                    <Link
                      className={`conversation-item ${selectedKey === item.localKey ? "selected" : ""} ${item.unread ? "is-unread" : ""}`}
                      href={`/messages/${item.localKey}`}
                      key={item.localKey}
                      onClick={(e) => {
                        if (
                          !consumePageSwitchSlot(
                            pathname,
                            `/messages/${item.localKey}`,
                          )
                        ) {
                          e.preventDefault();
                          showToast(
                            "Tunggu 1 detik sebelum pindah halaman.",
                            "info",
                          );
                        }
                      }}
                    >
                      <span
                        className={`chat-unread-dot ${item.unread ? "visible" : ""}`}
                        aria-hidden="true"
                      />
                      <Avatar name={person.name} src={person.image} />
                      <div className="conversation-item-body">
                        <div className="conversation-item-top">
                          <strong className="conversation-item-name">
                            <span>{person.name}</span>
                            <VerifiedBadge role={person.role} size={14} />
                          </strong>
                          {lastMsg?.time && (
                            <small className="conversation-item-time">
                              {lastMsg.time}
                            </small>
                          )}
                        </div>
                        <p className="conversation-item-preview">{previewText}</p>
                      </div>
                    </Link>
                  );
                })}

                {!filtered.length && (
                  <div className="empty-state chat-list-empty">
                    <p>
                      {activeQuery
                        ? "Tidak ada percakapan yang cocok."
                        : subtab === "unread"
                          ? "Tidak ada pesan yang belum dibaca."
                          : subtab === "sent"
                            ? "Belum ada pesan terkirim."
                            : "Belum ada percakapan."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Right Pane: Conversation View */}
        <section className="conversation-pane" aria-label="Isi percakapan">
          {selected && partner ? (
            <>
              <header className="conversation-header">
                <div className="conversation-header-left">
                  <Link
                    className="chat-back button button--ghost"
                    href="/messages"
                    aria-label="Kembali ke daftar percakapan"
                    onClick={(e) => {
                      if (!consumePageSwitchSlot(pathname, "/messages")) {
                        e.preventDefault();
                        showToast(
                          "Tunggu 1 detik sebelum pindah halaman.",
                          "info",
                        );
                      }
                    }}
                  >
                    <ArrowLeft size={20} />
                  </Link>
                  <Avatar name={partner.name} src={partner.image} />
                  <Link
                    href={`/profile/${partner.localKey}`}
                    className="conversation-header-partner"
                  >
                    <strong>{partner.name}</strong>
                    <VerifiedBadge role={partner.role} size={15} />
                  </Link>
                </div>
                <Link
                  href={`/profile/${partner.localKey}`}
                  className="conversation-header-more"
                  aria-label="Opsi percakapan"
                  title="Lihat profil"
                >
                  <MoreHorizontal size={20} />
                </Link>
              </header>

              <div className="message-history">
                {/* Profile Intro Card (Substack / X Reference) */}
                <div className="chat-profile-intro">
                  <div className="chat-profile-intro-avatar">
                    <Avatar name={partner.name} src={partner.image} />
                  </div>
                  <div className="chat-profile-intro-name">
                    <strong>{partner.name}</strong>
                    <VerifiedBadge role={partner.role} size={16} />
                  </div>
                  <span className="chat-profile-intro-handle">
                    @{partner.username}
                  </span>
                  <div className="chat-profile-intro-actions">
                    {!isFollowingPartner && (
                      <button
                        type="button"
                        className="chat-intro-btn chat-intro-btn--follow"
                        onClick={() =>
                          setFollowing((current) =>
                            current.includes(partner.localKey)
                              ? current
                              : [...current, partner.localKey],
                          )
                        }
                      >
                        Ikuti
                      </button>
                    )}
                    <Link
                      href={`/profile/${partner.localKey}`}
                      className="chat-intro-btn chat-intro-btn--profile"
                    >
                      Profil
                    </Link>
                  </div>
                </div>

                <div className="chat-profile-intro-divider" />

                {/* Messages */}
                <div className="chat-messages-stack">
                  {selected.messages.map((message) => (
                    <div
                      key={message.localKey}
                      className={`message-bubble ${message.outgoing ? "outgoing" : "incoming"}`}
                    >
                      {message.images && message.images.length > 0 && (
                        <MediaGallery
                          media={message.images}
                          altPrefix="Lampiran pesan"
                          className="chat-bubble-media"
                        />
                      )}
                      {message.text && <p>{message.text}</p>}
                      <small>{message.time}</small>
                    </div>
                  ))}
                  <div ref={bottom} />
                </div>
              </div>

              {/* Chat Composer: Left User Avatar + Right Unified Input Box */}
              <form
                className="chat-composer-row message-editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                {user && (
                  <div className="chat-composer-user-avatar">
                    <Avatar name={user.name} src={user.image} />
                  </div>
                )}

                <div className="chat-composer-unified">
                  {images.length > 0 && (
                    <div className="composer-photo-grid chat-composer-photo-grid">
                      {images.map((src, index) => (
                        <figure key={src} className="composer-photo-thumb">
                          {isVideoMedia(src) ? (
                            <video src={src} controls muted playsInline />
                          ) : (
                            <img
                              src={src}
                              alt={`Lampiran pesan ${index + 1}`}
                            />
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

                  <div className="chat-composer-bar">
                    <button
                      type="button"
                      className="composer-tool-btn"
                      title="Tambah foto atau video"
                      aria-label="Tambah foto atau video"
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
                        if (message) {
                          setError(message);
                          showToast(message, "error");
                        } else {
                          const added = files.map((file) => {
                            const url = URL.createObjectURL(file);
                            return file.type.startsWith("video/") ||
                              /\.(mp4|webm)$/i.test(file.name)
                              ? `${url}#video`
                              : url;
                          });
                          setImages((current) => [...current, ...added]);
                          setError("");

                          files.forEach((file, idx) => {
                            const previewUrl = added[idx];
                            void uploadMediaFileToR2(
                              file,
                              "posts",
                              user?.localKey,
                            ).then((r2Url) => {
                              if (r2Url && !r2Url.startsWith("data:")) {
                                setImages((current) =>
                                  current.map((item) =>
                                    item === previewUrl ? r2Url : item,
                                  ),
                                );
                              }
                            });
                          });
                        }
                        event.target.value = "";
                      }}
                    />

                    <button
                      type="button"
                      className="composer-tool-btn"
                      title="Tambah emoji"
                      aria-label="Tambah emoji"
                      onClick={() => setShowEmojiModal(true)}
                    >
                      <Smile size={20} strokeWidth={1.8} />
                    </button>

                    <label className="chat-composer-input-label">
                      <span className="sr-only">Tulis pesan</span>
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        maxLength={4000}
                        className="chat-composer-input"
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                          setError("");
                          e.target.style.height = "auto";
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Tulis pesan..."
                      />
                    </label>

                    <button
                      type="submit"
                      className="chat-composer-send-btn"
                      aria-label="Kirim pesan"
                      disabled={!text.trim() && images.length === 0}
                    >
                      <Send size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </form>

              <EmojiSelectorModal
                isOpen={showEmojiModal}
                onSelect={handleInsertEmoji}
                onClose={() => setShowEmojiModal(false)}
              />
            </>
          ) : (
            <div className="empty-state chat-empty">
              <h2>
                {selectedKey
                  ? "Percakapan tidak tersedia"
                  : "Belum ada obrolan dipilih"}
              </h2>
              <p>
                {selectedKey
                  ? "Kembali ke daftar atau mulai percakapan baru."
                  : "Pilih obrolan untuk mulai membaca atau mengirim pesan."}
              </p>
            </div>
          )}
        </section>
      </div>

      {newMessage && (
        <Dialog title="Pesan baru" onClose={() => setNew(false)}>
          <div className="dialog-body">
            <label>
              Cari penerima
              <input
                type="search"
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
                placeholder="Cari nama atau @..."
                autoFocus
              />
            </label>
            {people
              .filter(
                (person) =>
                  person.localKey !== user?.localKey &&
                  `${person.name} ${person.username}`
                    .toLowerCase()
                    .includes(activeRecipientQuery.toLowerCase()),
              )
              .map((person) => (
                <button
                  className="recipient-option"
                  key={person.localKey}
                  onClick={() => open(person.localKey)}
                >
                  <Avatar name={person.name} src={person.image} />
                  <span>
                    <strong>
                      {person.name}
                      <VerifiedBadge role={person.role} size={14} />
                    </strong>
                    <small>@{person.username}</small>
                  </span>
                </button>
              ))}
            {!people.some(
              (person) =>
                person.localKey !== user?.localKey &&
                `${person.name} ${person.username}`
                  .toLowerCase()
                  .includes(activeRecipientQuery.toLowerCase()),
            ) && <p className="muted">Tidak ada akun yang cocok.</p>}
          </div>
        </Dialog>
      )}
    </ProductShell>
  );
}
