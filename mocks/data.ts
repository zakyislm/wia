import type { Person, Post } from "@/types/models";

export const people: Person[] = [
  {
    id: "",
    localKey: "alya",
    name: "Alya Putri",
    username: "alyaputri",
    role: "USER",
    bio: "Suara kecil, perubahan bersama.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop",
  },
  {
    id: "",
    localKey: "nadia",
    name: "Nadia Putri",
    username: "nadiap",
    role: "USER",
    bio: "Cerita dari sudut kota.",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=240&auto=format&fit=crop",
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
  {
    id: "",
    localKey: "zaky_internal",
    name: "Zaky The Flymost",
    username: "zakyflymost",
    role: "INTERNAL",
    bio: "Tim Internal & Moderasi KAVI.",
  },
];

export function seedPosts(baseTime = 1794040000000): Post[] {
  const now = baseTime;

  // 1. Postingan biasa (Threads/Twitter style): Alya Putri
  const postAlya: Post = {
    id: "",
    authorId: "",
    topicId: "top_komunitas",
    topicSlug: "komunitas",
    topicName: "Komunitas",
    localKey: "kopi-braga",
    authorKey: "alya",
    postedAt: now - 45 * 60000,
    kind: "general",
    anonymous: false,
    content:
      "Kopi pagi di Braga selalu punya cerita tersendiri. Senang liat trotoar yang mulai ramah kursi roda dan pejalan kaki. Semoga makin banyak spot kayak gini di kota-kota lain ✨",
    province: "Jawa Barat",
    category: "Komunitas",
    tags: ["Bandung", "PejalanKaki", "RuangPublik"],
    agencyKeys: [],
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=720&auto=format&fit=crop",
    ],
    upvotesCount: 245,
    vote: null,
    reposted: false,
    replies: [
      {
        id: "",
        authorId: "",
        postId: "",
        parentId: "",
        localKey: "rep-alya-1",
        authorKey: "nadia",
        postedAt: now - 20 * 60000,
        content:
          "Setuju banget kak! Paling enak jalan kaki di sana pas minggu pagi sebelum rame.",
        upvotesCount: 12,
        downvotesCount: 0,
        vote: null,
      },
    ],
    resolutions: [],
  };

  // 2. Laporan warga (Diproses — aparat sudah Taking Action): Trotoar Rusak di Jl. Merdeka
  const reportMerdeka: Post = {
    id: "",
    authorId: "",
    topicId: "top_infra",
    topicSlug: "infrastruktur",
    topicName: "Infrastruktur",
    localKey: "trotoar-merdeka",
    authorKey: "alya",
    postedAt: now - 3 * 3600000,
    kind: "report",
    reportStatus: "in_progress",
    anonymous: true,
    content:
      "Trotoar yang aman untuk semua pejalan kaki.\n\nTrotoar di Jl. Merdeka rusak dan berlubang cukup parah setelah galian utilitas. Membahayakan anak sekolah dan lansia yang melintas setiap pagi. Mohon penanganan dari pihak terkait.",
    province: "Jawa Barat",
    category: "Infrastruktur",
    images: [
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=720&auto=format&fit=crop",
    ],
    agencyKeys: ["pupr", "dishub"],
    tags: ["TrotoarRusak", "AksesAman", "Bandung"],
    upvotesCount: 86,
    vote: null,
    reposted: false,
    replies: [
      {
        id: "",
        authorId: "",
        postId: "",
        parentId: "",
        localKey: "rep-warga-1",
        authorKey: "nadia",
        postedAt: now - 2 * 3600000,
        content:
          "Kemarin pagi saya lewat sini hampir kesandung besi penutup drainase yang miring. Semoga cepat diperbaiki.",
        upvotesCount: 9,
        downvotesCount: 0,
        vote: null,
      },
      {
        id: "",
        authorId: "",
        postId: "",
        parentId: "",
        localKey: "respons-pupr",
        authorKey: "pupr",
        postedAt: now - 35 * 60000,
        content:
          "Tim pemeliharaan jalan Dinas PUPR Bandung telah melakukan pemasangan kembali paving blok dan penutupan lubang utilitas di Jl. Merdeka. Silakan warga meninjau hasil perbaikan dan memberikan upvote/downvote pada respon tindak lanjut ini.",
        is_action_taken: true,
        actionRole: "GOVERNMENT",
        actionTakenAt: now - 35 * 60000,
        images: [
          "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=720&auto=format&fit=crop",
        ],
        upvotesCount: 17,
        downvotesCount: 3,
        vote: null,
      },
    ],
    resolutions: [
      {
        id: "",
        localKey: "bukti-awal",
        agencyKey: "pupr",
        content:
          "Perbaikan permukaan trotoar dan penutupan lubang utilitas telah dilaksanakan. Silakan warga meninjau langsung dan memberikan penilaian validasi.",
        images: [],
        deadline: now + 72 * 3600000,
        agree: 17,
        disagree: 3,
        choice: null,
      },
    ],
  };

  // 3. Postingan biasa (Threads/Twitter style): Komunitas Kota Kita
  const postKomunitas: Post = {
    id: "",
    authorId: "",
    topicId: "top_komunitas",
    topicSlug: "komunitas",
    topicName: "Komunitas",
    localKey: "workshop-sampah",
    authorKey: "komunitas",
    postedAt: now - 5 * 3600000,
    kind: "general",
    anonymous: false,
    content:
      "Minggu depan kita mau ngadain workshop daur ulang sampah plastik & komposter mandiri untuk warga kelurahan. Ada yang mau join jadi volunteer atau fasilitator? Drop reply ya! ♻️🙌",
    province: "Jawa Barat",
    category: "Komunitas",
    tags: ["Komunitas", "DaurUlang", "ZeroWaste", "Warga"],
    agencyKeys: [],
    images: [],
    upvotesCount: 89,
    vote: null,
    reposted: false,
    replies: [
      {
        id: "",
        authorId: "",
        postId: "",
        parentId: "",
        localKey: "rep-kom-1",
        authorKey: "nadia",
        postedAt: now - 4 * 3600000,
        content: "Mau ikut kak! Ada link grup koordinasi atau pendaftarannya?",
        upvotesCount: 5,
        downvotesCount: 0,
        vote: null,
      },
    ],
    resolutions: [],
  };

  // 4. Postingan biasa (Threads/Twitter style): Nadia Putri
  const postNadia: Post = {
    id: "",
    authorId: "",
    topicId: "top_rth",
    topicSlug: "ruang-terbuka-hijau",
    topicName: "Ruang Terbuka Hijau",
    localKey: "ruang-hijau",
    authorKey: "nadia",
    postedAt: now - 8 * 3600000,
    kind: "general",
    anonymous: false,
    content:
      "Ruang terbuka hijau di lingkungan kita tuh beneran bikin pikiran adem setelah seminggu kerja. Yuk rawat bareng-bareng jangan buang puntung rokok sembarangan ya kawan-kawan 🌿🌳",
    province: "Jawa Barat",
    category: "Komunitas",
    tags: ["RuangTerbukaHijau", "Lingkungan", "Bandung"],
    agencyKeys: [],
    images: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=720&auto=format&fit=crop",
    ],
    upvotesCount: 174,
    vote: null,
    reposted: false,
    replies: [],
    resolutions: [],
  };

  // 5. Laporan warga: Lampu Jalan Padam (Selesai — Closed by Aparat)
  const reportLampu: Post = {
    ...reportMerdeka,
    localKey: "contoh-success",
    postedAt: now - 24 * 3600000,
    reportStatus: "completed",
    closedByKey: "dishub",
    closedByRole: "GOVERNMENT",
    closedAt: now - 2 * 3600000,
    anonymous: false,
    authorKey: "nadia",
    tags: ["LampuJalan", "FasilitasPublik", "Keselamatan"],
    content:
      "Penerangan jalan umum padam di perempatan.\n\nLampu jalan di perempatan Jl. Riau padam lebih dari 3 hari, rawan kecelakaan di malam hari. Mohon perbaikan unit lampu PJU.",
    replies: [
      {
        id: "",
        authorId: "",
        postId: "",
        parentId: "",
        localKey: "respons-dishub-selesai",
        authorKey: "dishub",
        postedAt: now - 12 * 3600000,
        content:
          "Unit trafo dan lampu PJU di perempatan Jl. Riau telah diganti dengan unit LED baru oleh tim teknis Dishub Bandung. Penerangan jalan kembali berfungsi normal.",
        is_action_taken: true,
        actionRole: "GOVERNMENT",
        actionTakenAt: now - 12 * 3600000,
        images: [
          "https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=720&auto=format&fit=crop",
        ],
        upvotesCount: 28,
        downvotesCount: 1,
        vote: null,
      },
    ],
    resolutions: [
      {
        id: "",
        localKey: "hasil-success",
        agencyKey: "dishub",
        content:
          "Unit trafo dan bohlam PJU telah diganti. Penerangan jalan kembali berfungsi normal.",
        images: [],
        deadline: now - 86400000,
        agree: 28,
        disagree: 1,
        choice: null,
      },
    ],
  };

  // 6. Laporan warga: Akses Halte Rusak (Menunggu — Fresh Report)
  const reportHalte: Post = {
    ...reportMerdeka,
    localKey: "contoh-failed",
    postedAt: now - 48 * 3600000,
    reportStatus: "waiting",
    closedByKey: undefined,
    closedByRole: undefined,
    closedAt: undefined,
    anonymous: true,
    authorKey: "alya",
    tags: ["HalteBus", "TransportasiUmum", "Aksesibilitas"],
    content:
      "Atap halte bus bocor dan lantai licin.\n\nAtap halte Trans Metro Bandung di halte Cihampelas bocor dan genangan air saat hujan membahayakan penumpang yang menunggu bus.",
    replies: [
      {
        id: "",
        authorId: "",
        postId: "",
        parentId: "",
        localKey: "rep-halte-1",
        authorKey: "komunitas",
        postedAt: now - 30 * 3600000,
        content:
          "Bener banget, kemarin sore pas hujan deras banyak penumpang terpaksa berdiri di pinggir jalan karena dalamnya banjir.",
        upvotesCount: 14,
        downvotesCount: 0,
        vote: null,
      },
    ],
    resolutions: [],
  };

  return [
    postAlya,
    reportMerdeka,
    postKomunitas,
    postNadia,
    reportLampu,
    reportHalte,
  ];
}
