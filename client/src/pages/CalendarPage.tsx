import { useMemo, useState } from "react";
import { useLocalMemory } from "@/hooks/useLocalMemory";
import type { Priority, Task, TaskStatus } from "@/lib/localMemory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, CalendarDays, Clock, AlertCircle, CheckCircle2, Save, Trash2 } from "lucide-react";

type CalendarView = "gregorian" | "hijri";

const gregorianMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const weekDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "لم يبدأ" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "review", label: "مراجعة" },
  { value: "blocked", label: "متوقف" },
  { value: "done", label: "تم" },
];
const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

function todayIso() { return new Date().toISOString().slice(0, 10); }
function toIsoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseTaskDate(value?: string) { if (!value) return null; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? null : date; }
function getMonthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function getMonthEnd(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }
function getDatesBetween(start: Date, end: Date) { const dates: Date[] = []; const current = new Date(start); while (current <= end) { dates.push(new Date(current)); current.setDate(current.getDate() + 1); } return dates; }
function isToday(date: Date) { return toIsoDate(date) === todayIso(); }
function formatGregorianDate(date: Date) { return `${date.getDate()} ${gregorianMonths[date.getMonth()]} ${date.getFullYear()}`; }
function formatHijriSafe(date: Date) { try { return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(date); } catch { return "غير متاح"; } }
function getPriorityLabel(priority?: string) { if (priority === "urgent") return "عاجلة"; if (priority === "high") return "عالية"; if (priority === "medium") return "متوسطة"; return "منخفضة"; }
function getPriorityClass(priority?: string) { if (priority === "urgent" || priority === "high") return "badge danger"; if (priority === "medium") return "badge warning"; return "badge info"; }
function addDays(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return toIsoDate(d); }
function normalizeArabicNumbers(text: string) { return text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))); }
function extractDateFromCommand(text: string, currentDate: string) {
  const normalized = normalizeArabicNumbers(text);
  if (/بعد\s*غد|بعد بكرة/i.test(normalized)) return addDays(2);
  if (/غد|بكره|بكرة|غداً|غدا/i.test(normalized)) return addDays(1);
  if (/اليوم/i.test(normalized)) return todayIso();
  const iso = normalized.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return currentDate;
}
function extractTimeFromCommand(text: string, currentTime = "09:00") {
  const normalized = normalizeArabicNumbers(text);
  const m = normalized.match(/(?:الساعة\s*)?(\d{1,2})(?::(\d{2}))?\s*(صباح|ص|مساء|م|عصر)?/i);
  if (!m) return currentTime;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (/مساء|م|عصر/i.test(m[3] || "") && h < 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const memory = useLocalMemory();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [view, setView] = useState<CalendarView>("gregorian");
  const [editingId, setEditingId] = useState("");
  const [notice, setNotice] = useState("");
  const [quickCommand, setQuickCommand] = useState("");
  const [draft, setDraft] = useState({ title: "", description: "", dueDate: todayIso(), dueTime: "09:00", status: "todo" as TaskStatus, priority: "medium" as Priority });

  const tasks = memory.tasks || [];
  const datedTasks = useMemo(() => tasks.filter((task) => Boolean(task.dueDate)), [tasks]);
  const monthStart = getMonthStart(currentDate);
  const monthEnd = getMonthEnd(currentDate);
  const daysInMonth = getDatesBetween(monthStart, monthEnd);
  const firstDay = monthStart.getDay();

  const calendarDays = useMemo(() => {
    const previousMonthEnd = new Date(monthStart);
    previousMonthEnd.setDate(0);
    const previousDays = Array.from({ length: firstDay }, (_, index) => new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), previousMonthEnd.getDate() - firstDay + index + 1));
    const days = [...previousDays, ...daysInMonth];
    while (days.length % 7 !== 0) {
      const nextDay = new Date(monthEnd);
      nextDay.setDate(monthEnd.getDate() + (days.length - daysInMonth.length - firstDay + 1));
      days.push(nextDay);
    }
    return days;
  }, [firstDay, daysInMonth, monthEnd, monthStart]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    datedTasks.forEach((task) => {
      if (!task.dueDate) return;
      const list = map.get(task.dueDate) || [];
      list.push(task);
      map.set(task.dueDate, list);
    });
    return map;
  }, [datedTasks]);

  const selectedTasks = tasksByDate.get(selectedDate) || [];
  const selectedTask = tasks.find((task) => task.id === editingId) || selectedTasks[0] || null;
  const monthTasks = datedTasks.filter((task) => { const date = parseTaskDate(task.dueDate); return date && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear(); });
  const overdueTasks = datedTasks.filter((task) => task.status !== "done" && task.dueDate && task.dueDate < todayIso());
  const monthTitle = view === "gregorian" ? `${gregorianMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}` : formatHijriSafe(currentDate);

  function handlePrevMonth() { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); }
  function handleNextMonth() { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); }
  function handleToday() { const now = new Date(); setCurrentDate(now); setSelectedDate(todayIso()); }
  function startEdit(task: Task) {
    setEditingId(task.id);
    setDraft({ title: task.title, description: task.description || "", dueDate: task.dueDate || selectedDate, dueTime: task.dueTime || "09:00", status: task.status || "todo", priority: task.priority || "medium" });
  }
  async function saveEdit() {
    if (!editingId) return;
    await memory.saveTask({ id: editingId, title: draft.title.trim() || "موعد بدون عنوان", description: draft.description, dueDate: draft.dueDate, dueTime: draft.dueTime, status: draft.status, priority: draft.priority, listName: selectedTask?.listName || "Calendar", recurrence: selectedTask?.recurrence || "none", projectId: selectedTask?.projectId });
    setSelectedDate(draft.dueDate);
    setCurrentDate(new Date(`${draft.dueDate}T00:00:00`));
    setNotice("تم تحديث الموعد في التقويم والمهام.");
  }
  async function deleteTask(task: Task) {
    await memory.remove("tasks", task.id);
    setEditingId("");
    setNotice("تم حذف الموعد من التقويم.");
  }
  async function applyQuickCommand() {
    const target = selectedTask;
    if (!target) { setNotice("اختر موعدًا أولًا من اليوم المحدد."); return; }
    const nextDate = extractDateFromCommand(quickCommand, target.dueDate || selectedDate);
    const nextTime = extractTimeFromCommand(quickCommand, target.dueTime || "09:00");
    await memory.saveTask({ ...target, dueDate: nextDate, dueTime: nextTime, title: target.title, description: `${target.description || ""}\n\nتعديل تلقائي من التقويم: ${quickCommand}`.trim() });
    setSelectedDate(nextDate);
    setCurrentDate(new Date(`${nextDate}T00:00:00`));
    setQuickCommand("");
    setNotice(`تم تعديل الموعد تلقائيًا إلى ${nextDate} ${nextTime}.`);
  }

  return (
    <main className="calendar-shell" dir="rtl">
      <style>{styles}</style>
      <header className="calendar-hero">
        <a className="back" href="/">← الرئيسية</a>
        <span className="eyebrow">Focus Flow Calendar</span>
        <h1>التقويم</h1>
        <p>هنا تظهر المهام والمواعيد التي ينشئها الوكيل. يمكنك تعديل أي موعد يدويًا أو بأمر سريع من نفس الصفحة.</p>
        <div className="hero-actions">
          <Button onClick={handleToday}>اليوم</Button>
          <Button variant="outline" onClick={() => setView(view === "gregorian" ? "hijri" : "gregorian")}>{view === "gregorian" ? "عرض هجري" : "عرض ميلادي"}</Button>
        </div>
      </header>
      {notice && <section className="notice">{notice}</section>}
      <section className="stats-grid">
        <Card className="stat-card"><CalendarDays /><span>مهام مؤرخة</span><strong>{datedTasks.length}</strong><small>كل المهام ذات تاريخ</small></Card>
        <Card className="stat-card"><Clock /><span>هذا الشهر</span><strong>{monthTasks.length}</strong><small>{monthTitle}</small></Card>
        <Card className="stat-card danger"><AlertCircle /><span>متأخرة</span><strong>{overdueTasks.length}</strong><small>تحتاج متابعة</small></Card>
        <Card className="stat-card"><CheckCircle2 /><span>اليوم المحدد</span><strong>{selectedTasks.length}</strong><small>{selectedDate}</small></Card>
      </section>
      <Card className="calendar-card">
        <div className="month-header"><button onClick={handlePrevMonth} aria-label="الشهر السابق"><ChevronRight /></button><div><h2>{monthTitle}</h2><p>{formatGregorianDate(currentDate)} · {formatHijriSafe(currentDate)}</p></div><button onClick={handleNextMonth} aria-label="الشهر التالي"><ChevronLeft /></button></div>
        <div className="weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {calendarDays.map((date) => {
            const iso = toIsoDate(date);
            const dayTasks = tasksByDate.get(iso) || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
            const active = selectedDate === iso;
            return <button key={iso} className={`${isCurrentMonth ? "" : "muted"} ${isToday(date) ? "today" : ""} ${active ? "active" : ""}`} onClick={() => setSelectedDate(iso)}><b>{date.getDate()}</b>{dayTasks.slice(0, 2).map((task) => <small key={task.id}>{task.dueTime ? `${task.dueTime} · ` : ""}{task.title}</small>)}{dayTasks.length > 2 && <em>+{dayTasks.length - 2}</em>}</button>;
          })}
        </div>
      </Card>
      <section className="details-grid wide">
        <Card className="details-card">
          <h3>مهام {selectedDate}</h3>
          <div className="task-list">
            {selectedTasks.length ? selectedTasks.map((task) => <article key={task.id} className={`task-row ${editingId === task.id ? "selected" : ""}`} onClick={() => startEdit(task)}><div><b>{task.title}</b><p>{task.description || "بدون وصف"}</p><small>{task.dueTime || "بدون وقت"} · {task.status}</small></div><span className={getPriorityClass(task.priority)}>{getPriorityLabel(task.priority)}</span></article>) : <p className="empty">لا توجد مهام في هذا التاريخ.</p>}
          </div>
        </Card>
        <Card className="details-card editor-card">
          <h3>تعديل الموعد المحدد</h3>
          {selectedTask ? <>
            <div className="edit-grid">
              <label>العنوان<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
              <label>التاريخ<input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label>
              <label>الوقت<input type="time" value={draft.dueTime} onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })} /></label>
              <label>الأولوية<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}>{priorityOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
              <label>الحالة<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}>{statusOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
              <label className="full">الوصف<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
            </div>
            <div className="editor-actions"><Button onClick={saveEdit}><Save size={16} /> حفظ التعديل</Button><Button variant="destructive" onClick={() => deleteTask(selectedTask)}><Trash2 size={16} /> حذف الموعد</Button></div>
            <div className="quick-box"><h4>تعديل تلقائي سريع</h4><p>مثال: انقل الموعد إلى غد الساعة 9 صباحًا</p><textarea value={quickCommand} onChange={(e) => setQuickCommand(e.target.value)} placeholder="اكتب أمر تعديل مختصر للموعد المحدد" /><Button onClick={applyQuickCommand}>تطبيق الأمر</Button></div>
          </> : <p className="empty">اختر مهمة من القائمة لتعديلها.</p>}
        </Card>
      </section>
    </main>
  );
}

const styles = `
.calendar-shell{min-height:100vh;padding:18px 14px 100px;background:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px),radial-gradient(circle at 15% 0%,rgba(34,211,238,.18),transparent 30%),radial-gradient(circle at 85% 0%,rgba(124,58,237,.20),transparent 32%),#020202;background-size:3rem 3rem,3rem 3rem,auto,auto,auto;color:#f8fafc}.calendar-hero,.calendar-card,.details-card,.stat-card,.notice{border:1px solid rgba(255,255,255,.12)!important;background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04))!important;border-radius:34px!important;box-shadow:0 28px 90px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08)!important;backdrop-filter:blur(22px)!important}.calendar-hero{position:relative;display:grid;gap:12px;text-align:center;padding:28px;overflow:hidden}.calendar-hero:before{content:"";position:absolute;right:-90px;top:-120px;width:360px;height:360px;border-radius:999px;background:rgba(34,211,238,.18);filter:blur(70px)}.back{position:relative;justify-self:start;color:#bfdbfe;text-decoration:none}.eyebrow{position:relative;color:#67e8f9;letter-spacing:.22em;text-transform:uppercase;font-weight:950;font-size:12px}.calendar-hero h1{position:relative;margin:0;font-size:clamp(44px,10vw,82px);letter-spacing:-.055em}.calendar-hero p{position:relative;max-width:760px;margin:auto;color:#cbd5e1;line-height:1.9}.hero-actions{position:relative;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.hero-actions button,.editor-actions button,.quick-box button{min-height:48px;border-radius:18px!important;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed)!important;color:#fff!important;border:0!important;font-weight:900!important;padding:0 18px;text-decoration:none;display:inline-flex;align-items:center;gap:8px}.notice{margin:16px 0;padding:14px;color:#bbf7d0;border-color:rgba(34,197,94,.35)!important}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.stat-card{padding:18px!important;display:grid;gap:8px}.stat-card svg{color:#67e8f9}.stat-card span{color:#67e8f9;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:950}.stat-card strong{font-size:42px}.stat-card small{color:#cbd5e1}.stat-card.danger strong,.stat-card.danger svg{color:#fb7185}.calendar-card{padding:22px!important}.month-header{display:flex;align-items:center;justify-content:space-between;text-align:center;margin-bottom:18px}.month-header button{width:52px;height:52px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff}.month-header h2{margin:0;font-size:32px}.month-header p{color:#cbd5e1}.weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.weekdays span{color:#cbd5e1;text-align:center;font-size:12px;font-weight:800}.calendar-grid button{min-height:74px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#fff;text-align:right;padding:10px;display:grid;gap:4px;align-content:start}.calendar-grid button.active{background:linear-gradient(135deg,#06b6d4,#2563eb);border-color:rgba(103,232,249,.8)}.calendar-grid button.today{outline:2px solid rgba(103,232,249,.75)}.calendar-grid button.muted{opacity:.35}.calendar-grid b{font-size:18px}.calendar-grid small{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px;background:rgba(255,255,255,.08);border-radius:999px;padding:4px 7px}.calendar-grid em{font-style:normal;color:#bfdbfe}.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}.details-grid.wide{grid-template-columns:1fr 1.15fr}.details-card{padding:20px!important}.details-card h3{margin-top:0}.task-list{display:grid;gap:10px}.task-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.08);border-radius:22px;padding:14px;cursor:pointer}.task-row.selected{outline:2px solid rgba(103,232,249,.75)}.task-row b{display:block}.task-row p{margin:6px 0;color:#cbd5e1}.task-row small{color:#94a3b8}.badge{border:1px solid;border-radius:999px;padding:8px 12px;font-weight:900;white-space:nowrap}.badge.danger{color:#fecdd3;background:rgba(244,63,94,.14);border-color:rgba(244,63,94,.28)}.badge.warning{color:#fde68a;background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.28)}.badge.info{color:#a5f3fc;background:rgba(6,182,212,.14);border-color:rgba(6,182,212,.28)}.empty{color:#94a3b8}.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.edit-grid label{display:grid;gap:6px;color:#cbd5e1;font-weight:800}.edit-grid .full{grid-column:1/-1}.edit-grid input,.edit-grid select,.edit-grid textarea,.quick-box textarea{width:100%;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(15,23,42,.76);color:#fff;padding:12px;font:inherit}.edit-grid textarea,.quick-box textarea{min-height:90px}.editor-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.editor-actions button[variant="destructive"]{background:rgba(239,68,68,.22)!important;color:#fecaca!important}.quick-box{border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(255,255,255,.06);padding:14px;margin-top:12px}.quick-box h4{margin:0 0 6px}.quick-box p{color:#cbd5e1;margin:0 0 10px}@media(max-width:900px){.calendar-shell{padding:12px 10px 90px}.stats-grid,.details-grid,.details-grid.wide{grid-template-columns:1fr}.weekdays,.calendar-grid{gap:5px}.calendar-grid button{min-height:64px;padding:8px}.edit-grid{grid-template-columns:1fr}}
`;
