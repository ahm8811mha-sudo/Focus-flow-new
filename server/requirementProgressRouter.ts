import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import { projectRequirements } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export const requirementProgressRouter = router({
  markRequirementComplete: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        projectId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const now = new Date();
      await db
        .update(projectRequirements)
        .set({
          isCompleted: true,
          completedAt: now,
          completedBy: ctx.user.id,
          notes: input.notes,
          updatedAt: now,
        })
        .where(
          and(
            eq(projectRequirements.id, input.requirementId),
            eq(projectRequirements.projectId, input.projectId)
          )
        );

      return { success: true };
    }),

  markRequirementIncomplete: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        projectId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const now = new Date();
      await db
        .update(projectRequirements)
        .set({
          isCompleted: false,
          completedAt: null,
          completedBy: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(projectRequirements.id, input.requirementId),
            eq(projectRequirements.projectId, input.projectId)
          )
        );

      return { success: true };
    }),

  shareRequirement: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        projectId: z.string(),
        userIds: z.array(z.number()),
        permissions: z.enum(['view', 'edit', 'comment']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const requirement = await db
        .select()
        .from(projectRequirements)
        .where(
          and(
            eq(projectRequirements.id, input.requirementId),
            eq(projectRequirements.projectId, input.projectId)
          )
        )
        .limit(1);

      if (!requirement.length) throw new Error('Requirement not found');

      const req = requirement[0];
      const currentSharedWith = (req.sharedWith as any as number[] | null) || [];
      const newSharedWith = Array.from(new Set([...currentSharedWith, ...input.userIds]));

      const sharePermissions = (req.sharePermissions as any as Record<number, string> | null) || {};
      input.userIds.forEach((userId) => {
        sharePermissions[userId] = input.permissions;
      });

      const now = new Date();
      await db
        .update(projectRequirements)
        .set({
          sharedWith: newSharedWith as any,
          sharePermissions: sharePermissions as any,
          updatedAt: now,
        })
        .where(eq(projectRequirements.id, input.requirementId));

      return { success: true, sharedWith: newSharedWith };
    }),

  unshareRequirement: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        projectId: z.string(),
        userIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const requirement = await db
        .select()
        .from(projectRequirements)
        .where(
          and(
            eq(projectRequirements.id, input.requirementId),
            eq(projectRequirements.projectId, input.projectId)
          )
        )
        .limit(1);

      if (!requirement.length) throw new Error('Requirement not found');

      const req = requirement[0];
      const currentSharedWith = (req.sharedWith as any as number[] | null) || [];
      const newSharedWith = currentSharedWith.filter((id) => !input.userIds.includes(id));

      const sharePermissions = (req.sharePermissions as any as Record<number, string> | null) || {};
      input.userIds.forEach((userId) => {
        delete sharePermissions[userId];
      });

      const now = new Date();
      await db
        .update(projectRequirements)
        .set({
          sharedWith: newSharedWith.length > 0 ? (newSharedWith as any) : null,
          sharePermissions: Object.keys(sharePermissions).length > 0 ? (sharePermissions as any) : null,
          updatedAt: now,
        })
        .where(eq(projectRequirements.id, input.requirementId));

      return { success: true, sharedWith: newSharedWith };
    }),

  getRequirementShares: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const requirement = await db
        .select()
        .from(projectRequirements)
        .where(
          and(
            eq(projectRequirements.id, input.requirementId),
            eq(projectRequirements.projectId, input.projectId)
          )
        )
        .limit(1);

      if (!requirement.length) throw new Error('Requirement not found');

      const req = requirement[0];
      return {
        sharedWith: (req.sharedWith as any as number[] | null) || [],
        sharePermissions: (req.sharePermissions as any as Record<number, string> | null) || {},
      };
    }),

  getRequirementTimeInfo: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const requirement = await db
        .select()
        .from(projectRequirements)
        .where(
          and(
            eq(projectRequirements.id, input.requirementId),
            eq(projectRequirements.projectId, input.projectId)
          )
        )
        .limit(1);

      if (!requirement.length) throw new Error('Requirement not found');

      const req = requirement[0];
      return {
        isCompleted: req.isCompleted,
        completedAt: req.completedAt,
        completedBy: req.completedBy,
      };
    }),

  getSharedRequirements: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const requirements = await db
        .select()
        .from(projectRequirements)
        .where(eq(projectRequirements.projectId, input.projectId));

      return requirements.filter((req) => {
        const sharedWith = (req.sharedWith as any as number[] | null) || [];
        return sharedWith.includes(ctx.user.id);
      });
    }),
});
