import { env } from "cloudflare:workers";

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(request: Request) {
  try {
    if (!env.DB) throw new Error("Database is unavailable");
    const { plushieId } = (await request.json()) as { plushieId?: string };
    if (!plushieId) return Response.json({ error: "Choose a plushie first." }, { status: 400 });
    const found = await env.DB.prepare("SELECT id FROM plushies WHERE id = ?").bind(plushieId).first();
    if (!found) return Response.json({ error: "That plushie could not be found." }, { status: 404 });

    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("UPDATE plushies SET cuddle_count = cuddle_count + 1, last_cuddled_at = ?, queue_position = NULL WHERE id = ?").bind(now, plushieId),
      env.DB.prepare("INSERT INTO cuddle_events (id, plushie_id, cuddled_at) VALUES (?, ?, ?)").bind(crypto.randomUUID(), plushieId, now),
    ]);

    const remaining = await env.DB.prepare("SELECT COUNT(*) as count FROM plushies WHERE queue_position IS NOT NULL").first<{ count: number }>();
    let newRound = false;
    if ((remaining?.count ?? 0) === 0) {
      const all = await env.DB.prepare("SELECT id FROM plushies").all<{ id: string }>();
      const order = shuffled(all.results ?? []);
      const statements = order.map((item, index) =>
        env.DB!.prepare("UPDATE plushies SET queue_position = ? WHERE id = ?").bind(index + 1, item.id),
      );
      statements.push(env.DB.prepare("UPDATE app_state SET cycle = cycle + 1 WHERE id = 1"));
      if (statements.length) await env.DB.batch(statements);
      newRound = true;
    }
    return Response.json({ ok: true, newRound });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not record cuddle" }, { status: 500 });
  }
}

