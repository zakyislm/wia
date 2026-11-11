import type { Metadata } from "next";
import { Profile } from "@/features/profile/Profile";
import { db, users } from "@/db";
import { sql } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const clean = decodeURIComponent(username).replace(/^@/, "").toLowerCase();
  if (clean === "me") {
    return {
      title: "Profil Saya",
      description: "Profil pengguna dan riwayat laporan di KAVI.",
    };
  }
  try {
    const person = await db.query.users.findFirst({
      where: sql`lower(${users.username}) = ${clean} OR lower(${users.id}) = ${clean}`,
      columns: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        region: true,
      },
    });
    if (person) {
      const title = `${person.name} (@${person.username})`;
      const description =
        person.bio ||
        `Profil publik ${person.name} (@${person.username}) di KAVI.`;
      return {
        title,
        description,
        authors: [{ name: person.name }],
        creator: person.name,
        keywords: [
          person.name,
          `@${person.username}`,
          person.region || "Indonesia",
          "Profil KAVI",
        ],
        alternates: {
          canonical: `/profile/${person.id}`,
        },
        openGraph: {
          type: "profile",
          locale: "id_ID",
          siteName: "KAVI",
          title: `Kavi - ${title}`,
          description,
          url: `/profile/${person.id}`,
          images: person.image
            ? [{ url: person.image, alt: person.name }]
            : [{ url: "/kavi.png", alt: "KAVI" }],
        },
        twitter: {
          card: "summary",
          title: `Kavi - ${title}`,
          description,
          images: person.image ? [person.image] : ["/kavi.png"],
        },
      };
    }
    return { title: "Profil" };
  } catch {
    return { title: "Profil" };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <Profile profileKey={username} />;
}
