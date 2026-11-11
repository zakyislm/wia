import { NextRequest, NextResponse } from "next/server";
import { db, agencyVerificationRequests } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    const latest = await db.query.agencyVerificationRequests.findFirst({
      where: eq(agencyVerificationRequests.userId, currentUser.id),
      orderBy: [desc(agencyVerificationRequests.createdAt)],
    });

    if (!latest) {
      return NextResponse.json({
        success: true,
        data: {
          id: "",
          status: "none",
          name: "",
          region: "",
          responsibility: "",
          channel: "",
          evidenceName: "",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: latest.id,
        status: "submitted",
        name: latest.agencyName,
        region: latest.region,
        responsibility: latest.responsibility,
        channel: latest.channel,
        evidenceName: latest.documentUrls?.[0] || "dokumen-resmi.pdf",
      },
    });
  } catch (error) {
    console.error("GET /api/verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch verification status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    const body = await req.json();

    const {
      name = "",
      region = "",
      responsibility = "",
      channel = "",
      evidenceName = "",
      evidenceUrl = null,
    } = body;

    if (!name.trim() || !region.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama instansi dan wilayah wajib diisi" },
        { status: 400 }
      );
    }

    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          id: `demo_verif_${Date.now()}`,
          status: "submitted",
          name,
          region,
          responsibility,
          channel,
          evidenceName,
        },
      });
    }

    const now = new Date();
    const id = `verif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const docs = [evidenceUrl || evidenceName].filter(Boolean) as string[];

    await db.insert(agencyVerificationRequests).values({
      id,
      userId: currentUser.id,
      agencyName: name.trim(),
      region: region.trim(),
      responsibility: responsibility.trim(),
      channel: channel.trim(),
      documentUrls: docs,
      status: "submitted",
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        status: "submitted",
        name: name.trim(),
        region: region.trim(),
        responsibility: responsibility.trim(),
        channel: channel.trim(),
        evidenceName: evidenceName.trim(),
      },
    });
  } catch (error) {
    console.error("POST /api/verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit verification request" },
      { status: 500 }
    );
  }
}
