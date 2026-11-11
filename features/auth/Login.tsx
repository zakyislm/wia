"use client";
import Link from "next/link";
import { PublicFrame } from "./PublicFrame";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { signIn } from "next-auth/react";
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

export function Login() {
  const { people, user, isHydrating, login, showToast } = useDemo();
  const router = useRouter();
  const quickAccounts = people.filter((p) => p.isDemo);
  const [account, setAccount] = useState("alya");

  useEffect(() => {
    if (!isHydrating && user) {
      router.replace("/home");
    }
  }, [isHydrating, user, router]);

  useEffect(() => {
    if (
      quickAccounts.length > 0 &&
      !quickAccounts.some((d) => d.localKey === account)
    ) {
      setAccount(quickAccounts[0].localKey);
    }
  }, [quickAccounts, account]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "AccountNotRegistered") {
      showToast("Akun tidak terdaftar", "error");
    } else if (err === "AccountBanned") {
      showToast("Akun ini telah diblokir.", "error");
    }
  }, [showToast]);

  const selectedPerson = quickAccounts.find((p) => p.localKey === account);
  const selectedHandle = selectedPerson
    ? `@${selectedPerson.username}`
    : account === "pupr"
      ? "@pupr_bdg"
      : account === "zaky_internal"
        ? "@zaky_internal"
        : "@alyaputri";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Provided accounts run in isolated session state and never mutate database reports
    login(account);
    router.push("/home");
  }

  return (
    <PublicFrame title="Masuk ke Akun" documentTitle="Masuk">
      <p className="auth-subtitle">
        Pilih akun yang tersedia untuk masuk ke ruang warga, atau gunakan akun
        Google Anda.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field-group">
          <span className="sr-only">Pilih akun</span>
          <div className="auth-select-wrap">
            <select
              aria-label="Pilih akun"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              className="auth-input auth-select"
            >
              {quickAccounts.length > 0 ? (
                quickAccounts.map((item) => {
                  const roleLabel =
                    item.role === "GOVERNMENT"
                      ? "Instansi"
                      : item.role === "INTERNAL"
                        ? "Internal"
                        : "Warga";
                  return (
                    <option key={item.localKey} value={item.localKey}>
                      {item.name} · {roleLabel}
                    </option>
                  );
                })
              ) : (
                <>
                  <option value="alya">Alya Putri · Warga</option>
                  <option value="pupr">Dinas PUPR Bandung · Instansi</option>
                  <option value="zaky_internal">
                    Zaky The Flymost · Internal
                  </option>
                </>
              )}
            </select>
            <ChevronDown
              size={17}
              className="auth-select-icon"
              aria-hidden="true"
            />
          </div>
        </label>

        <label className="auth-field-group">
          <span className="sr-only">Kredensial akun</span>
          <div className="auth-passcode-preview">
            <input
              type="text"
              value={`${selectedHandle} · ••••••••`}
              disabled
              readOnly
              aria-label="Kredensial akun terpilih"
              className="auth-input auth-input--disabled"
            />
            <span className="auth-passcode-tag">Siap pakai</span>
          </div>
        </label>

        <div className="auth-trouble-row">
          <Link href="/recovery">Kendala saat masuk?</Link>
        </div>

        <Button type="submit" className="auth-submit-btn">
          Masuk
        </Button>

        <div className="auth-divider" role="separator">
          <span>Atau masuk dengan</span>
        </div>

        <button
          type="button"
          className="auth-oauth-btn"
          onClick={() => {
            void fetch("/api/auth/login", { method: "DELETE" })
              .catch(() => {})
              .finally(() => {
                void signIn("google", { callbackUrl: "/home" });
              });
          }}
        >
          <GoogleIcon />
          <span>Google</span>
        </button>
      </form>

      <p className="auth-switch">
        Belum punya akun? <Link href="/signup">Daftar sekarang</Link>
      </p>
    </PublicFrame>
  );
}
