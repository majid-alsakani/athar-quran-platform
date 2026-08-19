import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { sendMessage } from "./atharDb";

describe("مراسلة الأطراف المرتبطة", () => {
  beforeEach(() => getDbMock.mockReset());

  it("يسمح برسالة معلّم إلى ولي أمر مرتبط بحلقته وينشئ الإشعار", async () => {
    const selections = [[{ id: 8, role: "guardian" }], [{ id: 1 }]];
    const valuesCalls: Array<Record<string, unknown>> = [];
    const database = {
      select: vi.fn(() => {
        const result = selections.shift() || [];
        const chain = { from: () => chain, innerJoin: () => chain, where: () => chain, limit: async () => result };
        return chain;
      }),
      insert: vi.fn(() => ({ values: vi.fn(async (value: Record<string, unknown>) => { valuesCalls.push(value); return []; }) })),
    };
    getDbMock.mockResolvedValue(database);

    await sendMessage(
      { id: 3, openId: "teacher", name: "معلم", email: null, loginMethod: "test", role: "teacher", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      8,
      "تم تحديث متابعة ابنكم.",
    );

    expect(valuesCalls).toContainEqual({ senderId: 3, recipientId: 8, body: "تم تحديث متابعة ابنكم." });
    expect(valuesCalls).toContainEqual(expect.objectContaining({ recipientId: 8, type: "message", href: "/messages" }));
  });
});
