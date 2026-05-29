import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  projects,
  projectMembers,
  projectActivities,
  projectComments,
  projectFiles,
  projectTemplates,
  taskDependencies,
  tasks,
  users,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const projectsRouter = router({
  // Get project details with statistics
  getDetails: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      // Get project statistics
      const projectTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, input.projectId));

      const completedTasks = projectTasks.filter((t) => t.isDone).length;
      const totalTasks = projectTasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get members
      const members = await db
        .select({
          id: projectMembers.id,
          userId: projectMembers.userId,
          role: projectMembers.role,
          name: users.name,
          email: users.email,
        })
        .from(projectMembers)
        .leftJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, input.projectId));

      return {
        ...project[0],
        statistics: {
          totalTasks,
          completedTasks,
          pendingTasks: totalTasks - completedTasks,
          progress,
        },
        members,
      };
    }),

  // Update project with advanced fields
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        status: z.enum(["active", "archived", "completed", "on-hold"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        priority: z.enum(["منخفضة", "متوسطة", "عالية"]).optional(),
        visibility: z.enum(["private", "shared", "public"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.startDate !== undefined) updateData.startDate = input.startDate;
      if (input.endDate !== undefined) updateData.endDate = input.endDate;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.visibility !== undefined) updateData.visibility = input.visibility;

      await db
        .update(projects)
        .set(updateData)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)));

      // Log activity
      await db.insert(projectActivities).values({
        id: nanoid(),
        projectId: input.id,
        userId: ctx.user.id,
        type: "updated",
        description: "تم تحديث المشروع",
      });

      return { success: true };
    }),

  // Add member to project
  addMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
        role: z.enum(["owner", "editor", "viewer", "commenter"]).default("viewer"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is project owner
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found or unauthorized");

      // Find user by email
      const targetUser = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!targetUser.length) throw new Error("User not found");

      // Add member
      const memberId = nanoid();
      await db.insert(projectMembers).values({
        id: memberId,
        projectId: input.projectId,
        userId: targetUser[0].id,
        role: input.role,
      });

      // Log activity
      await db.insert(projectActivities).values({
        id: nanoid(),
        projectId: input.projectId,
        userId: ctx.user.id,
        type: "member_added",
        description: `تمت إضافة ${input.email} كـ ${input.role}`,
      });

      return { success: true, memberId };
    }),

  // Remove member from project
  removeMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is project owner
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found or unauthorized");

      // Get member info for logging
      const member = await db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.id, input.memberId))
        .limit(1);

      // Remove member
      await db.delete(projectMembers).where(eq(projectMembers.id, input.memberId));

      // Log activity
      if (member.length) {
        await db.insert(projectActivities).values({
          id: nanoid(),
          projectId: input.projectId,
          userId: ctx.user.id,
          type: "member_removed",
          description: `تمت إزالة عضو من المشروع`,
        });
      }

      return { success: true };
    }),

  // Update member role
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        memberId: z.string(),
        role: z.enum(["owner", "editor", "viewer", "commenter"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is project owner
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found or unauthorized");

      await db
        .update(projectMembers)
        .set({ role: input.role })
        .where(eq(projectMembers.id, input.memberId));

      return { success: true };
    }),

  // Get project activities
  getActivities: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: projectActivities.id,
          type: projectActivities.type,
          description: projectActivities.description,
          userName: users.name,
          createdAt: projectActivities.createdAt,
        })
        .from(projectActivities)
        .leftJoin(users, eq(projectActivities.userId, users.id))
        .where(eq(projectActivities.projectId, input.projectId))
        .orderBy(desc(projectActivities.createdAt))
        .limit(50);
    }),

  // Add comment to project
  addComment: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        taskId: z.string().optional(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const commentId = nanoid();
      await db.insert(projectComments).values({
        id: commentId,
        projectId: input.projectId,
        taskId: input.taskId,
        userId: ctx.user.id,
        content: input.content,
      });

      // Log activity
      await db.insert(projectActivities).values({
        id: nanoid(),
        projectId: input.projectId,
        userId: ctx.user.id,
        type: "commented",
        description: "تمت إضافة تعليق",
        relatedTaskId: input.taskId,
      });

      return { success: true, commentId };
    }),

  // Get project comments
  getComments: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: projectComments.id,
          content: projectComments.content,
          userName: users.name,
          userEmail: users.email,
          taskId: projectComments.taskId,
          createdAt: projectComments.createdAt,
        })
        .from(projectComments)
        .leftJoin(users, eq(projectComments.userId, users.id))
        .where(eq(projectComments.projectId, input.projectId))
        .orderBy(desc(projectComments.createdAt));
    }),

  // Upload project file
  uploadFile: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
        fileType: z.string().optional(),
        folder: z.string().default("/"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const fileId = nanoid();
      await db.insert(projectFiles).values({
        id: fileId,
        projectId: input.projectId,
        uploadedBy: ctx.user.id,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        fileType: input.fileType,
        folder: input.folder,
      });

      // Log activity
      await db.insert(projectActivities).values({
        id: nanoid(),
        projectId: input.projectId,
        userId: ctx.user.id,
        type: "updated",
        description: `تم رفع ملف: ${input.fileName}`,
      });

      return { success: true, fileId };
    }),

  // Get project files
  getFiles: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: projectFiles.id,
          fileName: projectFiles.fileName,
          fileUrl: projectFiles.fileUrl,
          fileSize: projectFiles.fileSize,
          fileType: projectFiles.fileType,
          folder: projectFiles.folder,
          uploadedBy: users.name,
          createdAt: projectFiles.createdAt,
        })
        .from(projectFiles)
        .leftJoin(users, eq(projectFiles.uploadedBy, users.id))
        .where(eq(projectFiles.projectId, input.projectId))
        .orderBy(desc(projectFiles.createdAt));
    }),

  // Add task dependency
  addDependency: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        taskId: z.string(),
        dependsOnTaskId: z.string(),
        dependencyType: z.enum(["finish-to-start", "start-to-start", "finish-to-finish", "start-to-finish"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const dependencyId = nanoid();
      await db.insert(taskDependencies).values({
        id: dependencyId,
        projectId: input.projectId,
        taskId: input.taskId,
        dependsOnTaskId: input.dependsOnTaskId,
        dependencyType: input.dependencyType,
      });

      return { success: true, dependencyId };
    }),

  // Get task dependencies for Gantt chart
  getDependencies: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(taskDependencies)
        .where(eq(taskDependencies.projectId, input.projectId));
    }),

  // Create project template
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        icon: z.string().default("📋"),
        color: z.string().default("#7C6EFA"),
        templateData: z.string(), // JSON string
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const templateId = nanoid();
      await db.insert(projectTemplates).values({
        id: templateId,
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        icon: input.icon,
        color: input.color,
        templateData: input.templateData,
        isPublic: input.isPublic,
      });

      return { success: true, templateId };
    }),

  // Get project templates
  getTemplates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(projectTemplates)
      .where(eq(projectTemplates.userId, ctx.user.id))
      .orderBy(desc(projectTemplates.createdAt));
  }),

  // Get project statistics
  getStatistics: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const projectTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, input.projectId));

      const completed = projectTasks.filter((t) => t.isDone).length;
      const pending = projectTasks.length - completed;
      const byPriority = {
        عالية: projectTasks.filter((t) => t.priority === "عالية").length,
        متوسطة: projectTasks.filter((t) => t.priority === "متوسطة").length,
        منخفضة: projectTasks.filter((t) => t.priority === "منخفضة").length,
      };

      return {
        total: projectTasks.length,
        completed,
        pending,
        progress: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0,
        byPriority,
      };
    }),

  // ============ PROJECT STEPS PROCEDURES ============

  // Create project step
  createStep: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        stepName: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string().optional(),
        plannedEndDate: z.string().optional(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectSteps } = await import("../drizzle/schema");
      const stepId = nanoid();

      await db.insert(projectSteps).values({
        id: stepId,
        projectId: input.projectId,
        stepName: input.stepName,
        description: input.description,
        startDate: input.startDate,
        plannedEndDate: input.plannedEndDate,
        duration: input.duration,
        status: "pending",
        progress: 0,
      });

      return { id: stepId, ...input };
    }),

  // Get project steps
  getSteps: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectSteps } = await import("../drizzle/schema");
      const steps = await db
        .select()
        .from(projectSteps)
        .where(eq(projectSteps.projectId, input.projectId))
        .orderBy(projectSteps.order);

      return steps;
    }),

  // Update project step
  updateStep: protectedProcedure
    .input(
      z.object({
        stepId: z.string(),
        projectId: z.string(),
        stepName: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        plannedEndDate: z.string().optional(),
        actualEndDate: z.string().optional(),
        status: z.enum(["pending", "in-progress", "completed", "on-hold", "cancelled"]).optional(),
        progress: z.number().min(0).max(100).optional(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectSteps } = await import("../drizzle/schema");
      const updateData: any = {};

      if (input.stepName) updateData.stepName = input.stepName;
      if (input.description) updateData.description = input.description;
      if (input.startDate) updateData.startDate = input.startDate;
      if (input.plannedEndDate) updateData.plannedEndDate = input.plannedEndDate;
      if (input.actualEndDate) updateData.actualEndDate = input.actualEndDate;
      if (input.status) updateData.status = input.status;
      if (input.progress !== undefined) updateData.progress = input.progress;
      if (input.duration) updateData.duration = input.duration;

      await db
        .update(projectSteps)
        .set(updateData)
        .where(eq(projectSteps.id, input.stepId));

      return { success: true };
    }),

  // Delete project step
  deleteStep: protectedProcedure
    .input(z.object({ stepId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectSteps } = await import("../drizzle/schema");
      await db.delete(projectSteps).where(eq(projectSteps.id, input.stepId));

      return { success: true };
    }),

  // ============ PROJECT REQUIREMENTS PROCEDURES ============

  // Create project requirement
  createRequirement: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        stepId: z.string().optional(),
        requirementName: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["resource", "budget", "material", "personnel", "equipment", "other"]),
        quantity: z.string().optional(),
        unit: z.string().optional(),
        estimatedCost: z.number().optional(),
        priority: z.enum(["منخفضة", "متوسطة", "عالية"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectRequirements } = await import("../drizzle/schema");
      const requirementId = nanoid();

      await db.insert(projectRequirements).values({
        id: requirementId,
        projectId: input.projectId,
        stepId: input.stepId,
        requirementName: input.requirementName,
        description: input.description,
        type: input.type,
        quantity: input.quantity,
        unit: input.unit,
        estimatedCost: input.estimatedCost ? input.estimatedCost.toString() : undefined,
        priority: input.priority || "متوسطة",
        status: "pending",
      });

      return { id: requirementId, ...input };
    }),

  // Get project requirements
  getRequirements: protectedProcedure
    .input(z.object({ projectId: z.string(), stepId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectRequirements } = await import("../drizzle/schema");
      const requirements = await db
        .select()
        .from(projectRequirements)
        .where(eq(projectRequirements.projectId, input.projectId));

      if (input.stepId) {
        return requirements.filter((r) => r.stepId === input.stepId);
      }

      return requirements;
    }),

  // Update project requirement
  updateRequirement: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        projectId: z.string(),
        requirementName: z.string().optional(),
        description: z.string().optional(),
        type: z.enum(["resource", "budget", "material", "personnel", "equipment", "other"]).optional(),
        quantity: z.string().optional(),
        unit: z.string().optional(),
        estimatedCost: z.number().optional(),
        actualCost: z.number().optional(),
        status: z.enum(["pending", "allocated", "used", "completed"]).optional(),
        priority: z.enum(["منخفضة", "متوسطة", "عالية"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectRequirements } = await import("../drizzle/schema");
      const updateData: any = {};

      if (input.requirementName) updateData.requirementName = input.requirementName;
      if (input.description) updateData.description = input.description;
      if (input.type) updateData.type = input.type;
      if (input.quantity) updateData.quantity = input.quantity;
      if (input.unit) updateData.unit = input.unit;
      if (input.estimatedCost) updateData.estimatedCost = input.estimatedCost.toString();
      if (input.actualCost) updateData.actualCost = input.actualCost.toString();
      if (input.status) updateData.status = input.status;
      if (input.priority) updateData.priority = input.priority;

      await db
        .update(projectRequirements)
        .set(updateData)
        .where(eq(projectRequirements.id, input.requirementId));

      return { success: true };
    }),

  // Delete project requirement
  deleteRequirement: protectedProcedure
    .input(z.object({ requirementId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      const { projectRequirements } = await import("../drizzle/schema");
      await db.delete(projectRequirements).where(eq(projectRequirements.id, input.requirementId));

      return { success: true };
    }),
});
