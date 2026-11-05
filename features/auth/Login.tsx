"use client";
import Link from "next/link";
import { PublicFrame } from "./PublicFrame";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useDemo } from "./DemoProvider";
import { Button } from "@/components/ui/Button";

export function Login() {
  const { login } = useDemo();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [account, setAccount] = useState("alya");
  return (
    <PublicFrame title="Selamat datang kembali.">
      <p className="muted">Satu ruang untuk suara dan perubahan.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          login(account);
          router.push("/home");
        }}
      >
        <label>
          Akun demo
          <select
            value={account}
            onChange={(event) => setAccount(event.target.value)}
          >
            <option value="alya">Alya Putri · Warga</option>
            <option value="nadia">Nadia Putri · Warga</option>
            <option value="pupr">Dinas PUPR Bandung · Instansi</option>
            <option value="dishub">Dinas Perhubungan · Instansi</option>
          </select>
        </label>
        <label>
          Email atau username
          <input placeholder="Contoh: alyaputri" autoComplete="off" />
        </label>
        <label>
          Kata sandi
          <span className="password-field">
            <input
              type={visible ? "text" : "password"}
              placeholder="Tidak perlu kata sandi asli"
              autoComplete="off"
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
        <Button type="submit">Masuk ke demo</Button>
      </form>
      <p className="demo-note">
        Demo frontend · tanpa autentikasi sungguhan. Gunakan data contoh saja.
        Refresh menghapus perubahan; pilihan instansi ini hanya untuk simulasi.
      </p>
      <p className="auth-switch">
        <Link href="/recovery">Lupa kata sandi?</Link>
      </p>
      <p className="auth-switch">
        Belum punya akun? <Link href="/signup">Daftar</Link>
      </p>
    </PublicFrame>
  );
}
