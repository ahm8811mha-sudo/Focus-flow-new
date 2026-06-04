import { useEffect, useMemo, useState } from 'react';
import { loadTables, type InternalTable } from '@/lib/internalTables';

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

type ProjectLike = {
  id: string;
  name: string;
  agentResults?: Array<{
    id: string;
    goal: string;
    agentName: string;
    status: string;
    summary: string;
    drafts?: string[];
    events?: string[];
    tables?: string[];
    tasks?: string[];
    createdAt: string;
  }>;
};

type Props = {
  project: ProjectLike;
  tasks?: LinkedTask[];
};

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

export default function ProjectLinkedResources({ project, tasks = [] }: Props) {
  const [tables, setTables] = useState<InternalTable[]>([]);

  useEffect(() => {
    setTables(loadTables());
    const onStorage = () => setTables(loadTables());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [project.id]);

  const linkedTasks = useMemo(() => asArray<LinkedTask>(tasks).filter((task) => relatedToProject(task, project)), [tasks, project]);
  const linkedEvents = useMemo(() => linkedTasks.filter(isCalendarTask), [linkedTasks]);
  const linkedTables = useMemo(() => asArray<InternalTable>(tables).filter((table) => relatedToProject(table, project)), [tables, project]);
  const linkedDrafts = useMemo(() => asArray(project.agentResults).filter((result) => asArray(result.drafts).length || /مسودة|بريد|إيميل|ايميل|رسالة/i.test(`${result.goal} ${result.summary}`)), [project]);

  return (
    <section className="panel" id="linked-resources">
      <div className="section-title">
        <h3>المخرجات المرتبطة بالمشروع</h3>
        <a className="mini-link" href="/execution">فتح سجل التنفيذ</a>
      </div>
      <div className="resource-grid">
        <article className="resource-card">
          <div className="resource-head"><b>المهام المرتبطة</b><a href="/tasks">فتح المهام</a></div>
          <strong>{linkedTasks.length}</strong>
          {linkedTasks.slice(0, 5).map((task) => <div className="resource-row" key={task.id}><span>{task.title}</span><small>{task.status || 'todo'} · {task.dueDate || 'بدون تاريخ'}</small></div>)}
          {!linkedTasks.length && <p>لا توجد مهام مرتبطة بعد.</p>}
        </article>
        <article className="resource-card">
          <div className="resource-head"><b>المواعيد المرتبطة</b><a href="/calendar">فتح التقويم</a></div>
          <strong>{linkedEvents.length}</strong>
          {linkedEvents.slice(0, 5).map((task) => <div className="resource-row" key={task.id}><span>{task.title}</span><small>{task.dueDate || 'بدون تاريخ'} · {task.dueTime || 'بدون وقت'}</small></div>)}
          {!linkedEvents.length && <p>لا توجد مواعيد مرتبطة بعد.</p>}
        </article>
        <article className="resource-card">
          <div className="resource-head"><b>الجداول المرتبطة</b><a href="/tables">فتح الجداول</a></div>
          <strong>{linkedTables.length}</strong>
          {linkedTables.slice(0, 5).map((table) => <div className="resource-row" key={table.id}><span>{table.title}</span><small>{table.rows?.length || 0} صف · {table.source || 'Agent'}</small></div>)}
          {!linkedTables.length && <p>لا توجد جداول مرتبطة بعد.</p>}
        </article>
        <article className="resource-card">
          <div className="resource-head"><b>الرسائل والمسودات</b><a href="/agents">فتح الوكلاء</a></div>
          <strong>{linkedDrafts.length}</strong>
          {linkedDrafts.slice(0, 5).map((item) => <div className="resource-row" key={item.id}><span>{item.goal}</span><small>{item.agentName} · {item.createdAt}</small></div>)}
          {!linkedDrafts.length && <p>لا توجد رسائل أو مسودات مرتبطة بعد.</p>}
        </article>
      </div>
    </section>
  );
}
