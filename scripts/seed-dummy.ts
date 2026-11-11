import "dotenv/config";
import {
  db,
  client,
  users,
  posts,
  comments,
  topics,
  tags,
  postTags,
  postAgencies,
  votes,
  follows,
  savedPosts,
  reposts,
  notifications,
  conversations,
  conversationParticipants,
  messages,
  userPreferences,
  drafts,
  agencyVerificationRequests,
} from "../db";

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw new Error("Unreachable");
}

async function insertChunked<T extends Record<string, any>>(
  table: any,
  rows: T[],
  chunkSize = 12
) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    await withRetry(() => db.insert(table).values(slice));
  }
}

export async function seedDummyData() {
  console.log("=== SEEDING KAVI PRODUCTION-GRADE CIVIC DATASET ===");
  const baseNow = Date.now();
  const now = new Date(baseNow);

  // Clean existing rows idempotently in a single batch so re-running seed produces exact counts
  const tablesToClear = [
    "agency_verification_requests",
    "drafts",
    "user_preferences",
    "messages",
    "conversation_participants",
    "conversations",
    "notifications",
    "reports",
    "blocked_users",
    "muted_users",
    "follows",
    "hidden_posts",
    "saved_posts",
    "reposts",
    "votes",
    "comments",
    "post_agencies",
    "post_tags",
    "posts",
    "tags",
    "topics",
    "users",
  ];
  await withRetry(() =>
    client.batch(
      [
        "PRAGMA foreign_keys = OFF;",
        ...tablesToClear.map((tbl) => `DELETE FROM "${tbl}";`),
        "PRAGMA foreign_keys = ON;",
      ],
      "write"
    )
  );

  // =========================================================================
  // 1. MACRO TOPICS (12 canonical topics)
  // =========================================================================
  const defaultTopics = [
    { id: "top_infra", name: "Infrastruktur", slug: "infrastruktur", isTrending: true, createdAt: now },
    { id: "top_transportasi", name: "Transportasi", slug: "transportasi", isTrending: true, createdAt: now },
    { id: "top_lingkungan", name: "Lingkungan & Kebersihan", slug: "lingkungan-kebersihan", isTrending: true, createdAt: now },
    { id: "top_kesehatan", name: "Kesehatan", slug: "kesehatan", isTrending: false, createdAt: now },
    { id: "top_pendidikan", name: "Pendidikan", slug: "pendidikan", isTrending: false, createdAt: now },
    { id: "top_keamanan", name: "Keamanan & Ketertiban", slug: "keamanan-ketertiban", isTrending: false, createdAt: now },
    { id: "top_bencana", name: "Bencana & Darurat", slug: "bencana-darurat", isTrending: true, createdAt: now },
    { id: "top_layanan", name: "Layanan Publik", slug: "layanan-publik", isTrending: false, createdAt: now },
    { id: "top_sosial", name: "Sosial & Warga", slug: "sosial-warga", isTrending: false, createdAt: now },
    { id: "top_tatakelola", name: "Tata Kelola & Hukum", slug: "tata-kelola-hukum", isTrending: false, createdAt: now },
    { id: "top_utilitas", name: "Air & Utilitas", slug: "air-utilitas", isTrending: false, createdAt: now },
    { id: "top_komunitas", name: "Komunitas", slug: "komunitas", isTrending: false, createdAt: now },
  ];
  await db.insert(topics).values(defaultTopics);

  // =========================================================================
  // 2. USERS (54 accounts total)
  // - 3 Pre-registered INTERNAL Google OAuth accounts
  // - 3 Demo switcher accounts (1 per role: USER, GOVERNMENT, INTERNAL)
  // - 14 Active Citizen Posters (~26% of 54 accounts: "alya", "nadia", "komunitas" + 11 citizen posters)
  // - 9 Official Government Agency accounts
  // - 26 Passive Citizen Scroller/Reader accounts (0 posts authored)
  // =========================================================================
  const internalGoogleUsers = [
    {
      id: "usr_internal_zaki",
      name: "Zaki Islam",
      username: "zakislam",
      email: "zakislam238@gmail.com",
      image: null,
      bio: "Internal Operations & Civic Verification Lead Kavi.",
      role: "INTERNAL" as const,
      agencyName: "Tim Internal KAVI",
      jurisdictionProvince: "Indonesia",
      region: "Indonesia",
      isDemo: false,
      postCount: 0,
      followerCount: 1420,
      followingCount: 48,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_internal_adrian",
      name: "Adrian B. W.",
      username: "adrianbw",
      email: "adrianbw28@gmail.com",
      image: null,
      bio: "Platform Reliability & Moderation Team Kavi.",
      role: "INTERNAL" as const,
      agencyName: "Tim Internal KAVI",
      jurisdictionProvince: "Indonesia",
      region: "Indonesia",
      isDemo: false,
      postCount: 0,
      followerCount: 980,
      followingCount: 35,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_internal_farika",
      name: "Farika Aulia P.",
      username: "farikaaulia",
      email: "farikaauliap@gmail.com",
      image: null,
      bio: "Public Policy & Agency Liaison Kavi.",
      role: "INTERNAL" as const,
      agencyName: "Tim Internal KAVI",
      jurisdictionProvince: "Indonesia",
      region: "Indonesia",
      isDemo: false,
      postCount: 0,
      followerCount: 1150,
      followingCount: 42,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 3 Demo accounts (1 per role) + 2 other active citizen posters
  // Note: "alya", "nadia", and "komunitas" are the ONLY 3 accounts (~5.56% / ~6% of 54) that author the 50 root posts!
  const demoAndActiveUsers = [
    {
      id: "alya",
      name: "Alya Putri",
      username: "alyaputri",
      email: "alya@kavi.id",
      image: "https://s3.kavi.jeki.me/pfp/alya.jpg",
      bio: "Suara kecil, perubahan bersama.",
      role: "USER" as const,
      agencyName: null,
      jurisdictionProvince: "Jawa Barat",
      region: "Bandung, Jawa Barat",
      isDemo: true,
      postCount: 18,
      followerCount: 1240,
      followingCount: 86,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pupr",
      name: "Dinas PUPR Bandung",
      username: "DinasPUPR",
      email: "pupr@bandung.go.id",
      image: null,
      bio: "Infrastruktur dan ruang publik Bandung.",
      role: "GOVERNMENT" as const,
      agencyName: "Dinas PUPR Bandung",
      jurisdictionProvince: "Jawa Barat",
      region: "Bandung, Jawa Barat",
      isDemo: true,
      postCount: 0,
      followerCount: 18400,
      followingCount: 12,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "zaky_internal",
      name: "Zaky The Flymost",
      username: "zakyflymost",
      email: "zaky@kavi.id",
      image: null,
      bio: "Tim Internal & Moderasi KAVI.",
      role: "INTERNAL" as const,
      agencyName: "Tim Internal KAVI",
      jurisdictionProvince: "Indonesia",
      region: "Indonesia",
      isDemo: true,
      postCount: 0,
      followerCount: 5200,
      followingCount: 24,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "nadia",
      name: "Nadia Putri",
      username: "nadiap",
      email: "nadia@kavi.id",
      image: "https://s3.kavi.jeki.me/pfp/nadia.jpg",
      bio: "Cerita dari sudut kota & pemantau fasilitas publik.",
      role: "USER" as const,
      agencyName: null,
      jurisdictionProvince: "DKI Jakarta",
      region: "Jakarta Pusat, DKI Jakarta",
      isDemo: false,
      postCount: 17,
      followerCount: 890,
      followingCount: 112,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "komunitas",
      name: "Komunitas Kota Kita",
      username: "kotakita",
      email: "komunitas@kavi.id",
      image: null,
      bio: "Merawat kota, mulai dari sekitar kita.",
      role: "USER" as const,
      agencyName: null,
      jurisdictionProvince: "Jawa Barat",
      region: "Bandung, Jawa Barat",
      isDemo: false,
      postCount: 15,
      followerCount: 3420,
      followingCount: 64,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const governmentAgencies = [
    {
      id: "dishub",
      name: "Dinas Perhubungan",
      username: "DishubBandung",
      email: "dishub@bandung.go.id",
      image: null,
      bio: "Bergerak bersama untuk Bandung.",
      role: "GOVERNMENT" as const,
      agencyName: "Dinas Perhubungan Bandung",
      jurisdictionProvince: "Jawa Barat",
      region: "Bandung, Jawa Barat",
      isDemo: false,
      postCount: 0,
      followerCount: 14200,
      followingCount: 9,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pemprov_jabar",
      name: "Pemprov Jawa Barat",
      username: "PemprovJabar",
      email: "humas@jabarprov.go.id",
      image: null,
      bio: "Kanal resmi Pemerintah Provinsi Jawa Barat.",
      role: "GOVERNMENT" as const,
      agencyName: "Pemprov Jawa Barat",
      jurisdictionProvince: "Jawa Barat",
      region: "Jawa Barat",
      isDemo: false,
      postCount: 0,
      followerCount: 54000,
      followingCount: 18,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dishub_dki",
      name: "Dinas Perhubungan DKI Jakarta",
      username: "DishubDKI",
      email: "dishub@jakarta.go.id",
      image: null,
      bio: "Kanal resmi tindak lanjut transportasi & lalu lintas Provinsi DKI Jakarta.",
      role: "GOVERNMENT" as const,
      agencyName: "Dinas Perhubungan DKI Jakarta",
      jurisdictionProvince: "DKI Jakarta",
      region: "DKI Jakarta",
      isDemo: false,
      postCount: 0,
      followerCount: 41200,
      followingCount: 15,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dlh_jabar",
      name: "DLH Provinsi Jawa Barat",
      username: "DLHJabar",
      email: "dlh@jabarprov.go.id",
      image: null,
      bio: "Pengelolaan lingkungan hidup, sungai, dan persampahan regional Jawa Barat.",
      role: "GOVERNMENT" as const,
      agencyName: "DLH Provinsi Jawa Barat",
      jurisdictionProvince: "Jawa Barat",
      region: "Jawa Barat",
      isDemo: false,
      postCount: 0,
      followerCount: 19300,
      followingCount: 11,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "bpbd_jateng",
      name: "BPBD Provinsi Jawa Tengah",
      username: "BPBDJateng",
      email: "bpbd@jatengprov.go.id",
      image: null,
      bio: "Penanggulangan bencana banjir, rob pesisir, dan kedaruratan Jawa Tengah.",
      role: "GOVERNMENT" as const,
      agencyName: "BPBD Provinsi Jawa Tengah",
      jurisdictionProvince: "Jawa Tengah",
      region: "Jawa Tengah",
      isDemo: false,
      postCount: 0,
      followerCount: 27800,
      followingCount: 14,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pupr_lampung",
      name: "Dinas BMBK & PUPR Lampung",
      username: "PUPRLampung",
      email: "bmbk@lampungprov.go.id",
      image: null,
      bio: "Pemeliharaan jalan provinsi dan jembatan Provinsi Lampung.",
      role: "GOVERNMENT" as const,
      agencyName: "Dinas BMBK & PUPR Lampung",
      jurisdictionProvince: "Lampung",
      region: "Lampung",
      isDemo: false,
      postCount: 0,
      followerCount: 15600,
      followingCount: 8,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pemda_kaltara",
      name: "Pemprov Kalimantan Utara",
      username: "PemdaKaltara",
      email: "pemda@kaltaraprov.go.id",
      image: null,
      bio: "Kanal resmi penanganan aduan & bencana Pemerintah Provinsi Kalimantan Utara.",
      role: "GOVERNMENT" as const,
      agencyName: "Pemprov Kalimantan Utara",
      jurisdictionProvince: "Kalimantan Utara",
      region: "Kalimantan Utara",
      isDemo: false,
      postCount: 0,
      followerCount: 12900,
      followingCount: 7,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pemkot_surabaya",
      name: "DSDABM Kota Surabaya",
      username: "PemkotSurabaya",
      email: "dsdabm@surabaya.go.id",
      image: null,
      bio: "Dinas Sumber Daya Air dan Bina Marga Kota Surabaya.",
      role: "GOVERNMENT" as const,
      agencyName: "DSDABM Kota Surabaya",
      jurisdictionProvince: "Jawa Timur",
      region: "Surabaya, Jawa Timur",
      isDemo: false,
      postCount: 0,
      followerCount: 31500,
      followingCount: 10,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pdam_bandung",
      name: "Perumda Tirtawening Bandung",
      username: "PDAMTirtawening",
      email: "pengaduan@pirtawening.co.id",
      image: null,
      bio: "Layanan distribusi air bersih dan pengaduan pelanggan Kota Bandung.",
      role: "GOVERNMENT" as const,
      agencyName: "Perumda Tirtawening Bandung",
      jurisdictionProvince: "Jawa Barat",
      region: "Bandung, Jawa Barat",
      isDemo: false,
      postCount: 0,
      followerCount: 9400,
      followingCount: 6,
      isBanned: false,
      warningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 37 Passive Citizen Scrollers/Readers (54 - 3 - 5 - 9 = 37)
  const passiveCitizenNames = [
    ["Budi Santoso", "budisantoso", "Jakarta Selatan, DKI Jakarta", "DKI Jakarta"],
    ["Siti Rahmawati", "sitirahma", "Bandung, Jawa Barat", "Jawa Barat"],
    ["Reza Pratama", "rezapratama", "Surabaya, Jawa Timur", "Jawa Timur"],
    ["Dewi Lestari", "dewilestari", "Semarang, Jawa Tengah", "Jawa Tengah"],
    ["Fajar Nugroho", "fajarnugroho", "Yogyakarta, DI Yogyakarta", "DI Yogyakarta"],
    ["Rina Wulandari", "rinawulan", "Depok, Jawa Barat", "Jawa Barat"],
    ["Andi Wijaya", "andiwijaya", "Makassar, Sulawesi Selatan", "Sulawesi Selatan"],
    ["Putri Maharani", "putrimaharani", "Bekasi, Jawa Barat", "Jawa Barat"],
    ["Dimas Saputra", "dimassaputra", "Malang, Jawa Timur", "Jawa Timur"],
    ["Novi Permata", "novipermata", "Tangerang Selatan, Banten", "Banten"],
    ["Hendra Kusuma", "hendrakusuma", "Medan, Sumatera Utara", "Sumatera Utara"],
    ["Lestari Ningrum", "lestariningrum", "Surakarta, Jawa Tengah", "Jawa Tengah"],
    ["Rizky Ramadhan", "rizkyramadhan", "Bogor, Jawa Barat", "Jawa Barat"],
    ["Ayu Kartika", "ayukartika", "Denpasar, Bali", "Bali"],
    ["Bayu Setiawan", "bayusetiawan", "Bandar Lampung, Lampung", "Lampung"],
    ["Mega Utami", "megautami", "Palembang, Sumatera Selatan", "Sumatera Selatan"],
    ["Arif Hidayat", "arifhidayat", "Balikpapan, Kalimantan Timur", "Kalimantan Timur"],
    ["Dian Sastro", "diansastro_warga", "Jakarta Pusat, DKI Jakarta", "DKI Jakarta"],
    ["Gilang Dirga", "gilangwarga", "Padang, Sumatera Barat", "Sumatera Barat"],
    ["Tika Bravani", "tikawarga", "Cirebon, Jawa Barat", "Jawa Barat"],
    ["Yoga Pratama", "yogapratama", "Pekanbaru, Riau", "Riau"],
    ["Intan Permatasari", "intanpermata", "Banjarmasin, Kalimantan Selatan", "Kalimantan Selatan"],
    ["Bagus Kurniawan", "baguskurnia", "Samarinda, Kalimantan Timur", "Kalimantan Timur"],
    ["Citra Kirana", "citrakirana_id", "Tasikmalaya, Jawa Barat", "Jawa Barat"],
    ["Eko Patrio", "ekowarga", "Jakarta Timur, DKI Jakarta", "DKI Jakarta"],
    ["Vina Panduwinata", "vinawarga", "Bogor, Jawa Barat", "Jawa Barat"],
    ["Galih Ginanjar", "galihwarga", "Garut, Jawa Barat", "Jawa Barat"],
    ["Ratna Sari", "ratnasari", "Serang, Banten", "Banten"],
    ["Surya Insomnia", "suryawarga", "Jakarta Barat, DKI Jakarta", "DKI Jakarta"],
    ["Wulan Guritno", "wulanwarga", "Jakarta Selatan, DKI Jakarta", "DKI Jakarta"],
    ["Taufik Hidayat", "taufikwarga", "Bandung, Jawa Barat", "Jawa Barat"],
    ["Nabila Syakieb", "nabilawarga", "Depok, Jawa Barat", "Jawa Barat"],
    ["Irfan Hakim", "irfanwarga", "Bandung, Jawa Barat", "Jawa Barat"],
    ["Suleiman Warga", "sulewarga", "Cimahi, Jawa Barat", "Jawa Barat"],
    ["Melly Goeslaw", "mellywarga", "Jakarta Utara, DKI Jakarta", "DKI Jakarta"],
    ["Deddy Mahendra", "deddywarga", "Tangerang, Banten", "Banten"],
    ["Mira Sualifah", "miraaaaaaaa", "Bulungan, Kalimantan Utara", "Kalimantan Utara"],
  ];

  const passiveCitizens = passiveCitizenNames.map(([name, username, region, prov], i) => ({
    id: `usr_reader_${String(i + 1).padStart(2, "0")}`,
    name,
    username,
    email: `${username}@warga.kavi.id`,
    image: null,
    bio: `Warga pemantau isu publik wilayah ${region}.`,
    role: "USER" as const,
    agencyName: null,
    jurisdictionProvince: prov,
    region,
    isDemo: false,
    postCount: 0, // Strictly passive readers/scrollers
    followerCount: 12 + (i % 40),
    followingCount: 5 + (i % 15),
    isBanned: false,
    warningCount: 0,
    createdAt: new Date(baseNow - (60 - i) * 86400000),
    updatedAt: now,
  }));

  const allUsers = [
    ...internalGoogleUsers,
    ...demoAndActiveUsers,
    ...governmentAgencies,
    ...passiveCitizens,
  ];

  // =========================================================================
  // 4. 50 ROOT POSTS (18 Real Indonesian Civic Reports + 32 General Posts)
  // Authored by 14 active citizen accounts (~26% of 54 accounts)
  // =========================================================================
  interface SeedReportSpec {
    id: string;
    authorId: "alya" | "nadia" | "komunitas";
    topicId: string;
    title: string;
    content: string;
    locationName: string;
    province: string;
    imageUrl: string;
    reportStatus: "waiting" | "in_progress" | "completed" | "closed_internal";
    anonymous: boolean;
    tags: string[];
    agencyIds: string[];
    upvotesCount: number;
    downvotesCount: number;
    repostsCount: number;
    viewsCount: number;
    hoursAgo: number;
    actionReply?: {
      id: string;
      agencyId: string;
      content: string;
      imageUrl: string;
      upvotesCount: number;
      downvotesCount: number;
      hoursAgo: number;
    };
    citizenReply?: {
      id: string;
      authorId: string;
      content: string;
      upvotesCount: number;
      hoursAgo: number;
    };
  }

  const reportSpecs: SeedReportSpec[] = [
    // 1. In Progress — Trotoar Merdeka Bandung (matches existing mock key)
    {
      id: "trotoar-merdeka",
      authorId: "alya",
      topicId: "top_infra",
      title: "Trotoar yang aman untuk semua pejalan kaki.",
      content:
        "Trotoar yang aman untuk semua pejalan kaki.\n\nTrotoar di Jl. Merdeka rusak dan berlubang cukup parah setelah galian utilitas. Membahayakan anak sekolah dan lansia yang melintas setiap pagi. Mohon penanganan dari pihak terkait.",
      locationName: "Sumur Bandung, Bandung, Jawa Barat",
      province: "Jawa Barat",
      imageUrl: "https://s3.kavi.jeki.me/posts/trotoar-merdeka.jpg",
      reportStatus: "in_progress",
      anonymous: true,
      tags: ["TrotoarRusak", "AksesAman", "Bandung"],
      agencyIds: ["pupr", "dishub"],
      upvotesCount: 86,
      downvotesCount: 2,
      repostsCount: 19,
      viewsCount: 1420,
      hoursAgo: 3,
      actionReply: {
        id: "respons-pupr",
        agencyId: "pupr",
        content:
          "Tim pemeliharaan jalan Dinas PUPR Bandung telah melakukan pemasangan kembali paving blok dan penutupan lubang utilitas di Jl. Merdeka. Silakan warga meninjau hasil perbaikan dan memberikan upvote/downvote pada respon tindak lanjut ini.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-road-repair.jpg",
        upvotesCount: 17,
        downvotesCount: 3,
        hoursAgo: 1,
      },
      citizenReply: {
        id: "rep-warga-1",
        authorId: "nadia",
        content:
          "Kemarin pagi saya lewat sini hampir kesandung besi penutup drainase yang miring. Semoga cepat diperbaiki.",
        upvotesCount: 9,
        hoursAgo: 2,
      },
    },
    // 2. Completed (1/11) — Lampu & Panel PJU Jl. Riau Bandung (matches contoh-success)
    {
      id: "contoh-success",
      authorId: "nadia",
      topicId: "top_utilitas",
      title: "Penerangan jalan umum padam di perempatan.",
      content:
        "Penerangan jalan umum padam di perempatan.\n\nLampu jalan dan panel distribusi PJU di perempatan Jl. Riau padam lebih dari 3 hari akibat gangguan MCB trafo, rawan kecelakaan di malam hari. Mohon perbaikan unit lampu PJU.",
      locationName: "Bandung, Jawa Barat",
      province: "Jawa Barat",
      imageUrl: "https://s3.kavi.jeki.me/posts/contoh-success.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["LampuJalan", "FasilitasPublik", "Keselamatan"],
      agencyIds: ["dishub"],
      upvotesCount: 142,
      downvotesCount: 3,
      repostsCount: 34,
      viewsCount: 2890,
      hoursAgo: 24,
      actionReply: {
        id: "respons-dishub-selesai",
        agencyId: "dishub",
        content:
          "Unit modul MCB trafo dan lampu PJU di perempatan Jl. Riau telah diganti dengan unit baru oleh tim teknis Dishub Bandung. Penerangan jalan kembali berfungsi normal.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-paving-done.jpg",
        upvotesCount: 54,
        downvotesCount: 2,
        hoursAgo: 12,
      },
    },
    // 3. Waiting — Armada & Halte Bus Cihampelas (matches contoh-failed)
    {
      id: "contoh-failed",
      authorId: "alya",
      topicId: "top_transportasi",
      title: "Atap halte bus bocor dan jadwal armada terlambat.",
      content:
        "Atap halte bus bocor dan lantai licin.\n\nAtap halte Trans Metro Bandung di koridor Cihampelas bocor dan antrean bus menumpuk lebih dari 45 menit saat jam pulang kerja.",
      locationName: "Cihampelas, Bandung, Jawa Barat",
      province: "Jawa Barat",
      imageUrl: "https://s3.kavi.jeki.me/posts/contoh-failed.jpg",
      reportStatus: "waiting",
      anonymous: true,
      tags: ["HalteBus", "TransportasiUmum", "Aksesibilitas"],
      agencyIds: ["pupr", "dishub"],
      upvotesCount: 64,
      downvotesCount: 2,
      repostsCount: 11,
      viewsCount: 980,
      hoursAgo: 48,
      citizenReply: {
        id: "rep-halte-1",
        authorId: "komunitas",
        content:
          "Bener banget, kemarin sore pas hujan deras banyak penumpang terpaksa berdiri di pinggir jalan karena dalamnya banjir.",
        upvotesCount: 14,
        hoursAgo: 30,
      },
    },
    // 4. Waiting — Antrean Loket Pelayanan Tamansari (matches antrean-tamansari)
    {
      id: "antrean-tamansari",
      authorId: "nadia",
      topicId: "top_layanan",
      title: "Loket layanan administrasi & rujukan warga lambat.",
      content:
        "Loket layanan kependudukan dan rujukan kesehatan di wilayah Tamansari pagi ini menumpuk lebih dari 2 jam karena hanya satu meja petugas yang buka.",
      locationName: "Tamansari, Jakarta Barat, DKI Jakarta",
      province: "DKI Jakarta",
      imageUrl: "https://s3.kavi.jeki.me/posts/antrean-tamansari.jpg",
      reportStatus: "waiting",
      anonymous: false,
      tags: ["LayananPublik", "Tamansari"],
      agencyIds: ["dishub_dki"],
      upvotesCount: 51,
      downvotesCount: 1,
      repostsCount: 8,
      viewsCount: 740,
      hoursAgo: 6,
    },
    // 5. Completed (2/11) — Jalan Rusak Berlubang Rumbia Lampung Tengah
    {
      id: "rep-jalan-lampung",
      authorId: "alya",
      topicId: "top_infra",
      title: "Jalan provinsi berlubang dalam di Ruas Rumbia Lampung Tengah.",
      content:
        "Jalan provinsi berlubang dalam di Ruas Rumbia Lampung Tengah.\n\nLubang aspal sedalam 25 cm yang tergenang air hujan di jalur lintas Rumbia sering membuat pengendara motor terjatuh dan truk logistik pecah ban.",
      locationName: "Bandar Lampung, Lampung",
      province: "Lampung",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-jalan-lampung.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["JalanRusak", "Lampung", "InfrastrukturJalan"],
      agencyIds: ["pupr_lampung"],
      upvotesCount: 412,
      downvotesCount: 9,
      repostsCount: 95,
      viewsCount: 6420,
      hoursAgo: 72,
      actionReply: {
        id: "respons-pupr-lampung",
        agencyId: "pupr_lampung",
        content:
          "Tim Dinas BMBK & PUPR Provinsi Lampung telah melaksanakan pengaspalan ulang (overlay hotmix) dan perbaikan pondasi agregat pada titik rusak di ruas Rumbia sepanjang 1,2 km.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-road-repair.jpg",
        upvotesCount: 88,
        downvotesCount: 4,
        hoursAgo: 36,
      },
    },
    // 6. Completed (3/11) — Banjir Tanggul Karanganyar Demak Jawa Tengah
    {
      id: "rep-banjir-demak",
      authorId: "komunitas",
      topicId: "top_bencana",
      title: "Banjir luapan sungai merendam jalan & kendaraan warga di Demak.",
      content:
        "Banjir luapan sungai merendam jalan & kendaraan warga di Demak.\n\nGenangan banjir setinggi atap mobil melumpuhkan jalur Karanganyar–Gajah akibat limpasan tanggul Sungai Wulan. Warga membutuhkan pompa penyedot dan evakuasi segera.",
      locationName: "Semarang Tengah, Semarang, Jawa Tengah",
      province: "Jawa Tengah",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-banjir-demak.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["BanjirDemak", "TanggapDarurat", "JawaTengah"],
      agencyIds: ["bpbd_jateng"],
      upvotesCount: 620,
      downvotesCount: 11,
      repostsCount: 184,
      viewsCount: 9300,
      hoursAgo: 96,
      actionReply: {
        id: "respons-bpbd-demak",
        agencyId: "bpbd_jateng",
        content:
          "BPBD Jawa Tengah bersama BBWS Pemali Juana telah menutup celah tanggul dengan sheet pile baja dan mengoperasikan 14 unit pompa mobile berkapasitas besar. Genangan di jalur utama telah surut.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-paving-done.jpg",
        upvotesCount: 112,
        downvotesCount: 5,
        hoursAgo: 40,
      },
    },
    // 7. Completed (4/11) — Tumpukan Sampah Plastik Imbas TPA Sarimukti Bandung
    {
      id: "rep-sampah-sarimukti",
      authorId: "alya",
      topicId: "top_lingkungan",
      title: "Tumpukan sampah plastik dan botol menumpuk di TPS Bandung.",
      content:
        "Tumpukan sampah plastik dan botol menumpuk di TPS Bandung.\n\nSudah 5 hari sampah kemasan plastik dan rumah tangga meluber di pinggir TPS Coblong akibat keterlambatan armada angkut menuju TPA Sarimukti.",
      locationName: "Coblong, Bandung, Jawa Barat",
      province: "Jawa Barat",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-sampah-sarimukti.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["DaruratSampah", "Sarimukti", "BandungBersih"],
      agencyIds: ["dlh_jabar"],
      upvotesCount: 289,
      downvotesCount: 6,
      repostsCount: 62,
      viewsCount: 4120,
      hoursAgo: 80,
      actionReply: {
        id: "respons-dlh-sarimukti",
        agencyId: "dlh_jabar",
        content:
          "DLH Provinsi Jawa Barat bersama DLH Kota Bandung telah mengerahkan 6 armada compactor tambahan dan mengaktifkan pengolahan organik/daur ulang di TPS 3R Coblong sehingga tumpukan telah bersih.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-recycling.jpg",
        upvotesCount: 74,
        downvotesCount: 3,
        hoursAgo: 28,
      },
    },
    // 8. Completed (5/11) — Kabut Asap Kebakaran Hutan Gambut Kalimantan Utara
    {
      id: "rep-karhutla-kaltara",
      authorId: "komunitas",
      topicId: "top_bencana",
      title: "Kabut asap pekat menyelimuti kawasan hutan dan permukiman Bulungan.",
      content:
        "Kabut asap pekat menyelimuti kawasan hutan dan permukiman Bulungan.\n\nJarak pandang pagi ini turun drastis akibat asap kebakaran lahan gambut di poros Bulungan–Malinau. Anak-anak mulai mengalami batuk dan ISPA.",
      locationName: "Tanjung Selor, Bulungan, Kalimantan Utara",
      province: "Kalimantan Utara",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-karhutla-kaltara.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["Karhutla", "KabutAsap", "KalimantanUtara"],
      agencyIds: ["pemda_kaltara"],
      upvotesCount: 845,
      downvotesCount: 14,
      repostsCount: 230,
      viewsCount: 11800,
      hoursAgo: 110,
      actionReply: {
        id: "respons-pemda-kaltara",
        agencyId: "pemda_kaltara",
        content:
          "Satgas Karhutla Pemprov Kalimantan Utara bersama Manggala Agni telah memadamkan titik api gambut dan mendirikan posko oksigen serta pembagian masker N95 gratis di 8 puskesmas kecamatan.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-health-post.jpg",
        upvotesCount: 138,
        downvotesCount: 6,
        hoursAgo: 50,
      },
    },
    // 9. In Progress — Banjir Rob Pesisir Tanjung Emas Semarang
    {
      id: "rep-rob-semarang",
      authorId: "nadia",
      topicId: "top_bencana",
      title: "Banjir rob pasang laut menenggelamkan rambu jalan pesisir Semarang.",
      content:
        "Banjir rob pasang laut menenggelamkan rambu jalan pesisir Semarang.\n\nNaiknya pasang air laut sore ini merendam akses kawasan pelabuhan dan rambu lalu lintas di Semarang Utara hingga menyulitkan kendaraan pekerja.",
      locationName: "Semarang Tengah, Semarang, Jawa Tengah",
      province: "Jawa Tengah",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-rob-semarang.jpg",
      reportStatus: "in_progress",
      anonymous: false,
      tags: ["BanjirRob", "Semarang", "Pesisir"],
      agencyIds: ["bpbd_jateng"],
      upvotesCount: 194,
      downvotesCount: 4,
      repostsCount: 41,
      viewsCount: 3150,
      hoursAgo: 18,
      actionReply: {
        id: "respons-rob-semarang",
        agencyId: "bpbd_jateng",
        content:
          "Tim BPBD dan Dinas PU sedang mengoperasikan pompa polder Banger dan memasang geobag penahan pasang di sepanjang dermaga terdampak. Silakan warga memantau surutnya air.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-road-repair.jpg",
        upvotesCount: 23,
        downvotesCount: 2,
        hoursAgo: 5,
      },
    },
    // 10. Completed (6/11) — Penataan Arus & Parkir Liar Koridor Bundaran HI Jakarta Pusat
    {
      id: "rep-macet-bundaran-hi",
      authorId: "nadia",
      topicId: "top_transportasi",
      title: "Penumpukan kendaraan dan ojek berhenti di bahu jalan Bundaran HI.",
      content:
        "Penumpukan kendaraan dan ojek berhenti di bahu jalan Bundaran HI.\n\nBanyak kendaraan menurunkan penumpang sembarangan di dekat akses halte dan trotoar koridor Thamrin–Bundaran HI sehingga menghambat laju bus dan pejalan kaki.",
      locationName: "Gambir, Jakarta Pusat, DKI Jakarta",
      province: "DKI Jakarta",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-macet-bundaran-hi.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["JakartaPusat", "BundaranHI", "TertibLaluLintas"],
      agencyIds: ["dishub_dki"],
      upvotesCount: 318,
      downvotesCount: 8,
      repostsCount: 54,
      viewsCount: 5240,
      hoursAgo: 68,
      actionReply: {
        id: "respons-dishub-dki-hi",
        agencyId: "dishub_dki",
        content:
          "Petugas Dishub DKI Jakarta telah menempatkan personel pengatur arus pada jam sibuk serta memasang pembatas jalur drop-off resmi di koridor Bundaran HI.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-traffic-order.jpg",
        upvotesCount: 67,
        downvotesCount: 3,
        hoursAgo: 22,
      },
    },
    // 11. Waiting — Jaringan Transmisi Listrik Balikpapan Kalimantan Timur
    {
      id: "rep-kabel-transmisi-kaltim",
      authorId: "komunitas",
      topicId: "top_utilitas",
      title: "Fluktuasi tegangan dan pemadaman listrik di jalur transmisi Balikpapan.",
      content:
        "Fluktuasi tegangan dan pemadaman listrik di jalur transmisi Balikpapan.\n\nDalam sepekan terakhir terjadi 4 kali pemadaman mendadak pada sore hari yang merusak peralatan elektronik UMKM warga.",
      locationName: "Balikpapan, Kalimantan Timur",
      province: "Kalimantan Timur",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-kabel-transmisi-kaltim.jpg",
      reportStatus: "waiting",
      anonymous: false,
      tags: ["ListrikPadam", "Balikpapan", "UtilitasPublik"],
      agencyIds: [],
      upvotesCount: 112,
      downvotesCount: 3,
      repostsCount: 27,
      viewsCount: 1890,
      hoursAgo: 14,
    },
    // 12. Completed (7/11) — Sampah Pesisir Pantai Muara Angke Jakarta Utara
    {
      id: "rep-sampah-pesisir-muaraangke",
      authorId: "nadia",
      topicId: "top_lingkungan",
      title: "Tumpukan sampah plastik kiriman mengotori bibir pantai Jakarta Utara.",
      content:
        "Tumpukan sampah plastik kiriman mengotori bibir pantai Jakarta Utara.\n\nPasca hujan deras, ribuan sampah kemasan plastik terdampar di pesisir dekat permukiman nelayan Tanjung Priok–Muara Angke dan menimbulkan bau menyengat.",
      locationName: "Pelabuhan Tanjung Priok, Jakarta Utara, DKI Jakarta",
      province: "DKI Jakarta",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-sampah-pesisir-muaraangke.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["SampahPesisir", "JakartaUtara", "LautBersih"],
      agencyIds: ["dishub_dki"],
      upvotesCount: 374,
      downvotesCount: 5,
      repostsCount: 81,
      viewsCount: 4920,
      hoursAgo: 90,
      actionReply: {
        id: "respons-pesisir-jakut",
        agencyId: "usr_internal_zaki",
        content:
          "Tim gabungan UPK Badan Air DKI dan relawan warga telah mengangkut 14 ton sampah plastik dari bibir pantai serta memasang kembali trash boom penyaring di muara.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-recycling.jpg",
        upvotesCount: 79,
        downvotesCount: 2,
        hoursAgo: 32,
      },
    },
    // 13. Completed (8/11) — Pencemaran Sampah Plastik Anak Sungai Citarum
    {
      id: "rep-limbah-citarum",
      authorId: "alya",
      topicId: "top_lingkungan",
      title: "Sampah plastik mengapung mencemari aliran anak Sungai Citarum.",
      content:
        "Sampah plastik mengapung mencemari aliran anak Sungai Citarum.\n\nKantong plastik dan limbah rumah tangga masih tampak mengapung pekat di aliran sungai kawasan Bandung Selatan sehingga menyumbat pintu air.",
      locationName: "Bandung, Jawa Barat",
      province: "Jawa Barat",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-limbah-citarum.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["CitarumHarum", "SungaiBersih", "JawaBarat"],
      agencyIds: ["dlh_jabar"],
      upvotesCount: 428,
      downvotesCount: 7,
      repostsCount: 104,
      viewsCount: 6180,
      hoursAgo: 105,
      actionReply: {
        id: "respons-dlh-citarum",
        agencyId: "dlh_jabar",
        content:
          "DLH Jawa Barat bersama Satgas Citarum Harum Sektor 7 telah melakukan pembersihan jaring apung dan penertiban TPS liar di bantaran sungai.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-coastal-clean.jpg",
        upvotesCount: 92,
        downvotesCount: 4,
        hoursAgo: 44,
      },
    },
    // 14. Completed (9/11) — Ruang Kelas & Meja Kursi SDN Rusak di Jawa Barat
    {
      id: "rep-sekolah-garut",
      authorId: "komunitas",
      topicId: "top_pendidikan",
      title: "Ruang kelas lembap dan meja belajar aus di SDN Tasikmalaya.",
      content:
        "Ruang kelas lembap dan meja belajar aus di SDN Tasikmalaya.\n\nKondisi ruang belajar dan perabot meja kursi kelas 4 sudah banyak yang goyang dan cat dinding mengelupas akibat rembesan hujan. Mohon bantuan rehabilitasi.",
      locationName: "Tasikmalaya, Jawa Barat",
      province: "Jawa Barat",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-sekolah-garut.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["FasilitasSekolah", "PendidikanLayak", "JawaBarat"],
      agencyIds: ["pemprov_jabar"],
      upvotesCount: 356,
      downvotesCount: 4,
      repostsCount: 78,
      viewsCount: 4700,
      hoursAgo: 120,
      actionReply: {
        id: "respons-pemprov-sekolah",
        agencyId: "pemprov_jabar",
        content:
          "Pemprov Jawa Barat melalui Dinas Pendidikan telah menyalurkan 40 set meja kursi baru serta menyelesaikan perbaikan atap dan pengecatan ruang kelas.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-paving-done.jpg",
        upvotesCount: 68,
        downvotesCount: 1,
        hoursAgo: 48,
      },
    },
    // 15. Completed (10/11) — Galian Drainase Box Culvert Gubeng Surabaya
    {
      id: "rep-galian-drainase-surabaya",
      authorId: "alya",
      topicId: "top_infra",
      title: "Galian proyek saluran drainase beton di Gubeng butuh rambu pengaman.",
      content:
        "Galian proyek saluran drainase beton di Gubeng butuh rambu pengaman.\n\nPekerjaan pembesian saluran air di tepi jalan Gubeng menyisakan besi tulangan terbuka yang berisiko bagi pengendara saat malam hari.",
      locationName: "Gubeng, Surabaya, Jawa Timur",
      province: "Jawa Timur",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-galian-drainase-surabaya.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["DrainaseSurabaya", "KeselamatanProyek", "Gubeng"],
      agencyIds: ["pemkot_surabaya"],
      upvotesCount: 267,
      downvotesCount: 5,
      repostsCount: 49,
      viewsCount: 3680,
      hoursAgo: 84,
      actionReply: {
        id: "respons-surabaya-drainase",
        agencyId: "pemkot_surabaya",
        content:
          "DSDABM Kota Surabaya telah memasang barikade water barrier berlampu rotary di sepanjang titik galian Gubeng dan menyelesaikan pengecoran penutup box culvert.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-paving-done.jpg",
        upvotesCount: 61,
        downvotesCount: 2,
        hoursAgo: 30,
      },
    },
    // 16. In Progress — Gangguan Rel & Jadwal Kereta Komuter Jakarta Selatan
    {
      id: "rep-rel-komuter-manggarai",
      authorId: "nadia",
      topicId: "top_transportasi",
      title: "Antrean sinyal kereta komuter menghambat perjalanan pagi warga.",
      content:
        "Antrean sinyal kereta komuter menghambat perjalanan pagi warga.\n\nRangkaian kereta tertahan hampir 25 menit sebelum masuk jalur transit akibat pengecekan wesel rel di lintas selatan Jakarta.",
      locationName: "Cilandak Barat, Cilandak, Jakarta Selatan, DKI Jakarta",
      province: "DKI Jakarta",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-rel-komuter-manggarai.jpg",
      reportStatus: "in_progress",
      anonymous: false,
      tags: ["KeretaKomuter", "TransportasiJakarta", "RelKereta"],
      agencyIds: ["dishub_dki"],
      upvotesCount: 215,
      downvotesCount: 6,
      repostsCount: 44,
      viewsCount: 3420,
      hoursAgo: 10,
      actionReply: {
        id: "respons-rel-komuter",
        agencyId: "dishub_dki",
        content:
          "Koordinasi Dishub DKI bersama tim prasarana perkeretaapian telah melakukan kalibrasi wesel dan normalisasi sinyal. Saat ini frekuensi perjalanan sedang dipulihkan bertahap.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-rail-signal.jpg",
        upvotesCount: 21,
        downvotesCount: 3,
        hoursAgo: 2,
      },
    },
    // 17. Completed (11/11 — 61.1% ~= 60% Completed!) — Air Bersih PDAM Bandung
    {
      id: "rep-pdam-bandung-timur",
      authorId: "alya",
      topicId: "top_utilitas",
      title: "Tekanan air PDAM mengecil dan sempat keruh di kawasan Bandung.",
      content:
        "Tekanan air PDAM mengecil dan sempat keruh di kawasan Bandung.\n\nSejak kemarin pagi aliran air bersih ke rumah warga mengecil drastis akibat kebocoran pipa distribusi sekunder. Mohon segera dinormalisasi.",
      locationName: "Bandung, Jawa Barat",
      province: "Jawa Barat",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-pdam-bandung-timur.jpg",
      reportStatus: "completed",
      anonymous: false,
      tags: ["AirBersih", "PDAMBandung", "UtilitasWarga"],
      agencyIds: ["pdam_bandung"],
      upvotesCount: 244,
      downvotesCount: 4,
      repostsCount: 38,
      viewsCount: 3290,
      hoursAgo: 64,
      actionReply: {
        id: "respons-pdam-bandung",
        agencyId: "pdam_bandung",
        content:
          "Tim teknik Perumda Tirtawening Bandung telah menyambung pipa PVC 8 inci yang bocor dan melakukan flushing jaringan. Aliran air bersih ke pelanggan kembali jernih dan bertekanan normal.",
        imageUrl: "https://s3.kavi.jeki.me/evidence/res-water-pipe.jpg",
        upvotesCount: 52,
        downvotesCount: 1,
        hoursAgo: 20,
      },
    },
    // 18. Closed Internal — Penataan Lapak Pasar Gembrong Jakarta Timur
    {
      id: "rep-pasar-gembrong-jakartatimur",
      authorId: "komunitas",
      topicId: "top_sosial",
      title: "Lapak pedagang pasar tradisional meluber ke bahu jalan Jatinegara.",
      content:
        "Lapak pedagang pasar tradisional meluber ke bahu jalan Jatinegara.\n\nAktivitas bongkar muat sayur dan lapak pagi hari memakan separuh badan jalan sehingga menimbulkan kemacetan di sekitar Pasar Gembrong.",
      locationName: "Pasar Gembrong, Jatinegara, Jakarta Timur, DKI Jakarta",
      province: "DKI Jakarta",
      imageUrl: "https://s3.kavi.jeki.me/posts/rep-pasar-gembrong-jakartatimur.jpg",
      reportStatus: "closed_internal",
      anonymous: false,
      tags: ["PasarTradisional", "JakartaTimur", "KetertibanUmum"],
      agencyIds: ["dishub_dki"],
      upvotesCount: 128,
      downvotesCount: 7,
      repostsCount: 19,
      viewsCount: 2140,
      hoursAgo: 56,
    },
  ];

  // 32 General Citizen Posts (Threads/Twitter style discussions, no title required)
  const generalSpecs = [
    {
      id: "kopi-braga",
      authorId: "alya",
      topicId: "top_komunitas",
      content:
        "Kopi pagi di Braga selalu punya cerita tersendiri. Senang liat trotoar yang mulai ramah kursi roda dan pejalan kaki. Semoga makin banyak spot kayak gini di kota-kota lain ✨",
      province: "Jawa Barat",
      locationName: "Braga, Sumur Bandung, Bandung, Jawa Barat",
      images: ["https://s3.kavi.jeki.me/posts/kopi-braga.jpg"],
      tags: ["Bandung", "PejalanKaki", "RuangPublik"],
      upvotesCount: 245,
      repostsCount: 28,
      viewsCount: 2940,
      minutesAgo: 45,
      reply: {
        id: "rep-alya-1",
        authorId: "nadia",
        content: "Setuju banget kak! Paling enak jalan kaki di sana pas minggu pagi sebelum rame.",
        upvotesCount: 12,
        minutesAgo: 20,
      },
    },
    {
      id: "workshop-sampah",
      authorId: "komunitas",
      topicId: "top_komunitas",
      content:
        "Minggu depan kita mau ngadain workshop daur ulang sampah plastik & komposter mandiri untuk warga kelurahan. Ada yang mau join jadi volunteer atau fasilitator? Drop reply ya! ♻️🙌",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["Komunitas", "DaurUlang", "ZeroWaste", "Warga"],
      upvotesCount: 89,
      repostsCount: 18,
      viewsCount: 1320,
      minutesAgo: 300,
      reply: {
        id: "rep-kom-1",
        authorId: "nadia",
        content: "Mau ikut kak! Ada link grup koordinasi atau pendaftarannya?",
        upvotesCount: 5,
        minutesAgo: 240,
      },
    },
    {
      id: "ruang-hijau",
      authorId: "nadia",
      topicId: "top_lingkungan",
      content:
        "Ruang terbuka hijau di lingkungan kita tuh beneran bikin pikiran adem setelah seminggu kerja. Yuk rawat bareng-bareng jangan buang puntung rokok sembarangan ya kawan-kawan 🌿🌳",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: ["https://s3.kavi.jeki.me/posts/ruang-hijau.jpg"],
      tags: ["RuangTerbukaHijau", "Lingkungan", "Bandung"],
      upvotesCount: 174,
      repostsCount: 31,
      viewsCount: 2410,
      minutesAgo: 480,
    },
    {
      id: "gen-04-perpustakaan-taman",
      authorId: "alya",
      topicId: "top_pendidikan",
      content:
        "Pojok baca gratis di taman kota sore ini ramai banget sama anak-anak SD. Kalau ada teman-teman yang punya buku cerita anak layak baca dan mau didonasikan, kabari ya!",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["LiterasiWarga", "TamanBaca", "Bandung"],
      upvotesCount: 132,
      repostsCount: 22,
      viewsCount: 1640,
      minutesAgo: 620,
    },
    {
      id: "gen-05-sepeda-pagi",
      authorId: "nadia",
      topicId: "top_transportasi",
      content:
        "Bersepeda ke kantor lewat jalur sepeda terproteksi di Sudirman pagi ini lumayan lancar. Semoga konektivitas dari jalan lingkungan ke jalur utama makin nyambung.",
      province: "DKI Jakarta",
      locationName: "Jakarta Pusat, DKI Jakarta",
      images: [],
      tags: ["BikeToWork", "JalurSepeda", "Jakarta"],
      upvotesCount: 98,
      repostsCount: 14,
      viewsCount: 1210,
      minutesAgo: 780,
    },
    {
      id: "gen-06-bank-sampah",
      authorId: "komunitas",
      topicId: "top_lingkungan",
      content:
        "Rekap Bank Sampah RW 08 bulan ini berhasil mengumpulkan 420 kg kardus dan botol PET! Hasil tabungannya langsung dipakai buat beli tanaman obat keluarga di gang.",
      province: "Jawa Barat",
      locationName: "Coblong, Bandung, Jawa Barat",
      images: ["https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=720&auto=format&fit=crop"],
      tags: ["BankSampah", "ZeroWaste", "GotongRoyong"],
      upvotesCount: 211,
      repostsCount: 45,
      viewsCount: 2870,
      minutesAgo: 950,
    },
    {
      id: "gen-07-posyandu-lansia",
      authorId: "alya",
      topicId: "top_kesehatan",
      content:
        "Senang lihat antusiasme kakek-nenek di Posyandu Lansia kelurahan pagi tadi. Cek tensi dan gula darah rutin itu sederhana tapi penting banget buat deteksi dini.",
      province: "Jawa Barat",
      locationName: "Sumur Bandung, Bandung, Jawa Barat",
      images: [],
      tags: ["PosyanduLansia", "KesehatanWarga", "Komunitas"],
      upvotesCount: 118,
      repostsCount: 16,
      viewsCount: 1490,
      minutesAgo: 1120,
    },
    {
      id: "gen-08-kuliner-umkm",
      authorId: "nadia",
      topicId: "top_sosial",
      content:
        "Pasar pagi minggu ini penuh jajanan pasar buatan ibu-ibu UMKM lokal. Selain harganya ramah kantong, mereka sekarang udah mulai pakai pembungkus daun pisang pengganti plastik.",
      province: "DKI Jakarta",
      locationName: "Jakarta Selatan, DKI Jakarta",
      images: [],
      tags: ["UMKMLokal", "PasarWarga", "RamahLingkungan"],
      upvotesCount: 154,
      repostsCount: 25,
      viewsCount: 1930,
      minutesAgo: 1340,
    },
    {
      id: "gen-09-kerja-bakti-selokan",
      authorId: "komunitas",
      topicId: "top_lingkungan",
      content:
        "Sebelum masuk puncak musim hujan, warga tiga RT kompak angkat sedimen lumpur di selokan depan rumah masing-masing. Pencegahan banjir memang harus mulai dari hulu sampai gang.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["KerjaBakti", "CegahBanjir", "WargaSiaga"],
      upvotesCount: 187,
      repostsCount: 39,
      viewsCount: 2380,
      minutesAgo: 1560,
    },
    {
      id: "gen-10-aplikasi-publik",
      authorId: "alya",
      topicId: "top_tatakelola",
      content:
        "Transparansi tindak lanjut laporan warga itu bikin kepercayaan publik tumbuh. Kalau ada bukti foto sebelum-sesudah yang divalidasi bareng-bareng, gak ada lagi klaim sepihak.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["TransparansiPublik", "CivicTech", "SuaraWarga"],
      upvotesCount: 263,
      repostsCount: 58,
      viewsCount: 3510,
      minutesAgo: 1800,
    },
    {
      id: "gen-11-rambu-sekolah",
      authorId: "nadia",
      topicId: "top_keamanan",
      content:
        "Zona Selamat Sekolah di depan SDN Menteng pagi ini dijaga petugas dan relawan orang tua murid. Anak-anak jadi lebih tenang waktu nyebrang zebra cross.",
      province: "DKI Jakarta",
      locationName: "Jakarta Pusat, DKI Jakarta",
      images: ["https://images.unsplash.com/photo-1517732306149-e8f829eb588a?q=80&w=720&auto=format&fit=crop"],
      tags: ["ZonaSelamatSekolah", "PejalanKaki", "Jakarta"],
      upvotesCount: 141,
      repostsCount: 21,
      viewsCount: 1760,
      minutesAgo: 2040,
    },
    {
      id: "gen-12-hemat-air",
      authorId: "komunitas",
      topicId: "top_utilitas",
      content:
        "Tips sederhana buat rumah di perkotaan: pasang penampung air hujan (rainwater harvesting) buat nyiram tanaman dan cuci halaman. Lumayan banget ngurangin beban air tanah.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["KonservasiAir", "PanenAirHujan", "Lingkungan"],
      upvotesCount: 109,
      repostsCount: 24,
      viewsCount: 1420,
      minutesAgo: 2280,
    },
    {
      id: "gen-13-jadwal-mrt",
      authorId: "nadia",
      topicId: "top_transportasi",
      content:
        "Integrasi halte bus dan stasiun sekarang jauh lebih nyaman kalau ada kanopi peneduh. Pas hujan deras sore tadi gak perlu lari-larian buka payung waktu pindah moda.",
      province: "DKI Jakarta",
      locationName: "Jakarta Selatan, DKI Jakarta",
      images: [],
      tags: ["TransportasiTerintegrasi", "Komuter", "Jakarta"],
      upvotesCount: 165,
      repostsCount: 29,
      viewsCount: 2120,
      minutesAgo: 2520,
    },
    {
      id: "gen-14-kelas-koding-remaja",
      authorId: "komunitas",
      topicId: "top_pendidikan",
      content:
        "Sabtu kemarin kelas pengenalan pemetaan digital OpenStreetMap bareng remaja karang taruna seru banget! Mereka langsung memetakan titik hidran dan jalur evakuasi di kelurahan.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["PemetaanWarga", "KarangTaruna", "EdukasiDigital"],
      upvotesCount: 192,
      repostsCount: 41,
      viewsCount: 2560,
      minutesAgo: 2760,
    },
    {
      id: "gen-15-lampu-gang",
      authorId: "alya",
      topicId: "top_keamanan",
      content:
        "Swadaya warga gang sebelah pasang lampu sensor cahaya tenaga surya di sudut-sudut gelap patut dicontoh. Malam hari jadi terang dan hemat tagihan listrik RT.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["KeamananLingkungan", "EnergiSurya", "InisiatifWarga"],
      upvotesCount: 138,
      repostsCount: 19,
      viewsCount: 1710,
      minutesAgo: 3000,
    },
    {
      id: "gen-16-kebun-atap",
      authorId: "komunitas",
      topicId: "top_lingkungan",
      content:
        "Panen perdana kangkung dan cabai dari kebun komunal lahan sempit RW 04! Hasilnya dibagiin ke warga lansia dan posyandu balita.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["UrbanFarming", "KetahananPangan", "Komunitas"],
      upvotesCount: 224,
      repostsCount: 46,
      viewsCount: 2980,
      minutesAgo: 3240,
    },
    {
      id: "gen-17-etiket-trotoar",
      authorId: "nadia",
      topicId: "top_transportasi",
      content:
        "Ingat bareng-bareng yuk: ubin kuning bertekstur (guiding block) di trotoar itu jalur pemandu teman-teman tunanetra. Jangan dipakai buat naruh pot, gerobak, atau parkir motor.",
      province: "DKI Jakarta",
      locationName: "Jakarta Pusat, DKI Jakarta",
      images: [],
      tags: ["KotaInklusif", "Disabilitas", "HakPejalanKaki"],
      upvotesCount: 310,
      repostsCount: 74,
      viewsCount: 4120,
      minutesAgo: 3480,
    },
    {
      id: "gen-18-musrenbang-kelurahan",
      authorId: "alya",
      topicId: "top_tatakelola",
      content:
        "Baru selesai ikut rembuk warga kelurahan bahas prioritas perbaikan drainase dan taman bermain anak tahun depan. Anak muda wajib banget hadir biar usulannya gak itu-itu aja.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["Musrenbang", "PartisipasiWarga", "TataKelola"],
      upvotesCount: 147,
      repostsCount: 27,
      viewsCount: 1890,
      minutesAgo: 3720,
    },
    {
      id: "gen-19-donor-darah",
      authorId: "komunitas",
      topicId: "top_kesehatan",
      content:
        "Aksi donor darah keliling bareng PMI di balai warga pagi ini terkumpul 68 kantong darah. Terima kasih buat semua warga yang udah nyempetin mampir sebelum berangkat kerja!",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["DonorDarah", "Kemanusiaan", "SehatBersama"],
      upvotesCount: 179,
      repostsCount: 33,
      viewsCount: 2240,
      minutesAgo: 3960,
    },
    {
      id: "gen-20-taman-malioboro",
      authorId: "nadia",
      topicId: "top_komunitas",
      content:
        "Suasana pedestrian di Yogyakarta waktu malam memang nyaman banget buat jalan santai bareng keluarga. Kursi taman bersih dan tempat sampah terpilah ada di tiap sudut.",
      province: "DI Yogyakarta",
      locationName: "Malioboro, Yogyakarta, DI Yogyakarta",
      images: [],
      tags: ["Yogyakarta", "RuangPublik", "Pedestrian"],
      upvotesCount: 205,
      repostsCount: 36,
      viewsCount: 2670,
      minutesAgo: 4200,
    },
    {
      id: "gen-21-tas-belanja",
      authorId: "alya",
      topicId: "top_lingkungan",
      content:
        "Selalu sedia totebag lipat di jok motor atau tas kerja itu kebiasaan kecil yang ngurangin puluhan kantong kresek setiap bulan.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["DietPlastik", "GayaHidupHijau", "Lingkungan"],
      upvotesCount: 94,
      repostsCount: 15,
      viewsCount: 1180,
      minutesAgo: 4440,
    },
    {
      id: "gen-22-pelatihan-p3k",
      authorId: "komunitas",
      topicId: "top_bencana",
      content:
        "Simulasi evakuasi gempa dan pelatihan P3K dasar untuk pengurus RT akhir pekan kemarin membuka mata banget. Tiap rumah minimal harus tahu titik kumpul aman terdekat.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["SiagaBencana", "MitigasiWarga", "P3K"],
      upvotesCount: 158,
      repostsCount: 32,
      viewsCount: 2010,
      minutesAgo: 4680,
    },
    {
      id: "gen-23-layanan-perpustakaan-daerah",
      authorId: "nadia",
      topicId: "top_layanan",
      content:
        "Perpustakaan umum daerah sekarang ruang bacanya dingin, Wi-Fi kencang, dan pendaftaran anggotanya cukup 5 menit pakai KTP. Tempat kerja remote favorit baru!",
      province: "DKI Jakarta",
      locationName: "Jakarta Pusat, DKI Jakarta",
      images: [],
      tags: ["PerpustakaanUmum", "FasilitasPublik", "Jakarta"],
      upvotesCount: 236,
      repostsCount: 48,
      viewsCount: 3140,
      minutesAgo: 4920,
    },
    {
      id: "gen-24-komposter-ember",
      authorId: "alya",
      topicId: "top_lingkungan",
      content:
        "Dua bulan nyobain komposter ember tumpuk di balkon kosan, ternyata gak bau sama sekali asal rasio sisa sayur dan serbuk gergajinya pas. Pupuk cairnya subur banget buat tanaman hias!",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["KomposRumahan", "SampahOrganik", "ZeroWaste"],
      upvotesCount: 162,
      repostsCount: 37,
      viewsCount: 2190,
      minutesAgo: 5160,
    },
    {
      id: "gen-25-koridor-bus-surabaya",
      authorId: "nadia",
      topicId: "top_transportasi",
      content:
        "Waktu dinas ke Surabaya kemarin sempat nyobain Suroboyo Bus. Sistem pembayaran non-tunai dan ketepatan waktu kedatangannya di aplikasi patut diapresiasi.",
      province: "Jawa Timur",
      locationName: "Gubeng, Surabaya, Jawa Timur",
      images: [],
      tags: ["Surabaya", "TransportasiPublik", "SmartCity"],
      upvotesCount: 184,
      repostsCount: 29,
      viewsCount: 2450,
      minutesAgo: 5400,
    },
    {
      id: "gen-26-siskamling-ramah",
      authorId: "komunitas",
      topicId: "top_keamanan",
      content:
        "Pos ronda RW kami sekarang merangkap jadi titik informasi warga dan peminjaman alat kerja bakti. Suasana malam jadi akrab lintas generasi.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["RukunWarga", "KeamananLingkungan", "SosialWarga"],
      upvotesCount: 121,
      repostsCount: 17,
      viewsCount: 1540,
      minutesAgo: 5640,
    },
    {
      id: "gen-27-jelantah-biodiesel",
      authorId: "alya",
      topicId: "top_lingkungan",
      content:
        "Jangan buang minyak goreng bekas (jelantah) ke wastafel karena bikin pipa mampet dan mencemari air. Kumpulin di jeriken buat disetor ke titik pengumpulan biodiesel warga!",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["MinyakJelantah", "CegahPencemaran", "Lingkungan"],
      upvotesCount: 208,
      repostsCount: 53,
      viewsCount: 2790,
      minutesAgo: 5880,
    },
    {
      id: "gen-28-taman-inklusi",
      authorId: "nadia",
      topicId: "top_sosial",
      content:
        "Senang banget makin banyak taman kota yang nyediain ayunan dan jalur ramp ramah kursi roda. Ruang bermain publik memang harus bisa diakses semua anak tanpa terkecuali.",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["TamanInklusi", "RamahAnak", "RuangPublik"],
      upvotesCount: 176,
      repostsCount: 30,
      viewsCount: 2310,
      minutesAgo: 6120,
    },
    {
      id: "gen-29-literasi-antihoaks",
      authorId: "komunitas",
      topicId: "top_tatakelola",
      content:
        "Kalau dapat broadcast info bencana atau penutupan jalan di grup WhatsApp keluarga, biasakan cek kanal resmi BPBD/Dishub atau laporan terverifikasi dulu sebelum ikut menyebarkan.",
      province: "DKI Jakarta",
      locationName: "Jakarta Pusat, DKI Jakarta",
      images: [],
      tags: ["LiterasiDigital", "CekFakta", "WargaCerdas"],
      upvotesCount: 249,
      repostsCount: 64,
      viewsCount: 3320,
      minutesAgo: 6360,
    },
    {
      id: "gen-30-pohon-peneduh",
      authorId: "alya",
      topicId: "top_lingkungan",
      content:
        "Jalan kaki siang hari di koridor yang pohon trembesinya rimbun itu beda sampai 4 derajat lebih sejuk dibanding jalan yang gersang. Pohon kota itu infrastruktur penting!",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["PohonKota", "IklimMikro", "PejalanKaki"],
      upvotesCount: 291,
      repostsCount: 69,
      viewsCount: 3890,
      minutesAgo: 6600,
    },
    {
      id: "gen-31-jadwal-puskesmas-online",
      authorId: "nadia",
      topicId: "top_kesehatan",
      content:
        "Daftar antrean Puskesmas lewat kuota pagi online lumayan memangkas waktu tunggu di ruang depan. Buat warga lansia yang gak punya HP tetap disediakan loket bantuan khusus.",
      province: "DKI Jakarta",
      locationName: "Jakarta Barat, DKI Jakarta",
      images: [],
      tags: ["Puskesmas", "LayananKesehatan", "Inklusif"],
      upvotesCount: 134,
      repostsCount: 20,
      viewsCount: 1680,
      minutesAgo: 6840,
    },
    {
      id: "gen-32-festival-kampung",
      authorId: "komunitas",
      topicId: "top_komunitas",
      content:
        "Penutupan pekan kreatif kampung minggu ini diisi pameran foto sejarah lingkungan dan bazar sayur organik warga. Terima kasih buat semua tetangga yang udah gotong royong!",
      province: "Jawa Barat",
      locationName: "Bandung, Jawa Barat",
      images: [],
      tags: ["FestivalKampung", "KomunitasWarga", "Bandung"],
      upvotesCount: 167,
      repostsCount: 28,
      viewsCount: 2150,
      minutesAgo: 7080,
    },
  ];

  // 14 Active Citizen Authors (~26% of 54 accounts = 14.04 -> 14 accounts!)
  // "alya", "nadia", "komunitas" + first 11 accounts from passiveCitizens ("usr_reader_01" .. "usr_reader_11")
  const activeAuthorPool = [
    "alya",
    "nadia",
    "komunitas",
    ...passiveCitizens.slice(0, 11).map((u) => u.id),
  ];

  // Keep core showcase posts on their canonical authors ("alya", "nadia", "komunitas")
  // and distribute the remaining 43 root posts across all 14 active authors so every one of the 14 authors has >= 2 posts!
  const canonicalPostIds = new Set([
    "kopi-braga",
    "trotoar-merdeka",
    "workshop-sampah",
    "ruang-hijau",
    "contoh-success",
    "contoh-failed",
    "antrean-tamansari",
  ]);

  let poolCursor = 0;
  for (const r of reportSpecs) {
    if (!canonicalPostIds.has(r.id)) {
      (r as { authorId: string }).authorId = activeAuthorPool[poolCursor % activeAuthorPool.length];
      poolCursor++;
    }
  }
  for (const g of generalSpecs) {
    if (!canonicalPostIds.has(g.id)) {
      (g as { authorId: string }).authorId = activeAuthorPool[poolCursor % activeAuthorPool.length];
      poolCursor++;
    }
  }

  // Recompute exact postCount for all 54 users before inserting users
  const postCountByAuthor = new Map<string, number>();
  for (const r of reportSpecs) {
    postCountByAuthor.set(r.authorId, (postCountByAuthor.get(r.authorId) || 0) + 1);
  }
  for (const g of generalSpecs) {
    postCountByAuthor.set(g.authorId, (postCountByAuthor.get(g.authorId) || 0) + 1);
  }
  for (const u of allUsers) {
    u.postCount = postCountByAuthor.get(u.id) || 0;
  }

  // Insert all 54 users + userPreferences in safe chunks of 12
  await insertChunked(users, allUsers, 12);
  await insertChunked(
    userPreferences,
    allUsers.map((u) => ({
      userId: u.id,
      theme: "light" as const,
      notificationSocial: true,
      notificationReports: true,
      notificationValidation: true,
      notificationEngagement: true,
      notificationMessages: true,
      notificationDigest: false,
      mutedWords: [],
      preferredTopics: ["Infrastruktur", "Transportasi", "Lingkungan & Kebersihan"],
      showSensitiveReports: true,
      autoplayVideos: true,
      privacyMessageRequests: "everyone" as const,
      privacyShowLikes: true,
      privacyAllowMentions: true,
      privacyDefaultAnonymous: false,
      updatedAt: now,
    })),
    12
  );

  // Collect all tags across reports & general posts
  const uniqueTagNames = new Set<string>();
  reportSpecs.forEach((r) => r.tags.forEach((t) => uniqueTagNames.add(t)));
  generalSpecs.forEach((g) => g.tags.forEach((t) => uniqueTagNames.add(t)));

  const tagMap = new Map<string, string>();
  const tagRows = Array.from(uniqueTagNames).map((name, idx) => {
    const id = `tag_${String(idx + 1).padStart(2, "0")}_${name.toLowerCase()}`;
    tagMap.set(name, id);
    return {
      id,
      name,
      color: idx % 3 === 0 ? "#EF4444" : idx % 3 === 1 ? "#3B82F6" : "#10B981",
      createdAt: now,
    };
  });
  await insertChunked(tags, tagRows, 20);

  // Build arrays for batch insertion of Root Posts, Reply Posts, Comments, PostTags, PostAgencies
  const rootPostRows: Array<typeof posts.$inferInsert> = [];
  const replyPostRows: Array<typeof posts.$inferInsert> = [];
  const commentRows: Array<typeof comments.$inferInsert> = [];
  const postTagRows: Array<typeof postTags.$inferInsert> = [];
  const postAgencyRows: Array<typeof postAgencies.$inferInsert> = [];

  for (const r of reportSpecs) {
    const postedDate = new Date(baseNow - r.hoursAgo * 3600000);
    const isClosed = r.reportStatus === "completed" || r.reportStatus === "closed_internal";
    const closeType =
      r.reportStatus === "completed"
        ? ("SOLVED" as const)
        : r.reportStatus === "closed_internal"
          ? ("GENERAL" as const)
          : ("NONE" as const);
    const closedById =
      r.reportStatus === "completed"
        ? r.actionReply?.agencyId || "pupr"
        : r.reportStatus === "closed_internal"
          ? "usr_internal_zaki"
          : null;
    const closedAtDate = isClosed ? new Date(baseNow - Math.max(1, Math.floor(r.hoursAgo / 3)) * 3600000) : null;
    const commentsCount = (r.actionReply ? 1 : 0) + (r.citizenReply ? 1 : 0);

    rootPostRows.push({
      id: r.id,
      authorId: r.authorId,
      topicId: r.topicId,
      kind: "report",
      parentPostId: null,
      rootPostId: null,
      title: r.title,
      content: r.content,
      images: [r.imageUrl],
      locationName: r.locationName,
      province: r.province,
      latitude: null,
      longitude: null,
      status: isClosed ? "CLOSED" : "OPEN",
      closeType,
      reportStatus: r.reportStatus,
      closedById,
      closedAt: closedAtDate,
      resolutionCommentId: r.actionReply?.id || null,
      isActionTaken: false,
      actionRole: null,
      actionTakenAt: null,
      upvotesCount: r.upvotesCount,
      downvotesCount: r.downvotesCount,
      commentsCount,
      repostsCount: r.repostsCount,
      viewsCount: r.viewsCount,
      isAnonymous: r.anonymous,
      isPinned: false,
      isDeleted: false,
      postedAt: postedDate,
      updatedAt: closedAtDate || postedDate,
    });

    for (const t of r.tags) {
      postTagRows.push({ postId: r.id, tagId: tagMap.get(t)! });
    }
    for (const agencyUserId of r.agencyIds) {
      postAgencyRows.push({ postId: r.id, agencyUserId });
    }

    if (r.citizenReply) {
      const replyDate = new Date(baseNow - r.citizenReply.hoursAgo * 3600000);
      replyPostRows.push({
        id: r.citizenReply.id,
        authorId: r.citizenReply.authorId,
        topicId: r.topicId,
        kind: "reply",
        parentPostId: r.id,
        rootPostId: r.id,
        title: null,
        content: r.citizenReply.content,
        images: [],
        locationName: null,
        province: r.province,
        status: "OPEN",
        closeType: "NONE",
        reportStatus: null,
        isActionTaken: false,
        actionRole: null,
        actionTakenAt: null,
        upvotesCount: r.citizenReply.upvotesCount,
        downvotesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        viewsCount: 80,
        isAnonymous: false,
        isPinned: false,
        isDeleted: false,
        postedAt: replyDate,
        updatedAt: replyDate,
      });
      commentRows.push({
        id: r.citizenReply.id,
        postId: r.id,
        authorId: r.citizenReply.authorId,
        parentId: null,
        content: r.citizenReply.content,
        images: [],
        upvotesCount: r.citizenReply.upvotesCount,
        downvotesCount: 0,
        isActionTaken: false,
        isAnonymous: false,
        isDeleted: false,
        createdAt: replyDate,
        updatedAt: replyDate,
      });
    }

    if (r.actionReply) {
      const actionDate = new Date(baseNow - r.actionReply.hoursAgo * 3600000);
      const isInternalActor = r.actionReply.agencyId.startsWith("usr_internal");
      replyPostRows.push({
        id: r.actionReply.id,
        authorId: r.actionReply.agencyId,
        topicId: r.topicId,
        kind: "reply",
        parentPostId: r.id,
        rootPostId: r.id,
        title: null,
        content: r.actionReply.content,
        images: [r.actionReply.imageUrl],
        locationName: r.locationName,
        province: r.province,
        status: "OPEN",
        closeType: "NONE",
        reportStatus: null,
        isActionTaken: true,
        actionRole: isInternalActor ? "INTERNAL" : "GOVERNMENT",
        actionTakenAt: actionDate,
        upvotesCount: r.actionReply.upvotesCount,
        downvotesCount: r.actionReply.downvotesCount,
        commentsCount: 0,
        repostsCount: 4,
        viewsCount: 320,
        isAnonymous: false,
        isPinned: false,
        isDeleted: false,
        postedAt: actionDate,
        updatedAt: actionDate,
      });
      commentRows.push({
        id: r.actionReply.id,
        postId: r.id,
        authorId: r.actionReply.agencyId,
        parentId: null,
        content: r.actionReply.content,
        images: [r.actionReply.imageUrl],
        upvotesCount: r.actionReply.upvotesCount,
        downvotesCount: r.actionReply.downvotesCount,
        isActionTaken: true,
        isAnonymous: false,
        isDeleted: false,
        createdAt: actionDate,
        updatedAt: actionDate,
      });
    }
  }

  for (const g of generalSpecs) {
    const postedDate = new Date(baseNow - g.minutesAgo * 60000);
    const commentsCount = g.reply ? 1 : 0;

    rootPostRows.push({
      id: g.id,
      authorId: g.authorId,
      topicId: g.topicId,
      kind: "general",
      parentPostId: null,
      rootPostId: null,
      title: null,
      content: g.content,
      images: g.images,
      locationName: g.locationName,
      province: g.province,
      status: "OPEN",
      closeType: "NONE",
      reportStatus: null,
      isActionTaken: false,
      actionRole: null,
      actionTakenAt: null,
      upvotesCount: g.upvotesCount,
      downvotesCount: 1,
      commentsCount,
      repostsCount: g.repostsCount,
      viewsCount: g.viewsCount,
      isAnonymous: false,
      isPinned: false,
      isDeleted: false,
      postedAt: postedDate,
      updatedAt: postedDate,
    });

    for (const t of g.tags) {
      postTagRows.push({ postId: g.id, tagId: tagMap.get(t)! });
    }

    if (g.reply) {
      const replyDate = new Date(baseNow - g.reply.minutesAgo * 60000);
      replyPostRows.push({
        id: g.reply.id,
        authorId: g.reply.authorId,
        topicId: g.topicId,
        kind: "reply",
        parentPostId: g.id,
        rootPostId: g.id,
        title: null,
        content: g.reply.content,
        images: [],
        locationName: null,
        province: g.province,
        status: "OPEN",
        closeType: "NONE",
        reportStatus: null,
        isActionTaken: false,
        actionRole: null,
        actionTakenAt: null,
        upvotesCount: g.reply.upvotesCount,
        downvotesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        viewsCount: 45,
        isAnonymous: false,
        isPinned: false,
        isDeleted: false,
        postedAt: replyDate,
        updatedAt: replyDate,
      });
      commentRows.push({
        id: g.reply.id,
        postId: g.id,
        authorId: g.reply.authorId,
        parentId: null,
        content: g.reply.content,
        images: [],
        upvotesCount: g.reply.upvotesCount,
        downvotesCount: 0,
        isActionTaken: false,
        isAnonymous: false,
        isDeleted: false,
        createdAt: replyDate,
        updatedAt: replyDate,
      });
    }
  }

  await insertChunked(posts, rootPostRows, 10);
  await insertChunked(posts, replyPostRows, 10);
  await insertChunked(comments, commentRows, 12);
  await insertChunked(postTags, postTagRows, 25);
  await insertChunked(postAgencies, postAgencyRows, 20);

  // =========================================================================
  // 5. SOCIAL GRAPH, VOTES, SAVED POSTS, NOTIFICATIONS, DMs & DRAFTS
  // (Passive citizens act as voters & followers!)
  // =========================================================================
  const followRows = [
    { followerId: "alya", followingId: "nadia", createdAt: now },
    { followerId: "alya", followingId: "komunitas", createdAt: now },
    { followerId: "alya", followingId: "pupr", createdAt: now },
    { followerId: "nadia", followingId: "alya", createdAt: now },
    { followerId: "nadia", followingId: "dishub_dki", createdAt: now },
    { followerId: "usr_internal_zaki", followingId: "alya", createdAt: now },
    { followerId: "usr_internal_zaki", followingId: "nadia", createdAt: now },
    { followerId: "usr_internal_zaki", followingId: "komunitas", createdAt: now },
    ...passiveCitizens.slice(0, 20).map((c) => ({
      followerId: c.id,
      followingId: "alya",
      createdAt: now,
    })),
    ...passiveCitizens.slice(10, 30).map((c) => ({
      followerId: c.id,
      followingId: "nadia",
      createdAt: now,
    })),
  ];
  await insertChunked(follows, followRows, 20);

  const voteRows = [
    ...passiveCitizens.slice(0, 25).map((c) => ({
      userId: c.id,
      targetType: "POST" as const,
      targetId: "trotoar-merdeka",
      voteType: "UP" as const,
      createdAt: now,
    })),
    ...passiveCitizens.slice(0, 30).map((c) => ({
      userId: c.id,
      targetType: "POST" as const,
      targetId: "rep-jalan-lampung",
      voteType: "UP" as const,
      createdAt: now,
    })),
    ...passiveCitizens.slice(0, 15).map((c) => ({
      userId: c.id,
      targetType: "COMMENT" as const,
      targetId: "respons-pupr",
      voteType: "UP" as const,
      createdAt: now,
    })),
  ];
  await insertChunked(votes, voteRows, 20);

  await db.insert(savedPosts).values([
    { userId: "alya", postId: "trotoar-merdeka", createdAt: now },
    { userId: "alya", postId: "rep-jalan-lampung", createdAt: now },
    { userId: "usr_internal_zaki", postId: "trotoar-merdeka", createdAt: now },
    { userId: "usr_internal_zaki", postId: "rep-banjir-demak", createdAt: now },
  ]);

  await db.insert(reposts).values([
    { userId: "nadia", postId: "trotoar-merdeka", createdAt: now },
    { userId: "komunitas", postId: "rep-sampah-sarimukti", createdAt: now },
  ]);

  // Notifications (100% DB-backed for all demo & active accounts)
  await db.insert(notifications).values([
    {
      id: "evidence",
      recipientId: "alya",
      actorId: "pupr",
      type: "RESOLVED",
      title: "Dinas PUPR mengajukan penyelesaian",
      message: "Lihat bukti dan ikut menilai hasilnya.",
      href: "/posts/trotoar-merdeka#evidence",
      postId: "trotoar-merdeka",
      commentId: "respons-pupr",
      isRead: false,
      createdAt: new Date(baseNow - 4 * 60000),
    },
    {
      id: "reply-1",
      recipientId: "alya",
      actorId: "komunitas",
      type: "COMMENT",
      title: "Balasan baru dalam percakapan",
      message: "Percakapan warga terus berlanjut di laporan trotoar.",
      href: "/posts/trotoar-merdeka",
      postId: "trotoar-merdeka",
      commentId: "rep-warga-1",
      isRead: false,
      createdAt: new Date(baseNow - 15 * 60000),
    },
    {
      id: "closed",
      recipientId: "alya",
      actorId: "pupr",
      type: "RESOLVED",
      title: "Validasi selesai · Laporan Ditutup",
      message: "Lihat bukti, hasil validasi dan riwayat percakapan.",
      href: "/posts/contoh-success#evidence",
      postId: "contoh-success",
      commentId: "respons-dishub-selesai",
      isRead: false,
      createdAt: new Date(baseNow - 60 * 60000),
    },
    {
      id: "reply-2",
      recipientId: "alya",
      actorId: "nadia",
      type: "COMMENT",
      title: "Nadia membalas komentar Anda",
      message: "Setuju banget kak! Paling enak jalan kaki di sana pas minggu pagi sebelum rame.",
      href: "/posts/kopi-braga",
      postId: "kopi-braga",
      commentId: "rep-alya-1",
      isRead: false,
      createdAt: new Date(baseNow - 120 * 60000),
    },
    {
      id: "follow",
      recipientId: "alya",
      actorId: "nadia",
      type: "FOLLOW",
      title: "Nadia mulai mengikutimu",
      message: "Temukan cerita dan suara baru dari warga sekitar.",
      href: "/profile/nadia",
      postId: null,
      commentId: null,
      isRead: false,
      createdAt: new Date(baseNow - 180 * 60000),
    },
    {
      id: "report-status",
      recipientId: "alya",
      actorId: "dishub",
      type: "SYSTEM",
      title: "Dishub memperbarui status fasilitas",
      message: "Pekerjaan lapangan telah dijadwalkan oleh dinas terkait.",
      href: "/posts/trotoar-merdeka",
      postId: "trotoar-merdeka",
      commentId: null,
      isRead: false,
      createdAt: new Date(baseNow - 240 * 60000),
    },
    {
      id: "notif_seed_pupr_1",
      recipientId: "pupr",
      actorId: "alya",
      type: "SYSTEM",
      title: "Laporan warga baru menyebut @DinasPUPR",
      message: "Trotoar di Jl. Merdeka rusak dan berlubang cukup parah setelah galian utilitas.",
      href: "/posts/trotoar-merdeka",
      postId: "trotoar-merdeka",
      commentId: null,
      isRead: false,
      createdAt: new Date(baseNow - 30 * 60000),
    },
    {
      id: "notif_seed_zaky_demo_1",
      recipientId: "zaky_internal",
      actorId: "alya",
      type: "SYSTEM",
      title: "Laporan Baru Menunggu Pemantauan",
      message: "18 laporan warga di berbagai provinsi telah disinkronisasi ke dasbor pengawasan Kavi.",
      href: "/tugas",
      postId: "trotoar-merdeka",
      commentId: null,
      isRead: false,
      createdAt: new Date(baseNow - 15 * 60000),
    },
    {
      id: "notif_seed_3",
      recipientId: "nadia",
      actorId: "dishub",
      type: "RESOLVED",
      title: "Laporan Lampu PJU Diselesaikan",
      message: "Dinas Perhubungan Bandung telah menyelesaikan perbaikan lampu PJU di perempatan Jl. Riau.",
      href: "/posts/contoh-success",
      postId: "contoh-success",
      commentId: "respons-dishub-selesai",
      isRead: false,
      createdAt: new Date(baseNow - 12 * 3600000),
    },
    {
      id: "notif_seed_4",
      recipientId: "usr_internal_zaki",
      actorId: "alya",
      type: "SYSTEM",
      title: "Laporan Baru Menunggu Pemantauan",
      message: "18 laporan warga di berbagai provinsi telah disinkronisasi ke dasbor pengawasan Kavi.",
      href: "/tugas",
      postId: "trotoar-merdeka",
      commentId: null,
      isRead: false,
      createdAt: new Date(baseNow - 15 * 60000),
    },
  ]);

  // Direct Message Conversations & Messages
  const convData = [
    {
      id: "conv_nadia",
      partnerId: "nadia",
      owners: ["alya", "pupr", "zaky_internal", "usr_internal_zaki"],
      text: "Besok jadi ikut kegiatan taman?",
      outgoing: false,
      minutesAgo: 25,
    },
    {
      id: "conv_komunitas",
      partnerId: "komunitas",
      owners: ["alya", "pupr", "zaky_internal", "usr_internal_zaki"],
      text: "Halo! Ada ide kegiatan warga untuk akhir pekan ini?",
      outgoing: false,
      minutesAgo: 55,
    },
    {
      id: "conv_dishub",
      partnerId: "dishub",
      owners: ["alya", "pupr", "zaky_internal", "usr_internal_zaki"],
      text: "Terima kasih atas perbaikan lampu PJU di perempatan Jl. Riau.",
      outgoing: true,
      minutesAgo: 720,
    },
  ];

  for (const c of convData) {
    for (const ownerId of c.owners) {
      const cid = `${c.id}_${ownerId}`;
      const msgTime = new Date(baseNow - c.minutesAgo * 60000);
      await db.insert(conversations).values({
        id: cid,
        lastMessageAt: msgTime,
        createdAt: new Date(baseNow - 86400000),
      });
      await db.insert(conversationParticipants).values([
        {
          conversationId: cid,
          userId: ownerId,
          lastReadAt: c.outgoing ? msgTime : null,
        },
        {
          conversationId: cid,
          userId: c.partnerId,
          lastReadAt: msgTime,
        },
      ]);
      await db.insert(messages).values({
        id: `msg_${cid}_1`,
        conversationId: cid,
        senderId: c.outgoing ? ownerId : c.partnerId,
        content: c.text,
        images: [],
        createdAt: msgTime,
      });
    }
  }

  // Saved Drafts in DB (Zero localStorage)
  await db.insert(drafts).values([
    {
      id: "draft_seed_alya_1",
      userId: "alya",
      mode: "report",
      title: "Penutup drainase besi hilang di Jl. Dago",
      content: "Penutup grill besi saluran air di dekat simpang Dago hilang satu keping sehingga membahayakan ban sepeda.",
      topicId: "top_infra",
      locationName: "Coblong, Bandung, Jawa Barat",
      tags: ["Drainase", "Bandung"],
      images: [],
      isAnonymous: false,
      updatedAt: new Date(baseNow - 90 * 60000),
    },
    {
      id: "draft_seed_zaki_1",
      userId: "usr_internal_zaki",
      mode: "post",
      title: "",
      content: "Rekap mingguan pemantauan laporan infrastruktur daerah menunjukkan peningkatan kecepatan respons instansi sebesar 18%.",
      topicId: "top_tatakelola",
      locationName: "Indonesia",
      tags: ["RekapKavi", "TransparansiPublik"],
      images: [],
      isAnonymous: false,
      updatedAt: new Date(baseNow - 40 * 60000),
    },
  ]);

  // Agency Verification Request in DB
  await db.insert(agencyVerificationRequests).values({
    id: "verif_seed_1",
    userId: "dishub",
    agencyName: "Dinas Perhubungan Kota Bandung",
    region: "Bandung, Jawa Barat",
    responsibility: "Manajemen rekayasa lalu lintas, halte angkutan umum, dan penerangan jalan umum.",
    channel: "dishub@bandung.go.id",
    documentUrls: ["sk-penunjukan-dishub-bandung.pdf"],
    status: "approved",
    reviewedById: "usr_internal_zaki",
    createdAt: new Date(baseNow - 5 * 86400000),
  });

  console.log("✓ Seeded 54 users, 50 root posts (18 reports + 32 general), replies, DMs, prefs & drafts!");
}

if (require.main === module) {
  seedDummyData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
