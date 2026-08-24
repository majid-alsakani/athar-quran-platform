import type { InvitationStatus } from "./invitationPolicy";

type ConsentInvitation = {
  status: InvitationStatus;
  consentAt: Date | null;
  channel: "email" | "whatsapp";
  recipientEmail: string | null;
  recipientPhone: string | null;
};

export function resolveExternalDeliveryTarget(invitation: ConsentInvitation | undefined) {
  if (!invitation || invitation.status !== "accepted" || !invitation.consentAt) return null;
  const recipient = invitation.channel === "email" ? invitation.recipientEmail : invitation.recipientPhone;
  return recipient ? { channel: invitation.channel, recipient } : null;
}

export function weeklyPdfStorageKey(organizationId: number, studentId: number, weekStart: Date) {
  return `reports/${organizationId}/${studentId}/weekly-${weekStart.toISOString().slice(0, 10)}.pdf`;
}

export function canRetryExternalDelivery(channel: "email" | "whatsapp" | "in_app", status: "queued" | "sent" | "failed" | "skipped") {
  return channel !== "in_app" && (status === "queued" || status === "failed");
}
