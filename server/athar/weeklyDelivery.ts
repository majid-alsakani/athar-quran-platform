import { and, eq, gte, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { attendanceRecords, notifications, progressRecords, weeklyReports } from "../../drizzle/schema";
import { getDb } from "../db";
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
  const existing = (
    await db
      .select()
      .from(weeklyReports)
      .where(and(eq(weeklyReports.guardianId, input.guardianId), eq(weeklyReports.studentId, input.studentId), eq(weeklyReports.weekStart, weekStart)))
      .limit(1)
  )[0];

  if (existing?.deliveredAt) {
    return { summary: existing.summary, weekStart, delivered: false };
  }

  const attendance = await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.studentId, input.studentId), gte(attendanceRecords.recordedAt, weekStart), lt(attendanceRecords.recordedAt, weekEnd)));
  const progress = await db
    .select()
    .from(progressRecords)
    .where(and(eq(progressRecords.studentId, input.studentId), gte(progressRecords.recordedAt, weekStart), lt(progressRecords.recordedAt, weekEnd)));
  const present = attendance.filter(item => item.status === "present").length;
  const summary = buildWeeklySummary(present, attendance.length, progress.length);
  const deliveredAt = new Date();

  if (existing) {
    await db
      .update(weeklyReports)
      .set({ summary, deliveredAt, scheduleCronTaskUid: input.scheduleCronTaskUid ?? null })
      .where(eq(weeklyReports.id, existing.id));
  } else {
    await db.insert(weeklyReports).values({
      organizationId: input.organizationId,
      guardianId: input.guardianId,
      studentId: input.studentId,
      weekStart,
      summary,
      deliveredAt,
      scheduleCronTaskUid: input.scheduleCronTaskUid ?? null,
    });
  }

  await db.insert(notifications).values({
    recipientId: input.guardianId,
    type: "report",
    title: "تقرير أسبوعي جديد",
    body: summary,
    href: "/app/progress",
  });
  return { summary, weekStart, delivered: true };
}
