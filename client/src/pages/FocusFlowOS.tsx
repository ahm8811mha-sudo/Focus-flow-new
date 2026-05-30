import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import { getStoredDriveToken } from '@/lib/googleDriveCloud';

const modules = [
  { title: 'الوكلاء التنفيذيون', icon: '🧠', href: '/agents', desc: 'القائد العام، السكرتير، Excel، الرسائل، الصور، الملابس، الأكل، المال، السفر، والتعلم.' },
  { title: 'إدارة المهام', icon: '✅', href: '/focus', desc: 'إضافة وتعديل وحذف المهام، الكانبان، المشاريع، والملاحظات المحلية.' },
  { title: 'مركز النظام', icon: '⚙️', href: '/system', desc: 'Gemini، Google Drive، Calendar، Gmail Drafts، Google Sheets، والنسخ السحابي.' },
  { title: 'التقويم', icon: '📅', href: '/calendar', desc: 'عرض المواعيد والمهام المؤرخة وربطها لاحقًا بتقويم Google.' },
  { title: 'المشاريع', icon: '📁', href: '/projects', desc: 'إدارة المشاريع ومتابعة الإنجاز والمهام المرتبطة.' },
  { title: 'الملاحظات', icon: '📝', href: '/notes', desc: 'حفظ قرارات الوكلاء والملاحظات المهمة.' },
];

function today() { return new Date().toISOString().slice(0, 10); }

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
  const topTasks = useMemo(() => memory.tasks.filter((task) => task.status !== 'done').slice(0, 4), [memory.tasks]);

  return (
    <main className="os-shell" dir="rtl">
      <style>{styles}</style>
      <header className="hero"><div className="brand">F</div><span className="eyebrow">Personal AI Execution OS</span><h1>Focus Flow OS</h1><p>النظام الموحد للوكلاء والمهام والتقويم والنسخ السحابي.</p><div className="hero-actions"><a className="primary" href="/agents">ابدأ من الوكلاء التنفيذيين</a><a className="secondary" href="/system">مركز النظام والخدمات</a></div></header>
      <section className="status-grid">
        <div className="status-card"><span>Gemini</span><strong>{geminiReady ? 'متصل' : 'غير مفعّل'}</strong><small>{geminiReady ? 'الوكلاء جاهزون للقرارات' : 'أضف GEMINI_API_KEY في Vercel'}</small></div>
        <div className="status-card"><span>Google</span><strong>{googleReady ? 'متصل' : 'غير مربوط'}</strong><small>Drive / Calendar / Gmail / Sheets</small></div>
        <div className="status-card"><span>المهام</span><strong>{memory.tasks.length}</strong><small>{urgent.length} عالية أو عاجلة</small></div>
        <div className="status-card"><span>المتأخر</span><strong>{overdue.length}</strong><small>تحتاج قرار من الوكيل</small></div>
      </section>
      <section className="main-grid"><article className="panel"><div className="section-title"><h2>أمر سريع للقائد العام</h2><a href="/agents">فتح مركز الأوامر</a></div><p>استخدم هذا المسار عندما تريد قرار وتنفيذ.</p><div className="prompt-box">رتب يومي، قرر أهم 3 إجراءات، ونفّذها داخل النظام.</div><a className="primary wide" href="/agents">تشغيل الوكلاء</a></article><article className="panel"><div className="section-title"><h2>أهم المهام المفتوحة</h2><a href="/focus">إدارة المهام</a></div><div className="task-list">{topTasks.map((task) => <div className="task-row" key={task.id}><b>{task.title}</b><small>{task.dueDate || 'بدون تاريخ'} · {task.priority}</small></div>)}{!topTasks.length && <small>لا توجد مهام مفتوحة.</small>}</div></article></section>
      <section className="module-grid">{modules.map((module) => <a className="module-card" href={module.href} key={module.href}><b>{module.icon}</b><strong>{module.title}</strong><small>{module.desc}</small></a>)}</section>
      <nav className="bottom-nav"><a href="/agents">الوكلاء</a><a href="/focus">المهام</a><a href="/system">النظام</a><a href="/calendar">التقويم</a></nav>
    </main>
  );
}

const styles = `:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#050816}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0%,#1e3a8a 0,#0b1020 45%,#030712 100%);color:#f8fafc}.os-shell{max-width:1120px;margin:0 auto;padding:18px 14px calc(100px + env(safe-area-inset-bottom))}.hero,.panel,.status-card,.module-card,.bottom-nav{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.045));box-shadow:0 24px 70px rgba(0,0,0,.3)}.hero{border-radius:36px;padding:28px;text-align:center;display:grid;gap:14px}.brand{width:66px;height:66px;border-radius:24px;background:#dbeafe;color:#111827;display:grid;place-items:center;font-size:34px;font-weight:950;margin:0 auto}.eyebrow{color:#bfdbfe;letter-spacing:.22em;text-transform:uppercase;font-size:12px}.hero h1{font-size:clamp(46px,12vw,88px);line-height:.95;margin:0}.hero p{max-width:790px;margin:0 auto;color:#cbd5e1;line-height:1.85;font-size:18px}.hero-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}.primary,.secondary,.section-title a,.bottom-nav a{min-height:52px;border-radius:20px;padding:0 18px;display:grid;place-items:center;text-decoration:none;color:#fff;font-weight:900}.primary{background:linear-gradient(135deg,#2563eb,#7c3aed)}.secondary{background:rgba(255,255,255,.1)}.wide{width:100%;margin-top:12px}.status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.status-card{border-radius:26px;padding:18px;display:grid;gap:8px}.status-card span,.status-card small,.module-card small,.task-row small,.panel p{color:#cbd5e1;line-height:1.6}.status-card strong{font-size:30px}.main-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.panel{border-radius:30px;padding:20px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.section-title h2{margin:0}.section-title a{min-height:42px;background:rgba(59,130,246,.18);color:#bfdbfe}.prompt-box{border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.75);border-radius:22px;padding:18px;font-size:20px;line-height:1.8;color:#e5e7eb}.task-list{display:grid;gap:10px}.task-row{border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.7);border-radius:18px;padding:14px;display:grid;gap:5px}.module-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px}.module-card{border-radius:28px;padding:18px;display:grid;gap:10px;text-decoration:none;color:#fff;min-height:165px}.module-card b{font-size:34px}.module-card strong{font-size:20px}.bottom-nav{position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:20;max-width:860px;margin:auto;border-radius:24px;padding:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:rgba(15,23,42,.92);backdrop-filter:blur(18px)}.bottom-nav a{min-height:48px;border-radius:17px;background:rgba(59,130,246,.18);font-size:14px}@media(max-width:760px){.os-shell{padding:12px 10px calc(92px + env(safe-area-inset-bottom))}.hero{border-radius:30px;padding:22px}.hero p{font-size:15px}.hero-actions{display:grid}.status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.main-grid{grid-template-columns:1fr}.module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.module-card{min-height:155px;padding:14px}.bottom-nav a{font-size:13px;padding:0 8px}}`;