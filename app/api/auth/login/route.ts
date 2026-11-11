import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/db";
import { or, sql } from "drizzle-orm";
import { getOptionalSessionUser } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const user = await getOptionalSessionUser(req);
    return NextResponse.json({
      success: true,
      data: user || null,
    });
  } catch (error) {
    console.error("[GET /api/auth/login] Error:", error);
    return NextResponse.json({ success: true, data: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawIdentifier = String(
      body.identifier || body.email || body.username || ""
    )
      .trim()
      .replace(/^@+/, "")
      .toLowerCase();

    if (!rawIdentifier) {
      return NextResponse.json(
        { success: false, error: "Masukkan email atau username." },
        { status: 400 }
      );
    }

    const dbUser = await db.query.users.findFirst({
      where: or(
        sql`lower(${users.email}) = ${rawIdentifier}`,
        sql`lower(${users.username}) = ${rawIdentifier}`,
        sql`lower(${users.id}) = ${rawIdentifier}`
      ),
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          code: "AccountNotRegistered",
          error: "Akun tidak terdaftar",
        },
        { status: 404 }
      );
    }

    if (dbUser.isBanned) {
      return NextResponse.json(
        {
          success: false,
          code: "AccountBanned",
          error: "Akun ini telah diblokir oleh moderator internal.",
        },
        { status: 403 }
      );
    }

    const res = NextResponse.json({
      success: true,
      data: dbUser,
    });

    res.cookies.set("kavi_uid", dbUser.id, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses login." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("kavi_uid");
  return res;
}
