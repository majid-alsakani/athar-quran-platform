import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { recordAttendance } from "./atharDb";

describe("تسجيل الحضور والإشعار الداخلي", () => {
  beforeEach(() => getDbMock.mockReset());

  it("ينشئ سجل الحضور وإشعاراً لولي الأمر المرتبط", async () => {
    const selectionResults = [[{ circleId: 3 }], [{ name: "محمد" }], [{ guardianId: 8 }]];
    const valuesCalls: Array<Record<string, unknown> | Array<Record<string, unknown>>> = [];
    const database = {
      select: vi.fn(() => {
        const result = selectionResults.shift() || [];
        const chain = {
          from: () => chain,
          where: () => chain,
          limit: async () => result,
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
        };
        return chain;
      }),
      insert: vi.fn(() => ({
        values: vi.fn((values: Record<string, unknown> | Array<Record<string, unknown>>) => {
          valuesCalls.push(values);
          return {
            onDuplicateKeyUpdate: vi.fn().mockResolvedValue([]),
            then: (resolve: (value: unknown) => unknown) => Promise.resolve([]).then(resolve),
          };
        }),
      })),
    };
    getDbMock.mockResolvedValue(database);

    await recordAttendance(
      { id: 1, openId: "admin", name: "مدير", email: null, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      { sessionId: 11, studentId: 4, status: "absent" },
    );

    expect(valuesCalls).toContainEqual(expect.objectContaining({ sessionId: 11, studentId: 4, status: "absent", recordedById: 1 }));
    expect(valuesCalls).toContainEqual([expect.objectContaining({ recipientId: 8, type: "attendance", href: "/notifications" })]);
  });
});
