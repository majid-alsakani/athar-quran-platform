import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { notifications } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notificationsRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(notifications).where(eq(notifications.recipientId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(25);
  }),
  markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, input.id), eq(notifications.recipientId, ctx.user.id)));
    return { success: true };
  }),
});
