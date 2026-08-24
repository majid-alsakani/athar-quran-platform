import { describe, expect, it } from "vitest";
import { dispatchExternalWeeklyReport } from "./externalDelivery";

describe("external weekly delivery adapter", () => {
  it("does not dispatch until a provider is explicitly configured", async () => {
    await expect(dispatchExternalWeeklyReport({ channel: "email", recipient: "guardian@example.com", attachmentStorageKey: "reports/1/2/test.pdf", weeklyReportId: 1 })).resolves.toMatchObject({ state: "not_configured" });
  });
});
