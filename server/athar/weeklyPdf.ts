import fontkit from "@pdf-lib/fontkit";
import ArabicReshaper from "arabic-reshaper";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { storageGetSignedUrl } from "../storage";

const arabicFontStorageUrl = "/manus-storage/athar-noto-naskh-arabic-regular_c2c91fd9.ttf";
let fontBytesPromise: Promise<Uint8Array> | null = null;

function getArabicFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = (async () => {
      const fontKey = arabicFontStorageUrl.replace("/manus-storage/", "");
      const response = await fetch(await storageGetSignedUrl(fontKey));
      if (!response.ok) throw new Error(`تعذر تحميل الخط العربي لتقرير PDF (${response.status}).`);
      return new Uint8Array(await response.arrayBuffer());
    })();
  }
  return fontBytesPromise;
}

type WeeklyPdfInput = {
  organizationName: string;
  guardianName: string;
  studentName: string;
  weekStart: Date;
  attendance: Array<{ status: "present" | "absent" | "late" | "excused" }>;
  progress: Array<{
    memorizationFrom: string | null;
    memorizationTo: string | null;
    revisionFrom: string | null;
    revisionTo: string | null;
    tajweedGrade: "excellent" | "very_good" | "good" | "needs_support" | null;
    pointsAwarded: number;
  }>;
};

function rtl(text: string) {
  const values: string[] = [];
  const protectedText = text.replace(/[0-9٠-٩]+/g, value => `§${values.push(value) - 1}§`);
  return Array.from(ArabicReshaper.convertArabic(protectedText)).reverse().join("").replace(/§(\d+)§/g, (_, index) => values[Number(index)] ?? "");
}

function drawRight(page: PDFPage, font: PDFFont, text: string, right: number, y: number, size: number, color = rgb(0.09, 0.23, 0.19)) {
  const visual = rtl(text);
  page.drawText(visual, { x: right - font.widthOfTextAtSize(visual, size), y, size, font, color });
}

function tajweedLabel(grade: WeeklyPdfInput["progress"][number]["tajweedGrade"]) {
  return grade === "excellent" ? "ممتاز" : grade === "very_good" ? "جيد جداً" : grade === "good" ? "جيد" : grade === "needs_support" ? "يحتاج دعماً" : "غير مسجل";
}

export async function generateWeeklyPdf(input: WeeklyPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await getArabicFontBytes(), { subset: true });
  const page = pdf.addPage([595.28, 841.89]);
  const right = 545;
  const present = input.attendance.filter(item => item.status === "present").length;
  const points = input.progress.reduce((total, item) => total + item.pointsAwarded, 0);
  const week = new Intl.DateTimeFormat("ar-SA", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(input.weekStart);

  page.drawRectangle({ x: 36, y: 742, width: 523, height: 64, color: rgb(0.09, 0.23, 0.19) });
  drawRight(page, font, "أثر للحلقات", right - 18, 780, 20, rgb(1, 1, 1));
  drawRight(page, font, "تقرير المتابعة الأسبوعي", right - 18, 754, 15, rgb(0.91, 0.84, 0.63));
  drawRight(page, font, input.organizationName, right, 710, 15);
  drawRight(page, font, `تاريخ بداية الأسبوع: ${week}`, right, 684, 12, rgb(0.3, 0.39, 0.35));
  drawRight(page, font, `الطالب: ${input.studentName}`, right, 642, 16);
  drawRight(page, font, `ولي الأمر: ${input.guardianName}`, right, 615, 13, rgb(0.3, 0.39, 0.35));

  page.drawRectangle({ x: 36, y: 515, width: 523, height: 72, color: rgb(0.96, 0.98, 0.96), borderColor: rgb(0.86, 0.91, 0.87), borderWidth: 1 });
  drawRight(page, font, "الحضور المسجل", 515, 558, 13);
  drawRight(page, font, `${present} من ${input.attendance.length}`, 515, 530, 20, rgb(0.14, 0.4, 0.33));
  drawRight(page, font, "سجلات المتابعة", 330, 558, 13);
  page.drawText(String(input.progress.length), { x: 295, y: 530, size: 20, font, color: rgb(0.14, 0.4, 0.33) });
  drawRight(page, font, "النقاط المكتسبة", 150, 558, 13);
  page.drawText(String(points), { x: 112, y: 530, size: 20, font, color: rgb(0.62, 0.44, 0.12) });

  drawRight(page, font, "آخر المتابعات", right, 470, 17);
  let y = 438;
  if (!input.progress.length) {
    drawRight(page, font, "لا توجد سجلات متابعة لهذا الأسبوع.", right, y, 13, rgb(0.3, 0.39, 0.35));
  }
  for (const item of input.progress.slice(0, 4)) {
    page.drawRectangle({ x: 36, y: y - 50, width: 523, height: 60, color: rgb(0.99, 0.99, 0.98), borderColor: rgb(0.9, 0.93, 0.91), borderWidth: 1 });
    drawRight(page, font, `الحفظ: ${item.memorizationFrom ?? "غير مسجل"} إلى ${item.memorizationTo ?? "غير مسجل"}`, right - 12, y - 8, 13);
    drawRight(page, font, `المراجعة: ${item.revisionFrom ?? "غير مسجل"} إلى ${item.revisionTo ?? "غير مسجل"}`, right - 12, y - 32, 11, rgb(0.3, 0.39, 0.35));
    drawRight(page, font, `التجويد: ${tajweedLabel(item.tajweedGrade)}`, 235, y - 32, 11, rgb(0.3, 0.39, 0.35));
    page.drawText(String(item.pointsAwarded), { x: 58, y: y - 32, size: 12, font, color: rgb(0.62, 0.44, 0.12) });
    y -= 76;
  }
  drawRight(page, font, "هذا التقرير خاص بولي الأمر الموثق ولا يُعاد توجيهه خارج نطاق الطالب.", right, 75, 10, rgb(0.38, 0.45, 0.41));
  return Buffer.from(await pdf.save());
}
