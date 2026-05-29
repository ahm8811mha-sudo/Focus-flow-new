import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { projectSteps } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";

const getDatabase = async () => getDb();

export const stepProgressRouter = router({
  /**
   * Update step progress
   */
  updateStepProgress: protectedProcedure
    .input(
      z.object({
        stepId: z.string(),
        projectId: z.string(),
        isCompleted: z.boolean().optional(),
        status: z
          .enum([
            "pending",
            "in-progress",
            "completed",
            "on-hold",
            "cancelled",
            "delayed",
          ])
          .optional(),
        progress: z.number().min(0).max(100).optional(),
        actualStartDate: z.string().optional(),
        actualEndDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const db = await getDatabase();
        if (!db) throw new Error("Database connection failed");
        const updateData: Record<string, any> = {};

        if (input.isCompleted !== undefined) {
          updateData.isCompleted = input.isCompleted;
        }
        if (input.status !== undefined) {
          updateData.status = input.status;
        }
        if (input.progress !== undefined) {
          updateData.progress = input.progress;
        }
        if (input.actualStartDate !== undefined) {
          updateData.actualStartDate = input.actualStartDate;
        }
        if (input.actualEndDate !== undefined) {
          updateData.actualEndDate = input.actualEndDate;
        }
        if (input.notes !== undefined) {
          updateData.notes = input.notes;
        }

        await db
          .update(projectSteps)
          .set(updateData)
          .where(
            and(
              eq(projectSteps.id, input.stepId),
              eq(projectSteps.projectId, input.projectId)
            )
          );

        return { success: true, message: "تم تحديث الخطوة بنجاح" };
      } catch (error) {
        console.error("Failed to update step progress:", error);
        throw new Error("فشل تحديث الخطوة");
      }
    }),

  /**
   * Get project completion percentage
   */
  getProjectCompletion: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }: { input: { projectId: string } }) => {
      try {
        const db = await getDatabase();
        if (!db) throw new Error("Database connection failed");
        const steps = await db
          .select()
          .from(projectSteps)
          .where(eq(projectSteps.projectId, input.projectId));

        if (steps.length === 0) {
          return {
            completionPercentage: 0,
            totalSteps: 0,
            completedSteps: 0,
            inProgressSteps: 0,
            delayedSteps: 0,
            pendingSteps: 0,
          };
        }

        const completedSteps = steps.filter(
          (s: typeof projectSteps.$inferSelect) => s.isCompleted || s.status === "completed"
        ).length;
        const inProgressSteps = steps.filter(
          (s: typeof projectSteps.$inferSelect) => s.status === "in-progress"
        ).length;
        const delayedSteps = steps.filter(
          (s: typeof projectSteps.$inferSelect) => s.status === "delayed"
        ).length;
        const pendingSteps = steps.filter(
          (s: typeof projectSteps.$inferSelect) => s.status === "pending"
        ).length;

        const completionPercentage = Math.round(
          (completedSteps / steps.length) * 100
        );

        return {
          completionPercentage,
          totalSteps: steps.length,
          completedSteps,
          inProgressSteps,
          delayedSteps,
          pendingSteps,
          averageProgress: Math.round(
            steps.reduce((sum: number, s: typeof projectSteps.$inferSelect) => sum + (s.progress || 0), 0) /
              steps.length
          ),
        };
      } catch (error) {
        console.error("Failed to get project completion:", error);
        throw new Error("فشل حساب نسبة الإنجاز");
      }
    }),

  /**
   * Get delayed steps
   */
  getDelayedSteps: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }: { input: { projectId: string } }) => {
      try {
        const db = await getDatabase();
        if (!db) throw new Error("Database connection failed");
        const today = new Date().toISOString().split("T")[0];

        const delayedSteps = await db
          .select()
          .from(projectSteps)
          .where(
            and(
              eq(projectSteps.projectId, input.projectId),
              eq(projectSteps.status, "in-progress")
            )
          );

        return delayedSteps.filter((step: typeof projectSteps.$inferSelect) => {
          if (!step.plannedEndDate) return false;
          return step.plannedEndDate < today && !step.isCompleted;
        });
      } catch (error) {
        console.error("Failed to get delayed steps:", error);
        throw new Error("فشل الحصول على الخطوات المتأخرة");
      }
    }),

  /**
   * Get upcoming deadlines
   */
  getUpcomingDeadlines: protectedProcedure
    .input(z.object({ projectId: z.string(), daysAhead: z.number().default(7) }))
    .query(async ({ input }: { input: { projectId: string; daysAhead: number } }) => {
      try {
        const db = await getDatabase();
        if (!db) throw new Error("Database connection failed");
        const today = new Date();
        const futureDate = new Date(today.getTime() + input.daysAhead * 24 * 60 * 60 * 1000);

        const todayStr = today.toISOString().split("T")[0];
        const futureDateStr = futureDate.toISOString().split("T")[0];

        const upcomingSteps = await db
          .select()
          .from(projectSteps)
          .where(
            and(
              eq(projectSteps.projectId, input.projectId),
              eq(projectSteps.isCompleted, false)
            )
          );

        return upcomingSteps.filter((step: typeof projectSteps.$inferSelect) => {
          if (!step.plannedEndDate) return false;
          return (
            step.plannedEndDate >= todayStr &&
            step.plannedEndDate <= futureDateStr
          );
        });
      } catch (error) {
        console.error("Failed to get upcoming deadlines:", error);
        throw new Error("فشل الحصول على المواعيد القادمة");
      }
    }),
});
