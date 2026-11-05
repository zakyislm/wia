"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Button } from "@/components/ui/Button";
export function Settings() {
  const { user, theme, setTheme, workspace, setWorkspace, logout } = useDemo();
  const router = useRouter();
  const [social, setSocial] = useState(workspace.notificationSocial);
  const [reports, setReports] = useState(workspace.notificationReports);
  const [status, setStatus] = useState("");
  return (
    <ProductShell title="Pengaturan" active="settings">
      <section className="feed-surface settings-surface">
        <details className="settings-section">
          <summary>Akun & keamanan</summary>
          <div className="stack">
            <p>
              <strong>{user?.name}</strong>
              <br />@{user?.username}
            </p>
            <Link href="/profile" className="button button--secondary">
              Edit profil
            </Link>
            <Link href="/recovery">Pemulihan kata sandi →</Link>
            <p className="small muted">
              Akun ini adalah sesi demo. Data masuk dan kata sandi tidak dikirim
              ke server.
            </p>
          </div>
        </details>
        <details className="settings-section">
          <summary>Privasi & anonimitas</summary>
          <div className="stack">
            <p>
              Laporan anonim menyembunyikan identitas penulis dari publik. Pada
              profil sendiri, laporan anonim hanya terlihat oleh pemilik.
            </p>
            <p>
              Foto, video atau lokasi dapat mengungkap identitas. Akses
              identitas oleh pengelola memerlukan kebijakan tersendiri.
            </p>
            <Link href="/help#anonymity">Pelajari anonim publik →</Link>
          </div>
        </details>
        <details className="settings-section">
          <summary>Notifikasi</summary>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              setWorkspace((current) => ({
                ...current,
                notificationSocial: social,
                notificationReports: reports,
              }));
              setStatus("Preferensi notifikasi disimpan untuk sesi demo.");
            }}
          >
            <label className="check-label">
              <input
                type="checkbox"
                checked={social}
                onChange={(e) => setSocial(e.target.checked)}
              />
              Interaksi sosial
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={reports}
                onChange={(e) => setReports(e.target.checked)}
              />
              Pembaruan laporan & validasi
            </label>
            <Button type="submit">Simpan preferensi</Button>
          </form>
        </details>
        <details className="settings-section">
          <summary>
            Tampilan ·{" "}
            {theme === "system"
              ? "Ikuti perangkat"
              : theme === "dark"
                ? "Gelap"
                : "Terang"}
          </summary>
          <label className="stack">
            Tema
            <select
              value={theme}
              onChange={(e) =>
                setTheme(e.target.value as "system" | "light" | "dark")
              }
            >
              <option value="system">Ikuti perangkat</option>
              <option value="light">Terang</option>
              <option value="dark">Gelap</option>
            </select>
          </label>
        </details>
        <Link className="settings-link" href="/activity">
          Riwayat aktivitas pribadi →
        </Link>
        <Link className="settings-link" href="/verification">
          Verifikasi instansi →
        </Link>
        {user?.role === "GOVERNMENT" && (
          <Link className="settings-link" href="/agency">
            Daftar laporan instansi →
          </Link>
        )}
        <Link className="settings-link" href="/help">
          Bantuan & pedoman →
        </Link>
        {status && (
          <p className="notice" role="status">
            {status}
          </p>
        )}
        <div className="section-pad">
          <Button
            variant="secondary"
            className="full-width"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Keluar
          </Button>
        </div>
      </section>
    </ProductShell>
  );
}
