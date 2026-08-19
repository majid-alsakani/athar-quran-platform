import { and, count, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import {
  attendanceRecords,
  circles,
  directMessages,
  enrollments,
  guardianStudentLinks,
  notifications,
  pointsLedger,
  progressRecords,
  sessions,
  tasks,
  users,
  type User,
} from "../drizzle/schema";
import { buildAttendanceNotification, buildMessageNotification, buildPointsNotification, calculateProgressPoints, type AtharRole } from "../shared/athar";
import { getDb } from "./db";

type CircleInput = {
  name: string;
  mosqueName: string;
  description?: string;
  level: "beginner" | "intermediate" | "advanced";
  teacherId: number;
  capacity: number;
  meetingSummary: string;
};

type SessionInput = {
  circleId: number;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  notes?: string;
};

async function requiredDb() {
  const database = await getDb();
  if (!database) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return database;
}

function asRole(role: User["role"]): AtharRole {
  return role as AtharRole;
}

export async function listTeachers() {
  const database = await requiredDb();
  return database
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "teacher"))
    .orderBy(users.name);
}

export async function listUsersForAdmin() {
  const database = await requiredDb();
  return database
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}

export async function listCirclesForUser(user: User) {
  const database = await requiredDb();
  const base = database
    .select({
      id: circles.id,
      name: circles.name,
      mosqueName: circles.mosqueName,
      level: circles.level,
      capacity: circles.capacity,
      meetingSummary: circles.meetingSummary,
      status: circles.status,
      teacherId: circles.teacherId,
      teacherName: users.name,
      enrollmentCount: sql<number>`(select count(*) from ${enrollments} where ${enrollments.circleId} = ${circles.id} and ${enrollments.status} = 'active')`,
    })
    .from(circles)
    .innerJoin(users, eq(circles.teacherId, users.id));

  if (user.role === "admin") return base.orderBy(desc(circles.createdAt));
  if (user.role === "teacher") {
    return base.where(eq(circles.teacherId, user.id)).orderBy(desc(circles.createdAt));
  }
  if (user.role === "student") {
    return base
      .innerJoin(enrollments, eq(enrollments.circleId, circles.id))
      .where(and(eq(enrollments.studentId, user.id), eq(enrollments.status, "active")))
      .orderBy(desc(circles.createdAt));
  }
  return base
    .innerJoin(enrollments, eq(enrollments.circleId, circles.id))
    .innerJoin(
      guardianStudentLinks,
      and(
        eq(guardianStudentLinks.studentId, enrollments.studentId),
        eq(guardianStudentLinks.guardianId, user.id),
      ),
    )
    .where(eq(enrollments.status, "active"))
    .orderBy(desc(circles.createdAt));
}

export async function listCircleStudents(circleId: number) {
  const database = await requiredDb();
  return database
    .select({ id: users.id, name: users.name, email: users.email, enrollmentStatus: enrollments.status })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .where(and(eq(enrollments.circleId, circleId), eq(enrollments.status, "active")))
    .orderBy(users.name);
}

export async function getAccessibleStudentIds(user: User) {
  const database = await requiredDb();
  if (user.role === "student") return [user.id];
  if (user.role === "guardian") {
    const rows = await database
      .select({ id: guardianStudentLinks.studentId })
      .from(guardianStudentLinks)
      .where(eq(guardianStudentLinks.guardianId, user.id));
    return rows.map(row => row.id);
  }
  if (user.role === "teacher") {
    const rows = await database
      .selectDistinct({ id: enrollments.studentId })
      .from(enrollments)
      .innerJoin(circles, eq(enrollments.circleId, circles.id))
      .where(and(eq(circles.teacherId, user.id), eq(enrollments.status, "active")));
    return rows.map(row => row.id);
  }
  const rows = await database.select({ id: users.id }).from(users).where(eq(users.role, "student"));
  return rows.map(row => row.id);
}

export async function listStudentsForUser(user: User) {
  const studentIds = await getAccessibleStudentIds(user);
  if (studentIds.length === 0) return [];
  const database = await requiredDb();
  return database
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(inArray(users.id, studentIds))
    .orderBy(users.name);
}

export async function canManageCircle(user: User, circleId: number) {
  if (user.role === "admin") return true;
  if (user.role !== "teacher") return false;
  const database = await requiredDb();
  const result = await database
    .select({ id: circles.id })
    .from(circles)
    .where(and(eq(circles.id, circleId), eq(circles.teacherId, user.id)))
    .limit(1);
  return result.length > 0;
}

export async function assertCircleManager(user: User, circleId: number) {
  if (!(await canManageCircle(user, circleId))) {
    throw new Error("لا تملك صلاحية إدارة هذه الحلقة.");
  }
}

export async function createCircle(input: CircleInput) {
  const database = await requiredDb();
  const [teacher] = await database.select({ id: users.id }).from(users).where(and(eq(users.id, input.teacherId), eq(users.role, "teacher"))).limit(1);
  if (!teacher) throw new Error("المعلم المحدد غير متاح.");
  const result = await database.insert(circles).values({
    ...input,
    description: input.description || null,
  });
  return { id: Number(result[0].insertId) };
}

export async function updateCircle(user: User, input: { circleId: number; name?: string; meetingSummary?: string; capacity?: number; status?: "active" | "paused" | "archived"; teacherId?: number }) {
  await assertCircleManager(user, input.circleId);
  const database = await requiredDb();
  const updateSet: Record<string, unknown> = {};
  if (input.name) updateSet.name = input.name;
  if (input.meetingSummary) updateSet.meetingSummary = input.meetingSummary;
  if (input.capacity !== undefined) updateSet.capacity = input.capacity;
  if (input.status) updateSet.status = input.status;
  if (input.teacherId !== undefined) {
    if (user.role !== "admin") throw new Error("إعادة تعيين معلم الحلقة متاحة للمدير فقط.");
    const [teacher] = await database.select({ id: users.id }).from(users).where(and(eq(users.id, input.teacherId), eq(users.role, "teacher"))).limit(1);
    if (!teacher) throw new Error("المعلم المحدد غير متاح.");
    updateSet.teacherId = input.teacherId;
  }
  if (!Object.keys(updateSet).length) return;
  await database.update(circles).set(updateSet).where(eq(circles.id, input.circleId));
}

export async function enrollStudent(circleId: number, studentId: number) {
  const database = await requiredDb();
  const [student] = await database.select({ id: users.id }).from(users).where(and(eq(users.id, studentId), eq(users.role, "student"))).limit(1);
  if (!student) throw new Error("الطالب المحدد غير متاح.");
  await database.insert(enrollments).values({ circleId, studentId }).onDuplicateKeyUpdate({ set: { status: "active" } });
}

export async function createSession(user: User, input: SessionInput) {
  await assertCircleManager(user, input.circleId);
  const database = await requiredDb();
  const result = await database.insert(sessions).values({
    ...input,
    teacherId: user.role === "admin" ? (await getCircleTeacher(input.circleId)) : user.id,
    endsAt: input.endsAt || null,
    notes: input.notes || null,
  });
  return { id: Number(result[0].insertId) };
}

export async function listSessionsForUser(user: User) {
  const database = await requiredDb();
  const circleRows = await listCirclesForUser(user);
  const circleIds = circleRows.map(circle => circle.id);
  if (circleIds.length === 0) return [];
  return database
    .select({
      id: sessions.id,
      circleId: sessions.circleId,
      title: sessions.title,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      status: sessions.status,
      circleName: circles.name,
    })
    .from(sessions)
    .innerJoin(circles, eq(sessions.circleId, circles.id))
    .where(inArray(sessions.circleId, circleIds))
    .orderBy(desc(sessions.startsAt))
    .limit(30);
}

async function getCircleTeacher(circleId: number) {
  const database = await requiredDb();
  const [circle] = await database.select({ teacherId: circles.teacherId }).from(circles).where(eq(circles.id, circleId)).limit(1);
  if (!circle) throw new Error("الحلقة غير موجودة.");
  return circle.teacherId;
}

async function notifyGuardians(studentId: number, title: string, body: string, type: "attendance" | "progress" | "points" | "task" | "message", href?: string) {
  const database = await requiredDb();
  const guardians = await database
    .select({ guardianId: guardianStudentLinks.guardianId })
    .from(guardianStudentLinks)
    .where(eq(guardianStudentLinks.studentId, studentId));
  if (guardians.length === 0) return;
  await database.insert(notifications).values(
    guardians.map(guardian => ({ recipientId: guardian.guardianId, title, body, type, href: href || null })),
  );
}

export async function recordAttendance(user: User, input: { sessionId: number; studentId: number; status: "present" | "absent" | "late" | "excused"; notes?: string }) {
  const database = await requiredDb();
  const [session] = await database.select({ circleId: sessions.circleId }).from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
  if (!session) throw new Error("الجلسة غير موجودة.");
  await assertCircleManager(user, session.circleId);
  await database
    .insert(attendanceRecords)
    .values({ ...input, notes: input.notes || null, recordedById: user.id })
    .onDuplicateKeyUpdate({ set: { status: input.status, notes: input.notes || null, recordedById: user.id, recordedAt: new Date() } });

  const [student] = await database.select({ name: users.name }).from(users).where(eq(users.id, input.studentId)).limit(1);
  const notification = buildAttendanceNotification(student?.name || "الطالب", input.status);
  await notifyGuardians(input.studentId, notification.title, notification.body, notification.type, "/notifications");
}

export async function recordProgress(
  user: User,
  input: {
    circleId: number;
    studentId: number;
    memorizationFrom?: string;
    memorizationTo?: string;
    revisionFrom?: string;
    revisionTo?: string;
    tajweedGrade?: "excellent" | "very_good" | "good" | "needs_support";
    notes?: string;
  },
) {
  await assertCircleManager(user, input.circleId);
  const database = await requiredDb();
  const pointsAwarded = calculateProgressPoints(input);
  await database.insert(progressRecords).values({
    circleId: input.circleId,
    studentId: input.studentId,
    teacherId: user.role === "admin" ? await getCircleTeacher(input.circleId) : user.id,
    memorizationFrom: input.memorizationFrom || null,
    memorizationTo: input.memorizationTo || null,
    revisionFrom: input.revisionFrom || null,
    revisionTo: input.revisionTo || null,
    tajweedGrade: input.tajweedGrade || null,
    notes: input.notes || null,
  });

  const hasPoints = pointsAwarded > 0;
  if (hasPoints) {
    const description = input.memorizationTo
      ? `نقاط تقديراً لإتمام حفظ ${input.memorizationTo}.`
      : "نقاط تقديراً للأداء المميز في الحلقة.";
    await database.insert(pointsLedger).values({
      studentId: input.studentId,
      sourceType: "memorization",
      points: pointsAwarded,
      description,
      createdById: user.id,
    });
    const notification = buildPointsNotification(pointsAwarded, description);
    await database.insert(notifications).values({
      recipientId: input.studentId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      href: "/progress",
    });
    await notifyGuardians(input.studentId, notification.title, notification.body, notification.type, "/progress");
  }

  const [student] = await database.select({ name: users.name }).from(users).where(eq(users.id, input.studentId)).limit(1);
  await notifyGuardians(
    input.studentId,
    "تحديث سجل الحفظ",
    `تم تحديث سجل الحفظ والمراجعة لـ ${student?.name || "ابنك"}.`,
    "progress",
    "/progress",
  );
}

export async function listRecentProgressForUser(user: User) {
  const studentIds = await getAccessibleStudentIds(user);
  if (studentIds.length === 0) return [];
  const database = await requiredDb();
  return database
    .select({
      id: progressRecords.id,
      studentId: progressRecords.studentId,
      studentName: users.name,
      recordedAt: progressRecords.recordedAt,
      memorizationTo: progressRecords.memorizationTo,
      revisionTo: progressRecords.revisionTo,
      tajweedGrade: progressRecords.tajweedGrade,
      pointsAwarded: progressRecords.pointsAwarded,
    })
    .from(progressRecords)
    .innerJoin(users, eq(progressRecords.studentId, users.id))
    .where(inArray(progressRecords.studentId, studentIds))
    .orderBy(desc(progressRecords.recordedAt))
    .limit(20);
}

export async function listPointEntriesForUser(user: User) {
  const studentIds = await getAccessibleStudentIds(user);
  if (studentIds.length === 0) return [];
  const database = await requiredDb();
  return database
    .select({
      id: pointsLedger.id,
      studentId: pointsLedger.studentId,
      studentName: users.name,
      sourceType: pointsLedger.sourceType,
      points: pointsLedger.points,
      description: pointsLedger.description,
      createdAt: pointsLedger.createdAt,
    })
    .from(pointsLedger)
    .innerJoin(users, eq(pointsLedger.studentId, users.id))
    .where(inArray(pointsLedger.studentId, studentIds))
    .orderBy(desc(pointsLedger.createdAt))
    .limit(20);
}

export async function createTask(
  user: User,
  input: { circleId: number; studentId?: number; title: string; description?: string; taskType: "memorization" | "revision" | "practice" | "challenge"; dueAt?: Date; pointsAvailable: number },
) {
  await assertCircleManager(user, input.circleId);
  const database = await requiredDb();
  const result = await database.insert(tasks).values({
    ...input,
    studentId: input.studentId || null,
    description: input.description || null,
    dueAt: input.dueAt || null,
    createdById: user.id,
  });
  if (input.studentId) {
    await database.insert(notifications).values({
      recipientId: input.studentId,
      title: "مهمة جديدة",
      body: `أضاف المعلم مهمة جديدة: ${input.title}`,
      type: "task",
      href: "/tasks",
    });
    await notifyGuardians(input.studentId, "مهمة جديدة", `أضيفت لابنك مهمة: ${input.title}`, "task", "/tasks");
  }
  return { id: Number(result[0].insertId) };
}

export async function listTasksForUser(user: User) {
  const studentIds = await getAccessibleStudentIds(user);
  if (studentIds.length === 0) return [];
  const database = await requiredDb();
  return database
    .select({ id: tasks.id, title: tasks.title, description: tasks.description, taskType: tasks.taskType, dueAt: tasks.dueAt, pointsAvailable: tasks.pointsAvailable, status: tasks.status, studentName: users.name, circleName: circles.name })
    .from(tasks)
    .innerJoin(users, eq(tasks.studentId, users.id))
    .innerJoin(circles, eq(tasks.circleId, circles.id))
    .where(inArray(tasks.studentId, studentIds))
    .orderBy(desc(tasks.createdAt))
    .limit(30);
}

export async function listNotifications(userId: number) {
  const database = await requiredDb();
  return database
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(12);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const database = await requiredDb();
  await database.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)));
}

export async function canSendMessage(sender: User, recipientId: number) {
  if (sender.role === "admin") return true;
  const database = await requiredDb();
  const [recipient] = await database
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);
  if (!recipient || recipient.role === "admin") return false;

  if (sender.role === "teacher") {
    if (recipient.role === "student") {
      const [match] = await database
        .select({ id: enrollments.id })
        .from(enrollments)
        .innerJoin(circles, eq(enrollments.circleId, circles.id))
        .where(and(eq(enrollments.studentId, recipientId), eq(circles.teacherId, sender.id)))
        .limit(1);
      return Boolean(match);
    }
    if (recipient.role === "guardian") {
      const [match] = await database
        .select({ id: guardianStudentLinks.id })
        .from(guardianStudentLinks)
        .innerJoin(enrollments, eq(guardianStudentLinks.studentId, enrollments.studentId))
        .innerJoin(circles, eq(enrollments.circleId, circles.id))
        .where(and(eq(guardianStudentLinks.guardianId, recipientId), eq(circles.teacherId, sender.id)))
        .limit(1);
      return Boolean(match);
    }
  }

  if (sender.role === "guardian") {
    if (recipient.role === "student") {
      const [match] = await database
        .select({ id: guardianStudentLinks.id })
        .from(guardianStudentLinks)
        .where(and(eq(guardianStudentLinks.guardianId, sender.id), eq(guardianStudentLinks.studentId, recipientId)))
        .limit(1);
      return Boolean(match);
    }
    if (recipient.role === "teacher") {
      const [match] = await database
        .select({ id: guardianStudentLinks.id })
        .from(guardianStudentLinks)
        .innerJoin(enrollments, eq(guardianStudentLinks.studentId, enrollments.studentId))
        .innerJoin(circles, eq(enrollments.circleId, circles.id))
        .where(and(eq(guardianStudentLinks.guardianId, sender.id), eq(circles.teacherId, recipientId)))
        .limit(1);
      return Boolean(match);
    }
  }

  if (sender.role === "student") {
    if (recipient.role === "guardian") {
      const [match] = await database
        .select({ id: guardianStudentLinks.id })
        .from(guardianStudentLinks)
        .where(and(eq(guardianStudentLinks.studentId, sender.id), eq(guardianStudentLinks.guardianId, recipientId)))
        .limit(1);
      return Boolean(match);
    }
    if (recipient.role === "teacher") {
      const [match] = await database
        .select({ id: enrollments.id })
        .from(enrollments)
        .innerJoin(circles, eq(enrollments.circleId, circles.id))
        .where(and(eq(enrollments.studentId, sender.id), eq(circles.teacherId, recipientId)))
        .limit(1);
      return Boolean(match);
    }
  }

  return false;
}

export async function listMessageRecipients(user: User) {
  const database = await requiredDb();
  if (user.role === "admin") {
    return database.select({ id: users.id, name: users.name, role: users.role }).from(users).where(sql`${users.id} <> ${user.id}`).orderBy(users.name);
  }
  const recipientIds = new Set<number>();
  if (user.role === "teacher") {
    const studentIds = await getAccessibleStudentIds(user);
    studentIds.forEach(id => recipientIds.add(id));
    if (studentIds.length) {
      const guardians = await database.select({ id: guardianStudentLinks.guardianId }).from(guardianStudentLinks).where(inArray(guardianStudentLinks.studentId, studentIds));
      guardians.forEach(row => recipientIds.add(row.id));
    }
  }
  if (user.role === "guardian") {
    const studentIds = await getAccessibleStudentIds(user);
    studentIds.forEach(id => recipientIds.add(id));
    if (studentIds.length) {
      const teachers = await database.selectDistinct({ id: circles.teacherId }).from(enrollments).innerJoin(circles, eq(enrollments.circleId, circles.id)).where(inArray(enrollments.studentId, studentIds));
      teachers.forEach(row => recipientIds.add(row.id));
    }
  }
  if (user.role === "student") {
    const guardians = await database.select({ id: guardianStudentLinks.guardianId }).from(guardianStudentLinks).where(eq(guardianStudentLinks.studentId, user.id));
    guardians.forEach(row => recipientIds.add(row.id));
    const teachers = await database.selectDistinct({ id: circles.teacherId }).from(enrollments).innerJoin(circles, eq(enrollments.circleId, circles.id)).where(eq(enrollments.studentId, user.id));
    teachers.forEach(row => recipientIds.add(row.id));
  }
  if (!recipientIds.size) return [];
  return database.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, Array.from(recipientIds))).orderBy(users.name);
}

export async function listMessagesForUser(userId: number) {
  const database = await requiredDb();
  return database
    .select({ id: directMessages.id, senderId: directMessages.senderId, recipientId: directMessages.recipientId, body: directMessages.body, isRead: directMessages.isRead, readAt: directMessages.readAt, createdAt: directMessages.createdAt })
    .from(directMessages)
    .where(or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId)))
    .orderBy(desc(directMessages.createdAt))
    .limit(40);
}

export async function markIncomingMessagesRead(userId: number) {
  const database = await requiredDb();
  await database.update(directMessages).set({ isRead: true, readAt: new Date() }).where(and(eq(directMessages.recipientId, userId), eq(directMessages.isRead, false)));
}

export async function sendMessage(sender: User, recipientId: number, body: string) {
  if (!(await canSendMessage(sender, recipientId))) {
    throw new Error("لا يمكنك إرسال رسالة إلى هذا الحساب خارج العلاقات المصرح بها.");
  }
  const database = await requiredDb();
  await database.insert(directMessages).values({ senderId: sender.id, recipientId, body });
  const notification = buildMessageNotification();
  await database.insert(notifications).values({
    recipientId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    href: "/messages",
  });
}

export async function getDashboard(user: User) {
  const database = await requiredDb();
  const [circlesForUser, notificationItems, studentIds] = await Promise.all([
    listCirclesForUser(user),
    listNotifications(user.id),
    getAccessibleStudentIds(user),
  ]);
  const circleIds = circlesForUser.map(circle => circle.id);
  const hasCircles = circleIds.length > 0;
  const hasStudents = studentIds.length > 0;
  const now = new Date();

  const upcomingSessions = hasCircles
    ? await database
        .select({ id: sessions.id, title: sessions.title, startsAt: sessions.startsAt, status: sessions.status, circleName: circles.name })
        .from(sessions)
        .innerJoin(circles, eq(sessions.circleId, circles.id))
        .where(and(inArray(sessions.circleId, circleIds), gte(sessions.startsAt, now)))
        .orderBy(sessions.startsAt)
        .limit(6)
    : [];

  const pendingTasks = hasStudents
    ? await database
        .select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, status: tasks.status, pointsAvailable: tasks.pointsAvailable, studentId: tasks.studentId })
        .from(tasks)
        .where(and(inArray(tasks.studentId, studentIds), inArray(tasks.status, ["assigned", "submitted", "overdue"])))
        .orderBy(tasks.dueAt)
        .limit(6)
    : [];

  const [pointsRow] = hasStudents
    ? await database
        .select({ total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)` })
        .from(pointsLedger)
        .where(inArray(pointsLedger.studentId, studentIds))
    : [{ total: 0 }];

  const [unreadRow] = await database
    .select({ total: count(notifications.id) })
    .from(notifications)
    .where(and(eq(notifications.recipientId, user.id), eq(notifications.isRead, false)));

  return {
    role: asRole(user.role),
    circles: circlesForUser,
    notifications: notificationItems,
    upcomingSessions,
    pendingTasks,
    metrics: {
      circles: circlesForUser.length,
      students: studentIds.length,
      points: Number(pointsRow?.total || 0),
      unreadNotifications: unreadRow?.total || 0,
    },
  };
}
