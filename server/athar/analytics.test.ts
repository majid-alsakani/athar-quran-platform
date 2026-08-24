import { describe, expect, it } from "vitest";
import { buildStudentTrend } from "./analytics";

describe("student progress trend", () => {
  it("groups real-style attendance and progress entries by ISO week", () => {
    const trend = buildStudentTrend({
      weeks: 2,
      now: new Date("2026-08-30T12:00:00.000Z"),
      attendance: [
        { recordedAt: new Date("2026-08-25T09:00:00.000Z"), status: "present" },
        { recordedAt: new Date("2026-08-27T09:00:00.000Z"), status: "absent" },
      ],
      progress: [{ recordedAt: new Date("2026-08-27T09:00:00.000Z"), pointsAwarded: 12 }],
    });
    expect(trend).toHaveLength(2);
    expect(trend[1]).toMatchObject({ key: "2026-08-24", present: 1, attendanceTotal: 2, progressCount: 1, points: 12 });
  });
});
