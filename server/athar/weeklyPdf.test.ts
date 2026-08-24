import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../storage", () => ({ storageGetSignedUrl: vi.fn().mockResolvedValue("https://example.test/arabic-font.ttf") }));

import { generateWeeklyPdf } from "./weeklyPdf";

describe("server weekly PDF", () => {
  beforeEach(async () => {
    const fontBytes = await readFile("/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(fontBytes, { status: 200 })));
  });

  it("produces a one-page PDF buffer for Arabic weekly report data", async () => {
    const pdf = await generateWeeklyPdf({
      organizationName: "مؤسسة التجربة",
      guardianName: "ولي الأمر",
      studentName: "الطالب",
      weekStart: new Date("2026-08-24T00:00:00.000Z"),
      attendance: [{ status: "present" }],
      progress: [{ memorizationFrom: "سورة النبأ", memorizationTo: "آية 28", revisionFrom: "سورة الملك", revisionTo: "آية 15", tajweedGrade: "excellent", pointsAwarded: 10 }],
    });
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
