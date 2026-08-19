export type AtharRole = "admin" | "teacher" | "guardian" | "student";

export const roleLabels: Record<AtharRole, string> = {
  admin: "المدير",
  teacher: "المعلم",
  guardian: "ولي الأمر",
  student: "الطالب",
};

export function isRoleAllowed(role: AtharRole, allowedRoles: readonly AtharRole[]) {
  return allowedRoles.includes(role);
}

export function buildAttendanceNotification(studentName: string, status: "present" | "absent" | "late" | "excused") {
  const isPresent = status === "present";
  const isAbsent = status === "absent";
  const isExcused = status === "excused";
  return {
    title: isPresent ? "تسجيل حضور" : isAbsent ? "تسجيل غياب" : isExcused ? "تسجيل اعتذار" : "تسجيل تأخر",
    body: isPresent
      ? `تم تسجيل حضور ${studentName} في جلسة اليوم.`
      : isAbsent
        ? `تم تسجيل غياب ${studentName} عن جلسة اليوم.`
        : isExcused
          ? `تم تسجيل اعتذار ${studentName} عن جلسة اليوم.`
          : `تم تسجيل تأخر ${studentName} عن جلسة اليوم.`,
    type: "attendance" as const,
  };
}

export function buildPointsNotification(points: number, description: string) {
  return {
    title: `تمت إضافة ${points} نقاط`,
    body: description,
    type: "points" as const,
  };
}

export function buildMessageNotification() {
  return {
    title: "رسالة جديدة",
    body: "لديك رسالة جديدة داخل منصة أثر.",
    type: "message" as const,
  };
}

export function calculateProgressPoints(input: { memorizationTo?: string; revisionTo?: string; tajweedGrade?: "excellent" | "very_good" | "good" | "needs_support" }) {
  const tajweedPoints = { excellent: 10, very_good: 7, good: 4, needs_support: 0 } as const;
  const total = (input.memorizationTo ? 15 : 0) + (input.revisionTo ? 8 : 0) + (input.tajweedGrade ? tajweedPoints[input.tajweedGrade] : 0);
  return Math.min(total, 33);
}
