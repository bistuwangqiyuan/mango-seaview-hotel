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
    const rooms = await sql`
      SELECT id, slug, name_zh, name_en, name_ru, desc_zh, desc_en, desc_ru,
             price_cny, price_usd, size_sqm, capacity,
             bed_type_zh, bed_type_en, bed_type_ru,
             floor_range, image_url, amenities
      FROM room_types
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;

    return new Response(JSON.stringify(rooms), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (error: any) {
    console.error("[get-rooms] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch rooms", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/get-rooms" };
