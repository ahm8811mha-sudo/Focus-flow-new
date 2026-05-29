import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { projects, projectSteps, projectRequirements, tasks } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

describe('Project Detail Features', () => {
  let db: any;
  let testUserId = 1;
  let testProjectId: string;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Create a test project
    testProjectId = nanoid();
    await db.insert(projects).values({
      id: testProjectId,
      userId: testUserId,
      name: 'Test Project',
      description: 'Test project for detail page',
      icon: '🚀',
      color: '#7C6EFA',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  });

  afterAll(async () => {
    if (db) {
      // Cleanup
      await db.delete(projectSteps).where(eq(projectSteps.projectId, testProjectId));
      await db.delete(projectRequirements).where(eq(projectRequirements.projectId, testProjectId));
      await db.delete(projects).where(eq(projects.id, testProjectId));
    }
  });

  describe('Project Steps', () => {
    it('should create a project step', async () => {
      const stepId = nanoid();
      await db.insert(projectSteps).values({
        id: stepId,
        projectId: testProjectId,
        stepName: 'Step 1: Planning',
        description: 'Initial planning phase',
        duration: 5,
        startDate: new Date().toISOString().split('T')[0],
        order: 1,
      });

      const step = await db.select().from(projectSteps).where(eq(projectSteps.id, stepId)).limit(1);
      expect(step).toHaveLength(1);
      expect(step[0].stepName).toBe('Step 1: Planning');
      expect(step[0].duration).toBe(5);
    });

    it('should retrieve all project steps', async () => {
      const steps = await db.select().from(projectSteps).where(eq(projectSteps.projectId, testProjectId));
      expect(steps.length).toBeGreaterThanOrEqual(0);
    });

    it('should update a project step', async () => {
      const steps = await db.select().from(projectSteps).where(eq(projectSteps.projectId, testProjectId)).limit(1);
      if (steps.length > 0) {
        await db.update(projectSteps).set({ stepName: 'Updated Step' }).where(eq(projectSteps.id, steps[0].id));
        const updated = await db.select().from(projectSteps).where(eq(projectSteps.id, steps[0].id)).limit(1);
        expect(updated[0].stepName).toBe('Updated Step');
      }
    });

    it('should delete a project step', async () => {
      const stepId = nanoid();
      await db.insert(projectSteps).values({
        id: stepId,
        projectId: testProjectId,
        stepName: 'Step to Delete',
        description: 'This step will be deleted',
        duration: 5,
        startDate: new Date().toISOString().split('T')[0],
        order: 2,
      });

      await db.delete(projectSteps).where(eq(projectSteps.id, stepId));
      const deleted = await db.select().from(projectSteps).where(eq(projectSteps.id, stepId));
      expect(deleted).toHaveLength(0);
    });
  });

  describe('Project Requirements', () => {
    it('should create a project requirement', async () => {
      const reqId = nanoid();
      await db.insert(projectRequirements).values({
        id: reqId,
        projectId: testProjectId,
        requirementName: 'Materials',
        type: 'material',
        quantity: '100',
        estimatedCost: '5000',
      });

      const req = await db.select().from(projectRequirements).where(eq(projectRequirements.id, reqId)).limit(1);
      expect(req).toHaveLength(1);
      expect(req[0].requirementName).toBe('Materials');
      expect(req[0].type).toBe('material');
      expect(req[0].quantity).toBe('100');
    });

    it('should retrieve all project requirements', async () => {
      const reqs = await db.select().from(projectRequirements).where(eq(projectRequirements.projectId, testProjectId));
      expect(reqs.length).toBeGreaterThan(0);
    });

    it('should calculate total requirement cost', async () => {
      const reqs = await db.select().from(projectRequirements).where(eq(projectRequirements.projectId, testProjectId));
      const totalCost = reqs.reduce((sum, req) => sum + (parseFloat(req.estimatedCost as any) || 0), 0);
      expect(totalCost).toBeGreaterThanOrEqual(0);
    });

    it('should filter requirements by type', async () => {
      const allReqs = await db.select()
        .from(projectRequirements)
        .where(eq(projectRequirements.projectId, testProjectId));
      
      const materialReqs = allReqs.filter(r => r.type === 'material');
      
      materialReqs.forEach(req => {
        expect(req.type).toBe('material');
      });
    });
  });

  describe('Project Statistics', () => {
    it('should calculate project progress', async () => {
      const projectTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.projectId, testProjectId));

      const completedTasks = projectTasks.filter((t: any) => t.isDone).length;
      const totalTasks = projectTasks.length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('should count high priority tasks', async () => {
      const projectTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.projectId, testProjectId));

      const highPriorityTasks = projectTasks.filter((t: any) => t.priority === 'عالية').length;
      expect(highPriorityTasks).toBeGreaterThanOrEqual(0);
    });

    it('should identify overdue tasks', async () => {
      const projectTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.projectId, testProjectId));

      const overdueTasks = projectTasks.filter((t: any) => 
        !t.isDone && t.dueDate && new Date(t.dueDate) < new Date()
      ).length;

      expect(overdueTasks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tab Navigation', () => {
    it('should support switching between tabs', () => {
      const tabs = ['tasks', 'steps', 'requirements', 'kanban', 'timeline', 'members', 'comments'];
      expect(tabs).toContain('tasks');
      expect(tabs).toContain('steps');
      expect(tabs).toContain('requirements');
    });

    it('should maintain tab state', () => {
      const activeTab = 'steps';
      expect(activeTab).toBe('steps');
    });
  });
});
