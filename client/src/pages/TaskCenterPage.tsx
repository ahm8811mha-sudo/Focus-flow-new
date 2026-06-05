import { useMemo, useState, type FormEvent } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Priority, Task, TaskStatus } from '@/lib/localMemory';
import './task-center.css';

const priorityLabel: Record<Priority, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const statusLabel: Record<TaskStatus, string> = { todo: 'جديدة', in_progress: 'قيد التنفيذ', review: 'مراجعة', done: 'مكتملة', blocked: 'معلقة' };
const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];
function today() { return new Date().toISOString().slice(0, 10); }
function asArray<T = any>(value: any): T[] { return Array.isArray(value) ? value : []; }
function normalizeStatus(status?: string): TaskStatus { return statuses.includes(status as TaskStatus) ? status as TaskStatus : 'todo'; }
function normalizePriority(priority?: string): Priority { return ['low','medium','high','urgent'].includes(String(priority)) ? priority as Priority : 'medium'; }
const emptyForm = { title: '', description: '', status: 'todo' as TaskStatus, priority: 'medium' as Priority, dueDate: today(), dueTime: '', listName: 'Focus', recurrence: 'none' as const };

export default function TaskCenterPage() {
  const memory = useLocalMemory();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const tasks = useMemo(() => asArray<Task>(memory.tasks).map((task: any) => ({ ...task, status: normalizeStatus(task?.status), priority: normalizePriority(task?.priority), title: task?.title || 'مهمة بدون عنوان', description: task?.description || '', listName: task?.listName || 'Focus' })), [memory.tasks]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return tasks; return tasks.filter((task) => `${task.title} ${task.description} ${task.listName} ${task.priority} ${task.status}`.toLowerCase().includes(q)); }, [tasks, query]);
  const grouped = useMemo(() => { const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [], blocked: [] }; filtered.forEach((task) => map[normalizeStatus(task.status)].push(task)); return map; }, [filtered]);
  function openNew() { setEditingId(null); setForm(emptyForm); setFormOpen(true); }
  function openEdit(task: Task) { setEditingId(task.id); setForm({ title: task.title || '', description: task.description || '', status: normalizeStatus(task.status), priority: normalizePriority(task.priority), dueDate: task.dueDate || today(), dueTime: task.dueTime || '', listName: task.listName || 'Focus', recurrence: task.recurrence || 'none' }); setFormOpen(true); }
  async function saveTask(event: FormEvent) { event.preventDefault(); if (!form.title.trim()) return; await memory.saveTask({ id: editingId || undefined, ...form, title: form.title.trim(), projectId: undefined }); setFormOpen(false); setEditingId(null); }
  async function updateStatus(task: Task, status: TaskStatus) { await memory.saveTask({ ...task, status }); }
  async function removeTask(task: Task) { if (!confirm('حذف المهمة نهائيًا؟')) return; await memory.remove('tasks', task.id); }
  const overdue = filtered.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today()).length;
  const openCount = tasks.filter((t) => t.status !== 'done').length;
  const todayCount = tasks.filter((t) => t.dueDate === today()).length;
  return (
    <main className="tasks-shell" dir="rtl"><header className="hero-card"><a className="back" href="/">← الرئيسية</a><a className="hub" href="/agents">الوكلاء</a><span className="eyebrow">Unified Task Center</span><h1>مركز المهام</h1><p>صفحة واحدة للمهام التي تضيفها أنت أو ينشئها الوكلاء، بدون واجهات قديمة أو تبويبات مربكة.</p><div className="hero-actions"><button onClick={openNew}>+ مهمة كاملة</button><a href="/calendar">التقويم</a><a href="/execution">سجل التنفيذ</a><a href="/tables">الجداول</a></div></header>
      <section className="stats-grid"><a href="/tasks"><span>كل المهام</span><strong>{tasks.length}</strong><small>محلية + مهام الوكلاء</small></a><a href="/tasks"><span>المفتوحة</span><strong>{openCount}</strong><small>قيد العمل</small></a><a href="/tasks" className="danger"><span>متأخرة</span><strong>{overdue}</strong><small>تحتاج متابعة</small></a><a href="/calendar"><span>اليوم</span><strong>{todayCount}</strong><small>{today()}</small></a></section>
      <section className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في المهام، الوصف، الحالة..." /><button onClick={openNew}>+ إضافة مهمة</button></section>
      {formOpen && <section className="panel form-panel"><form onSubmit={saveTask}><div className="section-title"><h2>{editingId ? 'تعديل المهمة' : 'مهمة جديدة'}</h2><button type="button" className="ghost" onClick={() => setFormOpen(false)}>إغلاق</button></div><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان المهمة" /><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف المهمة" /><div className="form-grid"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /><input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} /><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>{statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></div><button className="primary" type="submit">حفظ المهمة</button></form></section>}
      <section className="kanban-grid">{statuses.map((status) => <article key={status} className="column"><div className="column-head"><h2>{statusLabel[status]}</h2><span>{grouped[status].length}</span></div>{grouped[status].map((task) => <div key={task.id} className="task-card"><b>{task.title}</b><p>{task.description || 'بدون وصف'}</p><small>{task.dueDate || 'بدون تاريخ'} · {task.dueTime || 'بدون وقت'} · {priorityLabel[normalizePriority(task.priority)]}</small><div className="task-actions"><button onClick={() => openEdit(task)}>تعديل</button>{status !== 'done' && <button onClick={() => updateStatus(task, 'done')}>تم</button>}<button className="danger-btn" onClick={() => removeTask(task)}>حذف</button></div></div>)}{!grouped[status].length && <small className="empty">لا توجد مهام.</small>}</article>)}</section></main>
  );
}
