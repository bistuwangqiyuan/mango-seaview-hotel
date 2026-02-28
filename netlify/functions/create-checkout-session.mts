import type { Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripeKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const databaseUrl = Netlify.env.get("NETLIFY_DATABASE_URL");
  const siteUrl = Netlify.env.get("SITE_URL") || "https://mango-seaview-hotel.netlify.app";

  if (!stripeKey || !databaseUrl) {
    return new Response(
      JSON.stringify({ error: "Payment service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { roomTypeId, checkIn, checkOut, rooms, guests, guestName, guestEmail, guestPhone, specialRequests, currency, lang } = body;

    // Validation
    if (!roomTypeId || !checkIn || !checkOut || !guestName || !guestEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);
    if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime()) || coDate <= ciDate) {
      return new Response(
        JSON.stringify({ error: "Invalid dates" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sql = neon(databaseUrl);

    // Get room type
    const roomRows = await sql`SELECT * FROM room_types WHERE id = ${roomTypeId} AND is_active = true`;
    if (roomRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Room type not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const room = roomRows[0];
    const nights = Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24));
    const numRooms = Math.max(1, Math.min(5, parseInt(rooms) || 1));
    const cur = currency === "USD" ? "USD" : "CNY";
    const price = cur === "USD" ? room.price_usd : room.price_cny;
    const subtotal = price * nights * numRooms;
    const fee = Math.round(subtotal * 0.05);
    const totalPrice = subtotal + fee;

    // Generate booking number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const bookingNo = `MG${dateStr}-${rand}`;

    // Insert booking
    const bookingRows = await sql`
      INSERT INTO bookings (booking_no, room_type_id, check_in, check_out, rooms, guests, guest_name, guest_email, guest_phone, special_requests, total_price, currency, payment_status, lang)
      VALUES (${bookingNo}, ${roomTypeId}, ${checkIn}, ${checkOut}, ${numRooms}, ${guests || 1}, ${guestName}, ${guestEmail}, ${guestPhone || null}, ${specialRequests || null}, ${totalPrice}, ${cur}, 'pending', ${lang || 'zh'})
      RETURNING id
    `;

    const bookingId = bookingRows[0].id;

    // Create Stripe Checkout session
    const stripe = new Stripe(stripeKey);

    const roomName = lang === "en" ? room.name_en : lang === "ru" ? room.name_ru : room.name_zh;
    const productName = `${roomName} x${numRooms} (${nights}${lang === "en" ? " nights" : lang === "ru" ? " ночей" : "晚"})`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card", "alipay", "wechat_pay"],
      payment_method_options: {
        wechat_pay: { client: "web" },
      },
      line_items: [
        {
          price_data: {
            currency: cur.toLowerCase(),
            product_data: {
              name: productName,
              description: `Mango Sea View Hotel - ${bookingNo}`,
            },
            unit_amount: totalPrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&booking=${bookingNo}`,
      cancel_url: `${siteUrl}/#booking`,
      metadata: {
        booking_no: bookingNo,
        booking_id: String(bookingId),
      },
      customer_email: guestEmail,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update booking with stripe session ID
    await sql`
      UPDATE bookings SET stripe_session_id = ${session.id} WHERE id = ${bookingId}
    `;

    return new Response(
      JSON.stringify({ checkoutUrl: session.url, bookingNo }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[create-checkout-session] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create checkout session", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/create-checkout-session" };
