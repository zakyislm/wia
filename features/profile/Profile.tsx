"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
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
  return (
    <Dialog title="Edit profil" onClose={requestClose}>
      {discard ? (
        <div className="dialog-body">
          <h3>Buang perubahan profil?</h3>
          <p>Perubahan yang belum disimpan akan hilang.</p>
          <div className="button-row">
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              Lanjut mengedit
            </Button>
            <Button onClick={close}>Buang perubahan</Button>
          </div>
        </div>
      ) : (
        <form
          className="dialog-body"
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
          <div className="profile-photo">
            <Avatar name={name || person.name} src={image} />
            <label>
              Ganti foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
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
                }}
              />
            </label>
            {image && (
              <Button variant="ghost" onClick={() => setImage(undefined)}>
                Hapus foto
              </Button>
            )}
          </div>
          <label>
            Nama tampilan
            <input
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Bio
            <textarea
              value={bio}
              rows={3}
              maxLength={280}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <label>
            Wilayah
            <input
              value={region}
              maxLength={80}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Kota / provinsi"
            />
          </label>
          <p className="small muted">
            Username, email, dan peran akun dikelola oleh backend. Foto hanya
            tersimpan dalam sesi demo, maksimal 10 MB (JPG, PNG, WebP).
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="button-row">
            <Button variant="ghost" onClick={requestClose}>
              Batal
            </Button>
            <Button type="submit">Simpan perubahan</Button>
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
  const person = people.find(
    (item) => item.localKey === (profileKey ?? user?.localKey),
  );
  const own = person?.localKey === user?.localKey;
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
                    {person.role === "GOVERNMENT" ? " ✓" : ""}
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
                </button>{" "}
                · Data demo
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
            <p>Akun ini tidak tersedia dalam sesi demo.</p>
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
            <p className="small muted">
              Daftar menampilkan relasi yang tersedia dalam sesi demo.
            </p>
          </div>
        </Dialog>
      )}
      {editing && person && own && (
        <EditProfile person={person} onClose={() => setEditing(false)} />
      )}
    </ProductShell>
  );
}
