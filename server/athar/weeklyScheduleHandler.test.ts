import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), authenticateRequest: vi.fn(), deliverWeeklyReport: vi.fn() }));

vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("../_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./weeklyDelivery", () => ({ deliverWeeklyReport: mocks.deliverWeeklyReport }));

import { handleWeeklyReportSchedule } from "./weeklyScheduleHandler";

function scheduleQuery(rows: unknown[]) {
  const chain: any = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = vi.fn().mockResolvedValue(rows);
  return chain;
}

function response() {
  const res: any = { status: vi.fn(() => res), json: vi.fn(() => res) };
  return res;
}

describe("weekly schedule handler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the authenticated task UID and exposes an idempotent delivery result", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-secure-1" });
    mocks.getDb.mockResolvedValue({ select: vi.fn(() => scheduleQuery([{ organizationId: 1, guardianId: 2, studentId: 3, isEnabled: true, scheduleCronTaskUid: "task-secure-1" }])) });
    mocks.deliverWeeklyReport.mockResolvedValue({ reportId: 12, weekStart: new Date("2026-08-24T00:00:00.000Z"), pdfStorageKey: "reports/1/3/weekly.pdf", externalDelivery: "not_eligible" });
    const res = response();

    await handleWeeklyReportSchedule({ body: { guardianId: 999 } } as any, res);

    expect(mocks.deliverWeeklyReport).toHaveBeenCalledWith({ organizationId: 1, guardianId: 2, studentId: 3, scheduleCronTaskUid: "task-secure-1" });
    expect(res.json).toHaveBeenCalledWith({ ok: true, externalDelivery: "not_eligible", reportId: 12, hasPdf: true, weekStart: "2026-08-24T00:00:00.000Z" });
  });

  it("returns a successful skip for an unknown task UID", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-orphan" });
    mocks.getDb.mockResolvedValue({ select: vi.fn(() => scheduleQuery([])) });
    const res = response();

    await handleWeeklyReportSchedule({} as any, res);

    expect(mocks.deliverWeeklyReport).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true, skipped: "orphan-or-disabled" });
  });
});
