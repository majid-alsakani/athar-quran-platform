import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({
  getDb: getDbMock,
}));

import { sendMessage } from "./atharDb";

describe("إرسال الرسائل الداخلية", () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it("يحفظ الرسالة وينشئ إشعاراً للمستلم عند وجود صلاحية الإرسال", async () => {
    const valuesCalls: Array<Record<string, unknown>> = [];
    const database = {
      insert: vi.fn(() => ({
        values: vi.fn(async (values: Record<string, unknown>) => {
          valuesCalls.push(values);
          return [];
        }),
      })),
    };
    getDbMock.mockResolvedValue(database);

    await sendMessage(
      {
        id: 1,
        openId: "admin-user",
        name: "مدير المنصة",
        email: "admin@example.com",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      2,
      "يرجى مراجعة خطة الحفظ لهذا الأسبوع.",
    );

    expect(database.insert).toHaveBeenCalledTimes(2);
    expect(valuesCalls).toContainEqual({ senderId: 1, recipientId: 2, body: "يرجى مراجعة خطة الحفظ لهذا الأسبوع." });
    expect(valuesCalls).toContainEqual(expect.objectContaining({ recipientId: 2, type: "message", href: "/messages" }));
  });
});
