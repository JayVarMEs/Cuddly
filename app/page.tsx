"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Heart, Home, ImagePlus, Lightbulb, Plus, Sparkles, UsersRound, X } from "lucide-react";

type Plushie = {
  id: string; name: string; note: string; imageUrl: string | null;
  cuddleCount: number; lastCuddledAt: number | null; queuePosition: number | null; createdAt: number;
};
type Suggestion = { id: string; plushieId: string; plushieName: string; suggesterName: string; message: string; createdAt: number };
type Dashboard = { plushies: Plushie[]; suggestions: Suggestion[]; cycle: number };
type Tab = "home" | "plushies" | "suggestions";
const empty: Dashboard = { plushies: [], suggestions: [], cycle: 1 };

function timeAgo(value: number | null) {
  if (!value) return "Never cuddled";
  const days = Math.floor((Date.now() - value) / 86_400_000);
  if (days === 0) return "Cuddled today";
  if (days === 1) return "Cuddled yesterday";
  return `Cuddled ${days} days ago`;
}

function Avatar({ plushie, size = "large" }: { plushie: Plushie; size?: "small" | "large" }) {
  return <div className={`plushie-avatar ${size}`}>
    {plushie.imageUrl ? <img src={plushie.imageUrl} alt={plushie.name} /> : <span aria-hidden>🧸</span>}
  </div>;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState<Dashboard>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState("");

  async function refresh() {
    const response = await fetch("/api/plushies", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load the cuddle club");
    setData(result);
  }

  useEffect(() => { refresh().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3000); return () => window.clearTimeout(timer); }, [toast]);

  const waiting = useMemo(() => data.plushies.filter((p) => p.queuePosition !== null).sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0)), [data.plushies]);
  const cuddledThisRound = useMemo(() => data.plushies.filter((p) => p.queuePosition === null), [data.plushies]);
  const current = waiting[0] ?? null;
  const needsLove = useMemo(() => [...data.plushies].sort((a, b) => a.cuddleCount - b.cuddleCount || (a.lastCuddledAt ?? 0) - (b.lastCuddledAt ?? 0))[0] ?? null, [data.plushies]);
  const totalCuddles = data.plushies.reduce((sum, p) => sum + p.cuddleCount, 0);
  const progress = data.plushies.length ? (cuddledThisRound.length / data.plushies.length) * 100 : 0;

  async function recordCuddle(plushie: Plushie) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/cuddles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plushieId: plushie.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
      setToast(result.newRound ? "Everyone got love! A fresh cuddle round has begun ✨" : `${plushie.name} got a cuddle! 💗`);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  async function addPlushie(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/plushies", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result); setShowAdd(false); setToast("A new cuddle buddy joined the club! 🧸");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add plushie"); }
    finally { setBusy(false); }
  }

  return <main>
    <header className="topbar">
      <button className="brand" onClick={() => setTab("home")} aria-label="Plushie Cuddle Club home"><span>♡</span> Plushie Cuddle Club</button>
      <nav aria-label="Main navigation">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><Home size={17}/> Home</button>
        <button className={tab === "plushies" ? "active" : ""} onClick={() => setTab("plushies")}><UsersRound size={17}/> Plushies</button>
        <button className={tab === "suggestions" ? "active" : ""} onClick={() => setTab("suggestions")}><Lightbulb size={17}/> Suggestions</button>
      </nav>
      <button className="primary small" onClick={() => setShowAdd(true)}><Plus size={18}/> Add plushie</button>
    </header>
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}><X size={16}/></button></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
    <div className="page-shell">
      {loading ? <Loading /> : tab === "home" ? <section>
        <div className="hero-copy"><div><span className="eyebrow"><Sparkles size={14}/> FAIR CUDDLES FOR EVERYONE</span><h1>Who needs a<br/><em>little love?</em></h1></div><p>Keep every cuddle buddy feeling loved. We’ll remember who’s had a turn and make sure nobody gets left behind.</p></div>
        {current ? <div className="spotlight-card"><div className="wash"></div><div className="spotlight-photo"><Avatar plushie={current}/></div><div className="spotlight-content"><span className="eyebrow coral"><Heart size={14} fill="currentColor"/> UP NEXT</span><h2>You should cuddle<br/><em>{current.name}</em></h2><p>{current.note || `${current.name} is ready for a cozy moment with you.`}</p><div className="meta-line"><span><Heart size={16}/> {current.cuddleCount} cuddle{current.cuddleCount === 1 ? "" : "s"}</span><span>·</span><span>{timeAgo(current.lastCuddledAt)}</span></div><button className="primary cuddle-button" onClick={() => recordCuddle(current)} disabled={busy}><Heart size={19} fill="currentColor"/>{busy ? "Saving cuddle…" : "I cuddled them!"}</button></div><div className="round-badge">ROUND {data.cycle}</div></div> : <EmptyState onAdd={() => setShowAdd(true)} />}
        <section className="queue-section"><div className="section-heading"><div><span className="eyebrow"><Heart size={14}/> THE CUDDLE QUEUE</span><h2>Everyone gets a turn</h2></div><div className="progress-copy"><b>{cuddledThisRound.length} of {data.plushies.length}</b> cuddled this round<div className="progress"><span style={{ width: `${progress}%` }}/></div></div></div><div className="queue-grid">{waiting.slice(1, 5).map((p, index) => <QueueCard key={p.id} plushie={p} label={`#${index + 2} in queue`} onCuddle={() => recordCuddle(p)} />)}{cuddledThisRound.slice(-4).reverse().map((p) => <QueueCard key={p.id} plushie={p} label="Loved this round" cuddled onCuddle={() => recordCuddle(p)} />)}</div>{data.plushies.length > 0 && <p className="queue-note">When everyone has been cuddled, the queue shuffles and starts fresh — fair and random every round.</p>}</section>
      </section> : tab === "plushies" ? <PlushiesView data={data} totalCuddles={totalCuddles} onCuddle={recordCuddle} onAdd={() => setShowAdd(true)} busy={busy}/> : <SuggestionsView data={data} needsLove={needsLove} refresh={refresh} setToast={setToast} setError={setError}/>} 
    </div>
    {showAdd && <AddModal onClose={() => setShowAdd(false)} onSubmit={addPlushie} busy={busy}/>} 
  </main>;
}

function QueueCard({ plushie, label, cuddled, onCuddle }: { plushie: Plushie; label: string; cuddled?: boolean; onCuddle: () => void }) {
  return <article className={`queue-card ${cuddled ? "cuddled" : ""}`}><Avatar plushie={plushie} size="small"/><div className="queue-card-copy"><b>{plushie.name}</b><span>{label}</span></div>{cuddled ? <span className="check">✓</span> : <button className="heart-icon" onClick={onCuddle} aria-label={`Cuddle ${plushie.name}`}><Heart size={17}/></button>}</article>;
}

function PlushiesView({ data, totalCuddles, onCuddle, onAdd, busy }: { data: Dashboard; totalCuddles: number; onCuddle: (p: Plushie) => void; onAdd: () => void; busy: boolean }) {
  return <section className="inner-page"><div className="page-title"><div><span className="eyebrow"><UsersRound size={14}/> THE WHOLE CREW</span><h1>Your plushie family</h1><p>Every cuddle, every buddy, all in one cozy place.</p></div><button className="primary" onClick={onAdd}><Plus size={18}/> Add plushie</button></div><div className="stats"><div><strong>{data.plushies.length}</strong><span>plushies</span></div><div><strong>{totalCuddles}</strong><span>cuddles given</span></div><div><strong>{data.cycle}</strong><span>fair rounds</span></div></div><div className="plushie-grid">{data.plushies.map((p) => <article className="plushie-card" key={p.id}><div className="photo-wrap"><Avatar plushie={p}/>{p.queuePosition === null && <span className="loved-pill">Loved this round</span>}</div><div className="plushie-info"><h3>{p.name}</h3><p>{p.note || "A treasured member of the cuddle club."}</p><div className="plushie-stats"><span><Heart size={15}/> {p.cuddleCount} total</span><span>{timeAgo(p.lastCuddledAt)}</span></div><button className="secondary" disabled={busy} onClick={() => onCuddle(p)}><Heart size={16}/> Log a cuddle</button></div></article>)}{data.plushies.length === 0 && <EmptyState onAdd={onAdd}/>}</div></section>;
}

function SuggestionsView({ data, needsLove, refresh, setToast, setError }: { data: Dashboard; needsLove: Plushie | null; refresh: () => Promise<void>; setToast: (s: string) => void; setError: (s: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); try { const response = await fetch("/api/suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plushieId: form.get("plushieId"), name: form.get("name"), message: form.get("message") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); event.currentTarget.reset(); await refresh(); setToast("Suggestion added to the love board! 💌"); } catch (e) { setError(e instanceof Error ? e.message : "Could not add suggestion"); } finally { setBusy(false); } }
  return <section className="inner-page"><div className="page-title"><div><span className="eyebrow"><Lightbulb size={14}/> A LITTLE EXTRA LOVE</span><h1>Cuddle suggestions</h1><p>See who may need attention, or nominate a friend for the next cuddle.</p></div></div>{needsLove && <div className="love-alert"><Avatar plushie={needsLove}/><div><span className="eyebrow coral">OUR GENTLE NUDGE</span><h2>{needsLove.name} could use some love</h2><p>With {needsLove.cuddleCount} cuddle{needsLove.cuddleCount === 1 ? "" : "s"} so far, {needsLove.name} is at the quiet end of the cuddle count.</p></div><Sparkles size={38}/></div>}<div className="suggestion-layout"><form className="suggestion-form" onSubmit={submit}><h2>Suggest a cuddle</h2><p>This is separate from the fair queue — just a sweet nudge from you.</p><label>Which plushie?<select name="plushieId" required defaultValue=""><option value="" disabled>Choose a cuddle buddy</option>{data.plushies.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Your name <span>(optional)</span><input name="name" placeholder="A caring human" maxLength={50}/></label><label>Why do they need love?<textarea name="message" placeholder="They've been looking extra huggable lately…" maxLength={180}/></label><button className="primary" disabled={busy || !data.plushies.length}><Heart size={18}/>{busy ? "Adding…" : "Add suggestion"}</button></form><div className="love-board"><h2>Love board</h2><p>Suggestions from fellow cuddle coordinators.</p><div className="suggestion-list">{data.suggestions.map((s) => <article key={s.id}><span className="quote">“</span><p>{s.message}</p><footer><b>{s.plushieName}</b><span>suggested by {s.suggesterName}</span></footer></article>)}{data.suggestions.length === 0 && <div className="empty-board">No suggestions yet. Be the first to leave a little nudge.</div>}</div></div></div></section>;
}

function AddModal({ onClose, onSubmit, busy }: { onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void; busy: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><button className="modal-close" onClick={onClose}><X/></button><span className="eyebrow"><Sparkles size={14}/> NEW CUDDLE BUDDY</span><h2 id="add-title">Add a plushie</h2><p>Give them a name, a photo, and a note that captures their personality.</p><form onSubmit={onSubmit}><label className="photo-picker">{preview ? <img src={preview} alt="Selected plushie preview"/> : <><ImagePlus size={28}/><b>Add a photo</b><span>JPG, PNG or WEBP · max 6 MB</span></>}<input type="file" name="image" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : null); }}/></label><label>Name<input name="name" required maxLength={60} placeholder="e.g. Mochi"/></label><label>Little note <span>(optional)</span><textarea name="note" maxLength={280} placeholder="Loves rainy days and bedtime stories…"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}><Plus size={18}/>{busy ? "Adding…" : "Join the club"}</button></div></form></div></div>;
}
function EmptyState({ onAdd }: { onAdd: () => void }) { return <div className="empty-state"><span>🧸</span><h2>Your cuddle club is waiting</h2><p>Add your first plushie to start a fair, randomized cuddle queue.</p><button className="primary" onClick={onAdd}><Plus size={18}/> Add first plushie</button></div>; }
function Loading() { return <div className="loading"><span>♡</span><p>Gathering the cuddle crew…</p></div>; }
