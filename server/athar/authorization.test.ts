import { describe, expect, it } from "vitest";
import { canManageCircle, canViewOwnStudentRecord, hasRole } from "./authorization";

const admin = { id: 1, organizationId: 10, role: "admin" as const };
const teacher = { id: 2, organizationId: 10, role: "teacher" as const };
const otherTeacher = { id: 3, organizationId: 10, role: "teacher" as const };
const student = { id: 4, organizationId: 10, role: "student" as const };
const circle = { id: 20, organizationId: 10, teacherId: 2 };

describe("Athar authorization boundaries", () => {
  it("allows a same-organization administrator to manage a circle", () => {
    expect(canManageCircle(admin, circle)).toBe(true);
  });

  it("allows only the assigned teacher to manage the circle", () => {
    expect(canManageCircle(teacher, circle)).toBe(true);
    expect(canManageCircle(otherTeacher, circle)).toBe(false);
  });

  it("blocks users from another organization and students from management", () => {
    expect(canManageCircle({ ...admin, organizationId: 11 }, circle)).toBe(false);
    expect(canManageCircle(student, circle)).toBe(false);
  });

  it("limits a student to their own record", () => {
    expect(canViewOwnStudentRecord(student, 4)).toBe(true);
    expect(canViewOwnStudentRecord(student, 5)).toBe(false);
  });

  it("matches role membership explicitly", () => {
    expect(hasRole(teacher, ["admin", "teacher"])).toBe(true);
    expect(hasRole(student, ["admin", "teacher"])).toBe(false);
  });
});
