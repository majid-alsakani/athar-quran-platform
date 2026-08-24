import { and, count, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { circles, enrollments, guardianStudentLinks, notifications, progressRecords, sessions, users } from "../../drizzle/schema";
import { requireOrganization } from "../athar/authorization";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const dashboardRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx.user);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const notificationsList = await db.select().from(notifications).where(eq(notifications.recipientId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(5);
    if (ctx.user.role === "admin") {
      const [circleCount] = await db.select({ value: count() }).from(circles).where(eq(circles.organizationId, organizationId));
      const [studentCount] = await db.select({ value: count() }).from(users).where(and(eq(users.organizationId, organizationId), eq(users.role, "student")));
      const upcoming = await db.select().from(sessions).innerJoin(circles, eq(sessions.circleId, circles.id)).where(eq(circles.organizationId, organizationId)).orderBy(desc(sessions.startsAt)).limit(6);
      return { role: ctx.user.role, metrics: [{ label: "الحلقات النشطة", value: Number(circleCount.value) }, { label: "الطلاب", value: Number(studentCount.value) }, { label: "تنبيهات جديدة", value: notificationsList.filter(item => !item.isRead).length }], upcoming, notifications: notificationsList };
    }
    if (ctx.user.role === "teacher") {
      const teacherCircles = await db.select().from(circles).where(and(eq(circles.organizationId, organizationId), eq(circles.teacherId, ctx.user.id)));
      const circleIds = teacherCircles.map(circle => circle.id);
      const [studentCount] = circleIds.length ? await db.select({ value: count() }).from(enrollments).where(and(inArray(enrollments.circleId, circleIds), eq(enrollments.status, "active"))) : [{ value: 0 }];
      return { role: ctx.user.role, metrics: [{ label: "حلقاتي", value: teacherCircles.length }, { label: "الطلاب الملتحقون", value: Number(studentCount.value) }, { label: "تنبيهات جديدة", value: notificationsList.filter(item => !item.isRead).length }], circles: teacherCircles, notifications: notificationsList };
    }
    if (ctx.user.role === "guardian") {
      const children = await db.select({ id: users.id, name: users.name }).from(guardianStudentLinks).innerJoin(users, eq(guardianStudentLinks.studentId, users.id)).where(eq(guardianStudentLinks.guardianId, ctx.user.id));
      return { role: ctx.user.role, metrics: [{ label: "الأبناء المرتبطون", value: children.length }, { label: "تنبيهات جديدة", value: notificationsList.filter(item => !item.isRead).length }], children, notifications: notificationsList };
    }
    const progress = await db.select().from(progressRecords).where(eq(progressRecords.studentId, ctx.user.id)).orderBy(desc(progressRecords.recordedAt)).limit(5);
    return { role: ctx.user.role, metrics: [{ label: "سجلات المتابعة", value: progress.length }, { label: "تنبيهات جديدة", value: notificationsList.filter(item => !item.isRead).length }], progress, notifications: notificationsList };
  }),
});
