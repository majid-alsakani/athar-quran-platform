import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { assertCircleManager, canManageCircle, getAccessibleStudentIds } from "./atharDb";

const baseUser = { openId: "access-test", name: "اختبار", email: null, loginMethod: "test", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

function databaseReturning(rows: Array<{ id: number }>) {
  return {
    select: vi.fn(() => {
      const chain = { from: () => chain, innerJoin: () => chain, where: () => chain, limit: async () => rows, then: (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve) };
      return chain;
    }),
    selectDistinct: vi.fn(() => {
      const chain = { from: () => chain, innerJoin: () => chain, where: () => Promise.resolve(rows) };
      return chain;
    }),
  };
}

describe("عزل بيانات الأدوار وملكية الحلقات", () => {
  beforeEach(() => getDbMock.mockReset());

  it("يعيد ولي الأمر أبناءه فقط ولا يعيد طلاباً خارج العلاقة", async () => {
    getDbMock.mockResolvedValue(databaseReturning([{ id: 4 }, { id: 7 }]));
    await expect(getAccessibleStudentIds({ ...baseUser, id: 2, role: "guardian" })).resolves.toEqual([4, 7]);
  });

  it("يعيد المعلم طلاب الحلقات التي يملكها فقط", async () => {
    getDbMock.mockResolvedValue(databaseReturning([{ id: 4 }]));
    await expect(getAccessibleStudentIds({ ...baseUser, id: 3, role: "teacher" })).resolves.toEqual([4]);
  });

  it("يجيز للمعلم إدارة حلقة مطابقة لملكيته ويرفض غير المالك", async () => {
    getDbMock.mockResolvedValue(databaseReturning([{ id: 9 }]));
    await expect(canManageCircle({ ...baseUser, id: 3, role: "teacher" }, 9)).resolves.toBe(true);
    getDbMock.mockResolvedValue(databaseReturning([]));
    await expect(assertCircleManager({ ...baseUser, id: 3, role: "teacher" }, 10)).rejects.toThrow("لا تملك صلاحية إدارة هذه الحلقة");
  });
});
