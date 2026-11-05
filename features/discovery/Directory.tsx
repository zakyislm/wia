"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import { SearchControls } from "./SearchControls";
import { PostCard } from "@/features/posts/PostCard";
import type { Person } from "@/types/models";
import {
  closureDate,
  emptyFilters,
  filterPosts,
  type SearchFilters,
} from "./filters";

export function Directory({ timeline = false }: { timeline?: boolean }) {
  const { people, posts, user, following, setFollowing } = useDemo();
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState<SearchFilters>({ ...emptyFilters });
  const [tab, setTab] = useState("posts");
  const [preview, setPreview] = useState<Person | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const accounts = !timeline && tab === "accounts";
  const results = filterPosts(
    posts,
    people,
    {
      ...applied,
      kind: !timeline && tab === "reports" ? ["report"] : applied.kind,
    },
    timeline,
    now,
  );
  const accountResults = people.filter((person) =>
    `${person.name} ${person.username} ${person.bio}`
      .toLocaleLowerCase("id-ID")
      .includes(applied.query.trim().toLocaleLowerCase("id-ID")),
  );
  const regions = [
    ...new Set(posts.map((post) => post.province).filter(Boolean)),
  ];
  const categories = [
    ...new Set(posts.map((post) => post.category).filter(Boolean)),
  ];
  const agencies = people.filter((person) => person.role === "GOVERNMENT");
  function reset() {
    setQuery("");
    setApplied({ ...emptyFilters });
  }
  function follow(person: Person) {
    setFollowing((current) =>
      current.includes(person.localKey)
        ? current.filter((key) => key !== person.localKey)
        : [...current, person.localKey],
    );
  }
  return (
    <ProductShell
      title={timeline ? "Timeline Kinerja" : "Jelajah"}
      active={timeline ? "timeline" : "explore"}
    >
      <section className="feed-surface directory-surface">
        <div className="directory-controls">
          {timeline && (
            <p className="muted">Jejak penyelesaian, terbuka untuk semua.</p>
          )}
          <SearchControls
            query={query}
            onQueryChange={setQuery}
            filters={applied}
            onApply={setApplied}
            timeline={timeline}
            accounts={accounts}
            reportOnly={tab === "reports"}
            regions={regions}
            categories={categories}
            agencies={agencies}
          />
          {!timeline && (
            <div
              className="directory-tabs"
              role="tablist"
              aria-label="Jenis hasil"
            >
              {[
                { key: "posts", label: "Postingan" },
                { key: "reports", label: "Laporan" },
                { key: "accounts", label: "Akun" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  onClick={() => {
                    setTab(item.key);
                    if (item.key !== "posts")
                      setApplied((current) => ({ ...current, kind: [] }));
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <p role="status" className="small muted">
            {timeline ? "Terbaru ditutup · " : ""}
            {accounts ? accountResults.length : results.length}{" "}
            {accounts ? "akun" : "postingan"}
            {timeline ? " · Hanya laporan Closed" : ""}
          </p>
        </div>
        {accounts
          ? accountResults.map((person) => (
              <article className="account-result" key={person.localKey}>
                <Avatar name={person.name} src={person.image} />
                <div>
                  <button
                    className="account-name"
                    onClick={() => setPreview(person)}
                  >
                    {person.name}
                    {person.role === "GOVERNMENT" ? " ✓" : ""}
                  </button>
                  <small className="muted">@{person.username}</small>
                  <p>{person.bio}</p>
                </div>
                {person.localKey !== user?.localKey && (
                  <Button variant="secondary" onClick={() => follow(person)}>
                    {following.includes(person.localKey) ? "Diikuti" : "Ikuti"}
                  </Button>
                )}
              </article>
            ))
          : results.map((post) => (
              <div key={post.localKey} className="directory-post">
                {timeline && (
                  <p className="closure-caption">
                    Closed ·{" "}
                    {new Date(closureDate(post, now)!).toLocaleDateString(
                      "id-ID",
                      {
                        timeZone: "Asia/Jakarta",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                )}
                <PostCard post={post} />
              </div>
            ))}
        {!(accounts ? accountResults.length : results.length) && (
          <div className="empty-state">
            <h2>
              {timeline
                ? "Belum ada laporan Closed yang cocok"
                : "Tidak ada hasil"}
            </h2>
            <p>
              Coba kata kunci lain atau reset filter untuk melihat hasil
              lainnya.
            </p>
            <Button variant="secondary" onClick={reset}>
              Reset pencarian
            </Button>
          </div>
        )}
        {timeline && (
          <p className="directory-footnote">
            Mencari salah satu instansi yang ditandai menampilkan postingan asli
            yang sama. Penutupan otomatis tanpa suara tidak berarti disetujui
            warga.
          </p>
        )}
      </section>
      {preview && (
        <Dialog title="Ringkasan akun" onClose={() => setPreview(null)}>
          <div className="dialog-body">
            <Avatar name={preview.name} />
            <h3>
              {preview.name}
              {preview.role === "GOVERNMENT" ? " ✓" : ""}
            </h3>
            <p className="muted">@{preview.username}</p>
            <p>{preview.bio}</p>
            <Link
              className="button button--secondary"
              href={`/profile/${preview.localKey}`}
              onClick={() => setPreview(null)}
            >
              Lihat profil lengkap
            </Link>
            {preview.localKey !== user?.localKey && (
              <Button onClick={() => follow(preview)}>
                {following.includes(preview.localKey)
                  ? "Berhenti mengikuti"
                  : "Ikuti akun"}
              </Button>
            )}
          </div>
        </Dialog>
      )}
    </ProductShell>
  );
}
