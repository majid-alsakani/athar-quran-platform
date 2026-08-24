import { describe, expect, it } from "vitest";
import { buildWeeklySummary, startOfIsoWeek } from "./reporting";

describe("weekly reporting helpers", () => {
  it("normalizes any date to Monday at 00:00 UTC", () => {
    const start = startOfIsoWeek(new Date("2026-08-30T17:30:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("builds a concise Arabic weekly summary", () => {
    expect(buildWeeklySummary(3, 4, 2)).toBe("ملخص الأسبوع: 3 حضور من 4 جلسات، و2 سجل متابعة للحفظ والمراجعة.");
  });
});
