import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { recordProgress } from "./atharDb";

describe("تسجيل المتابعة والنقاط", () => {
  beforeEach(() => getDbMock.mockReset());

  it("يحتسب النقاط وينشئ إشعارات للطالب وولي الأمر", async () => {
    const selectionResults = [[{ teacherId: 7 }], [{ guardianId: 8 }], [{ name: "محمد" }], [{ guardianId: 8 }]];
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
          return { then: (resolve: (value: unknown) => unknown) => Promise.resolve([]).then(resolve) };
        }),
      })),
    };
    getDbMock.mockResolvedValue(database);

    await recordProgress(
      { id: 1, openId: "admin", name: "مدير", email: null, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      { circleId: 3, studentId: 4, memorizationTo: "الآية ١٢", revisionTo: "سورة الملك", tajweedGrade: "excellent" },
    );

    expect(valuesCalls).toContainEqual(expect.objectContaining({ studentId: 4, sourceType: "memorization", points: 33, createdById: 1 }));
    expect(valuesCalls).toContainEqual(expect.objectContaining({ recipientId: 4, type: "points", href: "/progress" }));
    expect(valuesCalls).toContainEqual([expect.objectContaining({ recipientId: 8, type: "points", href: "/progress" })]);
    expect(valuesCalls).toContainEqual([expect.objectContaining({ recipientId: 8, type: "progress", href: "/progress" })]);
  });
});
