import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { guardianStudentLinks, organizations, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { requireOrganization, requireRole } from "../athar/authorization";
import { protectedProcedure, router } from "../_core/trpc";

export const organizationRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    if (!ctx.user.organizationId) return { organization: null, needsSetup: ctx.user.role === "admin" };
    const organization = (await db.select().from(organizations).where(eq(organizations.id, ctx.user.organizationId)).limit(1))[0] ?? null;
    return { organization, needsSetup: false };
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(3).max(160), city: z.string().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user, ["admin"]);
      if (ctx.user.organizationId) throw new TRPCError({ code: "CONFLICT", message: "حسابك مرتبط بمؤسسة بالفعل." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const result = await db.insert(organizations).values({ name: input.name, city: input.city ?? null });
      const organizationId = Number(result[0].insertId);
      await db.update(users).set({ organizationId }).where(eq(users.id, ctx.user.id));
      return { organizationId };
    }),
  members: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin", "teacher"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    return db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }),
  assignRole: protectedProcedure
    .input(z.object({ userId: z.number().int().positive(), role: z.enum(["teacher", "guardian", "student", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx.user);
      requireRole(ctx.user, ["admin"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const target = (await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1))[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود." });
      await db.update(users).set({ organizationId, role: input.role }).where(and(eq(users.id, input.userId)));
      return { success: true };
    }),
  linkGuardian: protectedProcedure
    .input(z.object({ guardianId: z.number().int().positive(), studentId: z.number().int().positive(), relationship: z.string().min(2).max(64).default("ولي الأمر") }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx.user);
      requireRole(ctx.user, ["admin"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const linkedUsers = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.organizationId, organizationId)));
      const guardian = linkedUsers.find(member => member.id === input.guardianId && member.role === "guardian");
      const student = linkedUsers.find(member => member.id === input.studentId && member.role === "student");
      if (!guardian || !student) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يكون ولي الأمر والطالب تابعين للمؤسسة وبالدور الصحيح." });
      await db
        .insert(guardianStudentLinks)
        .values({ guardianId: input.guardianId, studentId: input.studentId, relationship: input.relationship })
        .onDuplicateKeyUpdate({ set: { relationship: input.relationship } });
      return { success: true };
    }),
});
