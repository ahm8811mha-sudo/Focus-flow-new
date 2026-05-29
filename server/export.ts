import { Task, Note } from '../drizzle/schema';

/**
 * Export tasks to CSV format
 */
export function exportTasksToCSV(tasks: Task[]): string {
  const headers = ['المهمة', 'الوصف', 'الأولوية', 'الحالة', 'تاريخ الاستحقاق'];
  const rows = [headers.join(',')];

  tasks.forEach((task) => {
    const row = [
      `"${task.name}"`,
      `"${task.description || ''}"`,
      task.priority || '',
      task.isDone ? 'مكتملة' : 'قيد التنفيذ',
      task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-SA') : '',
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Export notes to CSV format
 */
export function exportNotesToCSV(notes: Note[]): string {
  const headers = ['العنوان', 'المحتوى', 'الوسوم'];
  const rows = [headers.join(',')];

  notes.forEach((note) => {
    const row = [
      `"${note.title}"`,
      `"${(note.content || '').substring(0, 100)}"`,
      `"${note.tags || ''}"`,
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Generate summary statistics
 */
export function generateSummaryStats(tasks: Task[]): Record<string, unknown> {
  const completed = tasks.filter(t => t.isDone).length;
  const pending = tasks.filter(t => !t.isDone).length;
  const highPriority = tasks.filter(t => t.priority === 'عالية').length;
  const mediumPriority = tasks.filter(t => t.priority === 'متوسطة').length;
  const lowPriority = tasks.filter(t => t.priority === 'منخفضة').length;

  return {
    totalTasks: tasks.length,
    completedTasks: completed,
    pendingTasks: pending,
    completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    highPriority,
    mediumPriority,
    lowPriority,
    averageTasksPerDay: Math.round(tasks.length / 30),
  };
}
