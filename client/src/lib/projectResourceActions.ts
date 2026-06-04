import { upsertTable } from '@/lib/internalTables';

type ProjectRef = {
  id: string;
  name: string;
};

const TASKS_KEY = 'focus-flow-tasks';

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function loadTasks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks(items: any[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(asArray(items)));
}

export function saveAgentResultAsProjectTable(args: {
  project: ProjectRef;
  title: string;
  columns?: string[];
  rows?: any[][];
  source?: string;
  notes?: string;
}) {
  return upsertTable({
    title: args.title || `جدول ${args.project.name}`,
    columns: args.columns?.length ? args.columns : ['البند', 'الوصف', 'الحالة'],
    rows: args.rows?.length ? args.rows : [[args.title || args.project.name, args.notes || 'نتيجة وكيل', 'جديد']],
    source: args.source || 'Project Agent',
    notes: args.notes || '',
    projectId: args.project.id,
    projectName: args.project.name,
  });
}

export function createProjectFollowUpTask(args: {
  project: ProjectRef;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: string;
}) {
  const tasks = loadTasks();
  const task = {
    id: uid(),
    title: args.title || `متابعة ${args.project.name}`,
    description: args.description || '',
    status: 'todo',
    priority: args.priority || 'high',
    dueDate: args.dueDate || today(),
    dueTime: args.dueTime || '',
    listName: `مشروع: ${args.project.name}`,
    projectId: args.project.id,
    projectName: args.project.name,
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveTasks([task, ...tasks]);
  return task;
}

export function createProjectFollowUpEvent(args: {
  project: ProjectRef;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
}) {
  return createProjectFollowUpTask({
    project: args.project,
    title: args.title || `موعد متابعة ${args.project.name}`,
    description: args.description || 'موعد متابعة مرتبط بالمشروع',
    dueDate: args.dueDate || today(),
    dueTime: args.dueTime || '09:00',
    priority: 'high',
  });
}
