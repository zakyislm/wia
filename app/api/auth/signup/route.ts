import { NextRequest, NextResponse } from "next/server";
import { db, users, userPreferences } from "@/db";
import { eq, or, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const rawName = String(body.name || "").trim();
    const rawUsername = String(body.username || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase();
    const rawPassword = String(body.password || "");

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { success: false, error: "Format email tidak valid." },
        { status: 400 }
      );
    }

    if (!rawName || rawName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Nama lengkap minimal 2 karakter." },
        { status: 400 }
      );
    }

    if (!rawUsername || !/^[a-z0-9_]{3,24}$/.test(rawUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: "Username harus 3-24 karakter (huruf, angka, atau underscore).",
        },
        { status: 400 }
      );
    }

    if (!rawPassword || rawPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    const existing = await db.query.users.findFirst({
      where: or(
        sql`lower(${users.email}) = ${rawEmail}`,
        sql`lower(${users.username}) = ${rawUsername}`
      ),
    });

    if (existing) {
      const conflictField =
        existing.email.toLowerCase() === rawEmail ? "Email" : "Username";
      return NextResponse.json(
        {
          success: false,
          error: `${conflictField} sudah terdaftar. Silakan masuk atau gunakan yang lain.`,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const userId = `usr_${rawUsername}_${Date.now().toString(36)}`;

    await db.insert(users).values({
      id: userId,
      name: rawName,
      username: rawUsername,
      email: rawEmail,
      role: "USER",
      bio: String(body.bio || "Warga penggerak transparansi publik di Kavi."),
      region: String(body.region || "Indonesia"),
      isDemo: false,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isBanned: false,
      createdAt: now,
      updatedAt: now,
    });

    await db
      .insert(userPreferences)
      .values({
        userId,
        theme: "dark",
        notificationMessages: true,
        notificationSocial: true,
        notificationReports: true,
        updatedAt: now,
      })
      .onConflictDoNothing();

    const created = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const res = NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    );

    res.cookies.set("kavi_uid", userId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return res;
  } catch (error: any) {
    console.error("[POST /api/auth/signup] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mendaftarkan akun baru." },
      { status: 500 }
    );
  }
}
