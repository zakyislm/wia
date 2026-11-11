import type { Topic } from "@/types/models";

export const defaultTopics: Topic[] = [
  { id: "top_infra", name: "Infrastruktur", slug: "infrastruktur", isTrending: true },
  { id: "top_transportasi", name: "Transportasi", slug: "transportasi", isTrending: true },
  { id: "top_lingkungan", name: "Lingkungan & Kebersihan", slug: "lingkungan-kebersihan", isTrending: true },
  { id: "top_kesehatan", name: "Kesehatan", slug: "kesehatan", isTrending: false },
  { id: "top_pendidikan", name: "Pendidikan", slug: "pendidikan", isTrending: false },
  { id: "top_keamanan", name: "Keamanan & Ketertiban", slug: "keamanan-ketertiban", isTrending: false },
  { id: "top_bencana", name: "Bencana & Darurat", slug: "bencana-darurat", isTrending: false },
  { id: "top_layanan", name: "Layanan Publik", slug: "layanan-publik", isTrending: false },
  { id: "top_sosial", name: "Sosial & Warga", slug: "sosial-warga", isTrending: false },
  { id: "top_tatakelola", name: "Tata Kelola & Hukum", slug: "tata-kelola-hukum", isTrending: false },
  { id: "top_utilitas", name: "Air & Utilitas", slug: "air-utilitas", isTrending: false },
  { id: "top_komunitas", name: "Komunitas", slug: "komunitas", isTrending: false },
];

const topicSlugAliases: Record<string, string> = {
  "bencana-nasional": "bencana-darurat",
  "lingkungan-hidup": "lingkungan-kebersihan",
  "ruang-terbuka-hijau": "lingkungan-kebersihan",
  kebersihan: "lingkungan-kebersihan",
  "pelayanan-publik": "layanan-publik",
  "keselamatan-warga": "keamanan-ketertiban",
  koruptor: "tata-kelola-hukum",
  "fasilitas-publik": "infrastruktur",
  "tata-kota": "infrastruktur",
};

export function resolveCanonicalTopicSlug(slug: string): string {
  const clean = decodeURIComponent(slug).trim().toLowerCase();
  return topicSlugAliases[clean] ?? clean;
}

export function toTopicSlug(value: string): string {
  const slug = value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return topicSlugAliases[slug] ?? slug;
}

export function findTopicNameBySlug(slug: string): string {
  const clean = resolveCanonicalTopicSlug(slug);
  const matched = defaultTopics.find((t) => t.slug === clean);
  if (matched) return matched.name;
  return clean
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
