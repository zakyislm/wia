import "dotenv/config";
import { db, users, posts, comments, topics, tags, postTags, votes } from "../db";
import { eq } from "drizzle-orm";

export async function seedDummyData() {
  console.log("=== SEEDING DUMMY CIVIC DATA ===");
  const now = new Date();

  // 1. Ensure core users exist
  const sampleUsers = [
    {
      id: "usr_dev_citizen",
      name: "Mira Sualifah",
      username: "miraaaaaaaa",
      email: "mira@kavi.id",
      role: "USER" as const,
      bio: "Just a mom that care with her country situation. #SuarakanRakyat",
      postCount: 1,
      followerCount: 571000,
      followingCount: 124,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_gov_kaltara",
      name: "Pemerintah Daerah Kalimantan Utara",
      username: "pemda_kaltara",
      email: "pemda@kaltaraprov.go.id",
      role: "GOVERNMENT" as const,
      agencyName: "Pemerintah Daerah Kalimantan Utara",
      jurisdictionProvince: "Kalimantan Utara",
      bio: "Kanal resmi penanganan aduan & isu publik Pemerintah Provinsi Kalimantan Utara.",
      postCount: 0,
      followerCount: 89000,
      followingCount: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_internal_zaky",
      name: "Zaky The Flymost",
      username: "zaky",
      email: "zaky@kavi.id",
      role: "INTERNAL" as const,
      agencyName: "Kavi Core Team",
      bio: "Kavi Platform Moderator & Head Developer.",
      postCount: 0,
      followerCount: 12000,
      followingCount: 50,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const u of sampleUsers) {
    const existing = await db.query.users.findFirst({ where: eq(users.id, u.id) });
    if (!existing) {
      await db.insert(users).values(u);
    }
  }

  // 2. Ensure macro topics exist
  const defaultTopics = [
    { id: "top_infra", name: "Infrastruktur", slug: "infrastruktur", isTrending: true, createdAt: now },
    { id: "top_transportasi", name: "Transportasi", slug: "transportasi", isTrending: true, createdAt: now },
    { id: "top_lingkungan", name: "Lingkungan & Kebersihan", slug: "lingkungan-kebersihan", isTrending: true, createdAt: now },
    { id: "top_kesehatan", name: "Kesehatan", slug: "kesehatan", isTrending: false, createdAt: now },
    { id: "top_pendidikan", name: "Pendidikan", slug: "pendidikan", isTrending: false, createdAt: now },
    { id: "top_keamanan", name: "Keamanan & Ketertiban", slug: "keamanan-ketertiban", isTrending: false, createdAt: now },
    { id: "top_bencana", name: "Bencana & Darurat", slug: "bencana-darurat", isTrending: false, createdAt: now },
    { id: "top_layanan", name: "Layanan Publik", slug: "layanan-publik", isTrending: false, createdAt: now },
    { id: "top_sosial", name: "Sosial & Warga", slug: "sosial-warga", isTrending: false, createdAt: now },
    { id: "top_tatakelola", name: "Tata Kelola & Hukum", slug: "tata-kelola-hukum", isTrending: false, createdAt: now },
    { id: "top_utilitas", name: "Air & Utilitas", slug: "air-utilitas", isTrending: false, createdAt: now },
    { id: "top_komunitas", name: "Komunitas", slug: "komunitas", isTrending: false, createdAt: now },
  ];

  for (const t of defaultTopics) {
    const existing = await db.query.topics.findFirst({ where: eq(topics.id, t.id) });
    if (!existing) {
      await db.insert(topics).values(t);
    }
  }

  // 3. Ensure tags exist
  const defaultTags = [
    { id: "tag_karhutla", name: "Karhutla", color: "#EF4444", createdAt: now },
    { id: "tag_tonedeaf", name: "ToneDeaf", color: "#F59E0B", createdAt: now },
    { id: "tag_kebakaran", name: "KebakaranHutan", color: "#DC2626", createdAt: now },
    { id: "tag_jalanrusak", name: "JalanRusak", color: "#3B82F6", createdAt: now },
    { id: "tag_banjir", name: "Banjir", color: "#06B6D4", createdAt: now },
  ];

  for (const tag of defaultTags) {
    const existing = await db.query.tags.findFirst({ where: eq(tags.id, tag.id) });
    if (!existing) {
      await db.insert(tags).values(tag);
    }
  }

  // 4. Seed Figma Showcase Post 1 (Active Report)
  const figmaPostId = "post_figma_kaltara_active";
  const existingPost = await db.query.posts.findFirst({ where: eq(posts.id, figmaPostId) });

  if (!existingPost) {
    await db.insert(posts).values({
      id: figmaPostId,
      authorId: "usr_dev_citizen",
      topicId: "top_bencana",
      title: "Tolong dong pemerintah terkait, saya dan keluarga udah 1 minggu sesak nafas gara gara kebakaran.",
      content:
        "lakuin sesuatu dong!! kasian anak-anak aku yang masih pada kecil, seharusnya bisa bernafas dengan lega malah sengsara, padahal ini wilayah yang banyak pohon. Saking segitunya kah kalian sama uang sampe ngelupain tanggung jawab kalian terhadap masyarakat? TETAPIN BENCANA NASIONAL & MULAI PEDULI KEPADA RAKYATMU WOK!",
      images: [],
      locationName: "Jl. Poros Bulungan - Malinau, Bulungan",
      province: "Kalimantan Utara",
      status: "OPEN",
      closeType: "NONE",
      upvotesCount: 995,
      downvotesCount: 12,
      commentsCount: 38,
      repostsCount: 142,
      viewsCount: 4820,
      isPinned: false,
      isDeleted: false,
      postedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      updatedAt: now,
    });

    // Attach tags: KebakaranHutan, ToneDeaf, Karhutla
    await db.insert(postTags).values([
      { postId: figmaPostId, tagId: "tag_kebakaran" },
      { postId: figmaPostId, tagId: "tag_tonedeaf" },
      { postId: figmaPostId, tagId: "tag_karhutla" },
    ]);

    // Sample top comment
    await db.insert(comments).values({
      id: "cmt_sample_kaltara_1",
      postId: figmaPostId,
      authorId: "usr_dev_citizen",
      content:
        "Kami warga desa sekitar sudah gotong royong coba padamkan dengan alat seadanya, tapi api di gambut masuk ke dalam tanah. Kami butuh helikopter water bombing segera!",
      upvotesCount: 142,
      downvotesCount: 1,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    });
  }

  // 5. Seed Figma Showcase Post 2 (Solved Report)
  const solvedPostId = "post_figma_kaltara_solved";
  const existingSolved = await db.query.posts.findFirst({ where: eq(posts.id, solvedPostId) });

  if (!existingSolved) {
    const resolutionCommentId = "cmt_official_res_kaltara";

    // 1. Insert post first
    await db.insert(posts).values({
      id: solvedPostId,
      authorId: "usr_dev_citizen",
      topicId: "top_bencana",
      title: "Kebakaran Hutan di Sekitar Permukiman Warga Malinau",
      content:
        "Kabut asap pekat sudah menutup jarak pandang di bawah 50 meter. Warga butuh bantuan evakuasi dan masker medis darurat secepatnya.",
      images: [],
      locationName: "Malinau Kota, Malinau",
      province: "Kalimantan Utara",
      status: "CLOSED",
      closeType: "SOLVED",
      closedById: "usr_gov_kaltara",
      resolutionCommentId: null, // Linked right after comment is created
      upvotesCount: 1430,
      downvotesCount: 8,
      commentsCount: 64,
      repostsCount: 310,
      viewsCount: 12500,
      isPinned: false,
      isDeleted: false,
      postedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    });

    // 2. Insert official resolution comment (now foreign key references valid post)
    await db.insert(comments).values({
      id: resolutionCommentId,
      postId: solvedPostId,
      authorId: "usr_gov_kaltara",
      content:
        "Tanggapan Resmi BPBD Kaltara: Tim gabungan TNI-Polri dan Manggala Agni telah diterjunkan ke lokasi sejak kemarin sore. 2 unit helikopter water bombing BNPB telah memadamkan titik api utama di radius 5km. Posko kesehatan dan pembagian masker N95 gratis dibuka di Balai Desa mulai hari ini.",
      upvotesCount: 840,
      downvotesCount: 5,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    });

    // 3. Link resolution comment to post
    await db
      .update(posts)
      .set({ resolutionCommentId })
      .where(eq(posts.id, solvedPostId));

    await db.insert(postTags).values([
      { postId: solvedPostId, tagId: "tag_kebakaran" },
      { postId: solvedPostId, tagId: "tag_karhutla" },
    ]);
  }

  console.log("✓ Dummy civic data seeded successfully!");
}

if (require.main === module) {
  seedDummyData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Dummy seeding failed:", err);
      process.exit(1);
    });
}
