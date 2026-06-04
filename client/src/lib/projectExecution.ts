export type ProjectExecutionInput = {
  executionId: string;
  agentName: string;
  goal: string;
  status: 'running' | 'done' | 'failed' | 'needs_user';
  summary: string;
  results: string[];
  failures: string[];
  tables?: string[];
  tasks?: string[];
  events?: string[];
  drafts?: string[];
  createdAt?: string;
};

export type ProjectExecutionRecord = ProjectExecutionInput & {
  id: string;
  createdAt: string;
};

type ManagedProjectLike = {
  id: string;
  name: string;
  objective?: string;
  scope?: string;
  executionLog?: string[];
  agentResults?: ProjectExecutionRecord[];
  [key: string]: any;
};

const PROJECTS_KEY = 'focus-flow-managed-projects-v3';

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadManagedProjects(): ManagedProjectLike[] {
  try {
    return asArray<ManagedProjectLike>(JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'));
  } catch {
    return [];
  }
}

export function saveManagedProjects(projects: ManagedProjectLike[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(asArray(projects)));
}

export function findProjectForText(text: string) {
  const query = normalize(text);
  if (!query) return null;
  const projects = loadManagedProjects();
  return projects.find((project) => {
    const haystack = normalize(`${project.name || ''} ${project.objective || ''} ${project.scope || ''}`);
    const projectName = normalize(project.name || '');
    return projectName.length > 2 && (query.includes(projectName) || haystack.includes(query.slice(0, Math.min(query.length, 45))));
  }) || null;
}

export function appendProjectExecution(projectId: string, input: ProjectExecutionInput) {
  const projects = loadManagedProjects();
  const now = input.createdAt || new Date().toISOString();
  const record: ProjectExecutionRecord = {
    id: input.executionId || uid(),
    ...input,
    createdAt: now,
    tables: asArray<string>(input.tables),
    tasks: asArray<string>(input.tasks),
    events: asArray<string>(input.events),
    drafts: asArray<string>(input.drafts),
  };
  const line = `${now} — ${input.agentName} — ${input.status} — ${input.goal} — ${input.summary}${input.failures.length ? ` — فشل: ${input.failures.join(' | ')}` : ''}`;
  const next = projects.map((project) => project.id === projectId ? {
    ...project,
    executionLog: [line, ...asArray<string>(project.executionLog)].slice(0, 50),
    agentResults: [record, ...asArray<ProjectExecutionRecord>(project.agentResults)].slice(0, 50),
    updatedAt: now,
  } : project);
  saveManagedProjects(next);
  return next.find((project) => project.id === projectId) || null;
}
