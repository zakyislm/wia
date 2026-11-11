"use client";
import Link from "next/link";
import { PublicFrame } from "@/features/auth/PublicFrame";

export function Help() {
  return (
    <PublicFrame title="Bantuan & Kebijakan" documentTitle="Bantuan" wide>
      {[
        {
          key: "about",
          title: "Tentang Kavi",
          text: "Kavi adalah ruang diskusi dan laporan warga untuk menyuarakan isu sekitar serta memantau tindak lanjut instansi terkait.",
        },
        {
          key: "anonymity",
          title: "Anonimitas",
          text: "Identitas penulis laporan anonim tidak ditampilkan pada kartu, profil publik atau pencarian postingan. Pemilik tetap dapat melihat laporan pada profil sendiri. Foto dan lokasi bisa mengungkap identitas. Akses identitas oleh pengelola perlu kebijakan eksplisit.",
        },
        {
          key: "validation",
          title: "Validasi penyelesaian",
          text: "Pengajuan bukti/argumen membuka validasi 72 jam. Semua akun yang masuk dapat memilih dan mengubah suara sebelum tenggat. Persentase tampil setelah memilih atau periode berakhir. Hasil minimal 83% menutup laporan; tanpa suara ditutup otomatis dengan alasan jelas; hasil lainnya tetap terbuka dan dapat diajukan ulang. Closed tetap mengizinkan diskusi.",
        },
        {
          key: "laporan",
          title: "Laporan",
          text: "Direktori seluruh laporan warga beserta status penanganan (Menunggu, Diproses, Selesai) dan filter pihak penangan Pemerintah atau Internal.",
        },
        {
          key: "verification",
          title: "Identitas instansi",
          text: "Badge menunjukkan identitas instansi terverifikasi. Komentar instansi biasa tidak dipin dan tidak memulai validasi sampai ditandai sebagai tindak lanjut resmi.",
        },
        {
          key: "community",
          title: "Pedoman komunitas",
          text: "Jaga percakapan tetap hormat. Jangan membagikan data pribadi, spam atau konten yang membahayakan. Gunakan menu laporan untuk menandai dugaan penyalahgunaan.",
        },
        {
          key: "privacy",
          title: "Privasi data pengguna",
          text: "Data profil, laporan publik, dan interaksi disimpan secara aman pada basis data Kavi. Laporan berstatus anonim menyembunyikan identitas pelapor dari tampilan publik.",
        },
        {
          key: "terms",
          title: "Ketentuan layanan",
          text: "Pengguna bertanggung jawab atas keakuratan laporan yang dikirimkan. Penyalahgunaan fitur pelaporan dapat dikenakan tindakan moderasi oleh tim Kavi.",
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
