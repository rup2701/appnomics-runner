import { requireAdmin } from "../../../lib/admin-session";
import { getDb } from "../../../lib/db";
import { RequestActions } from "./RequestActions";

export const dynamic = "force-dynamic";

export default async function Requests() {
  await requireAdmin();
  const rows = await getDb().q("select id, guest_name, phone, email, day, time, party_size, note, status, emailed, created_at from table_requests order by created_at desc limit 200");
  return (
    <>
      <h1>Table requests</h1>
      <p className="ad-muted">These are requests, not bookings. Contact the guest by phone or email to confirm, then mark it here.</p>
      {rows.length === 0 ? <p className="ad-muted">No requests yet. They appear here when a guest sends one from your website.</p> : null}
      {rows.map((r) => (
        <article className="ad-card" key={String(r.id)}>
          <div className="ad-row">
            <strong className="ad-grow">{String(r.guest_name)}: {Number(r.party_size)} on {String(r.day)} at {String(r.time)}</strong>
            <RequestActions id={String(r.id)} status={String(r.status)} />
          </div>
          <p className="ad-muted">{[r.phone ? `Phone ${r.phone}` : "", r.email ? `Email ${r.email}` : ""].filter(Boolean).join(" · ")}{r.note ? ` · "${String(r.note)}"` : ""}</p>
          <p className="ad-muted">Received {new Date(String(r.created_at)).toUTCString()}{r.emailed ? "" : " · the email to you did not go out"}</p>
        </article>
      ))}
    </>
  );
}
