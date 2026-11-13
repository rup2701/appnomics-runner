/** Sends one email through Resend. RESEND_API_KEY and EMAIL_FROM are set on the site's project. Without them nothing is sent and false comes back. */
export async function sendEmail(to: string, msg: { subject: string; text: string; html: string }, env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const key = env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM || "Appnomics <onboarding@resend.dev>", to: [to], ...msg }),
    });
    if (!r.ok) console.error("table request email not sent:", r.status);
    return r.ok;
  } catch (e) {
    console.error("table request email not sent:", e instanceof Error ? e.message : e);
    return false;
  }
}
