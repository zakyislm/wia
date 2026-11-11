"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { formatPageTitle } from "@/lib/title";

export default function Error({ retry }: { retry: () => void }) {
  useEffect(() => {
    document.title = formatPageTitle("Terjadi Kendala");
  }, []);

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
