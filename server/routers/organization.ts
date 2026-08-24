import { and, desc, eq, gt, gte, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { attendanceRecords, circles, enrollments, guardianInvitations, guardianStudentLinks, organizations, progressRecords, sessions, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { requireOrganization, requireRole } from "../athar/authorization";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { isInvitationActive, isInvitationExpired, normalizeInvitationRecipient } from "../athar/invitationPolicy";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const organizationRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    if (!ctx.user.organizationId) return { organization: null, needsSetup: ctx.user.role === "admin" };
    const organization = (await db.select().from(organizations).where(eq(organizations.id, ctx.user.organizationId)).limit(1))[0] ?? null;
    return { organization, needsSetup: false };
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(3).max(160), city: z.string().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx.user, ["admin"]);
      if (ctx.user.organizationId) throw new TRPCError({ code: "CONFLICT", message: "حسابك مرتبط بمؤسسة بالفعل." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const result = await db.insert(organizations).values({ name: input.name, city: input.city ?? null });
      const organizationId = Number(result[0].insertId);
      await db.update(users).set({ organizationId }).where(eq(users.id, ctx.user.id));
      return { organizationId };
    }),
  members: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin", "teacher"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    return db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }),
  assignRole: protectedProcedure
    .input(z.object({ userId: z.number().int().positive(), role: z.enum(["teacher", "guardian", "student", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx.user);
      requireRole(ctx.user, ["admin"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const target = (await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1))[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود." });
      await db.update(users).set({ organizationId, role: input.role }).where(and(eq(users.id, input.userId)));
      return { success: true };
    }),
  linkGuardian: protectedProcedure
    .input(z.object({ guardianId: z.number().int().positive(), studentId: z.number().int().positive(), relationship: z.string().min(2).max(64).default("ولي الأمر") }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx.user);
      requireRole(ctx.user, ["admin"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const linkedUsers = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.organizationId, organizationId)));
      const guardian = linkedUsers.find(member => member.id === input.guardianId && member.role === "guardian");
      const student = linkedUsers.find(member => member.id === input.studentId && member.role === "student");
      if (!guardian || !student) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يكون ولي الأمر والطالب تابعين للمؤسسة وبالدور الصحيح." });
      await db
        .insert(guardianStudentLinks)
        .values({ guardianId: input.guardianId, studentId: input.studentId, relationship: input.relationship })
        .onDuplicateKeyUpdate({ set: { relationship: input.relationship } });
      return { success: true };
    }),
  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    return db
      .select({
        id: guardianInvitations.id,
        recipientName: guardianInvitations.recipientName,
        recipientEmail: guardianInvitations.recipientEmail,
        recipientPhone: guardianInvitations.recipientPhone,
        channel: guardianInvitations.channel,
        status: guardianInvitations.status,
        createdAt: guardianInvitations.createdAt,
        sentAt: guardianInvitations.sentAt,
        expiresAt: guardianInvitations.expiresAt,
        lastError: guardianInvitations.lastError,
        studentName: users.name,
      })
      .from(guardianInvitations)
      .innerJoin(users, eq(guardianInvitations.studentId, users.id))
      .where(eq(guardianInvitations.organizationId, organizationId))
      .orderBy(desc(guardianInvitations.createdAt));
  }),
  createInvitation: protectedProcedure
    .input(z.object({
      studentId: z.number().int().positive(),
      recipientName: z.string().trim().min(2).max(160),
      channel: z.enum(["email", "whatsapp"]),
      recipientEmail: z.string().trim().email().max(320).optional(),
      recipientPhone: z.string().trim().min(8).max(32).optional(),
      guardianId: z.number().int().positive().optional(),
    }).superRefine((input, refine) => {
      if (input.channel === "email" && !input.recipientEmail) refine.addIssue({ code: "custom", path: ["recipientEmail"], message: "أدخل بريد ولي الأمر لإرسال الدعوة عبر البريد." });
      if (input.channel === "whatsapp" && !input.recipientPhone) refine.addIssue({ code: "custom", path: ["recipientPhone"], message: "أدخل رقم واتساب ولي الأمر بصيغة دولية." });
      if (input.channel === "whatsapp" && input.recipientPhone && !/^\+[1-9]\d{7,14}$/.test(normalizeInvitationRecipient("whatsapp", input.recipientPhone))) refine.addIssue({ code: "custom", path: ["recipientPhone"], message: "استخدم رقم واتساب بصيغة دولية تبدأ بـ +." });
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx.user);
      requireRole(ctx.user, ["admin"]);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
      const student = (await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.id, input.studentId), eq(users.organizationId, organizationId))).limit(1))[0];
      if (!student || student.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن يكون الطالب ضمن المؤسسة وبالدور الصحيح." });
      if (input.guardianId) {
        const guardian = (await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.id, input.guardianId), eq(users.organizationId, organizationId))).limit(1))[0];
        if (!guardian || guardian.role !== "guardian") throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن ربط الدعوة بحساب غير تابع لولي أمر في المؤسسة." });
      }
      const recipient = normalizeInvitationRecipient(input.channel, input.channel === "email" ? input.recipientEmail! : input.recipientPhone!);
      const activeDuplicate = (await db.select({ id: guardianInvitations.id }).from(guardianInvitations).where(and(
        eq(guardianInvitations.organizationId, organizationId),
        eq(guardianInvitations.studentId, input.studentId),
        eq(guardianInvitations.channel, input.channel),
        eq(guardianInvitations.recipientNormalized, recipient),
        inArray(guardianInvitations.status, ["draft", "queued", "sent"]),
        gt(guardianInvitations.expiresAt, new Date()),
      )).limit(1))[0];
      if (activeDuplicate) throw new TRPCError({ code: "CONFLICT", message: "توجد دعوة نشطة بالفعل لهذا المستلم والطالب." });
      const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
      const created = await db.insert(guardianInvitations).values({
        organizationId,
        studentId: input.studentId,
        guardianId: input.guardianId ?? null,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail ?? null,
        recipientPhone: input.recipientPhone ?? null,
        recipientNormalized: recipient,
        channel: input.channel,
        token: crypto.randomUUID(),
        expiresAt,
        requestedById: ctx.user.id,
      });
      return { invitationId: Number(created[0].insertId), status: "draft" as const };
    }),
  previewInvitation: publicProcedure.input(z.object({ token: z.string().min(16).max(80) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const invitation = (await db.select({ id: guardianInvitations.id, status: guardianInvitations.status, expiresAt: guardianInvitations.expiresAt, channel: guardianInvitations.channel }).from(guardianInvitations).where(eq(guardianInvitations.token, input.token)).limit(1))[0];
    if (!invitation) return { valid: false as const, reason: "not_found" as const };
    if (isInvitationActive(invitation.status) && isInvitationExpired(invitation.expiresAt)) {
      await db.update(guardianInvitations).set({ status: "expired" }).where(eq(guardianInvitations.id, invitation.id));
      return { valid: false as const, reason: "expired" as const };
    }
    if (invitation.status === "accepted") return { valid: false as const, reason: "accepted" as const };
    if (!isInvitationActive(invitation.status)) return { valid: false as const, reason: "unavailable" as const };
    return { valid: true as const, channel: invitation.channel, expiresAt: invitation.expiresAt };
  }),
  acceptInvitation: protectedProcedure.input(z.object({ token: z.string().min(16).max(80), consentToWeeklyReports: z.literal(true) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    const invitation = (await db.select().from(guardianInvitations).where(eq(guardianInvitations.token, input.token)).limit(1))[0];
    if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "الدعوة غير صالحة." });
    if (isInvitationExpired(invitation.expiresAt)) {
      if (isInvitationActive(invitation.status)) await db.update(guardianInvitations).set({ status: "expired" }).where(eq(guardianInvitations.id, invitation.id));
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "انتهت صلاحية هذه الدعوة." });
    }
    if (invitation.status === "accepted") return { accepted: true, alreadyAccepted: true };
    if (!isInvitationActive(invitation.status)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن قبول هذه الدعوة في حالتها الحالية." });
    if (ctx.user.organizationId && ctx.user.organizationId !== invitation.organizationId) throw new TRPCError({ code: "FORBIDDEN", message: "حسابك مرتبط بمؤسسة أخرى." });
    if (ctx.user.organizationId === invitation.organizationId && ctx.user.role !== "guardian") throw new TRPCError({ code: "FORBIDDEN", message: "يجب استخدام حساب ولي أمر لقبول الدعوة." });
    if (invitation.channel === "email" && ctx.user.email && normalizeInvitationRecipient("email", ctx.user.email) !== invitation.recipientNormalized) throw new TRPCError({ code: "FORBIDDEN", message: "يجب قبول دعوة البريد من الحساب المطابق للبريد المدعو." });
    await db.update(users).set({ organizationId: invitation.organizationId, role: "guardian" }).where(eq(users.id, ctx.user.id));
    await db.insert(guardianStudentLinks).values({ guardianId: ctx.user.id, studentId: invitation.studentId, relationship: "ولي أمر" }).onDuplicateKeyUpdate({ set: { relationship: "ولي أمر" } });
    await db.update(guardianInvitations).set({ guardianId: ctx.user.id, status: "accepted", consentAt: new Date(), acceptedAt: new Date(), lastError: null }).where(eq(guardianInvitations.id, invitation.id));
    return { accepted: true, alreadyAccepted: false };
  }),
  cancelInvitation: protectedProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const organizationId = requireOrganization(ctx.user);
    requireRole(ctx.user, ["admin"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    await db.update(guardianInvitations).set({ status: "cancelled" }).where(and(eq(guardianInvitations.id, input.invitationId), eq(guardianInvitations.organizationId, organizationId)));
    return { success: true };
  }),
  seedDemo: protectedProcedure.mutation(async ({ ctx }) => {
    requireRole(ctx.user, ["admin"]);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة." });
    let organizationId = ctx.user.organizationId;
    if (!organizationId) {
      const created = await db.insert(organizations).values({ name: "مؤسسة أثر التجريبية", city: "بيانات غير حقيقية", isDemo: true });
      organizationId = Number(created[0].insertId);
      await db.update(users).set({ organizationId }).where(eq(users.id, ctx.user.id));
    }
    const organization = (await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1))[0];
    if (!organization?.isDemo) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن إضافة بيانات تجربة إلى مؤسسة فعلية. أنشئ مؤسسة تجربة مستقلة أولاً." });
    const getOrCreateUser = async (openId: string, name: string, role: "teacher" | "guardian" | "student") => {
      const existing = (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
      if (existing) return existing;
      const result = await db.insert(users).values({ openId, organizationId, name, email: `${openId}@example.invalid`, loginMethod: "demo", role });
      return (await db.select().from(users).where(eq(users.id, Number(result[0].insertId))).limit(1))[0]!;
    };
    const teacher = await getOrCreateUser(`athar-demo-teacher-${organizationId}`, "المعلم التجريبي", "teacher");
    const guardian = await getOrCreateUser(`athar-demo-guardian-${organizationId}`, "ولي الأمر التجريبي", "guardian");
    const student = await getOrCreateUser(`athar-demo-student-${organizationId}`, "الطالب التجريبي", "student");
    const existingCircle = (await db.select().from(circles).where(and(eq(circles.organizationId, organizationId), eq(circles.name, "حلقة الفجر — تجربة"))).limit(1))[0];
    const circleId = existingCircle?.id ?? Number((await db.insert(circles).values({ organizationId, teacherId: teacher.id, name: "حلقة الفجر — تجربة", mosqueName: "بيانات تجريبية فقط", level: "intermediate", capacity: 12, meetingSummary: "جلسة تجربة آمنة، لا تمثل مؤسسة فعلية." }))[0].insertId);
    await db.insert(enrollments).values({ circleId, studentId: student.id }).onDuplicateKeyUpdate({ set: { status: "active" } });
    await db.insert(guardianStudentLinks).values({ guardianId: guardian.id, studentId: student.id, relationship: "ولي أمر تجريبي" }).onDuplicateKeyUpdate({ set: { relationship: "ولي أمر تجريبي" } });
    const seededSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.circleId, circleId)).limit(1);
    if (!seededSessions[0]) {
      for (let offset = 0; offset < 4; offset += 1) {
        const startsAt = new Date();
        startsAt.setUTCDate(startsAt.getUTCDate() - (offset * 7 + 2));
        startsAt.setUTCHours(15, 0, 0, 0);
        const sessionId = Number((await db.insert(sessions).values({ circleId, teacherId: teacher.id, title: `جلسة تجربة ${4 - offset}`, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000), status: "completed", notes: "بيانات تجربة معزولة." }))[0].insertId);
        await db.insert(attendanceRecords).values({ sessionId, studentId: student.id, status: "present", notes: "حضور تجريبي", recordedById: teacher.id, recordedAt: startsAt });
        await db.insert(progressRecords).values({ circleId, sessionId, studentId: student.id, teacherId: teacher.id, recordedAt: startsAt, memorizationFrom: "سورة النبأ", memorizationTo: `آية ${12 + offset * 4}`, revisionFrom: "سورة الملك", revisionTo: `آية ${6 + offset * 3}`, tajweedGrade: "very_good", notes: "سجل تجربة آمن", pointsAwarded: 4 + offset * 2 });
      }
    }
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const currentWeekSession = (await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.circleId, circleId), gte(sessions.startsAt, weekStart))).limit(1))[0];
    if (!currentWeekSession) {
      const startsAt = new Date();
      startsAt.setUTCHours(15, 0, 0, 0);
      const sessionId = Number((await db.insert(sessions).values({ circleId, teacherId: teacher.id, title: "جلسة التجربة لهذا الأسبوع", startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000), status: "completed", notes: "بيانات تجربة معزولة." }))[0].insertId);
      await db.insert(attendanceRecords).values({ sessionId, studentId: student.id, status: "present", notes: "حضور تجريبي لهذا الأسبوع", recordedById: teacher.id, recordedAt: startsAt });
      await db.insert(progressRecords).values({ circleId, sessionId, studentId: student.id, teacherId: teacher.id, recordedAt: startsAt, memorizationFrom: "سورة النبأ", memorizationTo: "آية 28", revisionFrom: "سورة الملك", revisionTo: "آية 15", tajweedGrade: "excellent", notes: "سجل تجربة لهذا الأسبوع", pointsAwarded: 10 });
    }
    return { organizationId, guardianId: guardian.id, studentId: student.id, circleId, isDemo: true };
  }),
});
