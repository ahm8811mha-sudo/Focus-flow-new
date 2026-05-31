export type ExecutionStatus = 'running' | 'done' | 'failed' | 'needs_user';

export type ExecutionEntry = {
  id: string;
  agentName: string;
  goal: string;
  status: ExecutionStatus;
  summary: string;
  results: string[];
  failures: string[];
  nextSteps: string[];
  createdAt: string;
  updatedAt: string;
};

const LOG_KEY = 'focus-flow-execution-log';

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getExecutionLog(): ExecutionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveExecutionLog(items: ExecutionEntry[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(items));
}

export function addExecutionLog(input: Omit<ExecutionEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const entry: ExecutionEntry = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  saveExecutionLog([entry, ...getExecutionLog()]);
  return entry;
}

export function clearExecutionLog() {
  saveExecutionLog([]);
}
