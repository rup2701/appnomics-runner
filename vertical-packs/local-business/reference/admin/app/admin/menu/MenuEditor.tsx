"use client";
import { useState } from "react";

type Item = { name: string; price?: string; description?: string; hidden?: boolean };
type Cat = { name: string; items: Item[] };
type Preview = { preview: true; mode: "replace" | "add"; dishes: number; sections: number; current: number; skipped: string[] };

const move = <T,>(a: T[], i: number, d: number): T[] => {
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  const b = a.slice();
  [b[i], b[j]] = [b[j], b[i]];
  return b;
};

export function MenuEditor({ initial }: { initial: Cat[] }) {
  const [cats, setCats] = useState<Cat[]>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"replace" | "add">("replace");
  const [preview, setPreview] = useState<Preview | null>(null);
  const dirty = JSON.stringify(cats) !== saved;

  const setCat = (i: number, f: (c: Cat) => Cat) => setCats((cs) => cs.map((c, k) => (k === i ? f(c) : c)));
  const setItem = (i: number, j: number, patch: Partial<Item>) => setCat(i, (c) => ({ ...c, items: c.items.map((it, k) => (k === j ? { ...it, ...patch } : it)) }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/menu", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ categories: cats }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setCats(j.categories); setSaved(JSON.stringify(j.categories)); setMsg({ ok: true, text: "Saved. The website shows it within a minute." }); }
      else setMsg({ ok: false, text: j.error ?? "That did not save. Try again." });
    } catch { setMsg({ ok: false, text: "I could not reach the site. Try again." }); }
    setBusy(false);
  }

  async function upload(confirm: boolean) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      if (confirm) form.append("confirm", "1");
      const r = await fetch("/api/admin/menu/upload", { method: "POST", body: form });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg({ ok: false, text: j.error ?? "I could not read that file." });
      else if (j.preview) setPreview(j as Preview);
      else {
        setPreview(null);
        setFile(null);
        const skipped: string[] = j.skipped ?? [];
        setMsg({ ok: true, text: `${j.mode === "add" ? `Added ${j.added} dish${j.added === 1 ? "" : "es"}.` : `The menu now has ${j.dishes} dishes.`}${skipped.length ? ` Skipped: ${skipped.slice(0, 6).join("; ")}${skipped.length > 6 ? "; and more" : ""}.` : ""} Reloading...` });
        setTimeout(() => location.reload(), 900);
      }
    } catch { setMsg({ ok: false, text: "I could not reach the site. Try again." }); }
    setBusy(false);
  }

  return (
    <div>
      <section className="ad-card">
        <h2>From a spreadsheet</h2>
        <p className="ad-muted">A .csv or .xlsx with the columns Section, Dish, Price, Description. Only Dish is required. <a href="/api/admin/menu/download">Download the current menu</a> to edit it and send it back.</p>
        <div className="ad-row">
          <input type="file" accept=".csv,.tsv,.txt,.xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setMsg(null); }} />
          <label className="ad-inline"><input type="radio" checked={mode === "replace"} onChange={() => { setMode("replace"); setPreview(null); }} /> Replace my menu</label>
          <label className="ad-inline"><input type="radio" checked={mode === "add"} onChange={() => { setMode("add"); setPreview(null); }} /> Only add what is missing</label>
          <button type="button" className="ad-btn" disabled={!file || busy} onClick={() => void upload(false)}>Read the file</button>
        </div>
        {preview ? (
          <div className="ad-note" role="status">
            {preview.mode === "replace"
              ? <p>This will replace your current menu ({preview.current} dish{preview.current === 1 ? "" : "es"}) with the {preview.dishes} dish{preview.dishes === 1 ? "" : "es"} in {preview.sections} section{preview.sections === 1 ? "" : "s"} in this file. Edits made here that are not in the file will be lost.</p>
              : <p>This will add dishes from the file that are not on your menu yet. Dishes already there are left as they are.</p>}
            {preview.skipped.length ? <p>Rows skipped: {preview.skipped.slice(0, 6).join("; ")}{preview.skipped.length > 6 ? "; and more" : ""}.</p> : null}
            <button type="button" className="ad-btn" disabled={busy} onClick={() => void upload(true)}>{preview.mode === "replace" ? "Replace my menu" : "Add to my menu"}</button>
            <button type="button" className="ad-link" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        ) : null}
      </section>

      {cats.length === 0 ? <p className="ad-muted">The menu is empty. Add a section, or upload a spreadsheet.</p> : null}
      {cats.map((c, i) => (
        <section className="ad-card" key={i}>
          <div className="ad-row">
            <input className="ad-grow ad-strong" aria-label="Section name" value={c.name} placeholder="Section name" onChange={(e) => setCat(i, (x) => ({ ...x, name: e.target.value }))} />
            <button type="button" className="ad-link" onClick={() => setCats((cs) => move(cs, i, -1))} aria-label="Move section up">Up</button>
            <button type="button" className="ad-link" onClick={() => setCats((cs) => move(cs, i, 1))} aria-label="Move section down">Down</button>
            <button type="button" className="ad-link ad-danger" onClick={() => { if (confirm(`Delete the section "${c.name || "Untitled"}" and its dishes?`)) setCats((cs) => cs.filter((_, k) => k !== i)); }}>Delete section</button>
          </div>
          {c.items.map((it, j) => (
            <div className={it.hidden ? "ad-dish ad-hidden" : "ad-dish"} key={j}>
              <input aria-label="Dish name" placeholder="Dish" value={it.name} onChange={(e) => setItem(i, j, { name: e.target.value })} />
              <input aria-label="Price" placeholder="Price" value={it.price ?? ""} className="ad-price" onChange={(e) => setItem(i, j, { price: e.target.value })} />
              <input aria-label="Description" placeholder="Description (optional)" value={it.description ?? ""} className="ad-grow" onChange={(e) => setItem(i, j, { description: e.target.value })} />
              <label className="ad-inline"><input type="checkbox" checked={it.hidden === true} onChange={(e) => setItem(i, j, { hidden: e.target.checked })} /> Hide</label>
              <button type="button" className="ad-link" onClick={() => setCat(i, (x) => ({ ...x, items: move(x.items, j, -1) }))} aria-label="Move dish up">Up</button>
              <button type="button" className="ad-link" onClick={() => setCat(i, (x) => ({ ...x, items: move(x.items, j, 1) }))} aria-label="Move dish down">Down</button>
              <button type="button" className="ad-link ad-danger" onClick={() => setCat(i, (x) => ({ ...x, items: x.items.filter((_, k) => k !== j) }))}>Delete</button>
            </div>
          ))}
          <button type="button" className="ad-link" onClick={() => setCat(i, (x) => ({ ...x, items: [...x.items, { name: "" }] }))}>+ Add a dish</button>
        </section>
      ))}
      <button type="button" className="ad-link" onClick={() => setCats((cs) => [...cs, { name: "", items: [{ name: "" }] }])}>+ Add a section</button>

      <div className="ad-savebar">
        <button type="button" className="ad-btn" disabled={!dirty || busy} onClick={() => void save()}>Save</button>
        <span className={msg?.ok === false ? "ad-error" : "ad-muted"} role="status">{msg ? msg.text : dirty ? "You have changes that are not saved." : "All changes saved."}</span>
      </div>
    </div>
  );
}
