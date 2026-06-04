import { upsertTable } from '@/lib/internalTables';

export type ProjectTableBridgeInput = {
  projectId: string;
  projectName: string;
  title: string;
  columns: string[];
  rows: any[][];
  source?: string;
  notes?: string;
  executionId?: string;
  agentId?: string;
};

export function saveProjectTable(input: ProjectTableBridgeInput) {
  return upsertTable({
    title: input.title,
    columns: input.columns?.length ? input.columns : ['البند', 'الوصف'],
    rows: input.rows?.length ? input.rows : [[input.title, input.notes || 'تم إنشاء الجدول من نتيجة الوكيل']],
    source: input.source || 'Project Agent',
    notes: input.notes || '',
    projectId: input.projectId,
    projectName: input.projectName,
    executionId: input.executionId || '',
    agentId: input.agentId || '',
  });
}
