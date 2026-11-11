import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db, users } from "./db";
import { eq, or, sql } from "drizzle-orm";

const SEEDED_PLACEHOLDER_PFPS = new Set([
  "https://s3.kavi.jeki.me/pfp/zaki.jpg",
  "https://s3.kavi.jeki.me/pfp/adrian.jpg",
  "https://s3.kavi.jeki.me/pfp/farika.jpg",
  "https://s3.kavi.jeki.me/pfp/alya.jpg",
  "https://s3.kavi.jeki.me/pfp/nadia.jpg",
]);

function shouldSyncGoogleAvatar(currentDbImage?: string | null): boolean {
  if (!currentDbImage) return true;
  if (SEEDED_PLACEHOLDER_PFPS.has(currentDbImage)) return true;
  if (currentDbImage.includes("googleusercontent.com")) return true;
  if (currentDbImage.includes("unsplash.com")) return true;
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh rolling JWT every 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email atau Username", type: "text" },
        password: { label: "Kata Sandi", type: "password" },
      },
      async authorize(credentials) {
        const raw = String(credentials?.identifier || "")
          .trim()
          .toLowerCase()
          .replace(/^@/, "");
        if (!raw) return null;

        const existing = await db.query.users.findFirst({
          where: or(
            sql`lower(${users.email}) = ${raw}`,
            sql`lower(${users.username}) = ${raw}`,
            eq(users.id, raw)
          ),
        });

        if (!existing || existing.isBanned) return null;
        return {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          image: existing.image,
          username: existing.username,
          role: existing.role,
          agencyName: existing.agencyName,
          jurisdictionProvince: existing.jurisdictionProvince,
          region: existing.region,
          isDemo: existing.isDemo,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const normalizedEmail = (
          (profile as any)?.email ||
          user.email ||
          ""
        )
          .trim()
          .toLowerCase();
        if (!normalizedEmail) {
          return "/login?error=AccountNotRegistered";
        }

        const googleAvatar =
          ((profile as any)?.picture as string | undefined) ||
          user.image ||
          null;
        const googleName =
          ((profile as any)?.name as string | undefined) ||
          user.name ||
          normalizedEmail.split("@")[0];

        let existingUser = await db.query.users.findFirst({
          where: sql`lower(${users.email}) = ${normalizedEmail}`,
        });

        // Auto-provision new citizen account when signing up via Google OAuth
        if (!existingUser) {
          const baseUsername = normalizedEmail
            .split("@")[0]
            .replace(/[^a-z0-9_]/gi, "")
            .toLowerCase()
            .slice(0, 18) || "warga";
          const newId = `usr_google_${Date.now().toString(36)}`;
          const newUsername = `${baseUsername}_${Math.random()
            .toString(36)
            .slice(2, 5)}`;
          const now = new Date();

          await db.insert(users).values({
            id: newId,
            name: googleName,
            username: newUsername,
            email: normalizedEmail,
            image: googleAvatar,
            bio: "Warga pengguna KAVI.",
            role: "USER",
            isDemo: false,
            isBanned: false,
            createdAt: now,
            updatedAt: now,
          });

          existingUser = await db.query.users.findFirst({
            where: eq(users.id, newId),
          });
        }

        if (!existingUser) {
          return "/login?error=AccountNotRegistered";
        }

        if (existingUser.isBanned) {
          return "/login?error=AccountBanned";
        }

        // Always sync real Google avatar over empty or seeded placeholder pfp
        const nextImage =
          googleAvatar && shouldSyncGoogleAvatar(existingUser.image)
            ? googleAvatar
            : existingUser.image;

        if (nextImage !== existingUser.image) {
          await db
            .update(users)
            .set({ image: nextImage, updatedAt: new Date() })
            .where(eq(users.id, existingUser.id));
          existingUser.image = nextImage;
        }

        user.id = existingUser.id;
        user.image = existingUser.image || googleAvatar;
        (user as any).username = existingUser.username;
        (user as any).role = existingUser.role;
        (user as any).agencyName = existingUser.agencyName;
        (user as any).jurisdictionProvince = existingUser.jurisdictionProvince;
        (user as any).region = existingUser.region;
        (user as any).isDemo = existingUser.isDemo;
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger }) {
      const googleAvatar =
        ((profile as any)?.picture as string | undefined) ||
        (account?.provider === "google" ? user?.image : undefined) ||
        (token.googlePicture as string | undefined);

      if (googleAvatar) {
        token.googlePicture = googleAvatar;
      }

      if (user) {
        token.id = user.id;
        token.email = user.email || token.email;
        token.username = (user as any).username;
        token.role = (user as any).role || "USER";
        token.agencyName = (user as any).agencyName || null;
        token.jurisdictionProvince = (user as any).jurisdictionProvince || null;
        token.region = (user as any).region || null;
        token.isDemo = Boolean((user as any).isDemo);
        token.picture = googleAvatar || user.image || token.picture;
      }

      // Resolve user from Turso by email or id to ensure token.id & Google avatar are always in sync
      const shouldSync =
        trigger === "update" ||
        Boolean(user) ||
        !token.syncedAt ||
        !token.username ||
        Date.now() - Number(token.syncedAt) > 5 * 60 * 1000;

      if (shouldSync && (token.id || token.email)) {
        try {
          const emailLower = String(token.email || "")
            .trim()
            .toLowerCase();
          const fresh = await db.query.users.findFirst({
            where: emailLower
              ? or(
                  eq(users.id, String(token.id || "")),
                  sql`lower(${users.email}) = ${emailLower}`
                )
              : eq(users.id, String(token.id)),
          });
          if (fresh && !fresh.isBanned) {
            let resolvedImage = fresh.image;
            const candidateGooglePic =
              (token.googlePicture as string | undefined) ||
              (typeof token.picture === "string" &&
              token.picture.includes("googleusercontent.com")
                ? token.picture
                : undefined);

            if (
              candidateGooglePic &&
              shouldSyncGoogleAvatar(fresh.image) &&
              fresh.image !== candidateGooglePic
            ) {
              resolvedImage = candidateGooglePic;
              await db
                .update(users)
                .set({ image: candidateGooglePic, updatedAt: new Date() })
                .where(eq(users.id, fresh.id));
            }

            token.id = fresh.id;
            token.name = fresh.name;
            token.username = fresh.username;
            token.role = fresh.role;
            token.agencyName = fresh.agencyName;
            token.jurisdictionProvince = fresh.jurisdictionProvince;
            token.region = fresh.region;
            token.isDemo = Boolean(fresh.isDemo);
            token.picture = resolvedImage || candidateGooglePic || null;
            token.syncedAt = Date.now();
          }
        } catch {
          // Keep cached JWT claims on transient DB error
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = String(token.id || "");
        session.user.image =
          (token.picture as string | undefined) ||
          (token.googlePicture as string | undefined) ||
          session.user.image ||
          null;
        // @ts-expect-error custom session field
        session.user.username = token.username || "warga";
        // @ts-expect-error custom session field
        session.user.role = token.role || "USER";
        // @ts-expect-error custom session field
        session.user.agencyName = token.agencyName || null;
        // @ts-expect-error custom session field
        session.user.jurisdictionProvince = token.jurisdictionProvince || null;
        // @ts-expect-error custom session field
        session.user.region = token.region || null;
        // @ts-expect-error custom session field
        session.user.isDemo = Boolean(token.isDemo);
      }
      return session;
    },
  },
});
