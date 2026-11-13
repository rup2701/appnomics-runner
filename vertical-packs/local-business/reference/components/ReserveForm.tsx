"use client";
import { useEffect, useState } from "react";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const GUESTS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * The table request form. It asks for a day, a time and a party size first; then, in a second step, a name and a way to reach the guest.
 * It sends a REQUEST: nothing here knows what is free, so the words are "Request a table" and "We will confirm", never "Find tables" or "Booked".
 * Used twice on the home page: in the hero (variant "hero", a white pill on the picture) and in the slim bar once the hero has scrolled away (variant "bar").
 * The only client code besides PageBehaviour. It posts JSON to the endpoint the builder gave the site, and has no other network call.
 */
export function ReserveForm({ endpoint, phone, variant }: { endpoint: string; phone?: string; variant: "hero" | "bar" }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [today, setToday] = useState<string | undefined>(undefined);
  const [v, setV] = useState({ day: "", time: "", party: "2", name: "", phone: "", email: "", note: "", website: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // The guest's own date, set after the page loads so the server and the browser agree on the first draw.
  useEffect(() => {
    const d = new Date();
    setToday(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }, []);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const id = (n: string) => `rb-${variant}-${n}`;

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!v.day || !v.time) { setStatus({ kind: "error", message: "Please choose a day and a time." }); return; }
    setStatus({ kind: "idle" });
    setStep(2);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: v.name, phone: v.phone, email: v.email, day: v.day, time: v.time, party: Number(v.party), note: v.note, website: v.website }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) setStatus({ kind: "sent" });
      else setStatus({ kind: "error", message: body.error || "We could not send that. Please try again, or call us." });
    } catch {
      setStatus({ kind: "error", message: "We could not send that. Please check your connection and try again, or call us." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className={`rb-reserve ${variant}`} role="status">
        <p className="rb-reserve-done"><strong>Thank you, we have your request.</strong> The restaurant will confirm by phone or email. It is not a booking until they do.</p>
      </div>
    );
  }
  const busy = status.kind === "sending";
  // In the hero the three labels are shown above their values; in the slim bar they are for screen readers only.
  const lab = variant === "hero" ? "rb-lab" : "rb-sr";
  return (
    <div className={`rb-reserve ${variant}`}>
      <form className="rb-reserve-row" onSubmit={next} aria-label="Request a table">
        <div className="rb-field">
          <label htmlFor={id("day")} className={lab}>Day</label>
          <input id={id("day")} type="date" min={today} value={v.day} onChange={set("day")} required />
        </div>
        <div className="rb-field">
          <label htmlFor={id("time")} className={lab}>Time</label>
          <input id={id("time")} type="time" value={v.time} onChange={set("time")} required />
        </div>
        <div className="rb-field">
          <label htmlFor={id("party")} className={lab}>Guests</label>
          <select id={id("party")} value={v.party} onChange={set("party")}>
            {GUESTS.map((n) => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}
          </select>
        </div>
        <button type="submit" className="rb-btn" disabled={step === 2}>Request a table</button>
      </form>
      {step === 2 ? (
        <form className="rb-reserve-more" onSubmit={send} aria-label="Your details">
          <p className="rb-reserve-sum">{v.party} {Number(v.party) === 1 ? "guest" : "guests"} on {v.day} at {v.time}. Where can the restaurant reach you to confirm?</p>
          <label htmlFor={id("name")} className="rb-sr">Your name</label>
          <input id={id("name")} type="text" placeholder="Your name" autoComplete="name" maxLength={80} value={v.name} onChange={set("name")} required />
          <label htmlFor={id("phone")} className="rb-sr">Phone</label>
          <input id={id("phone")} type="tel" placeholder="Phone" autoComplete="tel" maxLength={30} value={v.phone} onChange={set("phone")} />
          <label htmlFor={id("email")} className="rb-sr">Email</label>
          <input id={id("email")} type="email" placeholder="Or email" autoComplete="email" maxLength={120} value={v.email} onChange={set("email")} />
          <label htmlFor={id("note")} className="rb-sr">Anything we should know</label>
          <input id={id("note")} type="text" placeholder="Anything we should know?" maxLength={300} value={v.note} onChange={set("note")} />
          {/* A box people never see. Bots fill it, and then the request is dropped. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="rb-hp" value={v.website} onChange={set("website")} />
          <div className="rb-reserve-act">
            <button type="button" className="rb-btn ghost" onClick={() => { setStep(1); setStatus({ kind: "idle" }); }} disabled={busy}>Back</button>
            <button type="submit" className="rb-btn" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
          </div>
        </form>
      ) : null}
      <p className="rb-reserve-msg" role="status" aria-live="polite">
        {status.kind === "error" ? status.message : ""}
        {status.kind === "error" && phone ? <> <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Call {phone}</a></> : null}
      </p>
    </div>
  );
}
