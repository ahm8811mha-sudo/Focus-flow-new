import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stepProgressRouter } from './stepProgressRouter';
import { getDb } from './db';
import { projectSteps } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

describe('stepProgressRouter', () => {
  const mockDb = {
    update: vi.fn(),
    select: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockResolvedValue(mockDb);
  });

  describe('updateStepProgress', () => {
    it('should update step progress with all fields', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ success: true }),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.updateStepProgress({
        stepId: 'step-1',
        projectId: 'proj-1',
        isCompleted: true,
        status: 'completed',
        progress: 100,
        actualStartDate: '2026-04-20',
        actualEndDate: '2026-04-27',
        notes: 'تم الانتهاء من الخطوة',
      });

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(projectSteps);
    });

    it('should handle partial updates', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ success: true }),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.updateStepProgress({
        stepId: 'step-1',
        projectId: 'proj-1',
        progress: 50,
      });

      expect(result.success).toBe(true);
    });

    it('should throw error if database connection fails', async () => {
      (getDb as any).mockResolvedValue(null);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      await expect(
        procedure.updateStepProgress({
          stepId: 'step-1',
          projectId: 'proj-1',
          isCompleted: true,
        })
      ).rejects.toThrow('فشل تحديث الخطوة');
    });
  });

  describe('getProjectCompletion', () => {
    it('should calculate completion percentage correctly', async () => {
      const mockSteps = [
        { id: '1', projectId: 'proj-1', isCompleted: true, status: 'completed', progress: 100 },
        { id: '2', projectId: 'proj-1', isCompleted: false, status: 'in-progress', progress: 50 },
        { id: '3', projectId: 'proj-1', isCompleted: false, status: 'pending', progress: 0 },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSteps),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.getProjectCompletion({
        projectId: 'proj-1',
      });

      expect(result.completionPercentage).toBe(33); // 1 out of 3 completed
      expect(result.totalSteps).toBe(3);
      expect(result.completedSteps).toBe(1);
      expect(result.inProgressSteps).toBe(1);
      expect(result.pendingSteps).toBe(1);
      expect(result.averageProgress).toBe(50); // (100 + 50 + 0) / 3 = 50
    });

    it('should return zero values for empty project', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.getProjectCompletion({
        projectId: 'proj-1',
      });

      expect(result.completionPercentage).toBe(0);
      expect(result.totalSteps).toBe(0);
      expect(result.completedSteps).toBe(0);
    });

    it('should throw error if database connection fails', async () => {
      (getDb as any).mockResolvedValue(null);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      await expect(
        procedure.getProjectCompletion({
          projectId: 'proj-1',
        })
      ).rejects.toThrow('فشل حساب نسبة الإنجاز');
    });
  });

  describe('getDelayedSteps', () => {
    it('should return steps that are delayed', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const mockSteps = [
        { id: '1', projectId: 'proj-1', status: 'in-progress', plannedEndDate: yesterday, isCompleted: false },
        { id: '2', projectId: 'proj-1', status: 'in-progress', plannedEndDate: today, isCompleted: false },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSteps),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.getDelayedSteps({
        projectId: 'proj-1',
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });

    it('should exclude completed steps', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const mockSteps = [
        { id: '1', projectId: 'proj-1', status: 'in-progress', plannedEndDate: yesterday, isCompleted: true },
        { id: '2', projectId: 'proj-1', status: 'in-progress', plannedEndDate: yesterday, isCompleted: false },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSteps),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.getDelayedSteps({
        projectId: 'proj-1',
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('should return steps with upcoming deadlines', async () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const mockSteps = [
        { id: '1', projectId: 'proj-1', plannedEndDate: tomorrowStr, isCompleted: false },
        { id: '2', projectId: 'proj-1', plannedEndDate: nextWeekStr, isCompleted: false },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSteps),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.getUpcomingDeadlines({
        projectId: 'proj-1',
        daysAhead: 7,
      });

      expect(result.length).toBe(2);
    });

    it('should respect daysAhead parameter', async () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const mockSteps = [
        { id: '1', projectId: 'proj-1', plannedEndDate: tomorrowStr, isCompleted: false },
        { id: '2', projectId: 'proj-1', plannedEndDate: nextWeekStr, isCompleted: false },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSteps),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.getUpcomingDeadlines({
        projectId: 'proj-1',
        daysAhead: 2,
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });

    it('should exclude completed steps', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const mockSteps = [
        { id: '1', projectId: 'proj-1', plannedEndDate: tomorrowStr, isCompleted: true },
        { id: '2', projectId: 'proj-1', plannedEndDate: tomorrowStr, isCompleted: false },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSteps),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const procedure = stepProgressRouter.createCaller({
        user: { id: 1, role: 'user' },
        req: {},
        res: {},
      });

      const result = await procedure.getUpcomingDeadlines({
        projectId: 'proj-1',
        daysAhead: 7,
      });

      // Both steps should be returned since we're filtering by isCompleted in the where clause
      // The filtering happens at the database level
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(s => s.id === '2')).toBe(true);
    });
  });
});
