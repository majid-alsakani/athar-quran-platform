import { and, eq, gte, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { attendanceRecords, guardianInvitations, notifications, progressRecords, reportDeliveries, users, weeklyReports } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { dispatchExternalWeeklyReport } from "./externalDelivery";
import { resolveExternalDeliveryTarget, weeklyPdfStorageKey } from "./reportDeliveryPolicy";
import { generateWeeklyPdf } from "./weeklyPdf";
import { buildWeeklySummary, startOfIsoWeek } from "./reporting";

export async function deliverWeeklyReport(input: {
  organizationId: number;
  guardianId: number;
  studentId: number;
  scheduleCronTaskUid?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });

  const weekStart = startOfIsoWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const existing = (await db.select().from(weeklyReports).where(and(eq(weeklyReports.guardianId, input.guardianId), eq(weeklyReports.studentId, input.studentId), eq(weeklyReports.weekStart, weekStart))).limit(1))[0];
  const attendance = await db.select().from(attendanceRecords).where(and(eq(attendanceRecords.studentId, input.studentId), gte(attendanceRecords.recordedAt, weekStart), lt(attendanceRecords.recordedAt, weekEnd)));
  const progress = await db.select().from(progressRecords).where(and(eq(progressRecords.studentId, input.studentId), gte(progressRecords.recordedAt, weekStart), lt(progressRecords.recordedAt, weekEnd)));
  const present = attendance.filter(item => item.status === "present").length;
  const summary = buildWeeklySummary(present, attendance.length, progress.length);

  const reportId = existing?.id ?? Number((await db.insert(weeklyReports).values({ organizationId: input.organizationId, guardianId: input.guardianId, studentId: input.studentId, weekStart, summary, scheduleCronTaskUid: input.scheduleCronTaskUid ?? null }))[0].insertId);
  if (existing) await db.update(weeklyReports).set({ summary, scheduleCronTaskUid: input.scheduleCronTaskUid ?? null }).where(eq(weeklyReports.id, reportId));

  let report = (await db.select().from(weeklyReports).where(eq(weeklyReports.id, reportId)).limit(1))[0]!;
  if (!report.pdfStorageKey) {
    const people = await db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.organizationId, input.organizationId)));
    const guardian = people.find(person => person.id === input.guardianId);
    const student = people.find(person => person.id === input.studentId);
    if (!guardian || !student) throw new TRPCError({ code: "FORBIDDEN", message: "بيانات الطالب أو ولي الأمر ليست ضمن المؤسسة." });
    const bytes = await generateWeeklyPdf({ organizationName: "أثر للحلقات", guardianName: guardian.name ?? "ولي الأمر", studentName: student.name ?? "الطالب", weekStart, attendance, progress });
    const uploaded = await storagePut(weeklyPdfStorageKey(input.organizationId, input.studentId, weekStart), bytes, "application/pdf");
    await db.update(weeklyReports).set({ pdfStorageKey: uploaded.key, generatedAt: new Date() }).where(eq(weeklyReports.id, reportId));
    report = { ...report, pdfStorageKey: uploaded.key, generatedAt: new Date() };
  }

  const internal = (await db.select({ id: reportDeliveries.id }).from(reportDeliveries).where(and(eq(reportDeliveries.weeklyReportId, reportId), eq(reportDeliveries.channel, "in_app"), eq(reportDeliveries.recipient, String(input.guardianId)))).limit(1))[0];
  if (!internal) {
    await db.insert(reportDeliveries).values({ weeklyReportId: reportId, organizationId: input.organizationId, guardianId: input.guardianId, studentId: input.studentId, channel: "in_app", recipient: String(input.guardianId), status: "sent", pdfStorageKey: report.pdfStorageKey, attemptCount: 1, sentAt: new Date() });
    await db.insert(notifications).values({ recipientId: input.guardianId, type: "report", title: "تقرير أسبوعي جديد", body: summary, href: "/app/progress" });
  }

  const consentedInvitation = (await db.select().from(guardianInvitations).where(and(eq(guardianInvitations.organizationId, input.organizationId), eq(guardianInvitations.guardianId, input.guardianId), eq(guardianInvitations.studentId, input.studentId), eq(guardianInvitations.status, "accepted"))).limit(1))[0];
  const externalTarget = resolveExternalDeliveryTarget(consentedInvitation);
  if (!externalTarget) {
    return { summary, weekStart, reportId, pdfStorageKey: report.pdfStorageKey, externalDelivery: "not_eligible" as const };
  }
  const { channel, recipient } = externalTarget;
  const delivery = (await db.select().from(reportDeliveries).where(and(eq(reportDeliveries.weeklyReportId, reportId), eq(reportDeliveries.channel, channel), eq(reportDeliveries.recipient, recipient))).limit(1))[0];
  if (delivery?.status === "sent") return { summary, weekStart, reportId, pdfStorageKey: report.pdfStorageKey, externalDelivery: "already_sent" as const };
  if (!delivery) await db.insert(reportDeliveries).values({ weeklyReportId: reportId, organizationId: input.organizationId, guardianId: input.guardianId, studentId: input.studentId, channel, recipient, status: "queued", pdfStorageKey: report.pdfStorageKey });
  const dispatch = await dispatchExternalWeeklyReport({ channel, recipient, attachmentStorageKey: report.pdfStorageKey!, weeklyReportId: reportId });
  if (dispatch.state === "sent") {
    const sentAt = new Date();
    await db.update(reportDeliveries).set({ status: "sent", attemptCount: (delivery?.attemptCount ?? 0) + 1, sentAt, providerMessageId: dispatch.providerMessageId, lastError: null }).where(and(eq(reportDeliveries.weeklyReportId, reportId), eq(reportDeliveries.channel, channel), eq(reportDeliveries.recipient, recipient)));
    await db.update(weeklyReports).set({ deliveredAt: sentAt }).where(eq(weeklyReports.id, reportId));
    return { summary, weekStart, reportId, pdfStorageKey: report.pdfStorageKey, externalDelivery: "sent" as const };
  }
  await db.update(reportDeliveries).set({ status: dispatch.state === "failed" ? "failed" : "queued", lastError: dispatch.reason }).where(and(eq(reportDeliveries.weeklyReportId, reportId), eq(reportDeliveries.channel, channel), eq(reportDeliveries.recipient, recipient)));
  return { summary, weekStart, reportId, pdfStorageKey: report.pdfStorageKey, externalDelivery: dispatch.state };
}
