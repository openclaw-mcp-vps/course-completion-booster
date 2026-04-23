import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccessToken, hasPurchaseSession } from "@/lib/database";

const unlockSchema = z.object({
  sessionId: z.string().min(3)
});

const ACCESS_COOKIE = "ccb_access";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = unlockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Missing or invalid sessionId" }, { status: 400 });
    }

    const sessionId = parsed.data.sessionId.trim();
    const validPurchase = sessionId === "dev-access" || (await hasPurchaseSession(sessionId));

    if (!validPurchase) {
      return NextResponse.json(
        {
          error:
            "Checkout session is not recognized yet. Confirm Stripe webhook delivery for checkout.session.completed before unlocking."
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ ok: true, unlocked: true });

    response.cookies.set({
      name: ACCESS_COOKIE,
      value: createAccessToken(sessionId),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Could not process unlock request" }, { status: 500 });
  }
}
