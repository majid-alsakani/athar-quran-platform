import { and, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  attendanceRecords,
  circles,
  enrollments,
  guardianStudentLinks,
  organizations,
  progressRecords,
  sessions,
  users,
} from "../drizzle/schema.ts";

if (process.env.ATHAR_SEED_DEMO !== "confirm") {
  throw new Error("Refusing to seed. Set ATHAR_SEED_DEMO=confirm to create the isolated Athar demo dataset.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const client = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(client);

async function getOrCreateUser({ openId, organizationId, name, role }) {
  const found = (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
  if (found) return found;
  const result = await db.insert(users).values({
    openId,
    organizationId,
    name,
    email: `${openId}@example.invalid`,
    loginMethod: "demo",
    role,
  });
  return (await db.select().from(users).where(eq(users.id, Number(result[0].insertId))).limit(1))[0];
}

try {
  const existingOrganization = (await db.select().from(organizations).where(eq(organizations.name, "مؤسسة أثر التجريبية")).limit(1))[0];
  const organizationId = existingOrganization?.id ?? Number((await db.insert(organizations).values({
    name: "مؤسسة أثر التجريبية",
    city: "بيانات غير حقيقية",
    isDemo: true,
  }))[0].insertId);

  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) throw new Error("OWNER_OPEN_ID is required to attach the project owner to the demo organization.");
  const existingOwner = (await db.select().from(users).where(eq(users.openId, ownerOpenId)).limit(1))[0];
  if (existingOwner?.organizationId && existingOwner.organizationId !== organizationId) {
    throw new Error("The project owner is already attached to another organization; demo data was not changed.");
  }
  if (existingOwner) {
    await db.update(users).set({ organizationId, role: "admin" }).where(eq(users.id, existingOwner.id));
  } else {
    await db.insert(users).values({ openId: ownerOpenId, organizationId, name: "مدير التجربة", loginMethod: "manus", role: "admin" });
  }

  const teacher = await getOrCreateUser({ openId: `athar-demo-teacher-${organizationId}`, organizationId, name: "المعلم التجريبي", role: "teacher" });
  const guardian = await getOrCreateUser({ openId: `athar-demo-guardian-${organizationId}`, organizationId, name: "ولي الأمر التجريبي", role: "guardian" });
  const student = await getOrCreateUser({ openId: `athar-demo-student-${organizationId}`, organizationId, name: "الطالب التجريبي", role: "student" });

  const existingCircle = (await db.select().from(circles).where(and(eq(circles.organizationId, organizationId), eq(circles.name, "حلقة الفجر — تجربة"))).limit(1))[0];
  const circleId = existingCircle?.id ?? Number((await db.insert(circles).values({
    organizationId,
    teacherId: teacher.id,
    name: "حلقة الفجر — تجربة",
    mosqueName: "بيانات تجريبية فقط",
    level: "intermediate",
    capacity: 12,
    meetingSummary: "جلسة تجربة آمنة لا تمثل مؤسسة فعلية.",
  }))[0].insertId);

  await db.insert(enrollments).values({ circleId, studentId: student.id }).onDuplicateKeyUpdate({ set: { status: "active" } });
  await db.insert(guardianStudentLinks).values({ guardianId: guardian.id, studentId: student.id, relationship: "ولي أمر تجريبي" }).onDuplicateKeyUpdate({ set: { relationship: "ولي أمر تجريبي" } });

  const existingSession = (await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.circleId, circleId)).limit(1))[0];
  if (!existingSession) {
    for (let offset = 0; offset < 4; offset += 1) {
      const startsAt = new Date();
      startsAt.setUTCDate(startsAt.getUTCDate() - (offset * 7 + 2));
      startsAt.setUTCHours(15, 0, 0, 0);
      const sessionId = Number((await db.insert(sessions).values({
        circleId,
        teacherId: teacher.id,
        title: `جلسة تجربة ${4 - offset}`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        status: "completed",
        notes: "بيانات تجربة معزولة.",
      }))[0].insertId);
      await db.insert(attendanceRecords).values({ sessionId, studentId: student.id, status: "present", notes: "حضور تجريبي", recordedById: teacher.id, recordedAt: startsAt });
      await db.insert(progressRecords).values({
        circleId,
        sessionId,
        studentId: student.id,
        teacherId: teacher.id,
        recordedAt: startsAt,
        memorizationFrom: "سورة النبأ",
        memorizationTo: `آية ${12 + offset * 4}`,
        revisionFrom: "سورة الملك",
        revisionTo: `آية ${6 + offset * 3}`,
        tajweedGrade: "very_good",
        notes: "سجل تجربة آمن",
        pointsAwarded: 4 + offset * 2,
      });
    }
  }

  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const currentWeekSession = (await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.circleId, circleId), gte(sessions.startsAt, weekStart))).limit(1))[0];
  if (!currentWeekSession) {
    const startsAt = new Date();
    startsAt.setUTCHours(15, 0, 0, 0);
    const sessionId = Number((await db.insert(sessions).values({
      circleId,
      teacherId: teacher.id,
      title: "جلسة التجربة لهذا الأسبوع",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      status: "completed",
      notes: "بيانات تجربة معزولة.",
    }))[0].insertId);
    await db.insert(attendanceRecords).values({ sessionId, studentId: student.id, status: "present", notes: "حضور تجريبي لهذا الأسبوع", recordedById: teacher.id, recordedAt: startsAt });
    await db.insert(progressRecords).values({ circleId, sessionId, studentId: student.id, teacherId: teacher.id, recordedAt: startsAt, memorizationFrom: "سورة النبأ", memorizationTo: "آية 28", revisionFrom: "سورة الملك", revisionTo: "آية 15", tajweedGrade: "excellent", notes: "سجل تجربة لهذا الأسبوع", pointsAwarded: 10 });
  }

  console.log(JSON.stringify({ organizationId, circleId, studentId: student.id, guardianId: guardian.id, seeded: true }));
} finally {
  await client.end();
}

process.exit(0);
