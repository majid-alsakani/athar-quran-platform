import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { createTask } from "./atharDb";

describe("إسناد المهمة والإشعارات", () => {
  beforeEach(() => getDbMock.mockReset());

  it("ينشئ مهمة للطالب ويشعره ويشعر ولي أمره", async () => {
    const valuesCalls: Array<Record<string, unknown> | Array<Record<string, unknown>>> = [];
    let insertCount = 0;
    const database = {
      select: vi.fn(() => {
        const result = [{ guardianId: 8 }];
        const chain = { from: () => chain, where: () => Promise.resolve(result) };
        return chain;
      }),
      insert: vi.fn(() => ({
        values: vi.fn((values: Record<string, unknown> | Array<Record<string, unknown>>) => {
          valuesCalls.push(values);
          insertCount += 1;
          return Promise.resolve(insertCount === 1 ? [{ insertId: 21 }] : []);
        }),
      })),
    };
    getDbMock.mockResolvedValue(database);

    await createTask(
      { id: 1, openId: "admin", name: "مدير", email: null, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      { circleId: 3, studentId: 4, title: "مراجعة سورة الملك", taskType: "revision", pointsAvailable: 10 },
    );

    expect(valuesCalls).toContainEqual(expect.objectContaining({ circleId: 3, studentId: 4, title: "مراجعة سورة الملك", createdById: 1 }));
    expect(valuesCalls).toContainEqual(expect.objectContaining({ recipientId: 4, type: "task", href: "/tasks" }));
    expect(valuesCalls).toContainEqual([expect.objectContaining({ recipientId: 8, type: "task", href: "/tasks" })]);
  });
});
