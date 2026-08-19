import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { createCircle, createSession, enrollStudent, updateCircle } from "./atharDb";

const admin = { id: 1, openId: "admin", name: "مدير", email: null, loginMethod: "test", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("تدفقات إدارة الحلقات", () => {
  beforeEach(() => getDbMock.mockReset());

  it("ينشئ حلقة بعد تحقق المعلم", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 12 }]);
    const database = { select: vi.fn(() => { const chain = { from: () => chain, where: () => chain, limit: async () => [{ id: 5 }] }; return chain; }), insert: vi.fn(() => ({ values })) };
    getDbMock.mockResolvedValue(database);
    await expect(createCircle({ name: "حلقة الفجر", mosqueName: "جامع الهدى", level: "beginner", capacity: 20, meetingSummary: "الأحد ٥ مساءً", teacherId: 5 })).resolves.toEqual({ id: 12 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 5, name: "حلقة الفجر" }));
  });

  it("يعيد تعيين معلم الحلقة عبر المدير فقط", async () => {
    const where = vi.fn().mockResolvedValue([]);
    const database = { select: vi.fn(() => { const chain = { from: () => chain, where: () => chain, limit: async () => [{ id: 6 }] }; return chain; }), update: vi.fn(() => ({ set: vi.fn(() => ({ where })) })) };
    getDbMock.mockResolvedValue(database);
    await updateCircle(admin, { circleId: 12, teacherId: 6, status: "active" });
    expect(database.update).toHaveBeenCalledTimes(1);
  });

  it("يسجل الطالب ويجدول جلسة للحلقة", async () => {
    const insertCalls: unknown[] = [];
    const database = {
      select: vi.fn(() => { const chain = { from: () => chain, where: () => chain, limit: async () => [{ id: 4, teacherId: 5 }] }; return chain; }),
      insert: vi.fn(() => ({ values: vi.fn((value: unknown) => { insertCalls.push(value); return { onDuplicateKeyUpdate: vi.fn().mockResolvedValue([]), then: (resolve: (value: unknown) => unknown) => Promise.resolve([{ insertId: 40 }]).then(resolve) }; }) })),
    };
    getDbMock.mockResolvedValue(database);
    await enrollStudent(12, 4);
    await createSession(admin, { circleId: 12, title: "جلسة تسميع", startsAt: new Date("2026-09-01T17:00:00Z") });
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0]).toEqual(expect.objectContaining({ circleId: 12, studentId: 4 }));
    expect(insertCalls[1]).toEqual(expect.objectContaining({ circleId: 12, teacherId: 5, title: "جلسة تسميع" }));
  });
});
