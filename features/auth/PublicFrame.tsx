"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { formatPageTitle } from "@/lib/title";

export function PublicFrame({
  title,
  documentTitle,
  children,
  wide = false,
}: {
  title: string;
  documentTitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const resolvedDocTitle = formatPageTitle(documentTitle ?? title);
  useEffect(() => {
    document.title = resolvedDocTitle;
  }, [resolvedDocTitle]);

  return (
    <div className="public-surface">
      <main className="auth-page">
        <section className={`auth-card ${wide ? "auth-card-wide" : ""}`}>
          <Link className="wordmark" href="/login" aria-label="KAVI">
            <Image
              src="/kavi.png"
              alt="KAVI"
              width={96}
              height={96}
              className="wordmark-img"
              preload
            />
          </Link>
          <h1>{title}</h1>
          {children}
          <footer className="public-footer">
            <p className="small muted">
              KAVI adalah ruang warga untuk berbagi cerita dan memantau
              perubahan di sekitar kita.
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
