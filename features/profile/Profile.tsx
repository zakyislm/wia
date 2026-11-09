"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { PostCard } from "@/features/posts/PostCard";
import { photoError } from "@/lib/validation";
import type { Person } from "@/types/models";

function EditProfile({
  person,
  onClose,
}: {
  person: Person;
  onClose: () => void;
}) {
  const { setPeople, user } = useDemo();
  const [name, setName] = useState(person.name);
  const [bio, setBio] = useState(person.bio);
  const [region, setRegion] = useState(person.region ?? "");
  const [image, setImage] = useState(person.image);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
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

            <label className="profile-edit-field">
              <span className="profile-edit-label-row">
                <span>Domisili</span>
              </span>
              <input
                value={region}
                maxLength={80}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Contoh: Bandung, Jawa Barat"
              />
            </label>
          </div>

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
  const { people, user, posts: allPosts, following, setFollowing } = useDemo();
  const posts = allPosts.filter((post) => !post.isDeleted);
  const [tab, setTab] = useState("posts");
  const [relation, setRelation] = useState<"followers" | "following" | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const targetKey = profileKey ? decodeURIComponent(profileKey).trim() : "@me";
  const isMe = targetKey === "@me" || targetKey.toLowerCase() === "me";

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
  const authored = posts.filter(
    (post) => post.authorKey === person?.localKey && (!post.anonymous || own),
  );
  const visible =
    tab === "reposts"
      ? own
        ? posts.filter((post) => post.reposted)
        : []
      : tab === "tagged"
        ? posts.filter((post) =>
            post.agencyKeys.includes(person?.localKey ?? ""),
          )
        : authored.filter(
            (post) => post.kind === (tab === "reports" ? "report" : "general"),
          );
  const tabs = [
    { key: "posts", label: "Postingan" },
    { key: "reports", label: "Laporan" },
    { key: "reposts", label: "Repost" },
    { key: "tagged", label: "Ditandai" },
  ];
  return (
    <ProductShell title="Profil" active="profile">
      <section className="feed-surface">
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
                <button onClick={() => setRelation("followers")}>
                  {!own && following.includes(person.localKey) ? 1 : 0} pengikut
                </button>{" "}
                ·{" "}
                <button onClick={() => setRelation("following")}>
                  {own ? following.length : 0} mengikuti
                </button>
              </div>
              {own ? (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit profil
                </Button>
              ) : (
                <Button
                  variant={
                    following.includes(person.localKey)
                      ? "secondary"
                      : "primary"
                  }
                  onClick={() =>
                    setFollowing((current) =>
                      current.includes(person.localKey)
                        ? current.filter((key) => key !== person.localKey)
                        : [...current, person.localKey],
                    )
                  }
                >
                  {following.includes(person.localKey)
                    ? "Berhenti mengikuti"
                    : "Ikuti"}
                </Button>
              )}
            </header>
            <div
              className="profile-tabs"
              role="tablist"
              aria-label="Konten profil"
            >
              {tabs.map((item) => (
                <button
                  role="tab"
                  aria-selected={tab === item.key}
                  key={item.key}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {visible.map((post) => (
              <div key={post.localKey}>
                {own &&
                  post.anonymous &&
                  post.authorKey === person.localKey && (
                    <p className="private-report">
                      Laporan anonim · Hanya terlihat oleh Anda di profil ini
                    </p>
                  )}
                <PostCard post={post} />
              </div>
            ))}
            {!visible.length && (
              <div className="empty-state">
                <h2>
                  Belum ada{" "}
                  {tabs.find((item) => item.key === tab)?.label.toLowerCase()}
                </h2>
                <p>Konten yang tersedia akan muncul di sini.</p>
              </div>
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
    </ProductShell>
  );
}
