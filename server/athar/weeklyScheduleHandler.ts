import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { weeklyReportSchedules } from "../../drizzle/schema";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import { deliverWeeklyReport } from "./weeklyDelivery";

export async function handleWeeklyReportSchedule(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "database-unavailable" });
    const schedule = (
      await db
        .select()
        .from(weeklyReportSchedules)
        .where(eq(weeklyReportSchedules.scheduleCronTaskUid, user.taskUid))
        .limit(1)
    )[0];
    if (!schedule || !schedule.isEnabled) return res.json({ ok: true, skipped: "orphan-or-disabled" });
    const result = await deliverWeeklyReport({
      organizationId: schedule.organizationId,
      guardianId: schedule.guardianId,
      studentId: schedule.studentId,
      scheduleCronTaskUid: user.taskUid,
    });
    return res.json({ ok: true, delivered: result.delivered, weekStart: result.weekStart.toISOString() });
  } catch (error) {
    const details = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    return res.status(500).json({ error: "weekly-report-failed", details, timestamp: new Date().toISOString() });
  }
}
