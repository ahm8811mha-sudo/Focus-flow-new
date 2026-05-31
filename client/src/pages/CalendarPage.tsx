import { useMemo, useState } from "react";
import { useLocalMemory } from "@/hooks/useLocalMemory";
import type { Task } from "@/lib/localMemory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, CalendarDays, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

type CalendarView = "gregorian" | "hijri";

const gregorianMonths = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const weekDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTaskDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getDatesBetween(start: Date, end: Date) {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function isToday(date: Date) {
  return toIsoDate(date) === todayIso();
}

function formatGregorianDate(date: Date) {
  return `${date.getDate()} ${gregorianMonths[date.getMonth()]} ${date.getFullYear()}`;
}

function formatHijriSafe(date: Date) {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return "غير متاح";
  }
}

function getPriorityLabel(priority?: string) {
  if (priority === "urgent") return "عاجلة";
  if (priority === "high") return "عالية";
  if (priority === "medium") return "متوسطة";
  return "منخفضة";
}

function getPriorityClass(priority?: string) {
  if (priority === "urgent" || priority === "high") return "text-rose-300 bg-rose-500/15 border-rose-500/25";
  if (priority === "medium") return "text-amber-300 bg-amber-500/15 border-amber-500/25";
  return "text-cyan-300 bg-cyan-500/15 border-cyan-500/25";
}

export default function CalendarPage() {
  const memory = useLocalMemory();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [view, setView] = useState<CalendarView>("gregorian");

  const tasks = memory.tasks || [];
  const datedTasks = useMemo(() => tasks.filter((task) => Boolean(task.dueDate)), [tasks]);
  const monthStart = getMonthStart(currentDate);
  const monthEnd = getMonthEnd(currentDate);
  const daysInMonth = getDatesBetween(monthStart, monthEnd);
  const firstDay = monthStart.getDay();

  const calendarDays = useMemo(() => {
    const previousMonthEnd = new Date(monthStart);
    previousMonthEnd.setDate(0);

    const previousDays = Array.from({ length: firstDay }, (_, index) => {
      const day = previousMonthEnd.getDate() - firstDay + index + 1;
      return new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), day);
    });

    const days = [...previousDays, ...daysInMonth];

    while (days.length % 7 !== 0) {
      const nextDay = new Date(monthEnd);
      nextDay.setDate(nextDay.getDate() + (days.length - daysInMonth.length - firstDay + 1));
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
  const monthTasks = datedTasks.filter((task) => {
    const date = parseTaskDate(task.dueDate);
    return date && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  });
  const overdueTasks = datedTasks.filter((task) => task.status !== "done" && task.dueDate && task.dueDate < todayIso());

  const monthTitle = view === "gregorian" ? `${gregorianMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}` : formatHijriSafe(currentDate);

  function handlePrevMonth() {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(next);
  }

  function handleNextMonth() {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(next);
  }

  function handleToday() {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(todayIso());
  }

  return (
    <main className="calendar-shell" dir="rtl">
      <style>{styles}</style>

      <header className="calendar-hero">
        <a className="back" href="/">← الرئيسية</a>
        <span className="eyebrow">Focus Flow Calendar</span>
        <h1>التقويم</h1>
        <p>هنا تظهر المهام والمواعيد التي ينشئها الوكيل تلقائيًا حسب التاريخ والوقت.</p>
        <div className="hero-actions">
          <Button onClick={handleToday}>اليوم</Button>
          <Button variant="outline" onClick={() => setView(view === "gregorian" ? "hijri" : "gregorian")}>{view === "gregorian" ? "عرض هجري" : "عرض ميلادي"}</Button>
        </div>
      </header>

      <section className="stats-grid">
        <Card className="stat-card"><CalendarDays /><span>مهام مؤرخة</span><strong>{datedTasks.length}</strong><small>كل المهام ذات تاريخ</small></Card>
        <Card className="stat-card"><Clock /><span>هذا الشهر</span><strong>{monthTasks.length}</strong><small>{monthTitle}</small></Card>
        <Card className="stat-card danger"><AlertCircle /><span>متأخرة</span><strong>{overdueTasks.length}</strong><small>تحتاج متابعة</small></Card>
        <Card className="stat-card"><CheckCircle2 /><span>اليوم المحدد</span><strong>{selectedTasks.length}</strong><small>{selectedDate}</small></Card>
      </section>

      <Card className="calendar-card">
        <div className="month-header">
          <button onClick={handlePrevMonth} aria-label="الشهر السابق"><ChevronRight /></button>
          <div>
            <h2>{monthTitle}</h2>
            <p>{formatGregorianDate(currentDate)} · {formatHijriSafe(currentDate)}</p>
          </div>
          <button onClick={handleNextMonth} aria-label="الشهر التالي"><ChevronLeft /></button>
        </div>

        <div className="weekdays">
          {weekDays.map((day) => <span key={day}>{day}</span>)}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((date) => {
            const iso = toIsoDate(date);
            const dayTasks = tasksByDate.get(iso) || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
            const active = selectedDate === iso;
            return (
              <button key={iso} className={`${isCurrentMonth ? "" : "muted"} ${isToday(date) ? "today" : ""} ${active ? "active" : ""}`} onClick={() => setSelectedDate(iso)}>
                <b>{date.getDate()}</b>
                {dayTasks.slice(0, 2).map((task) => <small key={task.id}>{task.title}</small>)}
                {dayTasks.length > 2 && <em>+{dayTasks.length - 2}</em>}
              </button>
            );
          })}
        </div>
      </Card>

      <section className="details-grid">
        <Card className="details-card">
          <h3>مهام {selectedDate}</h3>
          <div className="task-list">
            {selectedTasks.length ? selectedTasks.map((task) => (
              <article key={task.id} className="task-row">
                <div>
                  <b>{task.title}</b>
                  <p>{task.description || "بدون وصف"}</p>
                  <small>{task.dueTime || "بدون وقت"} · {task.status}</small>
                </div>
                <span className={getPriorityClass(task.priority)}>{getPriorityLabel(task.priority)}</span>
              </article>
            )) : <p className="empty">لا توجد مهام في هذا التاريخ.</p>}
          </div>
        </Card>

        <Card className="details-card">
          <h3>كيف تشوف مهام الوكيل؟</h3>
          <p>أي إجراء من نوع مهمة أو موعد يحفظ داخل الذاكرة المحلية. افتح هذا التقويم واختر اليوم، أو افتح صفحة المهام من الرابط أدناه.</p>
          <div className="link-actions">
            <a href="/tasks">فتح صفحة المهام</a>
            <a href="/agents">تشغيل الوكيل</a>
          </div>
        </Card>
      </section>
    </main>
  );
}

const styles = `
.calendar-shell{min-height:100vh;padding:18px 14px 100px;background:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px),radial-gradient(circle at 15% 0%,rgba(34,211,238,.18),transparent 30%),radial-gradient(circle at 85% 0%,rgba(124,58,237,.20),transparent 32%),#020202;background-size:3rem 3rem,3rem 3rem,auto,auto,auto;color:#f8fafc}.calendar-hero,.calendar-card,.details-card,.stat-card{border:1px solid rgba(255,255,255,.12)!important;background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04))!important;border-radius:34px!important;box-shadow:0 28px 90px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08)!important;backdrop-filter:blur(22px)!important}.calendar-hero{position:relative;display:grid;gap:12px;text-align:center;padding:28px;overflow:hidden}.calendar-hero:before{content:"";position:absolute;right:-90px;top:-120px;width:360px;height:360px;border-radius:999px;background:rgba(34,211,238,.18);filter:blur(70px)}.back{position:relative;justify-self:start;color:#bfdbfe;text-decoration:none}.eyebrow{position:relative;color:#67e8f9;letter-spacing:.22em;text-transform:uppercase;font-weight:950;font-size:12px}.calendar-hero h1{position:relative;margin:0;font-size:clamp(44px,10vw,82px);letter-spacing:-.055em}.calendar-hero p{position:relative;max-width:760px;margin:auto;color:#cbd5e1;line-height:1.9}.hero-actions{position:relative;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.hero-actions button,.link-actions a{min-height:48px;border-radius:18px!important;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed)!important;color:#fff!important;border:0!important;font-weight:900!important;padding:0 18px;text-decoration:none;display:grid;place-items:center}.hero-actions button[variant="outline"]{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.12)!important}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.stat-card{padding:18px!important;display:grid;gap:8px}.stat-card svg{color:#67e8f9}.stat-card span{color:#67e8f9;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:950}.stat-card strong{font-size:34px}.stat-card small,.month-header p,.details-card p,.task-row p,.task-row small,.empty{color:#cbd5e1}.stat-card.danger strong,.stat-card.danger svg{color:#fb7185}.calendar-card{padding:18px!important}.month-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.month-header h2{margin:0;font-size:30px}.month-header button{width:48px;height:48px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;display:grid;place-items:center}.weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.weekdays span{text-align:center;color:#94a3b8;font-weight:900;font-size:13px;padding:8px 0}.calendar-grid button{min-height:112px;border-radius:20px;border:1px solid rgba(255,255,255,.10);background:rgba(15,23,42,.58);color:#fff;text-align:right;padding:10px;display:flex;flex-direction:column;gap:6px;overflow:hidden}.calendar-grid button.muted{opacity:.36}.calendar-grid button.today{border-color:rgba(34,211,238,.55);box-shadow:0 0 0 1px rgba(34,211,238,.22),0 14px 40px rgba(34,211,238,.12)}.calendar-grid button.active{background:linear-gradient(145deg,rgba(34,211,238,.18),rgba(124,58,237,.12));border-color:rgba(124,58,237,.55)}.calendar-grid b{font-size:17px}.calendar-grid small{font-size:11px;color:#bae6fd;background:rgba(14,165,233,.12);border:1px solid rgba(14,165,233,.22);border-radius:999px;padding:3px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.calendar-grid em{font-style:normal;color:#c4b5fd;font-size:11px}.details-grid{display:grid;grid-template-columns:1.3fr .7fr;gap:14px;margin-top:16px}.details-card{padding:20px!important}.details-card h3{margin:0 0 14px}.task-list{display:grid;gap:10px}.task-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border:1px solid rgba(255,255,255,.10);border-radius:20px;background:rgba(15,23,42,.58);padding:14px}.task-row div{display:grid;gap:4px}.task-row span{border:1px solid;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900;white-space:nowrap}.link-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}@media(max-width:760px){.calendar-shell{padding:12px 10px 92px}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.details-grid{grid-template-columns:1fr}.weekdays,.calendar-grid{gap:5px}.weekdays span{font-size:10px}.calendar-grid button{min-height:84px;border-radius:16px;padding:7px}.calendar-grid small{display:none}.month-header h2{font-size:24px}.task-row{flex-direction:column}.link-actions{grid-template-columns:1fr}}
`;
