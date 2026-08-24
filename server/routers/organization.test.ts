import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("../db", () => ({ getDb: mocks.getDb }));

import { organizationRouter } from "./organization";

function context(user: Record<string, unknown>) {
  return { user, req: { headers: {} }, res: {} } as any;
}

function queryResult(rows: unknown[]) {
  const chain: any = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = vi.fn().mockResolvedValue(rows);
  return chain;
}

function writeChain() {
  const chain: any = {};
  chain.set = () => chain;
  chain.where = vi.fn().mockResolvedValue(undefined);
  chain.values = () => ({ onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined) });
  return chain;
}

describe("organization invitation routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not disclose data for an unknown invitation token", async () => {
    const db = { select: vi.fn(() => queryResult([])) };
    mocks.getDb.mockResolvedValue(db);
    const caller = organizationRouter.createCaller(context({ id: 9, organizationId: 1, role: "admin" }));

    await expect(caller.previewInvitation({ token: "x".repeat(36) })).resolves.toEqual({ valid: false, reason: "not_found" });
  });

  it("accepts a valid consented invitation only through an authenticated account", async () => {
    const invitation = { id: 4, organizationId: 1, guardianId: null, studentId: 33, recipientNormalized: "guardian@example.com", channel: "email", status: "sent", consentAt: null, expiresAt: new Date("2030-01-01T00:00:00.000Z") };
    const db = { select: vi.fn(() => queryResult([invitation])), update: vi.fn(() => writeChain()), insert: vi.fn(() => writeChain()) };
    mocks.getDb.mockResolvedValue(db);
    const caller = organizationRouter.createCaller(context({ id: 55, organizationId: null, role: "admin", email: "guardian@example.com" }));

    await expect(caller.acceptInvitation({ token: "x".repeat(36), consentToWeeklyReports: true })).resolves.toEqual({ accepted: true, alreadyAccepted: false });
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("refuses to seed demonstration data into a real organization", async () => {
    const db = { select: vi.fn(() => queryResult([{ id: 8, isDemo: false }])) };
    mocks.getDb.mockResolvedValue(db);
    const caller = organizationRouter.createCaller(context({ id: 9, organizationId: 8, role: "admin" }));

    await expect(caller.seedDemo()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
