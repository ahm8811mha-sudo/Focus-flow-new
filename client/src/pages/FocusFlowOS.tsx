import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import { getStoredDriveToken } from '@/lib/googleDriveCloud';
import { motion } from 'framer-motion';
import { Sparkles, Terminal, CheckCircle2, AlertCircle, LayoutGrid, BrainCircuit, Calendar, FolderKanban, Search, ClipboardList, Table2, UserRoundCheck } from 'lucide-react';
import './focus-flow-os.css';

function today() { return new Date().toISOString().slice(0, 10); }

const modules = [
  { title: 'الوكلاء', href: '/agents', tag: 'AI Command', desc: 'أوامر تنفيذ، مرفقات، صور، جداول، مواعيد، ورسائل.', icon: BrainCircuit },
  { title: 'مركز المهام', href: '/tasks', tag: 'Tasks', desc: 'كل مهامك ومهام الوكلاء في كانبان واحد.', icon: CheckCircle2 },
  { title: 'التقويم', href: '/calendar', tag: 'Calendar', desc: 'تعديل المواعيد يدويًا أو بأمر سريع.', icon: Calendar },
  { title: 'الدليل', href: '/directory', tag: 'Directory', desc: 'جهات الاتصال والأرقام والبيانات.', icon: Search },
  { title: 'الجداول', href: '/tables', tag: 'Tables', desc: 'جداول الوكلاء قبل التصدير.', icon: Table2 },
  { title: 'سجل التنفيذ', href: '/execution', tag: 'Execution', desc: 'ما تم، ما فشل، وما الخطوة التالية.', icon: ClipboardList },
  { title: 'النظام', href: '/system', tag: 'System', desc: 'Gemini و Google و OAuth والمزامنة.', icon: LayoutGrid },
  { title: 'المشاريع', href: '/projects', tag: 'Projects', desc: 'تشغيل السكرتير داخل سياق مشروع.', icon: FolderKanban },
];

const agents = [
  { title: 'السكرتير التنفيذي', href: '/secretary', desc: 'CRM، جهات، مسودات، وتقارير.' },
  { title: 'مدير المشاريع', href: '/projects', desc: 'PMP، مراحل، نتائج، وسجل.' },
  { title: 'الوكلاء التنفيذيون', href: '/agents', desc: 'تنفيذ سريع ومحادثات.' },
  { title: 'النظام', href: '/system', desc: 'ربط Gemini وGoogle.' },
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

  const tasks = Array.isArray(memory.tasks) ? memory.tasks : [];
  const projects = Array.isArray(memory.projects) ? memory.projects : [];
  
  const overdue = useMemo(() => tasks.filter((task: any) => task.dueDate && task.dueDate < today() && task.status !== 'done'), [tasks]);
  const urgent = useMemo(() => tasks.filter((task: any) => task.status !== 'done' && (task.priority === 'urgent' || task.priority === 'high')), [tasks]);
  const todayTasks = useMemo(() => tasks.filter((task: any) => task.dueDate === today() && task.status !== 'done'), [tasks]);
  const openTasks = useMemo(() => tasks.filter((task: any) => task.status !== 'done'), [tasks]);
  const topTasks = useMemo(() => openTasks.slice(0, 5), [openTasks]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  const statCards = [
    { label: 'Google', href: '/system', value: googleReady ? 'متصل' : 'محلي', sub: 'Drive / Gmail / Calendar', icon: LayoutGrid },
    { label: 'المهام', href: '/tasks', value: tasks.length, sub: `${urgent.length} عالية أو عاجلة`, icon: CheckCircle2 },
    { label: 'المتأخر', href: '/tasks', value: overdue.length, sub: 'تحتاج تدخل اليوم', icon: AlertCircle, alert: overdue.length > 0 },
    { label: 'المشاريع', href: '/projects', value: projects.length, sub: 'قيد المتابعة والتنفيذ', icon: FolderKanban },
  ];

  return (
    <main className="ffos-shell" dir="rtl">
      <div className="ffos-bg-grid" />
      <div className="ffos-glow-a" />
      <div className="ffos-glow-b" />

      <aside className="ffos-side">
        <div className="ffos-logo">FF</div>
        <div className="ffos-side-links">
          <a href="/agents">AI</a><a href="/tasks">Tasks</a><a href="/calendar">Cal</a><a href="/secretary">CRM</a><a href="/tables">Tbl</a><a href="/execution">Log</a><a href="/system">Sys</a>
        </div>
      </aside>

      <motion.div variants={container} initial="hidden" animate="show" className="ffos-container">
        {/* Hero Section - محسن */}
        <motion.section variants={item} className="ffos-hero">
          <div>
            <span className="ffos-eyebrow"><Sparkles size={18} /> PERSONAL AI EXECUTION OS</span>
            <h1 className="ffos-title">Focus Flow<br /><span className="ffos-gradient">لوحة تنفيذ يومية.</span></h1>
            <p className="ffos-lead">ابدأ من هنا: ماذا عليك اليوم، ماذا نفذ الوكلاء، حالة المشاريع، وصحة النظام.</p>
            
            <div className="ffos-actions">
              <a className="ffos-btn primary" href="/projects">تشغيل داخل مشروع</a>
              <a className="ffos-btn" href="/secretary">لوحة السكرتير</a>
              <a className="ffos-btn" href="/execution">سجل التنفيذ</a>
            </div>
          </div>

          <div className="ffos-status">
            <span className="ffos-status-title">System Health</span>
            <strong>{geminiReady ? 'Gemini متصل' : 'Gemini غير مفعل'}</strong>
            <small>{googleReady ? 'Google Drive متصل ✓' : 'محلي أولًا · اربط Google من النظام'}</small>
            <div className={`ffos-dot ${geminiReady ? 'ok' : ''}`} />
          </div>
        </motion.section>

        {/* Daily Brief */}
        <motion.section variants={item} className="ffos-daily">
          <span className="ffos-section-kicker">Daily Executive Brief</span>
          <h2>اليوم لديك</h2>
          <div className="ffos-daily-grid">
            <div className="ffos-daily-item"><b>{urgent.length}</b><span>عالية أو عاجلة</span></div>
            <div className="ffos-daily-item"><b>{todayTasks.length}</b><span>مجدولة اليوم</span></div>
            <div className="ffos-daily-item"><b>{overdue.length}</b><span>متأخرة</span></div>
          </div>
          <p className="ffos-lead">اقتراح الوكيل: ابدأ بالمهام العاجلة ثم افتح المشاريع.</p>
        </motion.section>

        {/* Stats */}
        <motion.section variants={item} className="ffos-metrics">
          {statCards.map((metric, i) => (
            <a key={i} href={metric.href} className={`ffos-metric ${metric.alert ? 'alert' : ''}`}>
              <div className="ffos-metric-head">
                <span>{metric.label}</span>
                <metric.icon size={22} />
              </div>
              <strong>{metric.value}</strong>
              <small>{metric.sub}</small>
            </a>
          ))}
        </motion.section>

        {/* Main Grid */}
        <motion.section variants={item} className="ffos-main-grid">
          <article className="ffos-feature">
            <span className="ffos-feature-tag">Command Center</span>
            <h2>اطلب تنفيذ، وشوف النتيجة في سجل واحد.</h2>
            <p>الوكلاء ينشئون مهام ومواعيد وجداول وجهات اتصال، ثم يظهر ملخص التنفيذ.</p>
            <div className="ffos-command">
              <Terminal size={18} /> مثال: احصر جهات، أنشئ جدول، وجدول مواعيد الاتصال...
            </div>
          </article>

          <article className="ffos-task-panel">
            <div className="ffos-task-head">
              <span className="ffos-section-kicker">Active Tasks</span>
              <a className="ffos-btn" href="/tasks">فتح الكانبان</a>
            </div>
            <div className="ffos-task-list">
              {topTasks.map((task: any) => (
                <a href="/tasks" key={task.id} className="ffos-task">
                  <strong>{task.title}</strong>
                  <small>
                    <Calendar size={13} /> {task.dueDate || 'بدون تاريخ'} · {task.priority}
                  </small>
                </a>
              ))}
              {!topTasks.length && <div className="ffos-empty">لا توجد مهام مفتوحة حالياً. أضف مهمة جديدة!</div>}
            </div>
          </article>
        </motion.section>

        {/* Agents */}
        <motion.section variants={item} className="ffos-agents">
          {agents.map((agent) => (
            <a href={agent.href} key={agent.title} className="ffos-agent-card">
              <div className="ffos-agent-status" />
              <b>{agent.title}</b>
              <small>{agent.desc}</small>
            </a>
          ))}
        </motion.section>

        {/* Projects */}
        <motion.section variants={item} className="ffos-projects">
          {projects.slice(0, 4).map((project: any) => (
            <a href="/projects" key={project.id || project.name} className="ffos-project-card">
              <b>{project.name || project.title || 'مشروع بدون اسم'}</b>
              <small>{project.status || 'قيد المتابعة'}</small>
              <div className="ffos-progress"><span /></div>
            </a>
          ))}
          {!projects.length && (
            <a href="/projects" className="ffos-project-card">
              <b>لا توجد مشاريع محفوظة</b>
              <small>أنشئ مشروع PMP وشغّل السكرتير داخله.</small>
              <div className="ffos-progress"><span /></div>
            </a>
          )}
        </motion.section>

        {/* Modules */}
        <motion.section variants={item} className="ffos-modules">
          {modules.map((module) => (
            <a key={module.href} href={module.href} className="ffos-module">
              <div className="ffos-module-icon"><module.icon size={24} /></div>
              <span className="ffos-module-tag">{module.tag}</span>
              <strong>{module.title}</strong>
              <small>{module.desc}</small>
            </a>
          ))}
        </motion.section>
      </motion.div>

      <nav className="ffos-bottom-nav">
        <a href="/agents">الوكلاء</a>
        <a href="/tasks">المهام</a>
        <a href="/calendar">التقويم</a>
        <a href="/secretary">السكرتير</a>
        <a href="/system">النظام</a>
      </nav>
    </main>
  );
}