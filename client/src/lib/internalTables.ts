export type InternalTable = {
  id: string;
  title: string;
  columns: string[];
  rows: any[][];
  source?: string;
  notes?: string;
  projectId?: string;
  projectName?: string;
  executionId?: string;
  agentId?: string;
  createdAt: string;
  updatedAt: string;
};

const TABLES_KEY = 'focus-flow-internal-tables';

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export function loadTables(): InternalTable[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TABLES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTables(items: InternalTable[]) {
  localStorage.setItem(TABLES_KEY, JSON.stringify(Array.isArray(items) ? items : []));
}

export function upsertTable(input: Partial<InternalTable> & { title: string; columns: string[]; rows: any[][] }) {
  const items = loadTables();
  const existing = input.id ? items.find((item) => item.id === input.id) : undefined;
  const table: InternalTable = {
    id: existing?.id || input.id || uid(),
    title: input.title,
    columns: input.columns.length ? input.columns : ['البند', 'الوصف'],
    rows: input.rows.length ? input.rows : [[input.title, input.notes || 'تم إنشاء الجدول داخل النظام']],
    source: input.source || existing?.source || 'Agent',
    notes: input.notes || existing?.notes || '',
    projectId: input.projectId || existing?.projectId || '',
    projectName: input.projectName || existing?.projectName || '',
    executionId: input.executionId || existing?.executionId || '',
    agentId: input.agentId || existing?.agentId || '',
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
  };
  saveTables(existing ? items.map((item) => item.id === table.id ? table : item) : [table, ...items]);
  return table;
}

export function deleteTable(id: string) {
  saveTables(loadTables().filter((item) => item.id !== id));
}

export function toCsv(table: InternalTable) {
  return [table.columns, ...table.rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
}
