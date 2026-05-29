import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  icon: string;
  color: string;
  budgetEstimate: number;
  actualCost: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  dueTime?: string;
  listName: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  projectId?: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  projectId?: string;
  name: string;
  role: string;
  mission: string;
  active: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'project' | 'task' | 'note' | 'agent' | 'system';
  title: string;
  detail: string;
  createdAt: string;
}

export interface AppSettings {
  id: 'main';
  ownerName: string;
  localOnly: boolean;
  aiMode: 'offline' | 'cloud-ready';
  theme: 'dark';
  updatedAt: string;
}

export interface FocusFlowDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updatedAt': string; 'by-status': ProjectStatus };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-projectId': string; 'by-status': TaskStatus; 'by-dueDate': string };
  };
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-projectId': string; 'by-updatedAt': string };
  };
  agents: {
    key: string;
    value: Agent;
    indexes: { 'by-projectId': string };
  };
  activities: {
    key: string;
    value: Activity;
    indexes: { 'by-createdAt': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'focus-flow-local-memory';
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<FocusFlowDB>> | null = null;

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

export async function getLocalDB() {
  if (!dbPromise) {
    dbPromise = openDB<FocusFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('by-updatedAt', 'updatedAt');
        projects.createIndex('by-status', 'status');

        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        tasks.createIndex('by-projectId', 'projectId');
        tasks.createIndex('by-status', 'status');
        tasks.createIndex('by-dueDate', 'dueDate');

        const notes = db.createObjectStore('notes', { keyPath: 'id' });
        notes.createIndex('by-projectId', 'projectId');
        notes.createIndex('by-updatedAt', 'updatedAt');

        const agents = db.createObjectStore('agents', { keyPath: 'id' });
        agents.createIndex('by-projectId', 'projectId');

        const activities = db.createObjectStore('activities', { keyPath: 'id' });
        activities.createIndex('by-createdAt', 'createdAt');

        db.createObjectStore('settings', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export const createIds = { project: () => id('project'), task: () => id('task'), note: () => id('note'), agent: () => id('agent'), activity: () => id('activity') };

export async function addActivity(title: string, detail: string, type: Activity['type'] = 'system') {
  const db = await getLocalDB();
  await db.put('activities', { id: createIds.activity(), title, detail, type, createdAt: now() });
}

export async function ensureSeedData() {
  const db = await getLocalDB();
  const count = await db.count('projects');
  const settings = await db.get('settings', 'main');
  if (!settings) {
    await db.put('settings', {
      id: 'main',
      ownerName: 'Ahmad',
      localOnly: true,
      aiMode: 'offline',
      theme: 'dark',
      updatedAt: now(),
    });
  }
  if (count > 0) return;

  const projectId = createIds.project();
  await db.put('projects', {
    id: projectId,
    title: 'استكشاف النشاط التجاري',
    description: 'مشروع تجريبي لإدارة الخطة والمهام والميزانية محليًا على الجوال.',
    status: 'active',
    priority: 'medium',
    icon: '💼',
    color: '#3b82f6',
    budgetEstimate: 74003,
    actualCost: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    createdAt: now(),
    updatedAt: now(),
  });

  const baseTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { projectId, title: 'دراسة الجدوى وتحديد نوع الشركة', description: 'مراجعة الوضع الحالي وتحديد الأهداف واختيار نوع الشركة المناسب.', status: 'todo', priority: 'high', dueDate: '', dueTime: '', listName: 'Work 💼', recurrence: 'none' },
    { projectId, title: 'تحليل الموارد المطلوبة', description: 'تحديد المواد والأدوات والفريق والميزانية.', status: 'todo', priority: 'medium', dueDate: '', dueTime: '', listName: 'Work 💼', recurrence: 'none' },
    { projectId, title: 'إعداد خطة تنفيذ أسبوعية', description: 'تقسيم المشروع إلى خطوات قابلة للمتابعة.', status: 'in_progress', priority: 'medium', dueDate: '', dueTime: '', listName: 'Work 💼', recurrence: 'none' },
  ];

  for (const task of baseTasks) {
    await db.put('tasks', { ...task, id: createIds.task(), createdAt: now(), updatedAt: now() });
  }

  await db.put('notes', {
    id: createIds.note(),
    projectId,
    title: 'ملاحظة البداية',
    body: 'كل البيانات الآن محفوظة محليًا داخل ذاكرة المتصفح على الجوال باستخدام IndexedDB.',
    tags: ['local', 'offline'],
    pinned: true,
    createdAt: now(),
    updatedAt: now(),
  });

  await db.put('agents', {
    id: createIds.agent(),
    projectId,
    name: 'وكيل التخطيط',
    role: 'Planning Agent',
    mission: 'تقسيم المشروع إلى خطوات ومواعيد وأولويات قابلة للتنفيذ.',
    active: true,
    createdAt: now(),
  });

  await addActivity('تم تفعيل الذاكرة المحلية', 'تم إنشاء قاعدة IndexedDB داخل الجهاز وتشغيل بيانات البداية.', 'system');
}

export async function getSnapshot() {
  await ensureSeedData();
  const db = await getLocalDB();
  const [projects, tasks, notes, agents, activities, settings] = await Promise.all([
    db.getAll('projects'),
    db.getAll('tasks'),
    db.getAll('notes'),
    db.getAll('agents'),
    db.getAll('activities'),
    db.get('settings', 'main'),
  ]);
  return { projects, tasks, notes, agents, activities: activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), settings };
}

export async function saveProject(input: Partial<Project> & Pick<Project, 'title'>) {
  const db = await getLocalDB();
  const existing = input.id ? await db.get('projects', input.id) : undefined;
  const project: Project = {
    id: existing?.id ?? createIds.project(),
    title: input.title,
    description: input.description ?? existing?.description ?? '',
    status: input.status ?? existing?.status ?? 'active',
    priority: input.priority ?? existing?.priority ?? 'medium',
    icon: input.icon ?? existing?.icon ?? '🚀',
    color: input.color ?? existing?.color ?? '#3b82f6',
    budgetEstimate: Number(input.budgetEstimate ?? existing?.budgetEstimate ?? 0),
    actualCost: Number(input.actualCost ?? existing?.actualCost ?? 0),
    startDate: input.startDate ?? existing?.startDate ?? '',
    endDate: input.endDate ?? existing?.endDate ?? '',
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  await db.put('projects', project);
  await addActivity(existing ? 'تحديث مشروع' : 'إنشاء مشروع', project.title, 'project');
  return project;
}

export async function saveTask(input: Partial<Task> & Pick<Task, 'title'>) {
  const db = await getLocalDB();
  const existing = input.id ? await db.get('tasks', input.id) : undefined;
  const task: Task = {
    id: existing?.id ?? createIds.task(),
    projectId: input.projectId ?? existing?.projectId,
    title: input.title,
    description: input.description ?? existing?.description ?? '',
    status: input.status ?? existing?.status ?? 'todo',
    priority: input.priority ?? existing?.priority ?? 'medium',
    dueDate: input.dueDate ?? existing?.dueDate ?? '',
    dueTime: input.dueTime ?? existing?.dueTime ?? '',
    listName: input.listName ?? existing?.listName ?? 'Work 💼',
    recurrence: input.recurrence ?? existing?.recurrence ?? 'none',
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  await db.put('tasks', task);
  await addActivity(existing ? 'تحديث مهمة' : 'إنشاء مهمة', task.title, 'task');
  return task;
}

export async function saveNote(input: Partial<Note> & Pick<Note, 'title'>) {
  const db = await getLocalDB();
  const existing = input.id ? await db.get('notes', input.id) : undefined;
  const note: Note = {
    id: existing?.id ?? createIds.note(),
    projectId: input.projectId ?? existing?.projectId,
    title: input.title,
    body: input.body ?? existing?.body ?? '',
    tags: input.tags ?? existing?.tags ?? [],
    pinned: input.pinned ?? existing?.pinned ?? false,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  await db.put('notes', note);
  await addActivity(existing ? 'تحديث ملاحظة' : 'إنشاء ملاحظة', note.title, 'note');
  return note;
}

export async function saveAgent(input: Partial<Agent> & Pick<Agent, 'name'>) {
  const db = await getLocalDB();
  const agent: Agent = {
    id: input.id ?? createIds.agent(),
    projectId: input.projectId,
    name: input.name,
    role: input.role ?? 'AI Agent',
    mission: input.mission ?? '',
    active: input.active ?? true,
    createdAt: input.createdAt ?? now(),
  };
  await db.put('agents', agent);
  await addActivity('إضافة وكيل', agent.name, 'agent');
  return agent;
}

export async function removeRecord(store: 'projects' | 'tasks' | 'notes' | 'agents', id: string) {
  const db = await getLocalDB();
  await db.delete(store, id);
  await addActivity('حذف عنصر', `${store}/${id}`, 'system');
}

export async function clearAllLocalMemory() {
  const db = await getLocalDB();
  await Promise.all(['projects', 'tasks', 'notes', 'agents', 'activities', 'settings'].map((store) => db.clear(store as any)));
  await ensureSeedData();
}

export async function exportLocalMemory() {
  const snapshot = await getSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `focus-flow-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importLocalMemory(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);
  const db = await getLocalDB();
  const tx = db.transaction(['projects', 'tasks', 'notes', 'agents', 'activities'], 'readwrite');
  for (const project of data.projects ?? []) await tx.objectStore('projects').put(project);
  for (const task of data.tasks ?? []) await tx.objectStore('tasks').put(task);
  for (const note of data.notes ?? []) await tx.objectStore('notes').put(note);
  for (const agent of data.agents ?? []) await tx.objectStore('agents').put(agent);
  for (const activity of data.activities ?? []) await tx.objectStore('activities').put(activity);
  await tx.done;
  await addActivity('استيراد نسخة احتياطية', file.name, 'system');
}

export async function generateOfflineProjectPlan(prompt: string) {
  const title = prompt.trim().slice(0, 60) || 'مشروع جديد بالذكاء الاصطناعي';
  const project = await saveProject({
    title,
    description: `خطة مولدة محليًا بناءً على: ${prompt}`,
    icon: '✨',
    priority: 'high',
    color: '#6366f1',
    budgetEstimate: 0,
  });

  const tasks = [
    ['تحليل الهدف ونطاق المشروع', 'تحديد المشكلة، النتائج المطلوبة، والقيود الأساسية.', 'high'],
    ['تقسيم المشروع إلى مراحل', 'بناء مراحل تنفيذ أسبوعية قابلة للقياس.', 'high'],
    ['تحديد الموارد والميزانية', 'حصر الأدوات، الأشخاص، والتكاليف المتوقعة.', 'medium'],
    ['تنفيذ أول نسخة قابلة للتجربة', 'بناء MVP سريع ثم اختباره على الجوال.', 'high'],
    ['مراجعة النتائج والتحسين', 'تحليل التقدم، معالجة التعثر، وتحديث الخطة.', 'medium'],
  ] as const;

  for (const [taskTitle, description, priority] of tasks) {
    await saveTask({ projectId: project.id, title: taskTitle, description, priority, status: 'todo', listName: 'AI Plan ✨' });
  }

  const agents = [
    ['وكيل التخطيط', 'Planner', 'يقسم المشروع إلى مراحل ومهام واضحة.'],
    ['وكيل المتابعة', 'Execution Tracker', 'يراقب التأخير ونسبة الإنجاز.'],
    ['وكيل المخاطر', 'Risk Analyst', 'يتوقع نقاط التعثر ويقترح حلولًا.'],
  ] as const;
  for (const [name, role, mission] of agents) {
    await saveAgent({ projectId: project.id, name, role, mission });
  }

  await addActivity('توليد خطة محلية', title, 'system');
  return project;
}

export async function importLocalMemorySnapshot(data: any) {
  const db = await getLocalDB();
  const tx = db.transaction(['projects', 'tasks', 'notes', 'agents', 'activities', 'settings'], 'readwrite');
  await Promise.all(['projects', 'tasks', 'notes', 'agents', 'activities'].map((store) => tx.objectStore(store as any).clear()));
  for (const project of data.projects ?? []) await tx.objectStore('projects').put(project);
  for (const task of data.tasks ?? []) await tx.objectStore('tasks').put(task);
  for (const note of data.notes ?? []) await tx.objectStore('notes').put(note);
  for (const agent of data.agents ?? []) await tx.objectStore('agents').put(agent);
  for (const activity of data.activities ?? []) await tx.objectStore('activities').put(activity);
  if (data.settings) await tx.objectStore('settings').put(data.settings);
  await tx.done;
}
