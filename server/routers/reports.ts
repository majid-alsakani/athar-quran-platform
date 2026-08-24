import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { attendanceRecords, circles, enrollments, guardianStudentLinks, progressRecords, users, weeklyReportSchedules } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { assertGuardianLink, canExportWeeklyPdf, requireOrganization, requireRole } from "../athar/authorization";
import { buildStudentTrend } from "../athar/analytics";
import { getDb } from "../db";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { protectedProcedure, router } from "../_core/trpc";
import { deliverWeeklyReport } from "../athar/weeklyDelivery";

const cronSchema = z.string().trim().regex(/^\S+(?:\s+\S+){5}$/, "اكتب تعبير cron من ستة حقول بتوقيت UTC.").max(64);

function requireSessionToken(cookieHeader: string | undefined) {
  const token = parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "تعذر تأكيد جلسة المستخدم للجدولة." });
  return token;
}

export const reportsRouter = router({
  studentSummary: protectedProcedure.input(z.object({ studentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    if (ctx.user.role === "student" && ctx.user.id !== input.studentId) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا التقرير." });
    if (ctx.user.role === "guardian") await assertGuardianLink(ctx.user.id, input.studentId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const target = (await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, input.studentId)).limit(1))[0];
    if (!target || !canExportWeeklyPdf(ctx.user, target.organizationId, input.studentId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا التقرير." });
    }
    const organizationId = requireOrganization(ctx.user);
    if (ctx.user.role === "teacher") {
      const assigned = await db
        .select({ circleId: circles.id })
        .from(enrollments)
        .innerJoin(circles, eq(enrollments.circleId, circles.id))
        .where(and(eq(enrollments.studentId, input.studentId), eq(enrollments.status, "active"), eq(circles.teacherId, ctx.user.id), eq(circles.organizationId, organizationId)))
        .limit(1);
      if (!assigned[0]) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا التقرير." });
    }
    const weekStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const attendance = await db.select().from(attendanceRecords).where(and(eq(attendanceRecords.studentId, input.studentId), gte(attendanceRecords.recordedAt, weekStart), lt(attendanceRecords.recordedAt, weekEnd)));
    const progress = await db.select().from(progressRecords).where(and(eq(progressRecords.studentId, input.studentId), gte(progressRecords.recordedAt, weekStart), lt(progressRecords.recordedAt, weekEnd))).orderBy(desc(progressRecords.recordedAt));
    return { attendance, progress, weekStart };
  }),
  studentTrend: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), weeks: z.number().int().min(4).max(16).default(8) })).query(async ({ ctx, input }) => {
    if (ctx.user.role === "student" && ctx.user.id !== input.studentId) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا التقرير." });
    if (ctx.user.role === "guardian") await assertGuardianLink(ctx.user.id, input.studentId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const target = (await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, input.studentId)).limit(1))[0];
    if (!target || !canExportWeeklyPdf(ctx.user, target.organizationId, input.studentId)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا التقرير." });
    const organizationId = requireOrganization(ctx.user);
    if (ctx.user.role === "teacher") {
      const assigned = await db.select({ circleId: circles.id }).from(enrollments).innerJoin(circles, eq(enrollments.circleId, circles.id)).where(and(eq(enrollments.studentId, input.studentId), eq(enrollments.status, "active"), eq(circles.teacherId, ctx.user.id), eq(circles.organizationId, organizationId))).limit(1);
      if (!assigned[0]) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا التقرير." });
    }
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - (input.weeks - 1) * 7);
    const attendance = await db.select({ recordedAt: attendanceRecords.recordedAt, status: attendanceRecords.status }).from(attendanceRecords).where(and(eq(attendanceRecords.studentId, input.studentId), gte(attendanceRecords.recordedAt, start)));
    const progress = await db.select({ recordedAt: progressRecords.recordedAt, pointsAwarded: progressRecords.pointsAwarded }).from(progressRecords).where(and(eq(progressRecords.studentId, input.studentId), gte(progressRecords.recordedAt, start)));
    return buildStudentTrend({ attendance, progress, weeks: input.weeks });
  }),
  generateWeekly: protectedProcedure.input(z.object({ guardianId: z.number().int().positive(), studentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin", "teacher"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const link = (await db.select().from(guardianStudentLinks).where(and(eq(guardianStudentLinks.guardianId, input.guardianId), eq(guardianStudentLinks.studentId, input.studentId))).limit(1))[0];
    if (!link) throw new TRPCError({ code: "BAD_REQUEST", message: "لا توجد صلة موثقة بين ولي الأمر والطالب." });
    return deliverWeeklyReport({ organizationId, guardianId: input.guardianId, studentId: input.studentId });
  }),
  listSchedules: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    return db.select().from(weeklyReportSchedules).where(eq(weeklyReportSchedules.organizationId, organizationId));
  }),
  activateWeeklySchedule: protectedProcedure
    .input(z.object({ guardianId: z.number().int().positive(), studentId: z.number().int().positive(), cron: cronSchema.default("0 0 16 * * 5") }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx.user);
      requireRole(ctx.user, ["admin"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const link = (await db.select().from(guardianStudentLinks).where(and(eq(guardianStudentLinks.guardianId, input.guardianId), eq(guardianStudentLinks.studentId, input.studentId))).limit(1))[0];
      if (!link) throw new TRPCError({ code: "BAD_REQUEST", message: "لا توجد صلة موثقة بين ولي الأمر والطالب." });
      const pair = await db.select({ id: users.id }).from(users).where(and(eq(users.organizationId, organizationId)));
      if (!pair.some(user => user.id === input.guardianId) || !pair.some(user => user.id === input.studentId)) throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن يكون ولي الأمر والطالب ضمن المؤسسة." });
      const sessionToken = requireSessionToken(ctx.req.headers.cookie);
      const existing = (await db.select().from(weeklyReportSchedules).where(and(eq(weeklyReportSchedules.guardianId, input.guardianId), eq(weeklyReportSchedules.studentId, input.studentId))).limit(1))[0];
      if (existing?.scheduleCronTaskUid) {
        const updated = await updateHeartbeatJob(existing.scheduleCronTaskUid, { cron: input.cron, enable: true, path: "/api/scheduled/weekly-report", description: "Athar weekly guardian report" }, sessionToken);
        await db.update(weeklyReportSchedules).set({ cron: input.cron, isEnabled: true }).where(eq(weeklyReportSchedules.id, existing.id));
        return { scheduleId: existing.id, nextExecutionAt: updated.nextExecutionAt ?? null };
      }
      let scheduleId = existing?.id;
      if (!scheduleId) {
        const created = await db.insert(weeklyReportSchedules).values({ organizationId, guardianId: input.guardianId, studentId: input.studentId, cron: input.cron, createdById: ctx.user.id });
        scheduleId = Number(created[0].insertId);
      }
      const job = await createHeartbeatJob({ name: `athar-weekly-${scheduleId}`, cron: input.cron, path: "/api/scheduled/weekly-report", description: "Athar weekly guardian report" }, sessionToken);
      await db.update(weeklyReportSchedules).set({ cron: input.cron, isEnabled: true, scheduleCronTaskUid: job.taskUid }).where(eq(weeklyReportSchedules.id, scheduleId));
      return { scheduleId, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
  pauseWeeklySchedule: protectedProcedure.input(z.object({ scheduleId: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const schedule = (await db.select().from(weeklyReportSchedules).where(and(eq(weeklyReportSchedules.id, input.scheduleId), eq(weeklyReportSchedules.organizationId, organizationId))).limit(1))[0];
    if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "إعداد الجدولة غير موجود." });
    if (!schedule.scheduleCronTaskUid) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لم تُنشأ مهمة مجدولة لهذا التقرير بعد." });
    const sessionToken = requireSessionToken(ctx.req.headers.cookie);
    await updateHeartbeatJob(schedule.scheduleCronTaskUid, { enable: input.enabled }, sessionToken);
    await db.update(weeklyReportSchedules).set({ isEnabled: input.enabled }).where(eq(weeklyReportSchedules.id, schedule.id));
    return { success: true };
  }),
  exportCsv: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const rows = await db
      .select({ studentName: users.name, recordedAt: progressRecords.recordedAt, memorizationFrom: progressRecords.memorizationFrom, memorizationTo: progressRecords.memorizationTo, revisionFrom: progressRecords.revisionFrom, revisionTo: progressRecords.revisionTo, tajweedGrade: progressRecords.tajweedGrade, pointsAwarded: progressRecords.pointsAwarded })
      .from(progressRecords)
      .innerJoin(users, eq(progressRecords.studentId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(progressRecords.recordedAt));
    const head = ["الطالب", "التاريخ", "من الحفظ", "إلى الحفظ", "من المراجعة", "إلى المراجعة", "التجويد", "النقاط"];
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const content = [head.join(","), ...rows.map(row => [row.studentName, row.recordedAt.toISOString(), row.memorizationFrom, row.memorizationTo, row.revisionFrom, row.revisionTo, row.tajweedGrade, row.pointsAwarded].map(escape).join(","))].join("\n");
    return { filename: `athar-progress-${new Date().toISOString().slice(0, 10)}.csv`, content: `\uFEFF${content}` };
  }),
});
