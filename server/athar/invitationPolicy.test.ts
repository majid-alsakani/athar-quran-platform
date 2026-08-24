import { describe, expect, it } from "vitest";
import { isInvitationActive, isInvitationExpired, normalizeInvitationRecipient } from "./invitationPolicy";

describe("guardian invitation policy", () => {
  it("normalizes email and international WhatsApp recipients deterministically", () => {
    expect(normalizeInvitationRecipient("email", " Guardian@Example.COM ")).toBe("guardian@example.com");
    expect(normalizeInvitationRecipient("whatsapp", "+966 (50) 123-4567")).toBe("+966501234567");
  });

  it("keeps only deliverable invitation states active and expires at the boundary", () => {
    expect(isInvitationActive("sent")).toBe(true);
    expect(isInvitationActive("failed")).toBe(false);
    expect(isInvitationExpired(new Date("2026-08-24T00:00:00.000Z"), new Date("2026-08-24T00:00:00.000Z"))).toBe(true);
  });
});
