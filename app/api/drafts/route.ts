import { NextRequest, NextResponse } from "next/server";
import { db, drafts } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    const list = await db
      .select()
      .from(drafts)
      .where(eq(drafts.userId, currentUser.id))
      .orderBy(desc(drafts.updatedAt));

    return NextResponse.json({
      success: true,
      data: list.map((d) => ({
        id: d.id,
        savedAt:
          d.updatedAt instanceof Date
            ? d.updatedAt.getTime()
            : Number(d.updatedAt),
        kind: d.mode === "report" ? "report" : "general",
        title: d.title,
        content: d.content,
        province: d.locationName || "",
        category: d.topicId || "",
        agencyKeys: [],
        anonymous: Boolean(d.isAnonymous),
      })),
    });
  } catch (error) {
    console.error("GET /api/drafts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    const body = await req.json();

    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: body,
      });
    }

    const now = new Date();
    const id =
      body.id ||
      `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const mode: "post" | "report" =
      body.kind === "report" || body.mode === "report" ? "report" : "post";

    await db
      .insert(drafts)
      .values({
        id,
        userId: currentUser.id,
        mode,
        title: String(body.title || ""),
        content: String(body.content || ""),
        topicId: body.category || body.topicId || null,
        locationName: body.province || body.location || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        images: Array.isArray(body.images) ? body.images : [],
        isAnonymous: Boolean(body.anonymous || body.isAnonymous),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: drafts.id,
        set: {
          mode,
          title: String(body.title || ""),
          content: String(body.content || ""),
          topicId: body.category || body.topicId || null,
          locationName: body.province || body.location || null,
          isAnonymous: Boolean(body.anonymous || body.isAnonymous),
          updatedAt: now,
        },
      });

    return NextResponse.json({
      success: true,
      data: {
        id,
        savedAt: now.getTime(),
        kind: mode === "report" ? "report" : "general",
        title: String(body.title || ""),
        content: String(body.content || ""),
        province: body.province || "",
        category: body.category || "",
        anonymous: Boolean(body.anonymous || body.isAnonymous),
      },
    });
  } catch (error) {
    console.error("POST /api/drafts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save draft" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    if (isDemoUser(currentUser)) {
      return NextResponse.json({ success: true, demo: true });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      await db
        .delete(drafts)
        .where(and(eq(drafts.id, id), eq(drafts.userId, currentUser.id)));
    } else {
      await db.delete(drafts).where(eq(drafts.userId, currentUser.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/drafts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}
