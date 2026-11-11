"use client";
import Link from "next/link";
import { PublicFrame } from "@/features/auth/PublicFrame";
export function Help() {
  return (
    <PublicFrame title="Bantuan & pedoman" documentTitle="Bantuan" wide>
      <p className="muted">
        Panduan produk KAVI · Rancangan kebijakan masih memerlukan peninjauan
        pengelola.
      </p>
      {[
        {
          key: "posts",
          title: "Unggahan umum dan laporan",
          text: "Unggahan umum untuk percakapan sehari-hari. Laporan wajib memiliki deskripsi, wilayah, kategori dan minimal satu tag instansi terverifikasi. Lampiran foto opsional.",
        },
        {
          key: "anonymity",
          title: "Anonimitas dan privasi",
          text: "Identitas penulis laporan anonim tidak ditampilkan pada kartu, profil publik atau pencarian postingan. Pemilik tetap dapat melihat laporan pada profil sendiri. Foto dan lokasi bisa mengungkap identitas. Akses identitas oleh pengelola perlu kebijakan eksplisit.",
        },
        {
          key: "validation",
          title: "Validasi penyelesaian",
          text: "Pengajuan bukti/argumen membuka validasi 72 jam. Semua akun yang masuk dapat memilih dan mengubah suara sebelum tenggat. Persentase tampil setelah memilih atau periode berakhir. Hasil minimal 80% menutup laporan; tanpa suara ditutup otomatis dengan alasan jelas; hasil lainnya tetap terbuka dan dapat diajukan ulang. Closed tetap mengizinkan diskusi.",
        },
        {
          key: "laporan",
          title: "Laporan",
          text: "Direktori seluruh laporan warga beserta status penanganan (Menunggu, Diproses, Selesai) dan filter pihak penangan Pemerintah atau Internal.",
        },
        {
          key: "verification",
          title: "Identitas instansi",
          text: "Badge menunjukkan identitas instansi, bukan jaminan kebenaran isinya. Komentar instansi biasa tidak dipin dan tidak memulai validasi. Pengajuan verifikasi dan pemeriksaan nyata akan dihubungkan kemudian.",
        },
        {
          key: "community",
          title: "Pedoman komunitas",
          text: "Jaga percakapan tetap hormat. Jangan membagikan data pribadi, spam atau konten yang membahayakan. Gunakan menu laporan untuk menandai dugaan penyalahgunaan. Dalam demo, laporan hanya disimpan lokal.",
        },
        {
          key: "privacy",
          title: "Privasi data demo",
          text: "Semua interaksi frontend tersimpan sementara dalam memori browser. Foto dan dokumen lokal tidak diunggah. Refresh menghapus sesi. Jangan masukkan data pribadi atau kata sandi asli.",
        },
        {
          key: "terms",
          title: "Ketentuan layanan",
          text: "Halaman ini adalah panduan prototipe dan bukan perjanjian layanan final. Ketentuan, kebijakan privasi, prosedur moderasi dan mekanisme keberatan akan ditinjau tim sebelum peluncuran.",
        },
      ].map((item) => (
        <details className="help-topic" id={item.key} key={item.key} open>
          <summary>{item.title}</summary>
          <p>{item.text}</p>
        </details>
      ))}
      <div className="button-row">
        <Link className="button button--secondary" href="/home">
          Kembali ke aplikasi
        </Link>
        <Link href="/login">Masuk</Link>
      </div>
    </PublicFrame>
  );
}
