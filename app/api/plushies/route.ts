import { env } from "cloudflare:workers";

type PlushieRow = {
  id: string;
  name: string;
  note: string;
  image_key: string | null;
  cuddle_count: number;
  last_cuddled_at: number | null;
  queue_position: number | null;
  created_at: number;
};

function db() {
  if (!env.DB) throw new Error("Database is unavailable");
  return env.DB;
}

function publicPlushie(row: PlushieRow) {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    imageUrl: row.image_key ? `/api/images/${encodeURIComponent(row.image_key)}` : null,
    cuddleCount: row.cuddle_count,
    lastCuddledAt: row.last_cuddled_at,
    queuePosition: row.queue_position,
    createdAt: row.created_at,
  };
}

async function readDashboard() {
  const database = db();
  await database
    .prepare("INSERT OR IGNORE INTO app_state (id, cycle) VALUES (1, 1)")
    .run();
  const [plushieResult, suggestionResult, state] = await Promise.all([
    database
      .prepare("SELECT * FROM plushies ORDER BY CASE WHEN queue_position IS NULL THEN 1 ELSE 0 END, queue_position, created_at")
      .all<PlushieRow>(),
    database
      .prepare(`SELECT s.id, s.plushie_id as plushieId, p.name as plushieName,
        s.suggester_name as suggesterName, s.message, s.created_at as createdAt
        FROM suggestions s JOIN plushies p ON p.id = s.plushie_id
        ORDER BY s.created_at DESC LIMIT 30`)
      .all(),
    database.prepare("SELECT cycle FROM app_state WHERE id = 1").first<{ cycle: number }>(),
  ]);
  return {
    plushies: (plushieResult.results ?? []).map(publicPlushie),
    suggestions: suggestionResult.results ?? [],
    cycle: state?.cycle ?? 1,
  };
}

export async function GET() {
  try {
    return Response.json(await readDashboard());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load the cuddle club" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim().slice(0, 60);
    const note = String(form.get("note") ?? "").trim().slice(0, 280);
    const image = form.get("image");
    if (!name) return Response.json({ error: "Please give your plushie a name." }, { status: 400 });

    const id = crypto.randomUUID();
    let imageKey: string | null = null;
    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith("image/")) return Response.json({ error: "Please choose an image file." }, { status: 400 });
      if (image.size > 6_000_000) return Response.json({ error: "Please use an image smaller than 6 MB." }, { status: 400 });
      if (!env.BUCKET) throw new Error("Photo storage is unavailable");
      const ext = image.type.split("/")[1]?.replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "") || "img";
      imageKey = `${id}.${ext}`;
      await env.BUCKET.put(imageKey, await image.arrayBuffer(), { httpMetadata: { contentType: image.type } });
    }

    const database = db();
    const max = await database.prepare("SELECT COALESCE(MAX(queue_position), 0) as maxPos FROM plushies").first<{ maxPos: number }>();
    await database.prepare(`INSERT INTO plushies
      (id, name, note, image_key, cuddle_count, queue_position, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)`)
      .bind(id, name, note, imageKey, (max?.maxPos ?? 0) + 1, Date.now())
      .run();
    return Response.json(await readDashboard(), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not add plushie" }, { status: 500 });
  }
}

