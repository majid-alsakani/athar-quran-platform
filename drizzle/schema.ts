import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "teacher", "guardian", "student"])
    .default("student")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const circles = mysqlTable(
  "circles",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    mosqueName: varchar("mosqueName", { length: 160 }).notNull(),
    description: text("description"),
    level: mysqlEnum("level", ["beginner", "intermediate", "advanced"])
      .default("beginner")
      .notNull(),
    teacherId: int("teacherId").notNull(),
    capacity: int("capacity").default(20).notNull(),
    meetingSummary: varchar("meetingSummary", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["active", "paused", "completed"])
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("circles_teacher_idx").on(table.teacherId)],
);

export const enrollments = mysqlTable(
  "enrollments",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull(),
    studentId: int("studentId").notNull(),
    status: mysqlEnum("status", ["active", "paused", "completed", "withdrawn"])
      .default("active")
      .notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("enrollments_circle_student_unique").on(table.circleId, table.studentId),
    index("enrollments_student_idx").on(table.studentId),
  ],
);

export const guardianStudentLinks = mysqlTable(
  "guardianStudentLinks",
  {
    id: int("id").autoincrement().primaryKey(),
    guardianId: int("guardianId").notNull(),
    studentId: int("studentId").notNull(),
    relationship: varchar("relationship", { length: 64 }).default("ولي الأمر").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("guardian_student_unique").on(table.guardianId, table.studentId),
    index("guardian_links_student_idx").on(table.studentId),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull(),
    teacherId: int("teacherId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt"),
    status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"])
      .default("scheduled")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("sessions_circle_starts_idx").on(table.circleId, table.startsAt)],
);

export const attendanceRecords = mysqlTable(
  "attendanceRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    studentId: int("studentId").notNull(),
    status: mysqlEnum("status", ["present", "absent", "late", "excused"])
      .notNull(),
    notes: varchar("notes", { length: 500 }),
    recordedById: int("recordedById").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("attendance_session_student_unique").on(table.sessionId, table.studentId),
    index("attendance_student_idx").on(table.studentId),
  ],
);

export const progressRecords = mysqlTable(
  "progressRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull(),
    studentId: int("studentId").notNull(),
    teacherId: int("teacherId").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    memorizationFrom: varchar("memorizationFrom", { length: 120 }),
    memorizationTo: varchar("memorizationTo", { length: 120 }),
    revisionFrom: varchar("revisionFrom", { length: 120 }),
    revisionTo: varchar("revisionTo", { length: 120 }),
    tajweedGrade: mysqlEnum("tajweedGrade", ["excellent", "very_good", "good", "needs_support"]),
    notes: text("notes"),
    pointsAwarded: int("pointsAwarded").default(0).notNull(),
  },
  table => [
    index("progress_student_recorded_idx").on(table.studentId, table.recordedAt),
    index("progress_circle_recorded_idx").on(table.circleId, table.recordedAt),
  ],
);

export const pointsLedger = mysqlTable(
  "pointsLedger",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull(),
    sourceType: mysqlEnum("sourceType", ["attendance", "memorization", "revision", "challenge", "manual"])
      .notNull(),
    points: int("points").notNull(),
    description: varchar("description", { length: 400 }).notNull(),
    createdById: int("createdById"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("points_student_created_idx").on(table.studentId, table.createdAt)],
);

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull(),
    studentId: int("studentId"),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    taskType: mysqlEnum("taskType", ["memorization", "revision", "practice", "challenge"])
      .notNull(),
    dueAt: timestamp("dueAt"),
    pointsAvailable: int("pointsAvailable").default(0).notNull(),
    status: mysqlEnum("status", ["assigned", "submitted", "completed", "overdue"])
      .default("assigned")
      .notNull(),
    createdById: int("createdById").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("tasks_student_status_idx").on(table.studentId, table.status)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    recipientId: int("recipientId").notNull(),
    type: mysqlEnum("type", ["attendance", "progress", "points", "task", "message", "general"])
      .notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    href: varchar("href", { length: 255 }),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("notifications_recipient_read_created_idx").on(table.recipientId, table.isRead, table.createdAt)],
);

export const directMessages = mysqlTable(
  "directMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    recipientId: int("recipientId").notNull(),
    body: text("body").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    readAt: timestamp("readAt"),
  },
  table => [index("messages_recipient_read_created_idx").on(table.recipientId, table.isRead, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserRole = User["role"];
