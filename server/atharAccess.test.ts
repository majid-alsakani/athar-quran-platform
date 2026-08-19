import { describe, expect, it } from "vitest";
import { buildAttendanceNotification, buildMessageNotification, buildPointsNotification, calculateProgressPoints, isRoleAllowed } from "../shared/athar";
import { canManageCircle } from "./atharDb";

describe("صلاحيات منصة أثر", () => {
  it("يسمح للمدير بإدارة الحلقات دون منح الطالب الصلاحية نفسها", () => {
    expect(isRoleAllowed("admin", ["admin", "teacher"])).toBe(true);
    expect(isRoleAllowed("student", ["admin", "teacher"])).toBe(false);
  });

  it("يرفض إدارة الحلقة من ولي الأمر ويجيزها للمدير دون الوصول إلى بيانات الحلقة", async () => {
    const baseUser = { id: 1, openId: "role-test", name: "اختبار", email: null, loginMethod: "test", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    await expect(canManageCircle({ ...baseUser, role: "admin" }, 9)).resolves.toBe(true);
    await expect(canManageCircle({ ...baseUser, role: "guardian" }, 9)).resolves.toBe(false);
  });

  it("ينشئ إشعاراً عربياً واضحاً عند تسجيل الغياب", () => {
    expect(buildAttendanceNotification("أحمد", "absent")).toMatchObject({
      type: "attendance",
      title: "تسجيل غياب",
      body: "تم تسجيل غياب أحمد عن جلسة اليوم.",
    });
  });

  it("يصوغ إشعار الحضور بصيغة مستقلة وواضحة", () => {
    expect(buildAttendanceNotification("ريم", "present")).toMatchObject({
      type: "attendance",
      title: "تسجيل حضور",
      body: "تم تسجيل حضور ريم في جلسة اليوم.",
    });
  });

  it("يميز التأخر والاعتذار برسالتين منفصلتين لولي الأمر", () => {
    expect(buildAttendanceNotification("سارة", "late")).toMatchObject({
      title: "تسجيل تأخر",
      body: "تم تسجيل تأخر سارة عن جلسة اليوم.",
    });
    expect(buildAttendanceNotification("سارة", "excused")).toMatchObject({
      title: "تسجيل اعتذار",
      body: "تم تسجيل اعتذار سارة عن جلسة اليوم.",
    });
  });

  it("ينشئ إشعار النقاط بالمقدار والوصف المطلوبين", () => {
    expect(buildPointsNotification(20, "أداء مميز")).toMatchObject({
      type: "points",
      title: "تمت إضافة 20 نقاط",
      body: "أداء مميز",
    });
  });

  it("ينشئ إشعاراً داخلياً ثابتاً عند وصول رسالة جديدة", () => {
    expect(buildMessageNotification()).toEqual({
      type: "message",
      title: "رسالة جديدة",
      body: "لديك رسالة جديدة داخل منصة أثر.",
    });
  });

  it("يحتسب نقاط المتابعة تلقائياً من الحفظ والمراجعة والتجويد", () => {
    expect(calculateProgressPoints({ memorizationTo: "الآية ١٢", revisionTo: "سورة الملك", tajweedGrade: "excellent" })).toBe(33);
    expect(calculateProgressPoints({ tajweedGrade: "needs_support" })).toBe(0);
  });
});
