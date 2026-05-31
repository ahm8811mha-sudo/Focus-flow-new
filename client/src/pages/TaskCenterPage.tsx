import { useMemo, useState, type FormEvent } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Priority, Task, TaskStatus } from '@/lib/localMemory';

const priorityLabel: Record<Priority, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const statusLabel: Record<TaskStatus, string> = { todo: 'جديدة', in_progress: 'قيد التنفيذ', review: 'مراجعة', done: 'مكتملة', blocked: 'معلقة' };
const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];

function today() { return new Date().toISOString().slice(0, 10); }

const emptyForm = {
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as Priority,
  dueDate: today(),
  dueTime: '',
  listName: 'Focus',
  recurrence: 'none' as const,
};

export default function TaskCenterPage() {
  const memory = useLocalMemory();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memory.tasks;
    return memory.tasks.filter((task) => `${task.title} ${task.description} ${task.listName} ${task.priority} ${task.status}`.toLowerCase().includes(q));
  }, [memory.tasks, query]);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [], blocked: [] };
    filtered.forEach((task) => map[task.status].push(task));
    return map;
  }, [filtered]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || today(),
      dueTime: task.dueTime || '',
      listName: task.listName || 'Focus',
      recurrence: task.recurrence || 'none',
    });
    setFormOpen(true);
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    await memory.saveTask({
      id: editingId || undefined,
      ...form,
      title: form.title.trim(),
      projectId: undefined,
    });
    setFormOpen(false);
    setEditingId(null);
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    await memory.saveTask({ ...task, status });
  }

  async function removeTask(task: Task) {
    if (!confirm('حذف المهمة نهائيًا؟')) return;
    await memory.remove('tasks', task.id);
  }

  const overdue = filtered.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today()).length;

  return (
    <main className="tasks-shell" dir="rtl">
      <style>{styles}</style>
      <header className="hero-card">
        <a className="back" href="/">← الرئيسية</a>
        <a className="hub" href="/agents">الوكلاء</a>
        <span className="eyebrow">Unified Task Center</span>
        <h1>مركز المهام</h1>
        <p>صفحة واحدة للمهام التي تضيفها أنت أو ينشئها الوكلاء، بدون واجهات قديمة أو تبويبات مربكة.</p>
        <div className="hero-actions"><button onClick={openNew}>+ مهمة كاملة</button><a href="/calendar">التقويم</a><a href="/execution">سجل التنفيذ</a></div>
      </header>

      <section className="stats-grid">
        <article><span>كل المهام</span><strong>{memory.tasks.length}</strong><small>محلية + مهام الوكلاء</small></article>
        <article><span>المفتوحة</span><strong>{memory.tasks.filter((t) => t.status !== 'done').length}</strong><small>قيد العمل</small></article>
        <article className="danger"><span>متأخرة</span><strong>{overdue}</strong><small>تحتاج متابعة</small></article>
        <article><span>اليوم</span><strong>{memory.tasks.filter((t) => t.dueDate === today()).length}</strong><small>{today()}</small></article>
      </section>

      <section className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في المهام، الوصف، الحالة..." /><button onClick={openNew}>+ إضافة مهمة</button></section>

      {formOpen && <section className="panel form-panel"><form onSubmit={saveTask}><div className="section-title"><h2>{editingId ? 'تعديل المهمة' : 'مهمة جديدة'}</h2><button type="button" className="ghost" onClick={() => setFormOpen(false)}>إغلاق</button></div><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان المهمة" /><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف المهمة" /><div className="form-grid"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /><input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} /><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>{statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></div><button className="primary" type="submit">حفظ المهمة</button></form></section>}

      <section className="kanban-grid">{statuses.map((status) => <article key={status} className="column"><div className="column-head"><h2>{statusLabel[status]}</h2><span>{grouped[status].length}</span></div>{grouped[status].map((task) => <div key={task.id} className="task-card"><b>{task.title}</b><p>{task.description || 'بدون وصف'}</p><small>{task.dueDate || 'بدون تاريخ'} · {task.dueTime || 'بدون وقت'} · {priorityLabel[task.priority]}</small><div className="task-actions"><button onClick={() => openEdit(task)}>تعديل</button>{status !== 'done' && <button onClick={() => updateStatus(task, 'done')}>تم</button>}<button className="danger-btn" onClick={() => removeTask(task)}>حذف</button></div></div>)}{!grouped[status].length && <small className="empty">لا توجد مهام.</small>}</article>)}</section>
    </main>
  );
}

const styles = `:root{color-scheme:dark;font-family:Cairo,-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#050816}*{box-sizing:border-box}body{margin:0;background:#020202;color:#f8fafc}.tasks-shell{min-height:100vh;padding:18px 14px 100px;background:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px),radial-gradient(circle at 15% 0%,rgba(34,211,238,.18),transparent 30%),radial-gradient(circle at 85% 0%,rgba(124,58,237,.20),transparent 32%),#020202;background-size:3rem 3rem,3rem 3rem,auto,auto,auto}.hero-card,.panel,.stats-grid article,.toolbar,.column,.task-card{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04));border-radius:34px;box-shadow:0 28px 90px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(22px)}.hero-card{position:relative;display:grid;gap:12px;text-align:center;padding:28px;overflow:hidden}.back,.hub{position:relative;color:#bfdbfe;text-decoration:none}.back{justify-self:start}.hub{position:absolute;left:28px;top:28px}.eyebrow{color:#67e8f9;letter-spacing:.22em;text-transform:uppercase;font-weight:950;font-size:12px}.hero-card h1{margin:0;font-size:clamp(44px,10vw,82px);letter-spacing:-.055em}.hero-card p{max-width:760px;margin:auto;color:#cbd5e1;line-height:1.8}.hero-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.hero-actions button,.hero-actions a,.toolbar button,.primary{min-height:50px;border:0;border-radius:18px;padding:0 18px;font-weight:950;color:#fff;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);display:grid;place-items:center;text-decoration:none}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.stats-grid article{padding:18px;display:grid;gap:8px}.stats-grid span{color:#67e8f9;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:950}.stats-grid strong{font-size:34px}.stats-grid small,.task-card p,.task-card small,.empty{color:#cbd5e1}.stats-grid .danger strong{color:#fb7185}.toolbar{display:grid;grid-template-columns:1fr auto;gap:10px;padding:14px;margin-bottom:16px}input,textarea,select{width:100%;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(15,23,42,.72);color:#fff;padding:15px 16px;outline:none;font:inherit}textarea{min-height:120px;line-height:1.6}.panel{padding:18px;margin-bottom:16px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px}.ghost{background:rgba(255,255,255,.08)!important}.form-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0}.kanban-grid{display:grid;grid-template-columns:repeat(5,minmax(220px,1fr));gap:12px;overflow-x:auto;padding-bottom:10px}.column{padding:14px;display:grid;gap:10px;align-content:start;min-height:260px}.column-head{display:flex;justify-content:space-between;align-items:center}.column-head h2{font-size:17px;margin:0}.column-head span{background:rgba(103,232,249,.14);border:1px solid rgba(103,232,249,.25);color:#67e8f9;border-radius:999px;padding:6px 10px;font-weight:900}.task-card{padding:14px;border-radius:22px;box-shadow:none;background:rgba(15,23,42,.58)}.task-card b{font-size:16px}.task-card p{margin:8px 0}.task-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.task-actions button{border:0;border-radius:14px;padding:9px 12px;font-weight:900;color:#fff;background:rgba(59,130,246,.22)}.danger-btn{background:rgba(239,68,68,.25)!important}@media(max-width:860px){.tasks-shell{padding:12px 10px 90px}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.toolbar{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr 1fr}.kanban-grid{grid-template-columns:1fr}.hub{position:static;justify-self:start}}`;