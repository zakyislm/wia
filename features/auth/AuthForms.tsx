"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicFrame } from "./PublicFrame";
import { useDemo } from "./DemoProvider";
import { Button } from "@/components/ui/Button";
export function Signup() {
  const { people, register } = useDemo();
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  return (
    <PublicFrame title="Bergabung di KAVI">
      <p className="muted">Mulai percakapan, temukan perubahan.</p>
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError("Nama tampilan wajib diisi.");
            return;
          }
          if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
            setError("Username memakai 3–24 huruf, angka atau garis bawah.");
            return;
          }
          if (
            people.some(
              (person) =>
                person.username.toLowerCase() === username.toLowerCase(),
            )
          ) {
            setError("Username sudah dipakai pada data contoh.");
            return;
          }
          register(name.trim(), username);
          setPassword("");
          router.push("/home");
        }}
      >
        <label>
          Nama tampilan
          <input
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          Username
          <input
            required
            value={username}
            maxLength={24}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            placeholder="contoh@example.com"
            autoComplete="off"
          />
        </label>
        <label>
          Kata sandi
          <span className="password-field">
            <input
              required
              minLength={8}
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter untuk demo"
            />
            <Button
              variant="ghost"
              aria-label={
                visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </span>
        </label>
        <p className="small muted">
          Dengan melanjutkan, baca <Link href="/help#terms">ketentuan</Link> dan{" "}
          <Link href="/help#privacy">privasi</Link>. Semua akun baru memakai
          peran warga; verifikasi instansi terpisah.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button type="submit">Daftar akun demo</Button>
      </form>
      <p className="demo-note">
        Gunakan data contoh. Email dan kata sandi tidak dikirim atau disimpan.
        Sesi hilang saat refresh.
      </p>
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
      title={
        step === "expired"
          ? "Tautan kedaluwarsa"
          : step === "done"
            ? "Pratinjau selesai"
            : "Pulihkan akses"
      }
    >
      {step === "email" ? (
        <>
          <p className="muted">Masukkan email untuk melihat alur pemulihan.</p>
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("sent");
            }}
          >
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="off"
                placeholder="contoh@example.com"
              />
            </label>
            <Button type="submit">Lanjutkan</Button>
          </form>
        </>
      ) : step === "sent" ? (
        <div className="stack">
          <p>
            Jika email terdaftar, layanan aktif akan menyediakan instruksi
            pemulihan.
          </p>
          <p className="demo-note">
            Ini pratinjau UI. Tidak ada email yang dikirim dan tidak ada
            pemeriksaan akun.
          </p>
          <Button onClick={() => setStep("new")}>
            Pratinjau kata sandi baru
          </Button>
          <Button variant="secondary" onClick={() => setStep("email")}>
            Kirim ulang
          </Button>
          <Button variant="ghost" onClick={() => setStep("expired")}>
            Lihat kondisi tautan kedaluwarsa
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
          <label>
            Kata sandi baru
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label>
            Ulangi kata sandi
            <input
              type="password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button type="submit">Simpan pada simulasi</Button>
        </form>
      ) : step === "expired" ? (
        <div className="stack">
          <p>
            Tautan ini tidak dapat digunakan lagi. Minta instruksi pemulihan
            baru.
          </p>
          <Button onClick={() => setStep("email")}>Minta tautan baru</Button>
        </div>
      ) : (
        <p className="notice" role="status">
          Alur demo selesai. Kata sandi akun sebenarnya tidak diubah.
        </p>
      )}
      <p className="auth-switch">
        <Link href="/login">Kembali ke Masuk</Link>
      </p>
      <p className="demo-note">Gunakan data contoh, bukan kata sandi asli.</p>
    </PublicFrame>
  );
}
