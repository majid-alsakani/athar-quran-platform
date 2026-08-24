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

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  city: varchar("city", { length: 120 }),
  isDemo: boolean("isDemo").default(false).notNull(),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    organizationId: int("organizationId").references(() => organizations.id, { onDelete: "set null" }),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["admin", "teacher", "guardian", "student"]).default("student").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => [index("users_organization_role_idx").on(table.organizationId, table.role)],
);

export const circles = mysqlTable(
  "circles",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    teacherId: int("teacherId").notNull().references(() => users.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    mosqueName: varchar("mosqueName", { length: 160 }).notNull(),
    level: mysqlEnum("level", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
    capacity: int("capacity").default(20).notNull(),
    meetingSummary: varchar("meetingSummary", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("circles_organization_idx").on(table.organizationId), index("circles_teacher_idx").on(table.teacherId)],
);

export const enrollments = mysqlTable(
  "enrollments",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull().references(() => circles.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["active", "paused", "completed", "withdrawn"]).default("active").notNull(),
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
    guardianId: int("guardianId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    relationship: varchar("relationship", { length: 64 }).default("ولي الأمر").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("guardian_student_unique").on(table.guardianId, table.studentId),
    index("guardian_links_student_idx").on(table.studentId),
  ],
);

export const guardianInvitations = mysqlTable(
  "guardianInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    guardianId: int("guardianId").references(() => users.id, { onDelete: "set null" }),
    recipientName: varchar("recipientName", { length: 160 }).notNull(),
    recipientEmail: varchar("recipientEmail", { length: 320 }),
    recipientPhone: varchar("recipientPhone", { length: 32 }),
    recipientNormalized: varchar("recipientNormalized", { length: 320 }).notNull(),
    channel: mysqlEnum("channel", ["email", "whatsapp"]).notNull(),
    token: varchar("token", { length: 80 }).notNull().unique(),
    status: mysqlEnum("status", ["draft", "queued", "sent", "failed", "accepted", "cancelled", "expired"]).default("draft").notNull(),
    consentAt: timestamp("consentAt"),
    sentAt: timestamp("sentAt"),
    acceptedAt: timestamp("acceptedAt"),
    expiresAt: timestamp("expiresAt").notNull(),
    providerMessageId: varchar("providerMessageId", { length: 160 }),
    lastError: text("lastError"),
    requestedById: int("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("guardian_invites_org_status_idx").on(table.organizationId, table.status),
    index("guardian_invites_student_idx").on(table.studentId),
    index("guardian_invites_recipient_idx").on(table.organizationId, table.channel, table.recipientNormalized),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull().references(() => circles.id, { onDelete: "cascade" }),
    teacherId: int("teacherId").notNull().references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 180 }).notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt"),
    status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("sessions_circle_starts_idx").on(table.circleId, table.startsAt)],
);

export const attendanceRecords = mysqlTable(
  "attendanceRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["present", "absent", "late", "excused"]).notNull(),
    notes: varchar("notes", { length: 500 }),
    recordedById: int("recordedById").notNull().references(() => users.id, { onDelete: "restrict" }),
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
    circleId: int("circleId").notNull().references(() => circles.id, { onDelete: "cascade" }),
    sessionId: int("sessionId").references(() => sessions.id, { onDelete: "set null" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    teacherId: int("teacherId").notNull().references(() => users.id, { onDelete: "restrict" }),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    memorizationFrom: varchar("memorizationFrom", { length: 120 }),
    memorizationTo: varchar("memorizationTo", { length: 120 }),
    revisionFrom: varchar("revisionFrom", { length: 120 }),
    revisionTo: varchar("revisionTo", { length: 120 }),
    tajweedGrade: mysqlEnum("tajweedGrade", ["excellent", "very_good", "good", "needs_support"]),
    notes: text("notes"),
    pointsAwarded: int("pointsAwarded").default(0).notNull(),
  },
  table => [index("progress_student_recorded_idx").on(table.studentId, table.recordedAt), index("progress_circle_recorded_idx").on(table.circleId, table.recordedAt)],
);

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    circleId: int("circleId").notNull().references(() => circles.id, { onDelete: "cascade" }),
    studentId: int("studentId").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    taskType: mysqlEnum("taskType", ["memorization", "revision", "practice", "challenge"]).notNull(),
    dueAt: timestamp("dueAt"),
    pointsAvailable: int("pointsAvailable").default(0).notNull(),
    status: mysqlEnum("status", ["assigned", "submitted", "completed", "overdue"]).default("assigned").notNull(),
    createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("tasks_student_status_idx").on(table.studentId, table.status)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    recipientId: int("recipientId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["attendance", "progress", "task", "report", "general"]).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    href: varchar("href", { length: 255 }),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("notifications_recipient_read_created_idx").on(table.recipientId, table.isRead, table.createdAt)],
);

export const weeklyReports = mysqlTable(
  "weeklyReports",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    guardianId: int("guardianId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    weekStart: timestamp("weekStart").notNull(),
    summary: text("summary").notNull(),
    pdfStorageKey: varchar("pdfStorageKey", { length: 512 }),
    generatedAt: timestamp("generatedAt"),
    deliveredAt: timestamp("deliveredAt"),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("weekly_report_guardian_student_week_unique").on(table.guardianId, table.studentId, table.weekStart),
    index("weekly_reports_schedule_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

export const reportDeliveries = mysqlTable(
  "reportDeliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    weeklyReportId: int("weeklyReportId").notNull().references(() => weeklyReports.id, { onDelete: "cascade" }),
    organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    guardianId: int("guardianId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    channel: mysqlEnum("channel", ["email", "whatsapp", "in_app"]).notNull(),
    recipient: varchar("recipient", { length: 320 }).notNull(),
    status: mysqlEnum("status", ["queued", "sent", "failed", "skipped"]).default("queued").notNull(),
    pdfStorageKey: varchar("pdfStorageKey", { length: 512 }),
    providerMessageId: varchar("providerMessageId", { length: 160 }),
    attemptCount: int("attemptCount").default(0).notNull(),
    lastError: text("lastError"),
    sentAt: timestamp("sentAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("report_delivery_report_channel_recipient_unique").on(table.weeklyReportId, table.channel, table.recipient),
    index("report_deliveries_guardian_status_idx").on(table.guardianId, table.status),
  ],
);

export const weeklyReportSchedules = mysqlTable(
  "weeklyReportSchedules",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    guardianId: int("guardianId").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    cron: varchar("cron", { length: 64 }).notNull().default("0 0 16 * * 5"),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("weekly_schedule_guardian_student_unique").on(table.guardianId, table.studentId),
    index("weekly_schedule_task_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserRole = User["role"];
