import type { Metadata } from "next";
import { Profile } from "@/features/profile/Profile";
import { db, users } from "@/db";
import { sql } from "drizzle-orm";
import { generateProfileJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo";

async function fetchProfilePerson(username: string) {
  const clean = decodeURIComponent(username).replace(/^@/, "").toLowerCase();
  if (clean === "me") return null;
  try {
    return await db.query.users.findFirst({
      where: sql`lower(${users.username}) = ${clean} OR lower(${users.id}) = ${clean}`,
      columns: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        region: true,
        role: true,
        agencyName: true,
      },
    });
  } catch {
    return null;
  }
}

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
      description: "Profil pengguna dan riwayat laporan di Kavi.",
    };
  }
  const person = await fetchProfilePerson(username);
  if (person) {
    const title = `${person.name} (@${person.username})`;
    const description =
      person.bio ||
      `Profil publik ${person.name} (@${person.username}) di Kavi.`;
    return {
      title,
      description,
      authors: [{ name: person.name }],
      creator: person.name,
      publisher: "Kavi",
      keywords: [
        person.name,
        `@${person.username}`,
        person.agencyName,
        person.region || "Indonesia",
        "Profil Kavi",
      ].filter((k): k is string => Boolean(k)),
      alternates: {
        canonical: `/profile/${person.id}`,
      },
      openGraph: {
        type: "profile",
        locale: "id_ID",
        siteName: "Kavi",
        title: `Kavi - ${title}`,
        description,
        url: `/profile/${person.id}`,
        images: person.image
          ? [{ url: person.image, alt: person.name }]
          : [{ url: "/kavi.png", alt: "Kavi" }],
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
}

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const person = await fetchProfilePerson(username);
  const schemas = person
    ? [
        generateProfileJsonLd(person),
        generateBreadcrumbJsonLd([
          { name: "Beranda", path: "/home" },
          { name: person.name, path: `/profile/${person.id}` },
        ]),
      ]
    : null;

  return (
    <>
      {schemas && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
        />
      )}
      <Profile profileKey={username} />
    </>
  );
}
