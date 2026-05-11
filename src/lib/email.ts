import { Resend } from "resend";
import { render } from "@react-email/render";
import { env } from "./env";
import { IpApprovalEmail } from "@/emails/IpApprovalEmail";

let resendClient: Resend | null = null;
function client() {
  if (!env.RESEND_API_KEY) return null;
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
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
 * Send the "new IP detected" email.
 *
 * If RESEND_API_KEY is empty (local dev), logs to stderr instead of sending.
 * Never throws — caller treats this as best-effort delivery.
 */
export async function sendIpApprovalEmail(
  args: SendIpApprovalArgs,
): Promise<{ delivered: boolean; reason?: string }> {
  const c = client();
  const html = await render(IpApprovalEmail(args));
  const text =
    `New IP detected at Portside Time: ${args.ip} (device: ${args.deviceLabel}, first seen ${args.observedAt}).\n\n` +
    `Approve or dismiss: ${args.approvalUrl}\n\n` +
    `Link expires at ${args.expiresAtFormatted}.`;

  if (!c) {
    console.warn(
      `[email] RESEND_API_KEY not set; logging email instead of sending.\n` +
        `  to: ${args.to}\n  url: ${args.approvalUrl}`,
    );
    return { delivered: false, reason: "no_api_key" };
  }

  try {
    const result = await c.emails.send({
      from: env.RESEND_FROM,
      to: args.to,
      subject: "New IP detected at the Portside time clock",
      html,
      text,
    });
    if (result.error) {
      console.error("[email] resend rejected send", result.error);
      return { delivered: false, reason: result.error.message };
    }
    return { delivered: true };
  } catch (err) {
    console.error("[email] failed to send", err);
    return {
      delivered: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
