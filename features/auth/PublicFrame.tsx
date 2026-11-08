"use client";
import Link from "next/link";
import type { ReactNode } from "react";

export function PublicFrame({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="public-surface">
      <main className="auth-page">
        <section className={`auth-card ${wide ? "auth-card-wide" : ""}`}>
          <Link className="wordmark" href="/login">
            k!
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
