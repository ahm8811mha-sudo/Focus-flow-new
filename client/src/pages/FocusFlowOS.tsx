import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import { getStoredDriveToken } from '@/lib/googleDriveCloud';

function today() { return new Date().toISOString().slice(0, 10); }

const modules = [
  { title: 'الوكلاء', href: '/agents', tag: 'AI Command', desc: 'القائد العام يحول الطلب إلى إجراءات قابلة للتنفيذ.' },
  { title: 'المهام', href: '/focus', tag: 'Execution', desc: 'إضافة وتعديل ومتابعة المهام والمشاريع.' },
  { title: 'النظام', href: '/system', tag: 'Control', desc: 'Gemini و Google Drive و Gmail و Calendar و Sheets.' },
  { title: 'المشاريع', href: '/projects', tag: 'Projects', desc: 'متابعة التقدم والتكاليف والخطوات.' },
];

export default function FocusFlowOS() {
  const memory = useLocalMemory();
  const [geminiReady, setGeminiReady] = useState(false);
  const googleReady = Boolean(getStoredDriveToken());

  useEffect(() => {
    fetch('/api/agents/status')
      .then((res) => res.json())
      .then((data) => setGeminiReady(Boolean(data?.geminiConfigured || data?.openaiConfigured)))
      .catch(() => setGeminiReady(false));
  }, []);

  const overdue = useMemo(() => memory.tasks.filter((task) => task.dueDate && task.dueDate < today() && task.status !== 'done'), [memory.tasks]);
  const urgent = useMemo(() => memory.tasks.filter((task) => task.status !== 'done' && (task.priority === 'urgent' || task.priority === 'high')), [memory.tasks]);
  const topTasks = useMemo(() => memory.tasks.filter((task) => task.status !== 'done').slice(0, 5), [memory.tasks]);

  return (
    <main className="pro-shell" dir="rtl">
      <style>{styles}</style>
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <aside className="side-rail">
        <div className="logo">FF</div>
        <a href="/agents">AI</a>
        <a href="/focus">Tasks</a>
        <a href="/system">System</a>
        <a href="/calendar">Cal</a>
      </aside>

      <section className="hero-pro">
        <div className="hero-copy">
          <span className="eyebrow">FOCUS FLOW / GEMINI OPERATING SYSTEM</span>
          <h1>نظام تنفيذ ذكي، مو مجرد قائمة مهام.</h1>
          <p>واجهة مركزية للوكلاء، المهام، المشاريع، التقويم، وخدمات Google بتصميم زجاجي احترافي.</p>
          <div className="hero-actions">
            <a className="primary" href="/agents">تشغيل الوكلاء</a>
            <a className="secondary" href="/focus">فتح المهام</a>
          </div>
        </div>
        <div className="ai-card">
          <span>AI STATUS</span>
          <strong>{geminiReady ? 'Gemini متصل' : 'Gemini غير مفعل'}</strong>
          <small>{geminiReady ? 'الوكلاء جاهزون لاتخاذ القرار' : 'أضف GEMINI_API_KEY في Vercel'}</small>
          <div className="pulse" />
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric"><span>Google</span><strong>{googleReady ? 'متصل' : 'غير مربوط'}</strong><small>Drive / Gmail / Calendar / Sheets</small></div>
        <div className="metric"><span>المهام</span><strong>{memory.tasks.length}</strong><small>{urgent.length} عالية أو عاجلة</small></div>
        <div className="metric"><span>المتأخر</span><strong>{overdue.length}</strong><small>تحتاج تدخل اليوم</small></div>
        <div className="metric"><span>المشاريع</span><strong>{memory.projects.length}</strong><small>قيد المتابعة</small></div>
      </section>

      <section className="bento-grid">
        <article className="panel command">
          <div className="section-title"><span>COMMAND CENTER</span><a href="/agents">فتح</a></div>
          <h2>اطلب قرار، وخله يتحول إلى تنفيذ.</h2>
          <p>مثال: رتب يومي، حدد أهم 3 إجراءات، أنشئ المهام، وجهز رسالة متابعة.</p>
          <div className="prompt-preview">رتب يومي وابدأ بالأكثر تأثيرًا.</div>
        </article>

        <article className="panel tasks-panel">
          <div className="section-title"><span>ACTIVE TASKS</span><a href="/focus">إدارة</a></div>
          <div className="task-list">
            {topTasks.map((task) => <div className="task-row" key={task.id}><b>{task.title}</b><small>{task.dueDate || 'بدون تاريخ'} · {task.priority}</small></div>)}
            {!topTasks.length && <small>لا توجد مهام مفتوحة.</small>}
          </div>
        </article>

        {modules.map((module) => (
          <a className="module-card" href={module.href} key={module.href}>
            <span>{module.tag}</span>
            <strong>{module.title}</strong>
            <small>{module.desc}</small>
          </a>
        ))}
      </section>

      <nav className="mobile-nav">
        <a href="/agents">الوكلاء</a>
        <a href="/focus">المهام</a>
        <a href="/system">النظام</a>
        <a href="/calendar">التقويم</a>
      </nav>
    </main>
  );
}

const styles = `
:root{color-scheme:dark;font-family:Cairo,-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#030712}*{box-sizing:border-box}body{margin:0;background:#030712;color:#f8fafc}.pro-shell{position:relative;min-height:100vh;overflow:hidden;padding:24px 24px 110px 108px;background:radial-gradient(circle at 15% 5%,rgba(6,182,212,.28),transparent 28%),radial-gradient(circle at 80% 0%,rgba(124,58,237,.34),transparent 34%),linear-gradient(135deg,#030712,#08111f 55%,#020617)}.orb{position:fixed;border-radius:999px;filter:blur(70px);pointer-events:none;opacity:.65}.orb-a{width:340px;height:340px;background:#2563eb;right:-120px;top:90px}.orb-b{width:260px;height:260px;background:#7c3aed;left:-80px;bottom:120px}.side-rail{position:fixed;right:22px;top:22px;bottom:22px;width:68px;border:1px solid rgba(255,255,255,.14);border-radius:30px;background:rgba(15,23,42,.58);backdrop-filter:blur(22px);display:grid;align-content:start;gap:12px;padding:12px;z-index:10;box-shadow:0 24px 80px rgba(0,0,0,.38)}.logo{height:46px;border-radius:18px;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);display:grid;place-items:center;font-weight:950;letter-spacing:-.08em}.side-rail a{height:46px;border-radius:18px;display:grid;place-items:center;text-decoration:none;color:#cbd5e1;background:rgba(255,255,255,.05);font-size:11px;font-weight:900}.hero-pro,.panel,.metric,.module-card,.ai-card{border:1px solid rgba(255,255,255,.14);background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.045));backdrop-filter:blur(22px);box-shadow:0 28px 90px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08)}.hero-pro{max-width:1180px;margin:0 auto;border-radius:42px;padding:34px;display:grid;grid-template-columns:1.4fr .75fr;gap:22px;align-items:stretch;min-height:360px}.hero-copy{display:grid;align-content:center;gap:18px}.eyebrow{color:#67e8f9;letter-spacing:.24em;font-size:12px;font-weight:900}.hero-pro h1{font-size:clamp(44px,8vw,92px);line-height:.98;letter-spacing:-.07em;margin:0;max-width:820px}.hero-pro p{color:#cbd5e1;line-height:1.9;font-size:18px;max-width:720px;margin:0}.hero-actions{display:flex;gap:12px;flex-wrap:wrap}.primary,.secondary{min-height:54px;border-radius:20px;padding:0 22px;display:grid;place-items:center;text-decoration:none;color:#fff;font-weight:950}.primary{background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);box-shadow:0 18px 55px rgba(37,99,235,.34)}.secondary{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.12)}.ai-card{border-radius:34px;padding:24px;display:grid;align-content:space-between;position:relative;overflow:hidden}.ai-card:before{content:"";position:absolute;inset:auto -60px -70px auto;width:220px;height:220px;border-radius:999px;background:rgba(34,197,94,.25);filter:blur(28px)}.ai-card span,.metric span,.module-card span,.section-title span{color:#67e8f9;font-size:12px;letter-spacing:.12em;font-weight:950}.ai-card strong{font-size:38px;line-height:1.2;position:relative}.ai-card small,.metric small,.module-card small,.task-row small,.panel p{color:#cbd5e1;line-height:1.7}.pulse{width:16px;height:16px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 10px rgba(34,197,94,.15);position:relative}.metrics-grid{max-width:1180px;margin:16px auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metric{border-radius:28px;padding:18px;display:grid;gap:8px}.metric strong{font-size:30px}.bento-grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1.2fr .8fr repeat(2,.65fr);gap:14px}.panel,.module-card{border-radius:30px;padding:20px;text-decoration:none;color:#fff;min-height:190px}.command{grid-column:span 2;min-height:260px}.tasks-panel{grid-row:span 2}.section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.section-title a{color:#bfdbfe;text-decoration:none;background:rgba(59,130,246,.18);border-radius:999px;padding:8px 12px;font-weight:900}.panel h2{font-size:34px;line-height:1.2;margin:0 0 12px}.prompt-preview{margin-top:18px;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.72);border-radius:24px;padding:20px;color:#e5e7eb;font-size:22px}.task-list{display:grid;gap:10px}.task-row{border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.58);border-radius:18px;padding:13px;display:grid;gap:4px}.module-card{display:grid;align-content:space-between;transition:.22s ease}.module-card:hover{transform:translateY(-6px);border-color:rgba(103,232,249,.42)}.module-card strong{font-size:28px}.mobile-nav{display:none}@media(max-width:900px){.pro-shell{padding:12px 10px 92px}.side-rail{display:none}.hero-pro{grid-template-columns:1fr;border-radius:34px;padding:24px;min-height:auto}.hero-pro h1{font-size:46px}.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bento-grid{grid-template-columns:1fr}.command,.tasks-panel{grid-column:auto;grid-row:auto}.mobile-nav{position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(4,1fr);gap:8px;border:1px solid rgba(255,255,255,.14);background:rgba(15,23,42,.9);backdrop-filter:blur(22px);border-radius:24px;padding:10px;z-index:20}.mobile-nav a{min-height:48px;border-radius:17px;display:grid;place-items:center;text-decoration:none;color:#fff;background:rgba(59,130,246,.18);font-weight:900;font-size:13px}}
`;
