import { NextRequest, NextResponse } from "next/server";
import { db, userPreferences } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, currentUser.id),
    });

    return NextResponse.json({
      success: true,
      data: prefs || {
        userId: currentUser.id,
        theme: "dark",
        notificationMessages: true,
        notificationSocial: true,
        notificationReports: true,
      },
    });
  } catch (error) {
    console.error("GET /api/preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const existing = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, currentUser.id),
    });

    const theme: "light" | "dark" | "system" =
      body.theme === "light" || body.theme === "dark" || body.theme === "system"
        ? body.theme
        : existing?.theme || "dark";

    const notificationMessages =
      typeof body.notifyDirectMessages === "boolean"
        ? body.notifyDirectMessages
        : typeof body.notificationMessages === "boolean"
          ? body.notificationMessages
          : existing?.notificationMessages ?? true;

    const notificationSocial =
      typeof body.notifyTagResponses === "boolean"
        ? body.notifyTagResponses
        : typeof body.notificationSocial === "boolean"
          ? body.notificationSocial
          : existing?.notificationSocial ?? true;

    const notificationReports =
      typeof body.notifyResolvedReports === "boolean"
        ? body.notifyResolvedReports
        : typeof body.notificationReports === "boolean"
          ? body.notificationReports
          : existing?.notificationReports ?? true;

    if (existing) {
      await db
        .update(userPreferences)
        .set({
          theme,
          notificationMessages,
          notificationSocial,
          notificationReports,
          updatedAt: now,
        })
        .where(eq(userPreferences.userId, currentUser.id));
    } else {
      await db.insert(userPreferences).values({
        userId: currentUser.id,
        theme,
        notificationMessages,
        notificationSocial,
        notificationReports,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: currentUser.id,
        theme,
        notificationMessages,
        notificationSocial,
        notificationReports,
      },
    });
  } catch (error) {
    console.error("PATCH /api/preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
