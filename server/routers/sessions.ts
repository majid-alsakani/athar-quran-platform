import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { attendanceRecords, circles, enrollments, guardianStudentLinks, notifications, progressRecords, sessions, users } from "../../drizzle/schema";
import { assertStudentEnrolledInCircle, getManagedCircle, requireRole } from "../athar/authorization";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const attendanceStatus = z.enum(["present", "absent", "late", "excused"]);

export const sessionsRouter = router({
  create: protectedProcedure
    .input(z.object({ circleId: z.number().int().positive(), title: z.string().min(2).max(180), startsAt: z.date(), endsAt: z.date().optional(), notes: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const circle = await getManagedCircle(ctx.user, input.circleId);
      requireRole(ctx.user, ["admin", "teacher"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const result = await db.insert(sessions).values({ ...input, teacherId: circle.teacherId, status: "scheduled" });
      return { sessionId: Number(result[0].insertId) };
    }),
  update: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive(), title: z.string().min(2).max(180).optional(), startsAt: z.date().optional(), endsAt: z.date().nullable().optional(), notes: z.string().max(2000).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user, ["admin", "teacher"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const session = (await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1))[0];
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة." });
      await getManagedCircle(ctx.user, session.circleId);
      const { sessionId, ...changes } = input;
      await db.update(sessions).set(changes).where(eq(sessions.id, sessionId));
      return { success: true };
    }),
  cancel: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireRole(ctx.user, ["admin", "teacher"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const session = (await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1))[0];
    if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة." });
    await getManagedCircle(ctx.user, session.circleId);
    if (session.status === "completed") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن إلغاء جلسة مكتملة." });
    await db.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, input.sessionId));
    return { success: true };
  }),
  roster: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const session = (await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1))[0];
    if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة." });
    await getManagedCircle(ctx.user, session.circleId);
    const roster = await db
      .select({ studentId: users.id, name: users.name, attendanceStatus: attendanceRecords.status, notes: attendanceRecords.notes })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .leftJoin(attendanceRecords, and(eq(attendanceRecords.studentId, users.id), eq(attendanceRecords.sessionId, input.sessionId)))
      .where(and(eq(enrollments.circleId, session.circleId), eq(enrollments.status, "active")));
    return { session, roster };
  }),
  recordAttendance: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive(), records: z.array(z.object({ studentId: z.number().int().positive(), status: attendanceStatus, notes: z.string().max(500).optional() })).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user, ["admin", "teacher"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const session = (await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1))[0];
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة." });
      await getManagedCircle(ctx.user, session.circleId);
      for (const record of input.records) {
        await assertStudentEnrolledInCircle(record.studentId, session.circleId);
        await db
          .insert(attendanceRecords)
          .values({ sessionId: input.sessionId, studentId: record.studentId, status: record.status, notes: record.notes ?? null, recordedById: ctx.user.id })
          .onDuplicateKeyUpdate({ set: { status: record.status, notes: record.notes ?? null, recordedById: ctx.user.id, recordedAt: new Date() } });
        const guardians = await db.select({ guardianId: guardianStudentLinks.guardianId }).from(guardianStudentLinks).where(eq(guardianStudentLinks.studentId, record.studentId));
        if (guardians.length) {
          await db.insert(notifications).values(guardians.map(link => ({
            recipientId: link.guardianId,
            type: "attendance" as const,
            title: "تحديث حضور جديد",
            body: record.status === "present" ? "تم تسجيل حضور الطالب في جلسة اليوم." : "تم تسجيل حالة حضور الطالب في جلسة اليوم.",
            href: "/app/progress",
          })));
        }
      }
      await db.update(sessions).set({ status: "completed" }).where(eq(sessions.id, input.sessionId));
      return { success: true, updated: input.records.length };
    }),
  recordProgress: protectedProcedure
    .input(z.object({ circleId: z.number().int().positive(), sessionId: z.number().int().positive().optional(), studentId: z.number().int().positive(), memorizationFrom: z.string().max(120).optional(), memorizationTo: z.string().max(120).optional(), revisionFrom: z.string().max(120).optional(), revisionTo: z.string().max(120).optional(), tajweedGrade: z.enum(["excellent", "very_good", "good", "needs_support"]).optional(), notes: z.string().max(2000).optional(), pointsAwarded: z.number().int().min(0).max(500).default(0) }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user, ["admin", "teacher"]);
      await getManagedCircle(ctx.user, input.circleId);
      await assertStudentEnrolledInCircle(input.studentId, input.circleId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const result = await db.insert(progressRecords).values({ ...input, teacherId: ctx.user.id });
      const guardians = await db.select({ guardianId: guardianStudentLinks.guardianId }).from(guardianStudentLinks).where(eq(guardianStudentLinks.studentId, input.studentId));
      if (guardians.length) {
        await db.insert(notifications).values(guardians.map(link => ({
          recipientId: link.guardianId,
          type: "progress" as const,
          title: "تقرير تسميع جديد",
          body: "أضاف المعلم متابعة جديدة للحفظ والمراجعة والتجويد.",
          href: "/app/progress",
        })));
      }
      return { progressId: Number(result[0].insertId) };
    }),
  recentProgress: protectedProcedure.input(z.object({ studentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    if (ctx.user.role === "student" && ctx.user.id !== input.studentId) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا السجل." });
    if (ctx.user.role === "guardian") {
      const permitted = await db.select({ id: guardianStudentLinks.id }).from(guardianStudentLinks).where(and(eq(guardianStudentLinks.guardianId, ctx.user.id), eq(guardianStudentLinks.studentId, input.studentId))).limit(1);
      if (!permitted[0]) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا السجل." });
    }
    if (ctx.user.role === "teacher") {
      const linkedCircle = await db
        .select({ id: circles.id })
        .from(circles)
        .innerJoin(progressRecords, eq(progressRecords.circleId, circles.id))
        .where(and(eq(circles.teacherId, ctx.user.id), eq(progressRecords.studentId, input.studentId)))
        .limit(1);
      if (!linkedCircle[0]) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الاطلاع على هذا السجل." });
    }
    return db.select().from(progressRecords).where(eq(progressRecords.studentId, input.studentId)).orderBy(desc(progressRecords.recordedAt)).limit(20);
  }),
});
