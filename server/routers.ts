import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { projectsRouter } from "./projectsRouter";
import { aiProjectGeneratorRouter } from "./aiProjectGenerator";
import { aiTeamRoleGeneratorRouter } from "./aiTeamRoleGenerator";
import { stepProgressRouter } from "./stepProgressRouter";
import { requirementProgressRouter } from "./requirementProgressRouter";
import { z } from "zod";
import { getDb } from "./db";
import { tasks, lists, projects, notes, subtasks } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  getUserTasks,
  getTasksByList,
  getTasksByDate,
  getTasksByProject,
  getTasksByKanbanColumn,
  getPendingTasks,
  getCompletedTasks,
  getUserLists,
  getUserProjects,
  getUserNotes,
  getNotesByProject,
  getTaskSubtasks,
  getStatistics,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  aiProjectGenerator: aiProjectGeneratorRouter,
  aiTeamRoleGenerator: aiTeamRoleGeneratorRouter,
  stepProgress: stepProgressRouter,
  requirementProgress: requirementProgressRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Task procedures
  tasks: router({
    list: protectedProcedure.query(({ ctx }) => getUserTasks(ctx.user.id)),
    
    byList: protectedProcedure
      .input(z.object({ listId: z.string() }))
      .query(({ ctx, input }) => getTasksByList(ctx.user.id, input.listId)),
    
    byDate: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(({ ctx, input }) => getTasksByDate(ctx.user.id, input.date)),
    
    byProject: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(({ ctx, input }) => getTasksByProject(ctx.user.id, input.projectId)),
    
    byKanban: protectedProcedure
      .input(z.object({ column: z.string() }))
      .query(({ ctx, input }) => getTasksByKanbanColumn(ctx.user.id, input.column)),
    
    pending: protectedProcedure.query(({ ctx }) => getPendingTasks(ctx.user.id)),
    
    completed: protectedProcedure.query(({ ctx }) => getCompletedTasks(ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        listId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["منخفضة", "متوسطة", "عالية"]).default("متوسطة"),
        dueDate: z.string().optional(),
        dueTime: z.string().optional(),
        projectId: z.string().optional(),
        recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const taskId = nanoid();
        await db.insert(tasks).values({
          id: taskId,
          userId: ctx.user.id,
          listId: input.listId,
          name: input.name,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate,
          dueTime: input.dueTime,
          projectId: input.projectId,
          recurrence: input.recurrence,
          kanbanColumn: "todo",
        });
        
        return { id: taskId, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["منخفضة", "متوسطة", "عالية"]).optional(),
        dueDate: z.string().optional(),
        dueTime: z.string().optional(),
        isDone: z.boolean().optional(),
        kanbanColumn: z.string().optional(),
        recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
        recurrenceEndDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
        if (input.dueTime !== undefined) updateData.dueTime = input.dueTime;
        if (input.isDone !== undefined) updateData.isDone = input.isDone;
        if (input.kanbanColumn !== undefined) updateData.kanbanColumn = input.kanbanColumn;
        if (input.recurrence !== undefined) updateData.recurrence = input.recurrence;
        if (input.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = input.recurrenceEndDate;
        
        await db.update(tasks)
          .set(updateData)
          .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(tasks)
          .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)));
        
        return { success: true };
      }),
  }),

  // List procedures
  lists: router({
    list: protectedProcedure.query(({ ctx }) => getUserLists(ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        icon: z.string().default("📋"),
        color: z.string().default("#7C6EFA"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const listId = nanoid();
        await db.insert(lists).values({
          id: listId,
          userId: ctx.user.id,
          name: input.name,
          icon: input.icon,
          color: input.color,
        });
        
        return { id: listId, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.icon !== undefined) updateData.icon = input.icon;
        if (input.color !== undefined) updateData.color = input.color;
        
        await db.update(lists)
          .set(updateData)
          .where(and(eq(lists.id, input.id), eq(lists.userId, ctx.user.id)));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(lists)
          .where(and(eq(lists.id, input.id), eq(lists.userId, ctx.user.id)));
        
        return { success: true };
      }),
  }),

  // Project procedures
  projects: router({
    list: protectedProcedure.query(({ ctx }) => getUserProjects(ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().default("🚀"),
        color: z.string().default("#7C6EFA"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const projectId = nanoid();
        await db.insert(projects).values({
          id: projectId,
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          icon: input.icon,
          color: input.color,
        });
        
        return { id: projectId, success: true };
      }),
    
    update: projectsRouter._def.procedures.update,
    
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(projects)
          .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)));
        
        return { success: true };
      }),
    
    // Advanced project management procedures from projectsRouter
    getDetails: projectsRouter._def.procedures.getDetails,
    addMember: projectsRouter._def.procedures.addMember,
    removeMember: projectsRouter._def.procedures.removeMember,
    updateMemberRole: projectsRouter._def.procedures.updateMemberRole,
    getActivities: projectsRouter._def.procedures.getActivities,
    addComment: projectsRouter._def.procedures.addComment,
    getComments: projectsRouter._def.procedures.getComments,
    uploadFile: projectsRouter._def.procedures.uploadFile,
    getFiles: projectsRouter._def.procedures.getFiles,
    addDependency: projectsRouter._def.procedures.addDependency,
    getDependencies: projectsRouter._def.procedures.getDependencies,
    createTemplate: projectsRouter._def.procedures.createTemplate,
    getTemplates: projectsRouter._def.procedures.getTemplates,
    getStatistics: projectsRouter._def.procedures.getStatistics,
    createStep: projectsRouter._def.procedures.createStep,
    getSteps: projectsRouter._def.procedures.getSteps,
    createRequirement: projectsRouter._def.procedures.createRequirement,
    getRequirements: projectsRouter._def.procedures.getRequirements,
  }),

  // Notes procedures
  notes: router({
    list: protectedProcedure.query(({ ctx }) => getUserNotes(ctx.user.id)),
    
    byProject: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(({ ctx, input }) => getNotesByProject(ctx.user.id, input.projectId)),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        projectId: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const noteId = nanoid();
        await db.insert(notes).values({
          id: noteId,
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          projectId: input.projectId,
          tags: input.tags,
        });
        
        return { id: noteId, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.string().optional(),
        isPinned: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, any> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.isPinned !== undefined) updateData.isPinned = input.isPinned;
        
        await db.update(notes)
          .set(updateData)
          .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.user.id)));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(notes)
          .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.user.id)));
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
