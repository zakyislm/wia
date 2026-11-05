"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
export default function Error({ retry }: { retry: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card stack" role="alert">
        <h1>Halaman belum bisa dimuat</h1>
        <p>
          Terjadi kendala saat menampilkan halaman. Coba lagi atau kembali ke
          beranda.
        </p>
        <Button onClick={retry}>Coba lagi</Button>
        <Link href="/home">Kembali ke beranda</Link>
      </section>
    </main>
  );
}
