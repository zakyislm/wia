"use client";
import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Button } from "@/components/ui/Button";
export function Verification() {
  const { user, workspace, setWorkspace } = useDemo();
  const initial = workspace.verification;
  const [name, setName] = useState(initial.name);
  const [region, setRegion] = useState(initial.region);
  const [responsibility, setResponsibility] = useState(initial.responsibility);
  const [channel, setChannel] = useState(initial.channel);
  const [file, setFile] = useState(initial.evidenceName);
  const [error, setError] = useState("");
  return (
    <ProductShell title="Verifikasi Instansi" active="settings">
      <section className="feed-surface section-pad stack">
        {user?.role === "GOVERNMENT" ? (
          <>
            <h2>Identitas instansi terverifikasi ✓</h2>
            <p>{user.name} memakai status instansi pada akun contoh.</p>
            <Link href="/tugas" className="button button--secondary">
              Lihat daftar tugas
            </Link>
          </>
        ) : workspace.verification.status === "submitted" ? (
          <>
            <h2>Pengajuan tersimpan di demo</h2>
            <p>
              Pratinjau status: menunggu pemeriksaan. Tidak ada pengajuan atau
              dokumen yang dikirim ke pengelola.
            </p>
            <dl className="summary-list">
              <dt>Instansi</dt>
              <dd>{initial.name}</dd>
              <dt>Wilayah</dt>
              <dd>{initial.region}</dd>
              <dt>Kanal resmi</dt>
              <dd>{initial.channel}</dd>
              <dt>Lampiran lokal</dt>
              <dd>{initial.evidenceName || "Tidak ada"}</dd>
            </dl>
            <p className="muted">
              Peran akun tidak berubah sebelum proses verifikasi nyata selesai.
            </p>
            <Button
              variant="secondary"
              onClick={() =>
                setWorkspace((current) => ({
                  ...current,
                  verification: { ...current.verification, status: "none" },
                }))
              }
            >
              Perbaiki pengajuan
            </Button>
          </>
        ) : (
          <>
            <h2>Bangun identitas resmi instansimu.</h2>
            <p className="muted">
              Badge diberikan setelah pemeriksaan identitas. Dokumen perwakilan
              tidak tampil ke publik.
            </p>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !name.trim() ||
                  !region.trim() ||
                  !responsibility.trim() ||
                  !channel.trim()
                ) {
                  setError("Lengkapi seluruh isian wajib.");
                  return;
                }
                setWorkspace((current) => ({
                  ...current,
                  verification: {
                    id: "",
                    status: "submitted",
                    name: name.trim(),
                    region: region.trim(),
                    responsibility: responsibility.trim(),
                    channel: channel.trim(),
                    evidenceName: file,
                  },
                }));
                setError("");
              }}
            >
              <label>
                Nama instansi *
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Wilayah layanan *
                <input
                  required
                  maxLength={100}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </label>
              <label>
                Tanggung jawab *
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={responsibility}
                  onChange={(e) => setResponsibility(e.target.value)}
                />
              </label>
              <label>
                Email / kanal resmi *
                <input
                  required
                  maxLength={200}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </label>
              <label>
                Bukti kewenangan perwakilan
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (!selected) return;
                    if (
                      ![
                        "application/pdf",
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                      ].includes(selected.type) ||
                      selected.size > 10 * 1024 * 1024
                    ) {
                      setError("Pilih PDF, JPG, PNG atau WebP maksimal 10 MB.");
                      e.target.value = "";
                      return;
                    }
                    setFile(selected.name);
                    setError("");
                  }}
                />
              </label>
              {file && (
                <p className="small">
                  Lampiran: {file}{" "}
                  <Button variant="ghost" onClick={() => setFile("")}>
                    Hapus lampiran
                  </Button>
                </p>
              )}
              <p className="small muted">
                Gunakan data contoh. Lampiran tidak diunggah; hanya nama file
                disimpan dalam sesi demo. Batas demo 10 MB.
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit">Kirim pengajuan demo</Button>
            </form>
          </>
        )}
      </section>
    </ProductShell>
  );
}
