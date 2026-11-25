import { promises as dns } from "dns";
import nodemailer, { type Transporter } from "nodemailer";

// Transactional email over SMTP (Gmail, Outlook, your host's mail server…). Set:
//   SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS
//   EMAIL_FROM (optional, e.g. "Tavo <you@gmail.com>"; defaults to SMTP_USER)
// With no SMTP_HOST, development prints the email to the server log; production refuses.

export type Mail = { to: string; subject: string; text: string; html: string };

const g = globalThis as { __sfSmtp?: Transporter };

// One pooled connection per server process, reused across emails.
async function transport(): Promise<Transporter> {
  if (g.__sfSmtp) return g.__sfSmtp;
  const port = Number(process.env.SMTP_PORT || 587);
  const hostname = process.env.SMTP_HOST!;
  // Connect over IPv4: on networks without working IPv6, nodemailer can pick the IPv6 address
  // and hang until "Connection timeout". TLS still checks the certificate against the real hostname.
  const [ipv4] = await dns.resolve4(hostname).catch(() => [hostname]);
  g.__sfSmtp = nodemailer.createTransport({
    host: ipv4,
    tls: { servername: hostname },
    port,
    secure: port === 465, // 465 starts encrypted; 587 upgrades with STARTTLS
    requireTLS: port !== 465, // never send the password over an unencrypted connection
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  return g.__sfSmtp;
}

export async function sendMail(mail: Mail) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production") throw new Error("No email server configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)");
    console.log(`
[email:dev] To: ${mail.to}
[email:dev] Subject: ${mail.subject}
${mail.text}
`);
    return;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error("SMTP_USER and SMTP_PASS must be set");
  const from = process.env.EMAIL_FROM || `Tavo <${process.env.SMTP_USER}>`;
  let info;
  try {
    info = await (await transport()).sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
  } catch (e) {
    g.__sfSmtp = undefined; // rebuild next time (fresh DNS lookup, fresh connection)
    throw e;
  }
  // Masked recipient: proves who it went to without putting full addresses in logs.
  console.log(`[email] sent to ${mail.to.replace(/^(.{2})[^@]*(@.*)$/, "$1••••$2")} | accepted: ${(info.accepted?.length ?? 0) > 0}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Code email in the app's receipt style. Inline styles only; email clients ignore stylesheets. */
export function codeEmail(kind: "verify" | "reset", code: string, to: string): Mail {
  const lines =
    kind === "verify"
      ? { subject: `${code} is your Tavo code`, title: "Confirm your email", body: "Enter this code to finish setting up your owner desk.", ur: "اپنا ای میل تصدیق کرنے کے لیے یہ کوڈ درج کریں۔" }
      : { subject: `${code} is your password reset code`, title: "Reset your password", body: "Enter this code to choose a new password.", ur: "نیا پاس ورڈ بنانے کے لیے یہ کوڈ درج کریں۔" };
  const footer = "The code expires in 10 minutes. If you didn't ask for it, ignore this email; nothing changes.";
  return {
    to,
    subject: lines.subject,
    text: `${lines.title}\n\n${lines.body}\n\n    ${code}\n\n${footer}\n\nTavo · Real feedback. Smarter reviews.`,
    html: `<!doctype html><html><body style="margin:0;background:#f3ede2;padding:32px 16px;font-family:Georgia,serif;color:#1c1a16">
<table role="presentation" width="100%" style="max-width:440px;margin:0 auto;background:#fbf8f2;border:1px solid #d8cfbf;border-radius:16px">
<tr><td style="padding:28px">
<p style="margin:0;font:12px/1 monospace;letter-spacing:.18em;text-transform:uppercase;color:#6f675b">Tavo</p>
<hr style="border:0;border-top:1px dashed #d8cfbf;margin:16px 0">
<h1 style="margin:0 0 8px;font-size:26px;font-weight:normal">${esc(lines.title)}</h1>
<p style="margin:0;font:15px/1.5 Arial,sans-serif;color:#6f675b">${esc(lines.body)}</p>
<p style="margin:24px 0;padding:16px;text-align:center;background:#1c1a16;color:#f3ede2;border-radius:12px;font:600 32px/1 monospace;letter-spacing:.35em">${esc(code)}</p>
<p dir="rtl" style="margin:0 0 16px;font:15px/1.8 Arial,sans-serif;color:#6f675b">${esc(lines.ur)}</p>
<p style="margin:0;font:13px/1.5 Arial,sans-serif;color:#6f675b">${esc(footer)}</p>
</td></tr></table>
<p style="text-align:center;font:11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#6f675b">Real feedback. Smarter reviews.</p>
</body></html>`,
  };
}
