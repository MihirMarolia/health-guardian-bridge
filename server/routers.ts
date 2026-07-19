import { z } from "zod";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getServiceRequestsByPatient,
  getTimelineByPatient,
  updateServiceRequestStatus,
  logAuditEvent,
} from "./db";

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

  clinical: router({
    /**
     * Hydrates the patient workspace by fetching all service requests and
     * timeline events for a given patient. Safe-fails to empty arrays if the
     * database is unavailable (DATABASE_URL missing or connection down).
     */
    getPatientWorkspace: publicProcedure
      .input(z.object({ patientId: z.string() }))
      .query(async ({ input }) => {
        try {
          const [serviceRequests, timeline] = await Promise.all([
            getServiceRequestsByPatient(input.patientId),
            getTimelineByPatient(input.patientId),
          ]);
          return { serviceRequests, timeline };
        } catch (error) {
          console.error(
            "[clinical.getPatientWorkspace] Database error – returning empty workspace:",
            error
          );
          return { serviceRequests: [], timeline: [] };
        }
      }),

    /**
     * Persists a clinician-verified referral by:
     *   1. Updating the service request status to 'pending' with verifiedByPhysician = true
     *   2. Writing an immutable audit log entry (PIPEDA/PHIPA compliance)
     *
     * Safe-fails without crashing the server if the database is down.
     */
    executeReferral: publicProcedure
      .input(
        z.object({
          id: z.string(),
          patientId: z.string(),
          specialistDomain: z.string(),
          notes: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const updated = await updateServiceRequestStatus(input.id, "pending", true);

          await logAuditEvent({
            id: nanoid(),
            actorId: ctx.user?.id ?? 0, // 0 = unauthenticated / system actor
            action: "EXECUTE_REFERRAL",
            resourceType: "ServiceRequest",
            resourceId: input.id,
            details: JSON.stringify({
              patientId: input.patientId,
              specialistDomain: input.specialistDomain,
              notes: input.notes,
            }),
          });

          return { success: true, serviceRequest: updated };
        } catch (error) {
          console.error(
            "[clinical.executeReferral] Database error – safe-failing:",
            error
          );
          return { success: false, error: String(error) };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
