import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { circles, enrollments, guardianStudentLinks, type User } from "../../drizzle/schema";
import { getDb } from "../db";

export type CircleScope = Pick<typeof circles.$inferSelect, "id" | "organizationId" | "teacherId">;
export type AccessUser = Pick<User, "id" | "organizationId" | "role">;

export function hasRole(user: AccessUser, roles: User["role"][]) {
  return roles.includes(user.role);
}

export function canManageCircle(user: AccessUser, circle: CircleScope) {
  if (!user.organizationId || user.organizationId !== circle.organizationId) return false;
  return user.role === "admin" || (user.role === "teacher" && circle.teacherId === user.id);
}

export function canViewOwnStudentRecord(user: AccessUser, studentId: number) {
  return user.role === "student" && user.id === studentId;
}

/**
 * First-pass policy shared by weekly report views and the client-side PDF export.
 * Guardian links and teacher circle assignments are checked by the relevant router
 * after this organization and role boundary is established.
 */
export function canExportWeeklyPdf(user: AccessUser, targetOrganizationId: number | null, studentId: number) {
  if (!user.organizationId || user.organizationId !== targetOrganizationId) return false;
  if (user.role === "admin" || user.role === "teacher" || user.role === "guardian") return true;
  return canViewOwnStudentRecord(user, studentId);
}

export function requireOrganization(user: AccessUser) {
  if (!user.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "أكمل إعداد المؤسسة أولاً قبل استخدام لوحة المنصة.",
    });
  }
  return user.organizationId;
}

export function requireRole(user: AccessUser, roles: User["role"][]) {
  if (!hasRole(user, roles)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك الصلاحية لتنفيذ هذا الإجراء." });
  }
}

export async function getManagedCircle(user: AccessUser, circleId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
  const circle = (await db.select().from(circles).where(eq(circles.id, circleId)).limit(1))[0];
  if (!circle || !canManageCircle(user, circle)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى هذه الحلقة." });
  }
  return circle;
}

export async function assertStudentEnrolledInCircle(studentId: number, circleId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
  const enrollment = (
    await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.circleId, circleId), eq(enrollments.status, "active")))
      .limit(1)
  )[0];
  if (!enrollment) throw new TRPCError({ code: "FORBIDDEN", message: "الطالب غير ملتحق بهذه الحلقة." });
}

export async function assertGuardianLink(guardianId: number, studentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
  const link = (
    await db
      .select({ id: guardianStudentLinks.id })
      .from(guardianStudentLinks)
      .where(and(eq(guardianStudentLinks.guardianId, guardianId), eq(guardianStudentLinks.studentId, studentId)))
      .limit(1)
  )[0];
  if (!link) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الاطلاع على سجل هذا الطالب." });
}
