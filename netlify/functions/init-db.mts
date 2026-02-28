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

  const sql = neon(databaseUrl);

  try {
    // Create room_types table
    await sql`
      CREATE TABLE IF NOT EXISTS room_types (
        id          SERIAL PRIMARY KEY,
        slug        VARCHAR(50) UNIQUE NOT NULL,
        name_zh     VARCHAR(100) NOT NULL,
        name_en     VARCHAR(100) NOT NULL,
        name_ru     VARCHAR(100) NOT NULL,
        desc_zh     TEXT NOT NULL,
        desc_en     TEXT NOT NULL,
        desc_ru     TEXT NOT NULL,
        price_cny   INTEGER NOT NULL,
        price_usd   INTEGER NOT NULL,
        size_sqm    INTEGER NOT NULL,
        capacity    INTEGER NOT NULL,
        bed_type_zh VARCHAR(50) NOT NULL,
        bed_type_en VARCHAR(50) NOT NULL,
        bed_type_ru VARCHAR(50) NOT NULL,
        floor_range VARCHAR(20),
        image_url   TEXT NOT NULL,
        amenities   JSONB DEFAULT '[]',
        sort_order  INTEGER DEFAULT 0,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create bookings table
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id                SERIAL PRIMARY KEY,
        booking_no        VARCHAR(20) UNIQUE NOT NULL,
        room_type_id      INTEGER NOT NULL REFERENCES room_types(id),
        check_in          DATE NOT NULL,
        check_out         DATE NOT NULL,
        rooms             INTEGER NOT NULL DEFAULT 1,
        guests            INTEGER NOT NULL DEFAULT 1,
        guest_name        VARCHAR(100) NOT NULL,
        guest_email       VARCHAR(150) NOT NULL,
        guest_phone       VARCHAR(30),
        special_requests  TEXT,
        total_price       INTEGER NOT NULL,
        currency          VARCHAR(3) NOT NULL DEFAULT 'CNY',
        stripe_session_id VARCHAR(255),
        payment_status    VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_method    VARCHAR(20),
        lang              VARCHAR(5) DEFAULT 'zh',
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create reviews table
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id          SERIAL PRIMARY KEY,
        guest_name  VARCHAR(100) NOT NULL,
        guest_email VARCHAR(150),
        rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title       VARCHAR(200),
        content     TEXT NOT NULL,
        lang        VARCHAR(5) NOT NULL DEFAULT 'zh',
        room_type   VARCHAR(50),
        stay_date   VARCHAR(20),
        status      VARCHAR(20) NOT NULL DEFAULT 'approved',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Seed room_types (upsert)
    const rooms = [
      {
        slug: "deluxe-ocean",
        name_zh: "豪华海景房", name_en: "Deluxe Ocean View", name_ru: "Делюкс с видом на море",
        desc_zh: "面朝南海，推窗即享270°无敌海景。宽敞明亮的客房配备高端寝具与智能设施，让您的每一刻都沉浸在海天一色的醉人美景中。",
        desc_en: "Facing the South China Sea with stunning 270° panoramic ocean views. Spacious rooms with premium bedding and smart amenities immerse you in breathtaking seascapes.",
        desc_ru: "Лицом к Южно-Китайскому морю с потрясающей панорамой 270°. Просторные номера с премиальным постельным бельём и умными удобствами.",
        price_cny: 688, price_usd: 98, size_sqm: 35, capacity: 2,
        bed_type_zh: "大床/双床", bed_type_en: "King or Twin", bed_type_ru: "Кинг/Твин",
        floor_range: "6-12F",
        image_url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80",
        amenities: JSON.stringify(["ocean_view","balcony","wifi","minibar","safe","rain_shower","bathrobe","tv_55inch"]),
        sort_order: 1
      },
      {
        slug: "superior-suite",
        name_zh: "高级海景套房", name_en: "Superior Ocean Suite", name_ru: "Люкс с видом на море",
        desc_zh: "尊享55平米奢阔空间，独立客厅与卧室分区，270°环幕海景尽收眼底。私享行政酒廊特权，品味顶级度假生活。",
        desc_en: "Enjoy 55sqm of luxury with separate living room and bedroom, 270° wraparound ocean views. Exclusive executive lounge access for the ultimate resort experience.",
        desc_ru: "Роскошные 55 м² с отдельной гостиной и спальней, панорамный вид на море 270°. Эксклюзивный доступ в представительский лаунж.",
        price_cny: 988, price_usd: 142, size_sqm: 55, capacity: 2,
        bed_type_zh: "特大床", bed_type_en: "King", bed_type_ru: "Кинг",
        floor_range: "10-16F",
        image_url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80",
        amenities: JSON.stringify(["ocean_view","balcony","wifi","minibar","safe","rain_shower","bathrobe","tv_55inch","living_room","lounge"]),
        sort_order: 2
      },
      {
        slug: "family-ocean",
        name_zh: "家庭海景房", name_en: "Family Ocean Room", name_ru: "Семейный номер",
        desc_zh: "专为家庭设计的温馨港湾，45平米空间配备大床与双床，让一家人在碧海蓝天下共享天伦之乐。",
        desc_en: "A warm family haven with 45sqm of space featuring king and twin beds, perfect for families to enjoy the blue sky and sea together.",
        desc_ru: "Уютная семейная гавань площадью 45 м² с большой и двуспальными кроватями для всей семьи.",
        price_cny: 888, price_usd: 128, size_sqm: 45, capacity: 4,
        bed_type_zh: "大床+双床", bed_type_en: "King + Twin", bed_type_ru: "Кинг + Твин",
        floor_range: "6-12F",
        image_url: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80",
        amenities: JSON.stringify(["ocean_view","balcony","wifi","minibar","safe","rain_shower","bathrobe","tv_55inch","kids_area"]),
        sort_order: 3
      },
      {
        slug: "presidential",
        name_zh: "总统海景套房", name_en: "Presidential Suite", name_ru: "Президентский люкс",
        desc_zh: "80平米至尊空间，独占顶层270°全海景。总统级奢华配置，私享管家服务，定义三亚海景度假的极致体验。",
        desc_en: "80sqm of supreme space occupying the top floors with full 270° ocean panorama. Presidential-grade luxury with private butler service defines the ultimate Sanya experience.",
        desc_ru: "80 м² высшего класса на верхних этажах с полной панорамой океана 270°. Президентская роскошь с персональным дворецким.",
        price_cny: 1688, price_usd: 242, size_sqm: 80, capacity: 4,
        bed_type_zh: "特大床", bed_type_en: "King", bed_type_ru: "Кинг",
        floor_range: "16-18F",
        image_url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80",
        amenities: JSON.stringify(["ocean_view","balcony","wifi","minibar","safe","rain_shower","bathrobe","tv_55inch","living_room","lounge","butler","jacuzzi"]),
        sort_order: 4
      }
    ];

    for (const r of rooms) {
      await sql`
        INSERT INTO room_types (slug, name_zh, name_en, name_ru, desc_zh, desc_en, desc_ru, price_cny, price_usd, size_sqm, capacity, bed_type_zh, bed_type_en, bed_type_ru, floor_range, image_url, amenities, sort_order)
        VALUES (${r.slug}, ${r.name_zh}, ${r.name_en}, ${r.name_ru}, ${r.desc_zh}, ${r.desc_en}, ${r.desc_ru}, ${r.price_cny}, ${r.price_usd}, ${r.size_sqm}, ${r.capacity}, ${r.bed_type_zh}, ${r.bed_type_en}, ${r.bed_type_ru}, ${r.floor_range}, ${r.image_url}, ${r.amenities}::jsonb, ${r.sort_order})
        ON CONFLICT (slug) DO UPDATE SET
          name_zh = EXCLUDED.name_zh, name_en = EXCLUDED.name_en, name_ru = EXCLUDED.name_ru,
          desc_zh = EXCLUDED.desc_zh, desc_en = EXCLUDED.desc_en, desc_ru = EXCLUDED.desc_ru,
          price_cny = EXCLUDED.price_cny, price_usd = EXCLUDED.price_usd,
          size_sqm = EXCLUDED.size_sqm, capacity = EXCLUDED.capacity,
          bed_type_zh = EXCLUDED.bed_type_zh, bed_type_en = EXCLUDED.bed_type_en, bed_type_ru = EXCLUDED.bed_type_ru,
          floor_range = EXCLUDED.floor_range, image_url = EXCLUDED.image_url,
          amenities = EXCLUDED.amenities, sort_order = EXCLUDED.sort_order
      `;
    }

    // Seed reviews
    const reviews = [
      { guest_name: "张明辉", rating: 5, title: "海景绝美，服务一流", content: "从阳台望去就是无敌海景，管家服务非常贴心，早餐也很丰富。2019年翻新后设施都很新，推荐入住海景套房！", lang: "zh" },
      { guest_name: "李雪梅", rating: 4, title: "位置便利，值得推荐", content: "离大东海走路就能到，酒店2019年翻新后很干净整洁。前台服务热情，帮忙预约了景点门票。性价比很高的海景酒店。", lang: "zh" },
      { guest_name: "James W.", rating: 5, title: "Breathtaking Ocean Views", content: "The balcony view is absolutely stunning. Staff were incredibly helpful and the rooms are spotless after the 2019 renovation. Highly recommend the Superior Suite!", lang: "en" },
      { guest_name: "Sarah K.", rating: 4, title: "Great Location, Clean Rooms", content: "Walking distance to Dadonghai Beach. Renovated in 2019, everything feels fresh and modern. The breakfast buffet has great variety. Will come back!", lang: "en" },
      { guest_name: "Алексей П.", rating: 5, title: "Потрясающий вид на море", content: "Вид с балкона просто невероятный. Персонал очень внимательный и всегда готов помочь. После ремонта 2019 года номера в отличном состоянии.", lang: "ru" },
      { guest_name: "Мария С.", rating: 4, title: "Отличное расположение", content: "Близко к пляжу Дадунхай, номера чистые после ремонта 2019 года. Завтрак разнообразный с тропическими фруктами. Рекомендую семьям!", lang: "ru" }
    ];

    const existingReviews = await sql`SELECT COUNT(*) as count FROM reviews`;
    if (parseInt(existingReviews[0].count) === 0) {
      for (const rev of reviews) {
        await sql`
          INSERT INTO reviews (guest_name, rating, title, content, lang, status)
          VALUES (${rev.guest_name}, ${rev.rating}, ${rev.title}, ${rev.content}, ${rev.lang}, 'approved')
        `;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Database initialized: 3 tables created, 4 room types + 6 reviews seeded" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[init-db] Error:", error);
    return new Response(
      JSON.stringify({ error: "Database initialization failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/init-db" };
