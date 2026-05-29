import { db } from './db';
import { eq, and, gte } from 'drizzle-orm';
import { tasks, projects, projectMembers } from '../drizzle/schema';

/**
 * Notification types and interfaces
 */
export type NotificationType = 'task_deadline' | 'task_overdue' | 'project_update' | 'team_mention' | 'task_assigned' | 'task_completed';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  targetUserId: string;
  relatedId?: string; // task ID, project ID, etc.
  relatedType?: string; // 'task', 'project', etc.
  actionUrl?: string;
}

/**
 * Check for upcoming task deadlines (within 24 hours)
 */
export async function checkUpcomingDeadlines() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        gte(tasks.dueDate, now),
        gte(tomorrow, tasks.dueDate)
      )
    );

  const notifications: NotificationPayload[] = [];

  for (const task of upcomingTasks) {
    if (task.assignedTo) {
      notifications.push({
        type: 'task_deadline',
        title: '⏰ مهمة قريبة الموعد',
        message: `المهمة "${task.title}" تستحق الإنجاز غداً`,
        targetUserId: task.assignedTo,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/tasks/${task.id}`,
      });
    }
  }

  return notifications;
}

/**
 * Check for overdue tasks
 */
export async function checkOverdueTasks() {
  const now = new Date();

  const overdueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        gte(now, tasks.dueDate),
        eq(tasks.completed, false)
      )
    );

  const notifications: NotificationPayload[] = [];

  for (const task of overdueTasks) {
    if (task.assignedTo) {
      const daysOverdue = Math.floor((now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24));
      
      notifications.push({
        type: 'task_overdue',
        title: '🚨 مهمة متأخرة',
        message: `المهمة "${task.title}" متأخرة بـ ${daysOverdue} أيام`,
        targetUserId: task.assignedTo,
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/tasks/${task.id}`,
      });
    }
  }

  return notifications;
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string, limit = 20) {
  // This would typically query a notifications table
  // For now, we'll return generated notifications
  const notifications: NotificationPayload[] = [];

  // Check upcoming deadlines
  const upcomingDeadlines = await checkUpcomingDeadlines();
  notifications.push(...upcomingDeadlines.filter(n => n.targetUserId === userId));

  // Check overdue tasks
  const overdueTasks = await checkOverdueTasks();
  notifications.push(...overdueTasks.filter(n => n.targetUserId === userId));

  return notifications.slice(0, limit);
}

/**
 * Send push notification to user
 * This would integrate with a push notification service
 */
export async function sendPushNotification(
  userId: string,
  notification: NotificationPayload
): Promise<boolean> {
  try {
    // In a real app, this would send to a push notification service
    // For now, we'll just log it
    console.log(`[NOTIFICATION] Sending to ${userId}:`, notification);

    // TODO: Integrate with actual push notification service
    // - Firebase Cloud Messaging (FCM)
    // - Web Push API
    // - OneSignal
    // - etc.

    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

/**
 * Schedule periodic notification checks
 */
export function startNotificationScheduler() {
  // Check every 5 minutes
  setInterval(async () => {
    try {
      const upcomingDeadlines = await checkUpcomingDeadlines();
      const overdueTasks = await checkOverdueTasks();

      const allNotifications = [...upcomingDeadlines, ...overdueTasks];

      for (const notification of allNotifications) {
        await sendPushNotification(notification.targetUserId, notification);
      }
    } catch (error) {
      console.error('Error in notification scheduler:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}
