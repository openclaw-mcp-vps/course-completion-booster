import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordPurchaseSession } from "@/lib/database";

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const pieces = signatureHeader.split(",").reduce<Record<string, string>>((accumulator, current) => {
    const [key, value] = current.split("=");
    if (key && value) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  const timestamp = pieces.t;
  const expectedSignature = pieces.v1;

  if (!timestamp || !expectedSignature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const computed = createHmac("sha256", secret).update(signedPayload).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const computedBuffer = Buffer.from(computed);

  if (expectedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, computedBuffer);
}

interface StripeEvent {
  type: string;
  data?: {
    object?: {
      id?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
    };
  };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 });
  }

  const rawPayload = await request.text();
  const isValid = verifyStripeSignature(rawPayload, signature, secret);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawPayload) as StripeEvent;

    if (event.type === "checkout.session.completed") {
      const sessionId = event.data?.object?.id;
      const customerEmail = event.data?.object?.customer_email ?? event.data?.object?.customer_details?.email;

      if (sessionId) {
        await recordPurchaseSession(sessionId, customerEmail);
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
  }
}
