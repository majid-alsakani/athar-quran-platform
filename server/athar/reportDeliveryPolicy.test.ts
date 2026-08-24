import { describe, expect, it } from "vitest";
import { canRetryExternalDelivery, resolveExternalDeliveryTarget, weeklyPdfStorageKey } from "./reportDeliveryPolicy";

describe("weekly report delivery policy", () => {
  it("does not create an external target without accepted consent", () => {
    expect(resolveExternalDeliveryTarget({ status: "accepted", consentAt: null, channel: "email", recipientEmail: "guardian@example.com", recipientPhone: null })).toBeNull();
  });

  it("creates a stable per-student weekly PDF key only for an eligible target", () => {
    expect(resolveExternalDeliveryTarget({ status: "accepted", consentAt: new Date(), channel: "whatsapp", recipientEmail: null, recipientPhone: "+966501234567" })).toEqual({ channel: "whatsapp", recipient: "+966501234567" });
    expect(weeklyPdfStorageKey(7, 41, new Date("2026-08-24T00:00:00.000Z"))).toBe("reports/7/41/weekly-2026-08-24.pdf");
  });

  it("allows retries only for pending external deliveries", () => {
    expect(canRetryExternalDelivery("email", "queued")).toBe(true);
    expect(canRetryExternalDelivery("whatsapp", "failed")).toBe(true);
    expect(canRetryExternalDelivery("email", "sent")).toBe(false);
    expect(canRetryExternalDelivery("in_app", "queued")).toBe(false);
  });
});
