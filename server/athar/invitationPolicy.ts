export type InvitationStatus = "draft" | "queued" | "sent" | "failed" | "accepted" | "cancelled" | "expired";

export function normalizeInvitationRecipient(channel: "email" | "whatsapp", value: string) {
  if (channel === "email") return value.trim().toLowerCase();
  return value.replace(/[\s().-]/g, "");
}

export function isInvitationActive(status: InvitationStatus) {
  return status === "draft" || status === "queued" || status === "sent";
}

export function isInvitationExpired(expiresAt: Date, now = new Date()) {
  return expiresAt <= now;
}
