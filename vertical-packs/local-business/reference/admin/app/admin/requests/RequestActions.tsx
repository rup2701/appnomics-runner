"use client";
import { useState } from "react";

export function RequestActions({ id, status }: { id: string; status: string }) {
  const [s, setS] = useState(status);
  const [busy, setBusy] = useState(false);
  async function set(next: string) {
    setBusy(true);
    const r = await fetch(`/api/admin/requests/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) }).catch(() => null);
    if (r?.ok) setS(next);
    setBusy(false);
  }
  return (
    <span className="ad-row">
      <span className={`ad-badge ad-${s}`}>{s === "new" ? "New" : s === "confirmed" ? "Confirmed" : "Declined"}</span>
      {s !== "confirmed" ? <button type="button" className="ad-link" disabled={busy} onClick={() => void set("confirmed")}>Mark confirmed</button> : null}
      {s !== "declined" ? <button type="button" className="ad-link" disabled={busy} onClick={() => void set("declined")}>Mark declined</button> : null}
      {s !== "new" ? <button type="button" className="ad-link" disabled={busy} onClick={() => void set("new")}>Back to new</button> : null}
    </span>
  );
}
