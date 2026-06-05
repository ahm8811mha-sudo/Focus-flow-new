import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Bot, RefreshCcw } from 'lucide-react';
import './execution-log.css';

type ExecutionStatus = 'running' | 'done' | 'failed' | 'needs_user';

type ExecutionEntry = {
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

function loadLog(): ExecutionEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

function saveLog(items: ExecutionEntry[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(items));
}

function statusLabel(status: ExecutionStatus) {
  if (status === 'done') return 'تم';
  if (status === 'failed') return 'فشل';
  if (status === 'needs_user') return 'يحتاج تدخلك';
  return 'قيد التنفيذ';
}

function statusClass(status: ExecutionStatus) {
  if (status === 'done') return 'done';
  if (status === 'failed') return 'failed';
  if (status === 'needs_user') return 'needs';
  return 'running';
}

export default function ExecutionLogPage() {
  const [items, setItems] = useState<ExecutionEntry[]>([]);
  useEffect(() => { setItems(loadLog()); }, []);

  const stats = useMemo(() => ({
    total: items.length,
    done: items.filter((item) => item.status === 'done').length,
    failed: items.filter((item) => item.status === 'failed').length,
    needs: items.filter((item) => item.status === 'needs_user').length,
  }), [items]);

  function clearLog() {
    if (!confirm('مسح سجل التنفيذ بالكامل؟')) return;
    saveLog([]);
    setItems([]);
  }

  function refresh() { setItems(loadLog()); }

  return (
    <main className="execution-shell" dir="rtl">
      <header className="hero-card">
        <a className="back" href="/">← الرئيسية</a>
        <span className="eyebrow">Execution Log</span>
        <h1>سجل التنفيذ</h1>
        <p>هنا يظهر ماذا فعل كل وكيل، أين حفظ النتيجة، ما الذي فشل، وما الخطوة التالية.</p>
        <div className="hero-actions"><button onClick={refresh}><RefreshCcw /> تحديث</button><button className="ghost" onClick={clearLog}>مسح السجل</button></div>
      </header>

      <section className="stats-grid">
        <article><Bot /><span>الإجمالي</span><strong>{stats.total}</strong></article>
        <article className="ok"><CheckCircle2 /><span>تم</span><strong>{stats.done}</strong></article>
        <article className="warn"><Clock /><span>يحتاج تدخلك</span><strong>{stats.needs}</strong></article>
        <article className="bad"><AlertTriangle /><span>فشل</span><strong>{stats.failed}</strong></article>
      </section>

      <section className="log-list">
        {items.map((item) => (
          <article key={item.id} className="log-card">
            <div className="log-head"><div><b>{item.agentName}</b><h2>{item.goal}</h2></div><span className={statusClass(item.status)}>{statusLabel(item.status)}</span></div>
            <p>{item.summary}</p>
            <div className="cols">
              <div><h3>ما تم</h3>{item.results.length ? item.results.map((r) => <small key={r}>• {r}</small>) : <small>لا توجد نتائج مسجلة.</small>}</div>
              <div><h3>الناقص/الفشل</h3>{item.failures.length ? item.failures.map((f) => <small key={f}>• {f}</small>) : <small>لا يوجد فشل مسجل.</small>}</div>
              <div><h3>الخطوة التالية</h3>{item.nextSteps.length ? item.nextSteps.map((n) => <small key={n}>• {n}</small>) : <small>لا توجد خطوة تالية.</small>}</div>
            </div>
            <footer>{new Date(item.createdAt).toLocaleString('ar-SA')} · آخر تحديث {new Date(item.updatedAt).toLocaleString('ar-SA')}</footer>
          </article>
        ))}
        {!items.length && <div className="empty">لم يتم تسجيل أي تنفيذ بعد. شغّل أحد الوكلاء ثم ارجع هنا.</div>}
      </section>
    </main>
  );
}
