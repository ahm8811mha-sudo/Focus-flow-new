import { useEffect, useMemo, useState } from 'react';
import { loadTables, saveTables, type InternalTable } from '@/lib/internalTables';
import { createProjectFollowUpEvent, createProjectFollowUpTask, saveAgentResultAsProjectTable } from '@/lib/projectResourceActions';

type LinkedTask = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  dueDate?: string;
  dueTime?: string;
  projectId?: string;
  projectName?: string;
  listName?: string;
  [key: string]: any;
};

type AgentResultItem = {
  id: string;
  goal: string;
  agentName: string;
  status: string;
  summary: string;
  results?: string[];
  failures?: string[];
  drafts?: string[];
  events?: string[];
  tables?: string[];
  tasks?: string[];
  createdAt: string;
};

type ProjectLike = {
  id: string;
  name: string;
  agentResults?: AgentResultItem[];
};

type Props = {
  project: ProjectLike;
  tasks?: LinkedTask[];
};

const TASKS_KEY = 'focus-flow-tasks';

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function relatedToProject(item: any, project: ProjectLike) {
  return item?.projectId === project.id || item?.projectName === project.name || item?.project === project.name || item?.listName === `مشروع: ${project.name}`;
}

function isCalendarTask(task: LinkedTask) {
  const text = `${task.title || ''} ${task.description || ''} ${task.listName || ''}`;
  return Boolean(task.dueDate && (task.dueTime || /موعد|تذكير|زيارة|اتصال|تقويم/i.test(text)));
}

function loadStoredTasks(): LinkedTask[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredTasks(items: LinkedTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(asArray(items)));
}

function resultToRows(item: AgentResultItem) {
  const rows = asArray<string>(item.results).map((value, index) => [index + 1, value, 'جديد']);
  return rows.length ? rows : [[1, item.summary || item.goal, item.status || 'جديد']];
}

export default function ProjectLinkedResources({ project, tasks = [] }: Props) {
  const [tables, setTables] = useState<InternalTable[]>([]);
  const [localTasks, setLocalTasks] = useState<LinkedTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [editingTableId, setEditingTableId] = useState('');
  const [taskDraft, setTaskDraft] = useState({ title: '', dueDate: '', dueTime: '', status: 'todo', description: '' });
  const [tableDraft, setTableDraft] = useState({ title: '', notes: '' });
  const [notice, setNotice] = useState('');

  function refresh() {
    setTables(loadTables());
    setLocalTasks(loadStoredTasks());
  }

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [project.id]);

  const sourceTasks = localTasks.length ? localTasks : asArray<LinkedTask>(tasks);
  const linkedTasks = useMemo(() => asArray<LinkedTask>(sourceTasks).filter((task) => relatedToProject(task, project)), [sourceTasks, project]);
  const linkedEvents = useMemo(() => linkedTasks.filter(isCalendarTask), [linkedTasks]);
  const linkedTables = useMemo(() => asArray<InternalTable>(tables).filter((table) => relatedToProject(table, project)), [tables, project]);
  const agentResults = useMemo(() => asArray<AgentResultItem>(project.agentResults).slice(0, 8), [project]);
  const linkedDrafts = useMemo(() => asArray(project.agentResults).filter((result) => asArray(result.drafts).length || /مسودة|بريد|إيميل|ايميل|رسالة/i.test(`${result.goal} ${result.summary}`)), [project]);

  function startTaskEdit(task: LinkedTask) {
    setEditingTaskId(task.id);
    setTaskDraft({ title: task.title || '', dueDate: task.dueDate || '', dueTime: task.dueTime || '', status: task.status || 'todo', description: task.description || '' });
  }

  function saveTaskEdit(task: LinkedTask) {
    const allTasks = loadStoredTasks();
    const base = allTasks.length ? allTasks : asArray<LinkedTask>(tasks);
    const next = base.map((item) => item.id === task.id ? { ...item, ...taskDraft, projectId: project.id, projectName: project.name, listName: item.listName || `مشروع: ${project.name}`, updatedAt: new Date().toISOString() } : item);
    saveStoredTasks(next);
    setLocalTasks(next);
    setEditingTaskId('');
    setNotice('تم تحديث المهمة/الموعد داخل المشروع.');
  }

  function deleteTask(taskId: string) {
    const next = loadStoredTasks().filter((item) => item.id !== taskId);
    saveStoredTasks(next);
    setLocalTasks(next);
    setEditingTaskId('');
    setNotice('تم حذف العنصر من المهام المحلية.');
  }

  function startTableEdit(table: InternalTable) {
    setEditingTableId(table.id);
    setTableDraft({ title: table.title || '', notes: table.notes || '' });
  }

  function saveTableEdit(table: InternalTable) {
    const next = loadTables().map((item) => item.id === table.id ? { ...item, title: tableDraft.title || item.title, notes: tableDraft.notes, projectId: project.id, projectName: project.name, updatedAt: new Date().toISOString() } : item);
    saveTables(next);
    setTables(next);
    setEditingTableId('');
    setNotice('تم تحديث الجدول المرتبط بالمشروع.');
  }

  function saveResultTable(item: AgentResultItem) {
    const table = saveAgentResultAsProjectTable({ project, title: `نتيجة ${item.goal}`, columns: ['#', 'المخرج', 'الحالة'], rows: resultToRows(item), source: item.agentName, notes: item.summary });
    setTables([table, ...loadTables().filter((x) => x.id !== table.id)]);
    setNotice('تم حفظ نتيجة الوكيل كجدول مرتبط بالمشروع.');
  }

  function createResultTask(item: AgentResultItem) {
    const task = createProjectFollowUpTask({ project, title: `متابعة: ${item.goal}`, description: item.summary, dueDate: new Date().toISOString().slice(0, 10), priority: 'high' });
    setLocalTasks([task, ...loadStoredTasks().filter((x) => x.id !== task.id)]);
    setNotice('تم إنشاء مهمة متابعة مرتبطة بالمشروع.');
  }

  function createResultEvent(item: AgentResultItem) {
    const task = createProjectFollowUpEvent({ project, title: `موعد متابعة: ${item.goal}`, description: item.summary, dueDate: new Date().toISOString().slice(0, 10), dueTime: '09:00' });
    setLocalTasks([task, ...loadStoredTasks().filter((x) => x.id !== task.id)]);
    setNotice('تم إنشاء موعد متابعة مرتبط بالمشروع.');
  }

  return (
    <section className="panel" id="linked-resources">
      <div className="section-title">
        <h3>المخرجات المرتبطة بالمشروع</h3>
        <a className="mini-link" href="/execution">فتح سجل التنفيذ</a>
      </div>
      {notice && <p className="resource-notice">{notice}</p>}
      {agentResults.length ? <div className="agent-result-actions"><h4>تحويل نتائج الوكلاء إلى إجراءات</h4>{agentResults.map((item) => <div className="resource-row" key={item.id}><span>{item.goal}</span><small>{item.agentName} · {item.createdAt}</small><div className="inline-actions"><button onClick={() => saveResultTable(item)}>حفظ كجدول</button><button onClick={() => createResultTask(item)}>إنشاء مهمة متابعة</button><button onClick={() => createResultEvent(item)}>إنشاء موعد متابعة</button></div></div>)}</div> : null}
      <div className="resource-grid">
        <article className="resource-card">
          <div className="resource-head"><b>المهام المرتبطة</b><a href="/tasks">فتح المهام</a></div>
          <strong>{linkedTasks.length}</strong>
          {linkedTasks.slice(0, 5).map((task) => <div className="resource-row" key={task.id}><span>{task.title}</span><small>{task.status || 'todo'} · {task.dueDate || 'بدون تاريخ'}</small><button onClick={() => startTaskEdit(task)}>تعديل</button>{editingTaskId === task.id && <div className="inline-editor"><input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} /><input type="date" value={taskDraft.dueDate} onChange={(e) => setTaskDraft({ ...taskDraft, dueDate: e.target.value })} /><input type="time" value={taskDraft.dueTime} onChange={(e) => setTaskDraft({ ...taskDraft, dueTime: e.target.value })} /><select value={taskDraft.status} onChange={(e) => setTaskDraft({ ...taskDraft, status: e.target.value })}><option value="todo">لم يبدأ</option><option value="in_progress">قيد التنفيذ</option><option value="review">مراجعة</option><option value="blocked">متوقف</option><option value="done">مكتمل</option></select><textarea value={taskDraft.description} onChange={(e) => setTaskDraft({ ...taskDraft, description: e.target.value })} /><div className="inline-actions"><button onClick={() => saveTaskEdit(task)}>حفظ</button><button className="danger-link" onClick={() => deleteTask(task.id)}>حذف</button></div></div>}</div>)}
          {!linkedTasks.length && <p>لا توجد مهام مرتبطة بعد.</p>}
        </article>
        <article className="resource-card">
          <div className="resource-head"><b>المواعيد المرتبطة</b><a href="/calendar">فتح التقويم</a></div>
          <strong>{linkedEvents.length}</strong>
          {linkedEvents.slice(0, 5).map((task) => <div className="resource-row" key={task.id}><span>{task.title}</span><small>{task.dueDate || 'بدون تاريخ'} · {task.dueTime || 'بدون وقت'}</small><button onClick={() => startTaskEdit(task)}>تعديل الموعد</button></div>)}
          {!linkedEvents.length && <p>لا توجد مواعيد مرتبطة بعد.</p>}
        </article>
        <article className="resource-card">
          <div className="resource-head"><b>الجداول المرتبطة</b><a href="/tables">فتح الجداول</a></div>
          <strong>{linkedTables.length}</strong>
          {linkedTables.slice(0, 5).map((table) => <div className="resource-row" key={table.id}><span>{table.title}</span><small>{table.rows?.length || 0} صف · {table.source || 'Agent'}</small><button onClick={() => startTableEdit(table)}>تعديل</button>{editingTableId === table.id && <div className="inline-editor"><input value={tableDraft.title} onChange={(e) => setTableDraft({ ...tableDraft, title: e.target.value })} /><textarea value={tableDraft.notes} onChange={(e) => setTableDraft({ ...tableDraft, notes: e.target.value })} /><div className="inline-actions"><button onClick={() => saveTableEdit(table)}>حفظ الجدول</button></div></div>}</div>)}
          {!linkedTables.length && <p>لا توجد جداول مرتبطة بعد.</p>}
        </article>
        <article className="resource-card">
          <div className="resource-head"><b>الرسائل والمسودات</b><a href="/agents">فتح الوكلاء</a></div>
          <strong>{linkedDrafts.length}</strong>
          {linkedDrafts.slice(0, 5).map((item) => <div className="resource-row" key={item.id}><span>{item.goal}</span><small>{item.agentName} · {item.createdAt}</small><p>{item.summary}</p></div>)}
          {!linkedDrafts.length && <p>لا توجد رسائل أو مسودات مرتبطة بعد.</p>}
        </article>
      </div>
    </section>
  );
}
