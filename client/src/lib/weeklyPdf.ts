export type WeeklyPdfRecord = {
  recordedAt: Date | string;
  memorizationFrom: string | null;
  memorizationTo: string | null;
  revisionFrom: string | null;
  revisionTo: string | null;
  tajweedGrade: "excellent" | "very_good" | "good" | "needs_support" | null;
  notes: string | null;
  pointsAwarded: number;
};

type WeeklyPdfInput = {
  studentName: string;
  weekStart: Date | string;
  present: number;
  attendanceTotal: number;
  records: WeeklyPdfRecord[];
};

const tajweedLabel: Record<NonNullable<WeeklyPdfRecord["tajweedGrade"]>, string> = {
  excellent: "ممتاز",
  very_good: "جيد جداً",
  good: "جيد",
  needs_support: "يحتاج دعماً",
};

function createText(tag: keyof HTMLElementTagNameMap, value: string, className?: string) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

export async function exportWeeklyReportPdf(input: WeeklyPdfInput) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const root = document.createElement("section");
  root.dir = "rtl";
  root.lang = "ar";
  root.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;background:#fffdf7;color:#183a30;padding:46px;box-sizing:border-box;font-family:Tahoma,Arial,sans-serif;line-height:1.75;z-index:-1;";

  const header = document.createElement("header");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2d705c;padding-bottom:20px;margin-bottom:26px;";
  const titleBlock = document.createElement("div");
  titleBlock.append(createText("p", "أثر للحلقات", "brand"), createText("h1", "التقرير الأسبوعي للطالب", "title"));
  const date = new Date(input.weekStart).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const stamp = createText("p", `بداية الأسبوع: ${date}`, "stamp");
  header.append(titleBlock, stamp);
  root.append(header);

  const identity = createText("div", `الطالب: ${input.studentName}`, "identity");
  identity.style.cssText = "background:#edf6ef;border-radius:14px;padding:14px 18px;font-weight:700;font-size:18px;margin-bottom:20px;";
  root.append(identity);

  const summary = document.createElement("div");
  summary.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;";
  [["الحضور", `${input.present}/${input.attendanceTotal}`], ["سجلات المتابعة", String(input.records.length)]].forEach(([label, value]) => {
    const box = document.createElement("div");
    box.style.cssText = "border:1px solid #d7e6db;border-radius:14px;padding:15px;background:#ffffff;";
    const labelNode = createText("p", label);
    labelNode.style.cssText = "margin:0;color:#62766d;font-size:14px;";
    const valueNode = createText("strong", value);
    valueNode.style.cssText = "display:block;margin-top:5px;font-size:25px;color:#1e5d4b;";
    box.append(labelNode, valueNode);
    summary.append(box);
  });
  root.append(summary);

  root.append(createText("h2", "سجل الحفظ والمراجعة", "section-title"));
  if (!input.records.length) {
    const empty = createText("p", "لا توجد سجلات متابعة لهذا الأسبوع بعد.");
    empty.style.cssText = "color:#68786f;background:#fafcfb;border-radius:12px;padding:16px;";
    root.append(empty);
  } else {
    input.records.forEach(record => {
      const card = document.createElement("article");
      card.style.cssText = "border:1px solid #e2ebe4;border-radius:14px;padding:16px;margin:10px 0;background:#fff;";
      const recordedAt = new Date(record.recordedAt).toLocaleDateString("ar-SA");
      const memorization = record.memorizationFrom || record.memorizationTo ? `الحفظ: ${record.memorizationFrom ?? ""}${record.memorizationTo ? ` — ${record.memorizationTo}` : ""}` : "متابعة تعلم";
      const revision = record.revisionFrom || record.revisionTo ? `المراجعة: ${record.revisionFrom ?? ""}${record.revisionTo ? ` — ${record.revisionTo}` : ""}` : "لا توجد مراجعة مسجلة";
      const title = createText("strong", memorization);
      const meta = createText("p", `${revision} · التجويد: ${record.tajweedGrade ? tajweedLabel[record.tajweedGrade] : "غير مسجل"} · ${recordedAt}`);
      meta.style.cssText = "margin:7px 0 0;color:#62766d;font-size:14px;";
      card.append(title, meta);
      if (record.notes) {
        const notes = createText("p", `ملاحظة المعلم: ${record.notes}`);
        notes.style.cssText = "margin:8px 0 0;background:#faf7ee;border-radius:9px;padding:8px 10px;font-size:14px;";
        card.append(notes);
      }
      root.append(card);
    });
  }

  const footer = createText("p", "تم إنشاء هذا التقرير من منصة أثر للحلقات.");
  footer.style.cssText = "margin-top:30px;padding-top:14px;border-top:1px solid #dce7df;color:#73827a;font-size:12px;";
  root.append(footer);
  document.body.append(root);

  try {
    const canvas = await html2canvas(root, { scale: 2, backgroundColor: "#fffdf7", useCORS: true });
    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    let remaining = imageHeight;
    let y = margin;

    pdf.addImage(image, "PNG", margin, y, imageWidth, imageHeight, undefined, "FAST");
    remaining -= pageHeight - margin * 2;
    while (remaining > 0) {
      pdf.addPage();
      y = margin - (imageHeight - remaining - (pageHeight - margin * 2));
      pdf.addImage(image, "PNG", margin, y, imageWidth, imageHeight, undefined, "FAST");
      remaining -= pageHeight - margin * 2;
    }
    pdf.save(`athar-weekly-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    root.remove();
  }
}
