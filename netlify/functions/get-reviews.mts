import type { Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
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
    const sql = neon(databaseUrl);

    const reviews = await sql`
      SELECT id, guest_name, rating, title, content, lang, created_at
      FROM reviews
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return new Response(JSON.stringify(reviews), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=120",
      },
    });
  } catch (error: any) {
    console.error("[get-reviews] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch reviews", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/get-reviews" };
