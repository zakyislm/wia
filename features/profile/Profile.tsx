/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowBigDown,
  ArrowBigUp,
  Ban,
  Check,
  ChevronDown,
  Link2,
  MapPin,
  Megaphone,
  MoreHorizontal,
  PenSquare,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { Dialog } from "@/components/ui/Dialog";
import { PostCard, renderWithMentions } from "@/features/posts/PostCard";
import {
  LazyLoadSentinel,
  useLazySlice,
  useSubtabTransition,
} from "@/components/ui/LazyFeed";
import { SkeletonPostList } from "@/components/ui/Skeleton";
import { Composer } from "@/features/posts/Composer";
import { SearchTriggerButton } from "@/components/search/QuickSearchModal";
import {
  isReplyVisibleInProfileSearch,
  matchesProfilePostQuery,
  matchesProfileReplyQuery,
  ProfileSearchModal,
} from "@/features/profile/ProfileSearchModal";
import { countPublicPosts } from "@/components/user/UserHoverCard";
import { LocationSelectorModal } from "@/components/selectors/LocationSelectorModal";
import { photoError } from "@/lib/validation";
import { formatPageTitle, formatSearchTitle } from "@/lib/title";
import type { Person, Post, Reply } from "@/types/models";

function formatShortTime(timestamp?: number): string {
  if (!timestamp) return "baru saja";
  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j`;
  return `${Math.floor(hours / 24)}h`;
}

export function EditProfile({
  person,
  onClose,
}: {
  person: Person;
  onClose: () => void;
}) {
  const { setPeople, user, showToast } = useDemo();
  const [name, setName] = useState(person.name);
  const [bio, setBio] = useState(person.bio);
  const [region, setRegion] = useState(person.region ?? "");
  const [image, setImage] = useState(person.image);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const created = useRef<string[]>([]);
  const dirty =
    name !== person.name ||
    bio !== person.bio ||
    region !== (person.region ?? "") ||
    image !== person.image;

  function close() {
    created.current.forEach((url) => URL.revokeObjectURL(url));
    onClose();
  }

  function requestClose() {
    if (dirty) setDiscard(true);
    else close();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const message = photoError(files, 0);
    if (message) {
      setError(message);
      return;
    }
    const url = URL.createObjectURL(files[0]);
    created.current.push(url);
    setImage(url);
    setError("");
    e.target.value = "";
  }

  return (
    <Dialog
      title="Edit profil"
      onClose={requestClose}
      className="profile-edit-dialog"
    >
      {discard ? (
        <div className="profile-edit-body profile-discard-view">
          <div className="profile-discard-copy">
            <h3>Buang perubahan?</h3>
            <p className="muted">
              Perubahan yang baru kamu tulis belum disimpan.
            </p>
          </div>
          <div className="profile-edit-footer">
            <button
              type="button"
              className="composer-cancel-btn"
              onClick={() => setDiscard(false)}
            >
              Lanjut mengedit
            </button>
            <button
              type="button"
              className="composer-post-btn"
              onClick={close}
            >
              Buang
            </button>
          </div>
        </div>
      ) : (
        <form
          className="profile-edit-body"
          onSubmit={(e) => {
            e.preventDefault();
            if (user?.localKey !== person.localKey) return;
            if (!name.trim()) {
              setError("Nama tampilan wajib diisi.");
              return;
            }
            setPeople((current) =>
              current.map((item) =>
                item.localKey === person.localKey
                  ? {
                      ...item,
                      name: name.trim(),
                      bio: bio.trim(),
                      region: region.trim(),
                      image,
                    }
                  : item,
              ),
            );
            created.current
              .filter((url) => url !== image)
              .forEach((url) => URL.revokeObjectURL(url));
            showToast("Profil diperbarui.", "success");
            onClose();
          }}
        >
          <div className="profile-edit-photo-row">
            <button
              type="button"
              className="profile-edit-avatar-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Ubah foto profil"
            >
              <Avatar name={name || person.name} src={image} />
            </button>
            <div className="profile-edit-photo-meta">
              <div className="profile-edit-photo-actions">
                <button
                  type="button"
                  className="profile-photo-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Ubah foto
                </button>
                {image && (
                  <button
                    type="button"
                    className="profile-photo-remove-btn"
                    onClick={() => setImage(undefined)}
                  >
                    Hapus
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>
              <span className="profile-edit-photo-hint">
                JPG, PNG, atau WebP · Maks. 10 MB
              </span>
            </div>
          </div>

          <div className="profile-edit-fields">
            <label className="profile-edit-field">
              <span className="profile-edit-label-row">
                <span>Nama tampilan</span>
                <small>{name.length}/60</small>
              </span>
              <input
                value={name}
                maxLength={60}
                placeholder="Nama lengkap atau panggilan"
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
              />
            </label>

            <label className="profile-edit-field">
              <span className="profile-edit-label-row">
                <span>Bio</span>
                <small>{bio.length}/160</small>
              </span>
              <textarea
                value={bio}
                rows={3}
                maxLength={160}
                placeholder="Ceritakan sedikit tentang dirimu atau fokus kegiatanmu"
                onChange={(e) => setBio(e.target.value)}
              />
            </label>

            <div className="profile-edit-field">
              <span className="profile-edit-label-row">
                <span>Domisili</span>
                {region && (
                  <button
                    type="button"
                    className="profile-domisili-clear"
                    onClick={() => setRegion("")}
                  >
                    Hapus
                  </button>
                )}
              </span>
              <button
                type="button"
                className="profile-domisili-trigger"
                onClick={() => setLocationModalOpen(true)}
              >
                <MapPin size={16} />
                <span className={region ? "" : "muted"}>
                  {region || "Contoh: Bandung, Jawa Barat"}
                </span>
              </button>
            </div>
          </div>

          <LocationSelectorModal
            isOpen={locationModalOpen}
            selectedLocation={region}
            onSelect={(loc) => setRegion(loc)}
            onClose={() => setLocationModalOpen(false)}
          />

          {error && (
            <p role="alert" className="composer-error">
              {error}
            </p>
          )}

          <div className="profile-edit-footer">
            <button
              type="button"
              className="composer-cancel-btn"
              onClick={requestClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="composer-post-btn"
              disabled={!dirty || !name.trim()}
            >
              Simpan
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function Profile({ profileKey }: { profileKey?: string }) {
  const {
    people,
    user,
    posts: allPosts,
    following,
    setFollowing,
    workspace,
    setWorkspace,
    showToast,
  } = useDemo();
  const router = useRouter();
  const posts = allPosts.filter((post) => !post.isDeleted);
  const [tab, setTab] = useState("posts");
  const [visibility, setVisibility] = useState<"public" | "anonymous">("public");
  const [profileQuery, setProfileQuery] = useState("");
  const [profileSearchOpen, setProfileSearchOpen] = useState(false);
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"post" | "report" | null>(
    null,
  );
  const visibilityMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [relation, setRelation] = useState<"followers" | "following" | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const targetKey = profileKey ? decodeURIComponent(profileKey).trim() : "@me";
  const isMe = targetKey === "@me" || targetKey.toLowerCase() === "me";

  useEffect(() => {
    if (!visibilityMenuOpen && !createMenuOpen && !moreMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        visibilityMenuRef.current &&
        !visibilityMenuRef.current.contains(target)
      ) {
        setVisibilityMenuOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(target)) {
        setCreateMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setVisibilityMenuOpen(false);
        setCreateMenuOpen(false);
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visibilityMenuOpen, createMenuOpen, moreMenuOpen]);

  const person = isMe
    ? (people.find((p) => p.localKey === user?.localKey) ?? user)
    : people.find((item) => {
        const clean = targetKey.replace(/^@/, "").toLowerCase();
        return (
          item.username.toLowerCase() === clean ||
          item.localKey.toLowerCase() === clean ||
          item.id.toLowerCase() === clean
        );
      });

  const own = isMe || (Boolean(person) && person?.localKey === user?.localKey);
  const isOfficialAccount =
    person?.role === "GOVERNMENT" || person?.role === "INTERNAL";
  const activeTab =
    tab === "responses" && !isOfficialAccount ? "posts" : tab;
  const isCommentTab = activeTab === "replies" || activeTab === "responses";
  const showVisibilityFilter =
    own &&
    (activeTab === "posts" ||
      activeTab === "reports" ||
      activeTab === "replies");
  const authored = posts.filter(
    (post) => post.authorKey === person?.localKey && (!post.anonymous || own),
  );
  const publicPostCount = useMemo(
    () => countPublicPosts(allPosts, person?.localKey),
    [allPosts, person?.localKey],
  );
  const normalizedQuery = profileQuery.trim().toLowerCase();
  const visible =
    (activeTab === "saved"
      ? own
        ? posts.filter((post) => post.saved)
        : []
      : activeTab === "reposts"
        ? own
          ? posts.filter((post) => post.reposted)
          : []
        : activeTab === "tagged"
        ? posts.filter((post) =>
            post.agencyKeys.includes(person?.localKey ?? ""),
          )
        : activeTab === "posts" || activeTab === "reports"
          ? authored.filter((post) => {
              if (
                post.kind !== (activeTab === "reports" ? "report" : "general")
              ) {
                return false;
              }
              if (!own) return !post.anonymous;
              return visibility === "anonymous"
                ? post.anonymous
                : !post.anonymous;
            })
          : []
    ).filter((post) => matchesProfilePostQuery(post, normalizedQuery));

  const profileComments = useMemo(() => {
    if (!person) return [] as Array<{ reply: Reply; post: Post }>;
    if (activeTab !== "replies" && activeTab !== "responses") return [];

    const items: Array<{ reply: Reply; post: Post }> = [];
    for (const post of posts) {
      for (const reply of post.replies) {
        if (reply.authorKey !== person.localKey) continue;
        if (!matchesProfileReplyQuery(reply, post, normalizedQuery)) continue;
        if (activeTab === "responses") {
          if (isOfficialAccount && reply.is_action_taken) {
            items.push({ reply, post });
          }
        } else {
          // Balasan tab: all comments authored by this profile (filtered by visibility)
          const isAnon = Boolean(reply.anonymous) && !reply.is_action_taken;
          if (!own) {
            if (isReplyVisibleInProfileSearch(reply, post, person.localKey, false)) {
              items.push({ reply, post });
            }
          } else if (visibility === "anonymous" ? isAnon : !isAnon) {
            items.push({ reply, post });
          }
        }
      }
    }
    return items.sort(
      (a, b) => (b.reply.postedAt ?? 0) - (a.reply.postedAt ?? 0),
    );
  }, [
    person,
    posts,
    activeTab,
    isOfficialAccount,
    own,
    visibility,
    normalizedQuery,
  ]);

  const profileResetKey = `${person?.localKey ?? ""}:${activeTab}:${visibility}:${normalizedQuery}`;
  const {
    visibleItems: visibleProfilePosts,
    hasMore: hasMoreProfilePosts,
    isLoadingMore: isLoadingMoreProfilePosts,
    sentinelRef: profilePostsSentinelRef,
  } = useLazySlice(visible, {
    initialCount: 4,
    batchSize: 4,
    resetKey: profileResetKey,
  });

  const {
    visibleItems: visibleProfileComments,
    hasMore: hasMoreProfileComments,
    isLoadingMore: isLoadingMoreProfileComments,
    sentinelRef: profileCommentsSentinelRef,
  } = useLazySlice(profileComments, {
    initialCount: 4,
    batchSize: 4,
    resetKey: profileResetKey,
  });

  const profileSubtabKey = `${activeTab}:${visibility}`;
  const { isSubtabLoading, triggerSubtabSkeleton } = useSubtabTransition(
    profileSubtabKey,
    {
      onRateLimited: () =>
        showToast("Tunggu 1 detik sebelum ganti tab.", "info"),
    },
  );

  function handleSelectProfileTab(nextTab: string) {
    if (!triggerSubtabSkeleton(`${nextTab}:${visibility}`)) {
      setVisibilityMenuOpen(false);
      return;
    }
    setTab(nextTab);
    setVisibilityMenuOpen(false);
  }

  function handleSelectVisibility(nextVis: "public" | "anonymous") {
    if (!triggerSubtabSkeleton(`${activeTab}:${nextVis}`)) {
      setVisibilityMenuOpen(false);
      return;
    }
    setVisibility(nextVis);
    setVisibilityMenuOpen(false);
  }

  function handleApplyProfileQuery(nextRaw: string) {
    const clean = nextRaw.trim();
    setProfileQuery(clean);
    if (!clean || !person) return;
    const q = clean.toLowerCase();

    const hasMatchIn = (targetTab: string, targetVis: "public" | "anonymous") => {
      if (targetTab === "posts" || targetTab === "reports") {
        const expectedKind = targetTab === "reports" ? "report" : "general";
        return posts.some(
          (post) =>
            post.authorKey === person.localKey &&
            post.kind === expectedKind &&
            (!post.anonymous || own) &&
            (targetVis === "anonymous" ? post.anonymous : !post.anonymous) &&
            matchesProfilePostQuery(post, q),
        );
      }
      if (targetTab === "replies") {
        return posts.some((post) =>
          post.replies.some((reply) => {
            if (reply.authorKey !== person.localKey) return false;
            if (!isReplyVisibleInProfileSearch(reply, post, person.localKey, own)) {
              return false;
            }
            const isAnon = Boolean(reply.anonymous) && !reply.is_action_taken;
            if (targetVis === "anonymous" ? !isAnon : isAnon) return false;
            return matchesProfileReplyQuery(reply, post, q);
          }),
        );
      }
      return false;
    };

    const currentVis = own ? visibility : "public";
    if (hasMatchIn(activeTab, currentVis)) return;

    const candidates: Array<["posts" | "reports" | "replies", "public" | "anonymous"]> = [
      ["posts", "public"],
      ["reports", "public"],
      ["replies", "public"],
      ...(own
        ? ([
            ["posts", "anonymous"],
            ["reports", "anonymous"],
            ["replies", "anonymous"],
          ] as Array<["posts" | "reports" | "replies", "anonymous"]>)
        : []),
    ];

    const matchedCandidate = candidates.find(([t, v]) => hasMatchIn(t, v));
    if (matchedCandidate) {
      setTab(matchedCandidate[0]);
      if (own) setVisibility(matchedCandidate[1]);
    }
  }

  function openConversationWith(partnerKey: string) {
    if (!workspace.conversations.some((c) => c.partnerKey === partnerKey)) {
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
    }
    router.push(`/messages/${partnerKey}`);
  }

  const tabs = [
    { key: "posts", label: "Postingan" },
    { key: "reports", label: "Laporan" },
    { key: "replies", label: "Balasan" },
    ...(isOfficialAccount ? [{ key: "responses", label: "Respon" }] : []),
    ...(own ? [{ key: "saved", label: "Tersimpan" }] : []),
    { key: "reposts", label: "Dibagikan" },
    { key: "tagged", label: "Ditandai" },
  ];
  return (
    <ProductShell
      title="Profil"
      active="profile"
      documentTitle={
        person
          ? profileQuery.trim()
            ? formatSearchTitle(profileQuery, person.name)
            : formatPageTitle(person.name)
          : formatPageTitle("Profil Tidak Ditemukan")
      }
    >
      <section className="feed-surface profile-surface">
        {person ? (
          <>
            <header className="profile-header">
              <div className="profile-identity">
                <div>
                  <h2>
                    {person.name}
                    <VerifiedBadge role={person.role} size={20} />
                  </h2>
                  <p className="muted">@{person.username}</p>
                </div>
                <Avatar name={person.name} src={person.image} />
              </div>
              <p className="profile-bio">{person.bio}</p>
              {person.region && <p>{person.region}</p>}
              {person.role === "GOVERNMENT" && (
                <p className="small muted">
                  Akun instansi terverifikasi ·{" "}
                  {person.region || "Bandung, Jawa Barat"}
                </p>
              )}
              <div className="profile-counts small muted">
                <button
                  type="button"
                  onClick={() => {
                    setTab("posts");
                    setVisibility("public");
                    setVisibilityMenuOpen(false);
                  }}
                >
                  {publicPostCount} postingan
                </button>{" "}
                ·{" "}
                <button type="button" onClick={() => setRelation("followers")}>
                  {!own && following.includes(person.localKey) ? 1 : 0} pengikut
                </button>{" "}
                ·{" "}
                <button type="button" onClick={() => setRelation("following")}>
                  {own ? following.length : 0} mengikuti
                </button>
              </div>
              <div className="profile-actions-row">
                {own ? (
                  <>
                    <div className="profile-action-slot" ref={createMenuRef}>
                      <button
                        type="button"
                        className="profile-action-btn profile-action-btn--primary"
                        aria-haspopup="menu"
                        aria-expanded={createMenuOpen}
                        onClick={() => setCreateMenuOpen((prev) => !prev)}
                      >
                        <span>Buat</span>
                        <ChevronDown
                          size={16}
                          strokeWidth={2}
                          className={`profile-filter-chevron ${createMenuOpen ? "is-open" : ""}`}
                        />
                      </button>

                      {createMenuOpen && (
                        <div
                          className="create-dropdown-popover profile-create-popover"
                          role="menu"
                          aria-label="Buat konten"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="create-dropdown-item"
                            onClick={() => {
                              setCreateMenuOpen(false);
                              setComposerMode("post");
                            }}
                          >
                            <PenSquare
                              size={17}
                              strokeWidth={1.8}
                              className="create-dropdown-icon"
                            />
                            <span>Postingan</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="create-dropdown-item"
                            onClick={() => {
                              setCreateMenuOpen(false);
                              setComposerMode("report");
                            }}
                          >
                            <Megaphone
                              size={17}
                              strokeWidth={1.8}
                              className="create-dropdown-icon"
                            />
                            <span>Lapor</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="profile-action-slot">
                      <button
                        type="button"
                        className="profile-action-btn profile-action-btn--secondary"
                        onClick={() => setEditing(true)}
                      >
                        Edit profil
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="profile-action-slot">
                      <button
                        type="button"
                        className={`profile-action-btn ${
                          following.includes(person.localKey)
                            ? "profile-action-btn--secondary"
                            : "profile-action-btn--primary"
                        }`}
                        onClick={() =>
                          setFollowing((current) =>
                            current.includes(person.localKey)
                              ? current.filter((key) => key !== person.localKey)
                              : [...current, person.localKey],
                          )
                        }
                      >
                        {following.includes(person.localKey)
                          ? "Diikuti"
                          : "Ikuti"}
                      </button>
                    </div>

                    <div className="profile-action-slot">
                      <button
                        type="button"
                        className="profile-action-btn profile-action-btn--secondary"
                        onClick={() => openConversationWith(person.localKey)}
                      >
                        Mengobrol
                      </button>
                    </div>

                    <div className="profile-more-wrap" ref={moreMenuRef}>
                      <button
                        type="button"
                        className={`profile-more-btn ${moreMenuOpen ? "active" : ""}`}
                        aria-label="Tindakan pengguna"
                        aria-haspopup="menu"
                        aria-expanded={moreMenuOpen}
                        onClick={() => setMoreMenuOpen((prev) => !prev)}
                      >
                        <MoreHorizontal size={20} strokeWidth={2} />
                      </button>

                      {moreMenuOpen && (
                        <div
                          className="profile-filter-menu profile-actions-menu"
                          role="menu"
                          aria-label={`Tindakan untuk @${person.username}`}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="sidebar-account-menu-item"
                            onClick={async () => {
                              setMoreMenuOpen(false);
                              try {
                                await navigator.clipboard.writeText(
                                  `${location.origin}/profile/${person.username || person.localKey}`,
                                );
                                showToast("Tautan profil disalin.", "success");
                              } catch {
                                showToast(
                                  "Tidak dapat menyalin tautan profil.",
                                  "error",
                                );
                              }
                            }}
                          >
                            <Link2 size={18} strokeWidth={1.8} />
                            <span>Salin tautan</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className="sidebar-account-menu-item"
                            onClick={() => {
                              const next = !workspace.mutedUsers.includes(
                                person.localKey,
                              );
                              setMoreMenuOpen(false);
                              setWorkspace((prev) => ({
                                ...prev,
                                mutedUsers: next
                                  ? [...prev.mutedUsers, person.localKey]
                                  : prev.mutedUsers.filter(
                                      (key) => key !== person.localKey,
                                    ),
                              }));
                              showToast(
                                next
                                  ? `@${person.username} dibisukan.`
                                  : `Bisu @${person.username} dibatalkan.`,
                                "info",
                              );
                            }}
                          >
                            {workspace.mutedUsers.includes(person.localKey) ? (
                              <Volume2 size={18} strokeWidth={1.8} />
                            ) : (
                              <VolumeX size={18} strokeWidth={1.8} />
                            )}
                            <span>
                              {workspace.mutedUsers.includes(person.localKey)
                                ? "Bunyikan akun"
                                : "Bisukan akun"}
                            </span>
                          </button>

                          <div className="sidebar-account-menu-divider" />

                          <button
                            type="button"
                            role="menuitem"
                            className="sidebar-account-menu-item sidebar-account-menu-item--danger"
                            onClick={() => {
                              const next = !workspace.blockedUsers.includes(
                                person.localKey,
                              );
                              setMoreMenuOpen(false);
                              setWorkspace((prev) => ({
                                ...prev,
                                blockedUsers: next
                                  ? [...prev.blockedUsers, person.localKey]
                                  : prev.blockedUsers.filter(
                                      (key) => key !== person.localKey,
                                    ),
                              }));
                              showToast(
                                next
                                  ? `@${person.username} diblokir.`
                                  : `Blokir @${person.username} dibuka.`,
                                "info",
                              );
                            }}
                          >
                            <Ban size={18} strokeWidth={1.8} />
                            <span>
                              {workspace.blockedUsers.includes(person.localKey)
                                ? "Buka blokir"
                                : "Blokir akun"}
                            </span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className="sidebar-account-menu-item sidebar-account-menu-item--danger"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              showToast(
                                `Laporan akun @${person.username} dicatat.`,
                                "success",
                              );
                            }}
                          >
                            <AlertCircle size={18} strokeWidth={1.8} />
                            <span>Laporkan akun</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </header>

            <div className="profile-controls-bar">
              <div className="profile-search-trigger-wrap">
                <SearchTriggerButton
                  query={profileQuery}
                  placeholder={`Cari di @${person.username}...`}
                  className={`profile-search-trigger ${profileQuery.trim() ? "has-clear" : ""}`.trim()}
                  onClick={() => setProfileSearchOpen(true)}
                />
                {profileQuery.trim() && (
                  <button
                    type="button"
                    className="quick-search-clear-btn profile-search-clear-btn"
                    aria-label="Hapus pencarian"
                    onClick={() => setProfileQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {showVisibilityFilter && (
                <div className="laporan-filter-wrap" ref={visibilityMenuRef}>
                  <button
                    type="button"
                    className={`chat-compose-btn laporan-filter-btn ${visibility !== "public" ? "is-active" : ""}`.trim()}
                    aria-label={`Filter visibilitas: ${visibility === "public" ? "Publik" : "Anonim"}`}
                    aria-haspopup="menu"
                    aria-expanded={visibilityMenuOpen}
                    title={`Filter: ${visibility === "public" ? "Publik" : "Anonim"}`}
                    onClick={() => setVisibilityMenuOpen((prev) => !prev)}
                  >
                    <SlidersHorizontal size={18} strokeWidth={1.8} />
                    {visibility !== "public" && (
                      <span className="laporan-filter-dot" aria-hidden="true" />
                    )}
                  </button>

                  {visibilityMenuOpen && (
                    <div
                      className="profile-filter-menu laporan-filter-menu"
                      role="menu"
                      aria-label="Filter visibilitas konten"
                    >
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={visibility === "public"}
                        className={`profile-filter-option ${visibility === "public" ? "is-selected" : ""}`}
                        onClick={() => handleSelectVisibility("public")}
                      >
                        <span>Publik</span>
                        {visibility === "public" && (
                          <Check size={16} strokeWidth={2.2} />
                        )}
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={visibility === "anonymous"}
                        className={`profile-filter-option ${visibility === "anonymous" ? "is-selected" : ""}`}
                        onClick={() => handleSelectVisibility("anonymous")}
                      >
                        <span>Anonim</span>
                        {visibility === "anonymous" && (
                          <Check size={16} strokeWidth={2.2} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="profile-tabs"
              role="tablist"
              aria-label="Konten profil"
            >
              {tabs.map((item) => (
                <button
                  role="tab"
                  aria-selected={activeTab === item.key}
                  key={item.key}
                  onClick={() => handleSelectProfileTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {profileQuery && (
              <div className="explore-feed-header">
                <span className="explore-feed-title">
                  Hasil untuk &ldquo;{profileQuery}&rdquo; (
                  {isCommentTab ? profileComments.length : visible.length})
                </span>
                <button
                  type="button"
                  className="profile-search-reset-btn"
                  onClick={() => setProfileQuery("")}
                >
                  Tampilkan semua
                </button>
              </div>
            )}
            {isSubtabLoading ? (
              <SkeletonPostList
                count={2}
                isReport={activeTab === "reports" || activeTab === "responses"}
              />
            ) : isCommentTab ? (
              <>
                {visibleProfileComments.map(({ reply, post }) => {
                  const isReplyAnon =
                    Boolean(reply.anonymous) && !reply.is_action_taken;
                  const displayName = isReplyAnon ? "Anonim" : person.name;
                  const badgeRole = isReplyAnon
                    ? undefined
                    : (reply.actionRole ??
                      (isOfficialAccount ? person.role : undefined));
                  const postHeadline =
                    post.content.split(/\r?\n+/)[0]?.trim() || "Postingan";
                  const upCount =
                    (reply.upvotesCount ?? 0) + (reply.vote === "UP" ? 1 : 0);
                  const downCount =
                    (reply.downvotesCount ?? 0) +
                    (reply.vote === "DOWN" ? 1 : 0);

                  return (
                    <article
                      key={`${post.localKey}-${reply.localKey}`}
                      className="post-card profile-reply-card"
                    >
                      <div className="post-avatar-col">
                        <Avatar
                          name={displayName}
                          src={isReplyAnon ? undefined : person.image}
                        />
                      </div>
                      <header className="post-meta">
                        <div>
                          <div className="post-meta-heading">
                            <span className="post-author-name">
                              {displayName}
                              <VerifiedBadge role={badgeRole} size={15} />
                            </span>
                            {!isReplyAnon && (
                              <span className="post-author-username">
                                @{person.username}
                              </span>
                            )}
                            <span className="post-meta-dot">·</span>
                            <span className="post-meta-time">
                              {formatShortTime(reply.postedAt)}
                            </span>
                          </div>
                        </div>
                        {reply.is_action_taken && (
                          <span className="comment-action-marker">
                            Tindak Lanjut
                          </span>
                        )}
                      </header>
                      <div className="profile-reply-context">
                        {reply.is_action_taken
                          ? "Merespon laporan: "
                          : "Membalas: "}
                        <Link href={`/posts/${post.localKey}`}>
                          {postHeadline}
                        </Link>
                      </div>
                      {reply.content && (
                        <div className="post-content post-body-text">
                          <p>{renderWithMentions(reply.content, people)}</p>
                        </div>
                      )}
                      {reply.location && (
                        <p className="post-meta-location">
                          <MapPin size={12} /> {reply.location}
                        </p>
                      )}
                      {reply.images && reply.images.length > 0 && (
                        <MediaGallery
                          media={reply.images}
                          altPrefix="Lampiran balasan"
                        />
                      )}
                      <footer className="profile-reply-footer">
                        <span className="profile-reply-stat">
                          <ArrowBigUp size={16} strokeWidth={1.8} />
                          {upCount}
                        </span>
                        <span className="profile-reply-stat">
                          <ArrowBigDown size={16} strokeWidth={1.8} />
                          {downCount}
                        </span>
                        <Link
                          href={`/posts/${post.localKey}#comment-${reply.localKey}`}
                          className="profile-reply-thread-link"
                        >
                          Lihat di postingan →
                        </Link>
                      </footer>
                    </article>
                  );
                })}
                <LazyLoadSentinel
                  hasMore={hasMoreProfileComments}
                  isLoadingMore={isLoadingMoreProfileComments}
                  sentinelRef={profileCommentsSentinelRef}
                />
                {!profileComments.length && (
                  <div className="empty-state">
                    <h2>
                      Belum ada{" "}
                      {tabs
                        .find((item) => item.key === activeTab)
                        ?.label.toLowerCase()}
                      {showVisibilityFilter
                        ? visibility === "anonymous"
                          ? " anonim"
                          : " publik"
                        : ""}
                    </h2>
                    <p>Konten yang tersedia akan muncul di sini.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {visibleProfilePosts.map((post) => (
                  <PostCard key={post.localKey} post={post} />
                ))}
                <LazyLoadSentinel
                  hasMore={hasMoreProfilePosts}
                  isLoadingMore={isLoadingMoreProfilePosts}
                  sentinelRef={profilePostsSentinelRef}
                />
                {!visible.length && (
                  <div className="empty-state">
                    <h2>
                      {activeTab === "saved"
                        ? "Belum ada postingan tersimpan"
                        : `Belum ada ${
                            tabs
                              .find((item) => item.key === activeTab)
                              ?.label.toLowerCase() ?? ""
                          }${
                            showVisibilityFilter
                              ? visibility === "anonymous"
                                ? " anonim"
                                : " publik"
                              : ""
                          }`}
                    </h2>
                    <p>
                      {activeTab === "saved"
                        ? "Simpan postingan atau laporan lewat menu titik tiga supaya gampang kamu buka lagi."
                        : "Konten yang tersedia akan muncul di sini."}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2>Akun tidak ditemukan</h2>
            <p>Akun ini tidak tersedia.</p>
          </div>
        )}
      </section>
      {relation && person && (
        <Dialog
          title={relation === "followers" ? "Pengikut" : "Mengikuti"}
          onClose={() => setRelation(null)}
        >
          <div className="dialog-body">
            {(relation === "following"
              ? own
                ? people.filter((item) => following.includes(item.localKey))
                : []
              : !own && following.includes(person.localKey) && user
                ? [user]
                : []
            ).map((item) => (
              <Link
                className="recipient-option"
                key={item.localKey}
                href={`/profile/${item.localKey}`}
                onClick={() => setRelation(null)}
              >
                <Avatar name={item.name} src={item.image} />
                <span>
                  <strong>{item.name}</strong>
                  <small>@{item.username}</small>
                </span>
              </Link>
            ))}
          </div>
        </Dialog>
      )}
      {editing && person && own && (
        <EditProfile person={person} onClose={() => setEditing(false)} />
      )}
      {composerMode && own && (
        <Composer
          initialMode={composerMode}
          onClose={() => setComposerMode(null)}
        />
      )}
      {person && (
        <ProfileSearchModal
          isOpen={profileSearchOpen}
          onClose={() => setProfileSearchOpen(false)}
          person={person}
          own={own}
          posts={allPosts}
          initialQuery={profileQuery}
          onApplyQuery={handleApplyProfileQuery}
        />
      )}
    </ProductShell>
  );
}
