import Link from "next/link";
import { PublicFrame } from "@/features/auth/PublicFrame";
export default function NotFound() {
  return (
    <PublicFrame title="Halaman tidak ditemukan" documentTitle="Halaman Tidak Ditemukan">
      <p className="muted">
        Alamat ini tidak tersedia. Kembali ke halaman yang kamu kenal untuk
        melanjutkan.
      </p>
      <div className="button-row">
        <Link className="button button--primary" href="/home">
          Ke beranda
        </Link>
        <Link className="button button--secondary" href="/login">
          Masuk
        </Link>
      </div>
    </PublicFrame>
  );
}
