import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  try {
    if (!env.DB) throw new Error("Database is unavailable");
    const body = (await request.json()) as { plushieId?: string; name?: string; message?: string };
    const plushieId = body.plushieId?.trim();
    if (!plushieId) return Response.json({ error: "Pick a plushie to suggest." }, { status: 400 });
    const name = body.name?.trim().slice(0, 50) || "Someone";
    const message = body.message?.trim().slice(0, 180) || "Could use a little extra love!";
    await env.DB.prepare(`INSERT INTO suggestions
      (id, plushie_id, suggester_name, message, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), plushieId, name, message, Date.now())
      .run();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not add suggestion" }, { status: 500 });
  }
}

