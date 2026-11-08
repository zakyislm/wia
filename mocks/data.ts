import type { Person, Post } from "@/types/models";

export const people: Person[] = [
  {
    id: "",
    localKey: "alya",
    name: "Alya Putri",
    username: "alyaputri",
    role: "USER",
    bio: "Suara kecil, perubahan bersama.",
  },
  {
    id: "",
    localKey: "nadia",
    name: "Nadia Putri",
    username: "nadiap",
    role: "USER",
    bio: "Cerita dari sudut kota.",
  },
  {
    id: "",
    localKey: "pupr",
    name: "Dinas PUPR Bandung",
    username: "DinasPUPR",
    role: "GOVERNMENT",
    bio: "Infrastruktur dan ruang publik Bandung.",
  },
  {
    id: "",
    localKey: "komunitas",
    name: "Komunitas Kota Kita",
    username: "kotakita",
    role: "USER",
    bio: "Merawat kota, mulai dari sekitar kita.",
  },
  {
    id: "",
    localKey: "dishub",
    name: "Dinas Perhubungan",
    username: "DishubBandung",
    role: "GOVERNMENT",
    bio: "Bergerak bersama untuk Bandung.",
  },
];

export function seedPosts(baseTime = 1794040000000): Post[] {
  const now = baseTime;
  const base: Post = {
    id: "",
    authorId: "",
    topicId: "top_komunitas",
    topicSlug: "komunitas",
    topicName: "Komunitas",
    localKey: "ruang-kecil",
    authorKey: "nadia",
    postedAt: now - 2 * 3600000,
    kind: "general",
    anonymous: false,
    content:
      "Ruang kecil, perubahan besar.\n\nSore ini ikut bersih-bersih taman bareng tetangga. Ada yang punya ide kegiatan buat akhir pekan?",
    province: "Jawa Barat",
    category: "Komunitas",
    tags: ["Kebersihan", "Warga", "KotaKita"],
    agencyKeys: [],
    images: [],
    upvotesCount: 128,
    vote: null,
    reposted: false,
    replies: [],
    resolutions: [],
  };
  const report: Post = {
    ...base,
    localKey: "trotoar-merdeka",
    authorKey: "alya",
    postedAt: now - 4 * 3600000,
    kind: "report",
    anonymous: true,
    content:
      "Trotoar yang aman untuk semua.\n\nTrotoar di Jl. Merdeka rusak dan sulit dilewati. Perlu akses aman untuk semua pejalan kaki.",
    province: "Jawa Barat",
    category: "Infrastruktur",
    topicId: "top_infra",
    topicSlug: "infrastruktur",
    topicName: "Infrastruktur",
    images: ["https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=720&auto=format&fit=crop"],
    agencyKeys: ["pupr", "dishub"],
    tags: ["TrotoarRusak", "AksesAman", "Bandung"],
    upvotesCount: 86,
    replies: [
      {
        id: "",
        authorId: "",
        postId: "",
        parentId: "",
        localKey: "respons-pupr",
        authorKey: "pupr",
        content:
          "Terima kasih atas laporannya. Kami sudah meninjau lokasi dan akan membagikan hasilnya di sini.",
      },
    ],
    resolutions: [],
  };
  const resolution = {
    id: "" as const,
    localKey: "bukti-awal",
    agencyKey: "pupr",
    content:
      "Perbaikan permukaan trotoar dan jalur akses telah dilaksanakan. Silakan tinjau uraian ini dan berikan penilaian apakah masalah sudah selesai.",
    images: [],
    deadline: now + 72 * 3600000,
    agree: 17,
    disagree: 3,
    choice: null,
  };
  return [
    base,
    { ...report, resolutions: [resolution] },
    ...(["success", "failed", "zero"] as const).map((outcome, i) => ({
      ...report,
      localKey: `contoh-${outcome}`,
      tags: [
        ["LampuJalan", "FasilitasPublik"],
        ["HalteBus", "TransportasiUmum", "Aksesibilitas"],
        ["RambuJalan", "KeselamatanWarga"],
      ][i],
      content:
        [
          "Lampu jalan kembali menyala.",
          "Akses halte masih perlu diperbaiki.",
          "Rambu penyeberangan di lingkungan kami.",
        ][i] + "\n\nContoh laporan untuk meninjau hasil validasi penyelesaian.",
      resolutions: [
        {
          ...resolution,
          localKey: `hasil-${outcome}`,
          deadline: now - (i + 1) * 86400000,
          agree: outcome === "zero" ? 0 : outcome === "success" ? 8 : 7,
          disagree: outcome === "zero" ? 0 : outcome === "success" ? 2 : 3,
        },
      ],
    })),
  ];
}
