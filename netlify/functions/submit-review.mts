import type { Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const databaseUrl = Netlify.env.get("NETLIFY_DATABASE_URL");
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { guestName, guestEmail, rating, title, content, lang } = body;

    // Validation
    if (!guestName || typeof guestName !== "string" || guestName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid guest name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!content || typeof content !== "string" || content.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Invalid review content" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "Rating must be between 1 and 5" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sql = neon(databaseUrl);

    const result = await sql`
      INSERT INTO reviews (guest_name, guest_email, rating, title, content, lang, status)
      VALUES (${guestName.trim()}, ${guestEmail?.trim() || null}, ${rating}, ${title?.trim() || null}, ${content.trim()}, ${lang || 'zh'}, 'approved')
      RETURNING id
    `;

    return new Response(
      JSON.stringify({ success: true, id: result[0].id }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[submit-review] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit review", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/submit-review" };
