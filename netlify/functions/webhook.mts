import type { Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");
  const databaseUrl = Netlify.env.get("NETLIFY_DATABASE_URL");

  if (!stripeKey || !webhookSecret || !databaseUrl) {
    console.error("[webhook] Missing configuration");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey);

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err.message);
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      try {
        const sql = neon(databaseUrl);

        const paymentMethod = session.payment_method_types?.[0] || "unknown";

        await sql`
          UPDATE bookings
          SET payment_status = 'paid',
              payment_method = ${paymentMethod},
              updated_at = NOW()
          WHERE id = ${parseInt(bookingId)}
        `;

        console.log(`[webhook] Booking ${bookingId} marked as paid (${paymentMethod})`);
      } catch (dbError: any) {
        console.error("[webhook] Database update failed:", dbError);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/webhook" };
