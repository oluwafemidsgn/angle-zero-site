// Receives the contact-page brief and posts it to Slack.
// The Slack incoming-webhook URL lives only in the SLACK_WEBHOOK_URL
// environment variable on Vercel, never in the site's code.

const FIELDS = {
  name: 120, company: 160, email: 200, phone: 60, event: 200, date: 80,
  type: 60, attendance: 60, needs: 400, message: 4000,
};

const EMAIL = /^[^\s@<>|]+@[^\s@<>|]+\.[^\s@<>|]+$/;

// Slack treats &, < and > as control characters in message text
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};

  // Honeypot: real visitors never see or fill this field
  if (body.website) return res.status(200).json({ ok: true });

  const data = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    const value = Array.isArray(body[key]) ? body[key].join(", ") : body[key];
    data[key] = String(value ?? "").trim().slice(0, max);
  }

  if (!data.name || !EMAIL.test(data.email)) {
    return res.status(400).json({ ok: false, error: "Name and a valid email are required." });
  }

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return res.status(503).json({ ok: false, error: "Not configured." });

  const line = (label, value) => (value ? `*${label}:* ${esc(value)}` : null);
  const details = [
    line("Company", data.company),
    `*Email:* <mailto:${data.email}|${esc(data.email)}>`,
    line("Phone", data.phone),
    line("Event", data.event),
    line("Date", data.date),
    line("Event type", data.type),
    line("Expected attendance", data.attendance),
    line("Needs", data.needs),
  ].filter(Boolean).join("\n");

  const title = `New brief from ${data.name}${data.company ? `, ${data.company}` : ""}`;
  const blocks = [
    { type: "header", text: { type: "plain_text", text: title.slice(0, 150) } },
    { type: "section", text: { type: "mrkdwn", text: details } },
  ];
  if (data.message) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Message:*\n${esc(data.message).slice(0, 2900)}` } });
  }
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: "Sent from the Angle Zero contact page" }] });

  try {
    const slack = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: title, blocks }),
    });
    if (!slack.ok) throw new Error(`Slack responded ${slack.status}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ ok: false, error: "Could not deliver the brief." });
  }
};

function safeParse(text) {
  try { return JSON.parse(text); } catch { return {}; }
}
