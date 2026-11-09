"use client";
import { useState } from "react";
import Link from "next/link";
import { ProductShell } from "@/components/layout/ProductShell";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { PostCard } from "@/features/posts/PostCard";
import { useDemo } from "@/features/auth/DemoProvider";
import { closureDate } from "@/features/discovery/filters";
export function AgencyInbox() {
  const { user, posts } = useDemo();
  const [closed, setClosed] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [now] = useState(() => Date.now());
  const owned = posts.filter(
    (post) =>
      !post.isDeleted &&
      post.kind === "report" &&
      post.agencyKeys.includes(user?.localKey ?? ""),
  );
  const visible = owned.filter(
    (post) =>
      (closureDate(post, now) !== null) === closed &&
      (!region || post.province === region) &&
      (!category || post.category === category) &&
      `${post.content} ${post.province} ${post.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <ProductShell title="Laporan Instansi" active="agency">
      <section className="feed-surface">
        {user?.role !== "GOVERNMENT" ? (
          <div className="empty-state">
            <h2>Akses terbatas</h2>
            <p>
              Daftar kerja ini hanya tersedia untuk instansi terkait. Laporan
              publik tetap tersedia di Jelajah.
            </p>
            <Link href="/explore">Jelajahi laporan →</Link>
          </div>
        ) : (
          <>
            <div className="section-pad stack content-toolbar">
              <p className="muted">
                {user.name} <VerifiedBadge role={user.role} size={15} /> · Daftar
                privat
              </p>
              <label>
                Cari laporan yang menandai instansi
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari laporan…"
                />
              </label>
              <details className="inline-filters">
                <summary>Filter wilayah dan kategori</summary>
                <div className="two-fields">
                  <label>
                    Wilayah
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      <option value="">Semua wilayah</option>
                      {[...new Set(owned.map((p) => p.province))].map(
                        (value) => (
                          <option key={value}>{value}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Kategori
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Semua kategori</option>
                      {[...new Set(owned.map((p) => p.category))].map(
                        (value) => (
                          <option key={value}>{value}</option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </details>
              <div
                className="simple-tabs"
                role="tablist"
                aria-label="Status laporan"
              >
                <button
                  role="tab"
                  aria-selected={!closed}
                  onClick={() => setClosed(false)}
                >
                  Belum Closed
                </button>
                <button
                  role="tab"
                  aria-selected={closed}
                  onClick={() => setClosed(true)}
                >
                  Closed
                </button>
              </div>
              <small className="muted">
                Belum Closed tidak berarti belum pernah ditanggapi.
              </small>
            </div>
            {visible.map((post) => (
              <PostCard key={post.localKey} post={post} />
            ))}
            {!visible.length && (
              <div className="empty-state">
                <h2>Tidak ada laporan yang cocok</h2>
                <p>
                  Ubah kata kunci atau filter untuk melihat laporan lainnya.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </ProductShell>
  );
}
