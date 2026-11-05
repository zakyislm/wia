export default function Loading() {
  return (
    <main className="auth-page">
      <section className="auth-card stack" role="status" aria-live="polite">
        <p>Memuat KAVI…</p>
        <div className="loading-skeleton" />
        <div className="loading-skeleton" />
        <div className="loading-skeleton" />
      </section>
    </main>
  );
}
