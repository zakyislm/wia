import { NextRequest, NextResponse } from "next/server";
import {
  db,
  conversations,
  conversationParticipants,
  messages,
} from "@/db";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);

    const myParticipations = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, currentUser.id));

    const convIds = myParticipations.map((p) => p.conversationId);
    if (convIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const [allParts, allMsgs] = await Promise.all([
      db
        .select()
        .from(conversationParticipants)
        .where(inArray(conversationParticipants.conversationId, convIds)),
      db
        .select()
        .from(messages)
        .where(inArray(messages.conversationId, convIds))
        .orderBy(asc(messages.createdAt)),
    ]);

    const formatted = convIds.map((convId) => {
      const myPart = myParticipations.find((p) => p.conversationId === convId);
      const partnerPart = allParts.find(
        (p) => p.conversationId === convId && p.userId !== currentUser.id
      );
      const convMsgs = allMsgs
        .filter((m) => m.conversationId === convId)
        .map((m) => ({
          id: m.id,
          authorId: m.senderId,
          localKey: m.id,
          outgoing: m.senderId === currentUser.id,
          text: m.content,
          images: m.images || [],
          time: new Intl.DateTimeFormat("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta",
          }).format(
            m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)
          ),
        }));

      return {
        id: convId,
        localKey: partnerPart?.userId || convId,
        partnerKey: partnerPart?.userId || convId,
        unread: !myPart?.lastReadAt,
        messages: convMsgs,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load conversations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    const body = await req.json();
    const {
      partnerKey,
      text = "",
      images = [],
    } = body;

    if (!partnerKey) {
      return NextResponse.json(
        { success: false, error: "partnerKey is required" },
        { status: 400 }
      );
    }

    if (isDemoUser(currentUser)) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          id: `demo_msg_${Date.now()}`,
          partnerKey,
          text,
          images,
        },
      });
    }

    const now = new Date();

    const myConvs = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, currentUser.id));

    let convId: string | null = null;
    if (myConvs.length > 0) {
      const partnerConvs = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.userId, partnerKey),
            inArray(
              conversationParticipants.conversationId,
              myConvs.map((c) => c.conversationId)
            )
          )
        );
      if (partnerConvs.length > 0) {
        convId = partnerConvs[0].conversationId;
      }
    }

    if (!convId) {
      convId = `conv_${currentUser.id}_${partnerKey}`;
      await db
        .insert(conversations)
        .values({
          id: convId,
          createdAt: now,
          lastMessageAt: now,
        })
        .onConflictDoNothing();

      await db
        .insert(conversationParticipants)
        .values([
          {
            conversationId: convId,
            userId: currentUser.id,
            lastReadAt: now,
          },
          {
            conversationId: convId,
            userId: partnerKey,
            lastReadAt: null,
          },
        ])
        .onConflictDoNothing();
    }

    let createdMsg = null;
    if (text.trim() || (Array.isArray(images) && images.length > 0)) {
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.insert(messages).values({
        id: msgId,
        conversationId: convId,
        senderId: currentUser.id,
        content: text.trim(),
        images: Array.isArray(images) ? images : [],
        createdAt: now,
      });

      await db
        .update(conversationParticipants)
        .set({ lastReadAt: null })
        .where(
          and(
            eq(conversationParticipants.conversationId, convId),
            eq(conversationParticipants.userId, partnerKey)
          )
        );

      await db
        .update(conversations)
        .set({ lastMessageAt: now })
        .where(eq(conversations.id, convId));

      createdMsg = {
        id: msgId,
        conversationId: convId,
        senderId: currentUser.id,
        text: text.trim(),
        images: Array.isArray(images) ? images : [],
        createdAt: now,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: convId,
        partnerKey,
        message: createdMsg,
      },
    });
  } catch (error) {
    console.error("POST /api/messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    if (isDemoUser(currentUser)) {
      return NextResponse.json({ success: true, demo: true });
    }

    const { partnerKey, conversationId } = await req.json();
    const myConvs = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, currentUser.id));

    let targetConvId = conversationId;
    if (!targetConvId && partnerKey && myConvs.length > 0) {
      const partnerMatch = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.userId, partnerKey),
            inArray(
              conversationParticipants.conversationId,
              myConvs.map((c) => c.conversationId)
            )
          )
        );
      targetConvId = partnerMatch[0]?.conversationId;
    }

    if (targetConvId) {
      await db
        .update(conversationParticipants)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(conversationParticipants.conversationId, targetConvId),
            eq(conversationParticipants.userId, currentUser.id)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to mark conversation read" },
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

    const { partnerKey, conversationId } = await req.json();
    const myConvs = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, currentUser.id));

    let targetConvId = conversationId;
    if (!targetConvId && partnerKey && myConvs.length > 0) {
      const partnerMatch = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.userId, partnerKey),
            inArray(
              conversationParticipants.conversationId,
              myConvs.map((c) => c.conversationId)
            )
          )
        );
      targetConvId = partnerMatch[0]?.conversationId;
    }

    if (targetConvId) {
      await db
        .delete(conversations)
        .where(eq(conversations.id, targetConvId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
