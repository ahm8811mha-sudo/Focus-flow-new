import { loadTables } from '@/lib/internalTables';
import type { ManagedProject } from '@/components/projects/types';

const TASKS_KEY = 'focus-flow-tasks';

function arr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function readTasks() {
  try {
    const v = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function belongs(item: any, project: ManagedProject) {
  return item?.projectId === project.id || item?.projectName === project.name || item?.listName === `مشروع: ${project.name}`;
}

export function buildSecretaryProjectContext(project: ManagedProject) {
  const tasks = readTasks().filter((x) => belongs(x, project));
  const tables = loadTables().filter((x) => belongs(x, project));
  const events = tasks.filter((x) => x.dueDate && (x.dueTime || /موعد|اتصال|تذكير|زيارة|تقويم/i.test(`${x.title} ${x.description}`)));
  const stages = arr<any>(project.stages);
  const currentStage = stages.find((x) => x.status !== 'done') || stages[0] || null;
  return {
    projectId: project.id,
    projectName: project.name,
    objective: project.objective,
    scope: project.scope,
    currentStage,
    stages,
    projectTasks: arr(project.projectTasks),
    tasks,
    tables,
    events,
    agentResults: arr(project.agentResults),
    executionLog: arr(project.executionLog),
    summaryText: `المشروع: ${project.name}\nالهدف: ${project.objective}\nالنطاق: ${project.scope}\nالمرحلة الحالية: ${currentStage?.title || 'غير محددة'}\nالمهام: ${tasks.length}\nالجداول: ${tables.length}\nالمواعيد: ${events.length}`,
  };
}
