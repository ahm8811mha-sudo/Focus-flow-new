import { loadTables, saveTables, type InternalTable } from '@/lib/internalTables';
import { createProjectFollowUpEvent, createProjectFollowUpTask } from '@/lib/projectResourceActions';

type ProjectRef = { id: string; name: string };

type Props = {
  project: ProjectRef;
  table: InternalTable;
  row: any[];
  rowIndex: number;
  onChange?: () => void;
};

function cell(row: any[], index: number) {
  return String(row?.[index] ?? '').trim();
}

function rowTitle(row: any[]) {
  return cell(row, 0) || cell(row, 1) || 'عنصر جدول';
}

function rowDescription(table: InternalTable, row: any[]) {
  return table.columns.map((column, index) => `${column}: ${cell(row, index) || '-'}`).join('\n');
}

function updateRowStatus(tableId: string, rowIndex: number, status: string) {
  const tables = loadTables();
  const next = tables.map((table) => {
    if (table.id !== tableId) return table;
    const rows = table.rows.map((row, index) => index === rowIndex ? [...row.slice(0, Math.max(row.length, 3)), status] : row);
    return { ...table, rows, updatedAt: new Date().toISOString() };
  });
  saveTables(next);
}

export default function TableRowActions({ project, table, row, rowIndex, onChange }: Props) {
  function makeTask() {
    createProjectFollowUpTask({ project, title: `متابعة: ${rowTitle(row)}`, description: rowDescription(table, row), dueDate: new Date().toISOString().slice(0, 10), priority: 'high' });
    updateRowStatus(table.id, rowIndex, 'مهمة متابعة');
    onChange?.();
  }

  function makeEvent() {
    createProjectFollowUpEvent({ project, title: `اتصال/موعد: ${rowTitle(row)}`, description: rowDescription(table, row), dueDate: new Date().toISOString().slice(0, 10), dueTime: '09:00' });
    updateRowStatus(table.id, rowIndex, 'موعد متابعة');
    onChange?.();
  }

  function markContacted() {
    updateRowStatus(table.id, rowIndex, 'تم التواصل');
    onChange?.();
  }

  function markWaiting() {
    updateRowStatus(table.id, rowIndex, 'بانتظار الرد');
    onChange?.();
  }

  function createDraftNote() {
    createProjectFollowUpTask({ project, title: `مسودة رسالة: ${rowTitle(row)}`, description: `جهز رسالة متابعة لهذا الصف:\n${rowDescription(table, row)}`, dueDate: new Date().toISOString().slice(0, 10), priority: 'medium' });
    updateRowStatus(table.id, rowIndex, 'مسودة مطلوبة');
    onChange?.();
  }

  return (
    <div className="inline-actions table-row-actions">
      <button onClick={makeTask}>مهمة</button>
      <button onClick={makeEvent}>موعد</button>
      <button onClick={createDraftNote}>مسودة</button>
      <button onClick={markContacted}>تم التواصل</button>
      <button onClick={markWaiting}>بانتظار الرد</button>
    </div>
  );
}
