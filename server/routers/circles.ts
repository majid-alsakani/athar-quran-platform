import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { circles, enrollments, sessions, users } from "../../drizzle/schema";
import { assertStudentEnrolledInCircle, getManagedCircle, requireOrganization, requireRole } from "../athar/authorization";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const circleInput = z.object({
  name: z.string().min(2).max(160),
  mosqueName: z.string().min(2).max(160),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  teacherId: z.number().int().positive(),
  capacity: z.number().int().min(1).max(200),
  meetingSummary: z.string().min(2).max(255),
});

export const circlesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx.user);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    if (ctx.user.role === "teacher") return db.select().from(circles).where(and(eq(circles.organizationId, organizationId), eq(circles.teacherId, ctx.user.id)));
    if (ctx.user.role === "student") {
      const rows = await db.select({ circleId: enrollments.circleId }).from(enrollments).where(and(eq(enrollments.studentId, ctx.user.id), eq(enrollments.status, "active")));
      if (!rows.length) return [];
      return db.select().from(circles).where(and(eq(circles.organizationId, organizationId), inArray(circles.id, rows.map(row => row.circleId))));
    }
    if (ctx.user.role === "guardian") return [];
    return db.select().from(circles).where(eq(circles.organizationId, organizationId));
  }),
  create: protectedProcedure.input(circleInput).mutation(async ({ ctx, input }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const teacher = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.teacherId), eq(users.organizationId, organizationId), eq(users.role, "teacher"))).limit(1))[0];
    if (!teacher) throw new TRPCError({ code: "BAD_REQUEST", message: "اختر معلماً تابعاً للمؤسسة." });
    const result = await db.insert(circles).values({ ...input, organizationId });
    return { circleId: Number(result[0].insertId) };
  }),
  students: protectedProcedure.input(z.object({ circleId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await getManagedCircle(ctx.user, input.circleId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    return db
      .select({ id: users.id, name: users.name, email: users.email, enrollmentStatus: enrollments.status, joinedAt: enrollments.joinedAt })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.circleId, input.circleId));
  }),
  enroll: protectedProcedure
    .input(z.object({ circleId: z.number().int().positive(), studentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const circle = await getManagedCircle(ctx.user, input.circleId);
      requireRole(ctx.user, ["admin", "teacher"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const student = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.studentId), eq(users.organizationId, circle.organizationId), eq(users.role, "student"))).limit(1))[0];
      if (!student) throw new TRPCError({ code: "BAD_REQUEST", message: "اختر طالباً تابعاً للمؤسسة." });
      await db.insert(enrollments).values({ circleId: input.circleId, studentId: input.studentId }).onDuplicateKeyUpdate({ set: { status: "active" } });
      return { success: true };
    }),
  upcomingSessions: protectedProcedure.input(z.object({ circleId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await getManagedCircle(ctx.user, input.circleId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    return db.select().from(sessions).where(eq(sessions.circleId, input.circleId)).orderBy(desc(sessions.startsAt)).limit(10);
  }),
  assertEnrollment: protectedProcedure.input(z.object({ circleId: z.number().int().positive(), studentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await getManagedCircle(ctx.user, input.circleId);
    await assertStudentEnrolledInCircle(input.studentId, input.circleId);
    return { enrolled: true };
  }),
});
