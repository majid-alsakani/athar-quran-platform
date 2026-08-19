import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { UserRole } from "../drizzle/schema";
import { isRoleAllowed, type AtharRole } from "../shared/athar";
import * as atharDb from "./atharDb";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "../shared/const";

const roleProcedure = (roles: readonly AtharRole[]) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!isRoleAllowed(ctx.user.role as AtharRole, roles)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك الصلاحية لتنفيذ هذا الإجراء." });
    }
    return next();
  });

const staffProcedure = roleProcedure(["admin", "teacher"]);
const adminProcedure = roleProcedure(["admin"]);

const circleInput = z.object({
  name: z.string().trim().min(3).max(160),
  mosqueName: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  teacherId: z.number().int().positive(),
  capacity: z.number().int().min(1).max(300),
  meetingSummary: z.string().trim().min(3).max(255),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  platform: router({
    dashboard: protectedProcedure.query(({ ctx }) => atharDb.getDashboard(ctx.user)),
    students: router({
      list: protectedProcedure.query(({ ctx }) => atharDb.listStudentsForUser(ctx.user)),
    }),
    teachers: adminProcedure.query(() => atharDb.listTeachers()),
    circles: router({
      list: protectedProcedure.query(({ ctx }) => atharDb.listCirclesForUser(ctx.user)),
      students: staffProcedure.input(z.object({ circleId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        await atharDb.assertCircleManager(ctx.user, input.circleId);
        return atharDb.listCircleStudents(input.circleId);
      }),
      create: adminProcedure.input(circleInput).mutation(({ input }) => atharDb.createCircle(input)),
      update: staffProcedure
        .input(z.object({ circleId: z.number().int().positive(), name: z.string().trim().min(3).max(160).optional(), meetingSummary: z.string().trim().min(3).max(255).optional(), capacity: z.number().int().min(1).max(300).optional(), status: z.enum(["active", "paused", "archived"]).optional(), teacherId: z.number().int().positive().optional() }))
        .mutation(({ ctx, input }) => atharDb.updateCircle(ctx.user, input)),
      enroll: adminProcedure
        .input(z.object({ circleId: z.number().int().positive(), studentId: z.number().int().positive() }))
        .mutation(({ input }) => atharDb.enrollStudent(input.circleId, input.studentId)),
    }),
    sessions: router({
      list: staffProcedure.query(({ ctx }) => atharDb.listSessionsForUser(ctx.user)),
      create: staffProcedure
        .input(z.object({ circleId: z.number().int().positive(), title: z.string().trim().min(3).max(180), startsAt: z.coerce.date(), endsAt: z.coerce.date().optional(), notes: z.string().trim().max(2000).optional() }))
        .mutation(({ ctx, input }) => atharDb.createSession(ctx.user, input)),
    }),
    attendance: router({
      record: staffProcedure
        .input(z.object({ sessionId: z.number().int().positive(), studentId: z.number().int().positive(), status: z.enum(["present", "absent", "late", "excused"]), notes: z.string().trim().max(500).optional() }))
        .mutation(({ ctx, input }) => atharDb.recordAttendance(ctx.user, input)),
    }),
    progress: router({
      list: protectedProcedure.query(({ ctx }) => atharDb.listRecentProgressForUser(ctx.user)),
      record: staffProcedure
        .input(z.object({
          circleId: z.number().int().positive(),
          studentId: z.number().int().positive(),
          memorizationFrom: z.string().trim().max(120).optional(),
          memorizationTo: z.string().trim().max(120).optional(),
          revisionFrom: z.string().trim().max(120).optional(),
          revisionTo: z.string().trim().max(120).optional(),
          tajweedGrade: z.enum(["excellent", "very_good", "good", "needs_support"]).optional(),
          notes: z.string().trim().max(2000).optional(),
        }))
        .mutation(({ ctx, input }) => atharDb.recordProgress(ctx.user, input)),
    }),
    tasks: router({
      list: protectedProcedure.query(({ ctx }) => atharDb.listTasksForUser(ctx.user)),
      create: staffProcedure
        .input(z.object({
          circleId: z.number().int().positive(),
          studentId: z.number().int().positive().optional(),
          title: z.string().trim().min(3).max(200),
          description: z.string().trim().max(2000).optional(),
          taskType: z.enum(["memorization", "revision", "practice", "challenge"]),
          dueAt: z.coerce.date().optional(),
          pointsAvailable: z.number().int().min(0).max(1000),
        }))
        .mutation(({ ctx, input }) => atharDb.createTask(ctx.user, input)),
    }),
    points: router({
      list: protectedProcedure.query(({ ctx }) => atharDb.listPointEntriesForUser(ctx.user)),
    }),
    notifications: router({
      list: protectedProcedure.query(({ ctx }) => atharDb.listNotifications(ctx.user.id)),
      markRead: protectedProcedure
        .input(z.object({ notificationId: z.number().int().positive() }))
        .mutation(({ ctx, input }) => atharDb.markNotificationRead(ctx.user.id, input.notificationId)),
    }),
    messages: router({
      list: protectedProcedure.query(({ ctx }) => atharDb.listMessagesForUser(ctx.user.id)),
      recipients: protectedProcedure.query(({ ctx }) => atharDb.listMessageRecipients(ctx.user)),
      markIncomingRead: protectedProcedure.mutation(({ ctx }) => atharDb.markIncomingMessagesRead(ctx.user.id)),
      send: protectedProcedure
        .input(z.object({ recipientId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) }))
        .mutation(({ ctx, input }) => atharDb.sendMessage(ctx.user, input.recipientId, input.body)),
    }),
    users: router({
      list: adminProcedure.query(() => atharDb.listUsersForAdmin()),
      updateRole: adminProcedure
        .input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "teacher", "guardian", "student"]) }))
        .mutation(async ({ input }) => {
          const { getDb } = await import("./db");
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const database = await getDb();
          if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
          await database.update(users).set({ role: input.role as UserRole }).where(eq(users.id, input.userId));
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
