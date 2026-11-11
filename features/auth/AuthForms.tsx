"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PublicFrame } from "./PublicFrame";
import { useDemo } from "./DemoProvider";
import { Button } from "@/components/ui/Button";

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
      />
    </svg>
  );
}

export function Signup() {
  const { user, isHydrating } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrating && user) {
      router.replace("/home");
    }
  }, [isHydrating, user, router]);

  return (
    <PublicFrame title="Bergabung di Kavi" documentTitle="Daftar">
      <p className="auth-subtitle">
        Mulai percakapan warga dan pantau perubahan nyata melalui akun Google
        Anda.
      </p>

      <div className="auth-form">
        <fieldset className="auth-disabled-fieldset" disabled aria-disabled="true">
          <label className="auth-field-group">
            <span className="sr-only">Nama tampilan</span>
            <input
              type="text"
              disabled
              placeholder="Nama tampilan"
              className="auth-input auth-input--disabled"
            />
          </label>
          <label className="auth-field-group">
            <span className="sr-only">Username</span>
            <input
              type="text"
              disabled
              placeholder="Username (@warga)"
              className="auth-input auth-input--disabled"
            />
          </label>
          <label className="auth-field-group">
            <span className="sr-only">Email</span>
            <input
              type="email"
              disabled
              placeholder="Alamat email"
              className="auth-input auth-input--disabled"
            />
          </label>
          <label className="auth-field-group">
            <span className="sr-only">Kata sandi</span>
            <div className="auth-passcode-preview">
              <input
                type="password"
                disabled
                placeholder="Kata sandi"
                className="auth-input auth-input--disabled"
              />
              <span className="auth-passcode-tag">Nonaktif</span>
            </div>
          </label>
        </fieldset>

        <p className="small muted auth-terms-note">
          Pendaftaran menggunakan autentikasi satu pintu Google. Dengan
          melanjutkan, Anda menyetujui{" "}
          <Link href="/help#terms">ketentuan</Link> &{" "}
          <Link href="/help#privacy">kebijakan privasi</Link>.
        </p>

        <button
          type="button"
          className="button button--primary auth-submit-btn auth-google-signup-btn"
          onClick={() => {
            void fetch("/api/auth/login", { method: "DELETE" })
              .catch(() => {})
              .finally(() => {
                void signIn("google", { callbackUrl: "/home" });
              });
          }}
        >
          <span className="auth-google-badge" aria-hidden="true">
            <GoogleIcon />
          </span>
          <span>Daftar dengan Google</span>
        </button>
      </div>

      <p className="auth-switch">
        Sudah punya akun? <Link href="/login">Masuk</Link>
      </p>
    </PublicFrame>
  );
}

export function Recovery() {
  const [step, setStep] = useState<
    "email" | "sent" | "new" | "expired" | "done"
  >("email");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  return (
    <PublicFrame
      documentTitle="Kendala Akses"
      title={
        step === "expired"
          ? "Tautan kedaluwarsa"
          : step === "done"
            ? "Kata sandi diperbarui"
            : "Pulihkan Akses"
      }
    >
      {step === "email" ? (
        <>
          <p className="auth-subtitle">
            Masukkan email terdaftar untuk menerima tautan pemulihan akses akun.
          </p>
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("sent");
            }}
          >
            <label className="auth-field-group">
              <span className="sr-only">Email</span>
              <input
                type="email"
                required
                autoComplete="off"
                placeholder="Masukkan email terdaftar"
                className="auth-input"
              />
            </label>
            <Button type="submit" className="auth-submit-btn">
              Kirim tautan pemulihan
            </Button>
          </form>
        </>
      ) : step === "sent" ? (
        <div className="stack">
          <p className="auth-subtitle">
            Jika email terdaftar, instruksi pemulihan kata sandi telah
            dikirimkan ke kotak masuk Anda.
          </p>
          <Button className="auth-submit-btn" onClick={() => setStep("new")}>
            Atur kata sandi baru
          </Button>
          <Button variant="secondary" onClick={() => setStep("email")}>
            Kirim ulang
          </Button>
        </div>
      ) : step === "new" ? (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (password !== confirm) {
              setError("Konfirmasi kata sandi belum sama.");
              return;
            }
            setPassword("");
            setConfirm("");
            setError("");
            setStep("done");
          }}
        >
          <label className="auth-field-group">
            Kata sandi baru
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="auth-input"
            />
          </label>
          <label className="auth-field-group">
            Ulangi kata sandi
            <input
              type="password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="auth-input"
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button type="submit" className="auth-submit-btn">
            Simpan kata sandi
          </Button>
        </form>
      ) : step === "expired" ? (
        <div className="stack">
          <p className="auth-subtitle">
            Tautan ini tidak dapat digunakan lagi. Minta instruksi pemulihan
            baru.
          </p>
          <Button className="auth-submit-btn" onClick={() => setStep("email")}>
            Minta tautan baru
          </Button>
        </div>
      ) : (
        <p className="notice" role="status">
          Kata sandi berhasil diperbarui. Silakan masuk kembali.
        </p>
      )}
      <p className="auth-switch">
        <Link href="/login">Kembali ke halaman Masuk</Link>
      </p>
    </PublicFrame>
  );
}
