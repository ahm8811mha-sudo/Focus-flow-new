import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Bot, RefreshCcw } from 'lucide-react';

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
      <style>{styles}</style>
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

const styles = `
.execution-shell{min-height:100vh;padding:18px 14px 100px;background:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px),radial-gradient(circle at 15% 0%,rgba(34,211,238,.18),transparent 30%),radial-gradient(circle at 85% 0%,rgba(124,58,237,.20),transparent 32%),#020202;background-size:3rem 3rem,3rem 3rem,auto,auto,auto;color:#f8fafc}.hero-card,.stats-grid article,.log-card,.empty{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04));border-radius:34px;box-shadow:0 28px 90px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(22px)}.hero-card{position:relative;display:grid;gap:12px;text-align:center;padding:28px;overflow:hidden}.hero-card:before{content:"";position:absolute;right:-90px;top:-120px;width:360px;height:360px;border-radius:999px;background:rgba(34,211,238,.18);filter:blur(70px)}.back{position:relative;justify-self:start;color:#bfdbfe;text-decoration:none}.eyebrow{position:relative;color:#67e8f9;letter-spacing:.22em;text-transform:uppercase;font-weight:950;font-size:12px}.hero-card h1{position:relative;margin:0;font-size:clamp(44px,10vw,82px);letter-spacing:-.055em}.hero-card p{position:relative;max-width:760px;margin:auto;color:#cbd5e1;line-height:1.9}.hero-actions{position:relative;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.hero-actions button{min-height:50px;border:0;border-radius:18px;padding:0 18px;font-weight:950;color:#fff;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);display:flex;align-items:center;gap:8px}.hero-actions .ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.stats-grid article{padding:18px;display:grid;gap:8px}.stats-grid svg{color:#67e8f9}.stats-grid span{color:#67e8f9;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:950}.stats-grid strong{font-size:34px}.stats-grid .ok svg,.stats-grid .ok strong{color:#86efac}.stats-grid .warn svg,.stats-grid .warn strong{color:#fbbf24}.stats-grid .bad svg,.stats-grid .bad strong{color:#fb7185}.log-list{display:grid;gap:14px}.log-card{padding:20px}.log-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.log-head b{color:#67e8f9}.log-head h2{margin:6px 0 0;font-size:22px}.log-head span{border:1px solid;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:950;white-space:nowrap}.done{color:#86efac;background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.35)}.failed{color:#fecaca;background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.35)}.needs{color:#fde68a;background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35)}.running{color:#bfdbfe;background:rgba(59,130,246,.14);border-color:rgba(59,130,246,.35)}.log-card p,.log-card footer,.empty{color:#cbd5e1;line-height:1.7}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}.cols div{border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(15,23,42,.5);padding:14px;display:grid;gap:7px}.cols h3{margin:0;color:#fff}.cols small{color:#cbd5e1;line-height:1.6}.log-card footer{margin-top:12px;font-size:12px}.empty{padding:24px;text-align:center}@media(max-width:760px){.execution-shell{padding:12px 10px 92px}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cols{grid-template-columns:1fr}.log-head{flex-direction:column}.hero-card{border-radius:38px;padding:26px 20px}}
`;
