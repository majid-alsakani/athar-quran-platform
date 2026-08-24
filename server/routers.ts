import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { circlesRouter } from "./routers/circles";
import { dashboardRouter } from "./routers/dashboard";
import { notificationsRouter } from "./routers/notifications";
import { organizationRouter } from "./routers/organization";
import { reportsRouter } from "./routers/reports";
import { sessionsRouter } from "./routers/sessions";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  organization: organizationRouter,
  circles: circlesRouter,
  sessions: sessionsRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
