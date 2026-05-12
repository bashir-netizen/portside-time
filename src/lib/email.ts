import nodemailer, { type Transporter } from "nodemailer";
import { render } from "@react-email/render";
import { env } from "./env";
import { IpApprovalEmail } from "@/emails/IpApprovalEmail";

let transporter: Transporter | null = null;
function getTransport(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 = SMTPS, 587 = STARTTLS
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return transporter;
}

export type SendIpApprovalArgs = {
  to: string;
  ip: string;
  deviceLabel: string;
  observedAt: string;
  approvalUrl: string;
  expiresAtFormatted: string;
};

/**
 * Send the "new IP detected" email via SMTP.
 *
 * Configured by SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS. The simplest
 * production setup is a Gmail / Google Workspace account with an App
 * Password (https://myaccount.google.com/apppasswords) — set:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_USER=bashir@portside-logistics.com
 *   SMTP_PASS=<app password>
 *
 * If SMTP is not configured (local dev), logs to stderr instead of sending.
 * Never throws — caller treats this as best-effort delivery.
 */
export async function sendIpApprovalEmail(
  args: SendIpApprovalArgs,
): Promise<{ delivered: boolean; reason?: string }> {
  const t = getTransport();
  const html = await render(IpApprovalEmail(args));
  const text =
    `New IP detected at Portside Time: ${args.ip} (device: ${args.deviceLabel}, first seen ${args.observedAt}).\n\n` +
    `Approve or dismiss: ${args.approvalUrl}\n\n` +
    `Link expires at ${args.expiresAtFormatted}.`;

  if (!t) {
    console.warn(
      `[email] SMTP not configured; logging email instead of sending.\n` +
        `  to: ${args.to}\n  url: ${args.approvalUrl}`,
    );
    return { delivered: false, reason: "no_smtp" };
  }

  try {
    await t.sendMail({
      from: env.SMTP_FROM,
      to: args.to,
      subject: "New IP detected at the Portside time clock",
      html,
      text,
    });
    return { delivered: true };
  } catch (err) {
    console.error("[email] failed to send", err);
    return {
      delivered: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
