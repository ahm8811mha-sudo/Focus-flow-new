import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import { getStoredDriveToken } from '@/lib/googleDriveCloud';
import { motion } from 'framer-motion';
import { Sparkles, Terminal, CheckCircle2, AlertCircle, LayoutGrid, BrainCircuit, Calendar, FolderKanban, Search, ClipboardList, Table2 } from 'lucide-react';

function today() { return new Date().toISOString().slice(0, 10); }

const modules = [
  { title: 'الوكلاء', href: '/agents', tag: 'AI Command', desc: 'اطلب تنفيذ فعلي: بحث، جداول، مواعيد، رسائل، وتقارير.', icon: BrainCircuit },
  { title: 'مركز المهام', href: '/tasks', tag: 'Tasks', desc: 'كل مهامك ومهام الوكلاء في صفحة واحدة واضحة.', icon: CheckCircle2 },
  { title: 'التقويم', href: '/calendar', tag: 'Calendar', desc: 'المواعيد والتنبيهات التي ينشئها الوكلاء حسب الوقت.', icon: Calendar },
  { title: 'الدليل', href: '/directory', tag: 'Directory', desc: 'جهات الاتصال والأرقام والبيانات التي يعتمد عليها الوكيل.', icon: Search },
  { title: 'الجداول', href: '/tables', tag: 'Tables', desc: 'الجداول التي ينشئها الوكلاء تظهر داخل التطبيق قبل أي تصدير.', icon: Table2 },
  { title: 'سجل التنفيذ', href: '/execution', tag: 'Execution Log', desc: 'اعرف ماذا نفذ الوكيل، ما الذي فشل، وما الخطوة التالية.', icon: ClipboardList },
  { title: 'النظام', href: '/system', tag: 'Settings', desc: 'Gemini و Google Drive و Gmail و Calendar و Sheets.', icon: LayoutGrid },
  { title: 'المشاريع', href: '/projects', tag: 'Projects', desc: 'متابعة المشاريع والتكاليف والخطوات.', icon: FolderKanban },
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
  const overdue = useMemo(() => tasks.filter((task) => task.dueDate && task.dueDate < today() && task.status !== 'done'), [tasks]);
  const urgent = useMemo(() => tasks.filter((task) => task.status !== 'done' && (task.priority === 'urgent' || task.priority === 'high')), [tasks]);
  const topTasks = useMemo(() => tasks.filter((task) => task.status !== 'done').slice(0, 5), [tasks]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  const statCards = [
    { label: 'Google', href: '/system', value: googleReady ? 'متصل' : 'محلي', sub: 'Drive / Gmail / Calendar', icon: LayoutGrid },
    { label: 'المهام', href: '/tasks', value: tasks.length, sub: `${urgent.length} عالية أو عاجلة`, icon: CheckCircle2 },
    { label: 'المتأخر', href: '/tasks', value: overdue.length, sub: 'تحتاج تدخل اليوم', icon: AlertCircle, alert: overdue.length > 0 },
    { label: 'المشاريع', href: '/projects', value: projects.length, sub: 'قيد المتابعة والتنفيذ', icon: FolderKanban },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-slate-200 p-4 md:p-8 lg:pr-[110px] pb-24 lg:pb-8 font-sans" dir="rtl">
      <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <aside className="hidden lg:flex fixed right-6 top-6 bottom-6 w-[72px] flex-col gap-4 p-3 border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-2xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] z-50">
        <div className="h-12 w-full rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center font-black text-white text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)]">FF</div>
        <div className="flex flex-col gap-3 mt-4">
          <a href="/agents" className="h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">AI</a>
          <a href="/tasks" className="h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">Tasks</a>
          <a href="/calendar" className="h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">Cal</a>
          <a href="/directory" className="h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">Dir</a>
          <a href="/tables" className="h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">Tbl</a>
          <a href="/execution" className="h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">Log</a>
          <a href="/system" className="h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">Sys</a>
        </div>
      </aside>

      <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1200px] mx-auto space-y-6 relative z-10">
        <motion.section variants={item} className="relative overflow-hidden flex flex-col lg:flex-row gap-8 lg:gap-12 p-8 lg:p-12 border border-white/10 bg-gradient-to-br from-[#0a0a0a]/80 to-white/[0.02] backdrop-blur-2xl rounded-[40px] shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
          <div className="flex-1 flex flex-col justify-center gap-6">
            <span className="text-cyan-400 tracking-[0.2em] text-xs font-black uppercase flex items-center gap-2"><Sparkles className="w-4 h-4" /> PERSONAL AI EXECUTION OS</span>
            <h1 className="text-4xl md:text-5xl lg:text-[4rem] leading-[1.1] font-bold text-white tracking-tight">Focus Flow<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">مركز واحد للتنفيذ.</span></h1>
            <p className="text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed">بدل التنقل بين صفحات متفرقة: ابدأ من هنا للوكلاء، المهام، التقويم، الدليل، الجداول، سجل التنفيذ، وإعدادات النظام.</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <a href="/agents" className="h-14 px-8 rounded-2xl flex items-center justify-center text-white font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-all hover:scale-105">تشغيل الوكلاء</a>
              <a href="/tasks" className="h-14 px-8 rounded-2xl flex items-center justify-center text-white font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105">مركز المهام</a>
              <a href="/execution" className="h-14 px-8 rounded-2xl flex items-center justify-center text-white font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105">سجل التنفيذ</a>
            </div>
          </div>

          <div className="relative w-full lg:w-[320px] shrink-0 p-8 rounded-[32px] bg-black/40 border border-white/10 flex flex-col justify-between overflow-hidden group">
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-green-500/20 blur-[40px] rounded-full group-hover:bg-green-500/30 transition-colors" />
            <span className="text-cyan-400 text-xs font-black tracking-widest uppercase">System Status</span>
            <div className="mt-8 mb-4">
              <strong className="text-3xl md:text-4xl font-bold text-white block mb-2">{geminiReady ? 'Gemini متصل' : 'Gemini غير مفعل'}</strong>
              <small className="text-white/50 text-sm">{googleReady ? 'Google Drive متصل' : 'محلي أولًا · اربط Google من النظام'}</small>
            </div>
            <div className={`w-4 h-4 rounded-full mt-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] ${geminiReady ? 'bg-green-500 animate-pulse shadow-green-500/50' : 'bg-orange-500'}`} />
          </div>
        </motion.section>

        <motion.section variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((metric, i) => (
            <a key={i} href={metric.href} className="p-6 rounded-3xl border border-white/10 bg-[#0a0a0a]/50 backdrop-blur-xl hover:bg-white/[0.04] transition-colors flex flex-col gap-2 relative overflow-hidden group no-underline">
              <div className="flex justify-between items-start"><span className="text-cyan-400 text-[11px] font-black tracking-widest uppercase">{metric.label}</span><metric.icon className={`w-5 h-5 ${metric.alert ? 'text-rose-400' : 'text-white/30 group-hover:text-cyan-400'} transition-colors`} /></div>
              <strong className={`text-3xl md:text-4xl font-bold mt-2 ${metric.alert ? 'text-rose-400' : 'text-white'}`}>{metric.value}</strong>
              <small className="text-white/50 text-sm mt-auto pt-2">{metric.sub}</small>
            </a>
          ))}
        </motion.section>

        <motion.section variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <article className="lg:col-span-2 p-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 backdrop-blur-xl flex flex-col h-full hover:border-indigo-500/30 transition-colors">
            <div className="flex items-center justify-between mb-8"><span className="text-cyan-400 text-xs font-black tracking-widest uppercase">Command Center</span><a href="/agents" className="px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold hover:bg-indigo-500/30 transition-colors">فتح الوكلاء</a></div>
            <h2 className="text-3xl font-bold text-white mb-3">اطلب تنفيذ، وشوف النتيجة في سجل واحد.</h2>
            <p className="text-white/60 text-lg mb-8 max-w-xl">الوكلاء ينشئون مهام ومواعيد وجداول وجهات اتصال، ثم يظهر ملخص التنفيذ في سجل التنفيذ.</p>
            <div className="mt-auto p-5 rounded-2xl bg-[#050505]/80 border border-white/5 text-white/80 font-medium flex items-center gap-3 shadow-inner"><Terminal className="w-5 h-5 text-indigo-400" /> مثال: احصر جهات، أنشئ جدول، وجدول مواعيد الاتصال...<span className="w-2 h-5 bg-indigo-500 animate-pulse ml-auto" /></div>
          </article>

          <article className="p-8 rounded-[32px] border border-white/10 bg-[#0a0a0a]/50 backdrop-blur-xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-6"><span className="text-cyan-400 text-xs font-black tracking-widest uppercase">Active Tasks</span><a href="/tasks" className="px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30 transition-colors">مركز المهام</a></div>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">{topTasks.map((task) => <a href="/tasks" key={task.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group no-underline"><strong className="text-white text-sm block mb-1 group-hover:text-cyan-300 transition-colors">{task.title}</strong><small className="text-white/40 text-xs flex items-center gap-2"><Calendar className="w-3 h-3" /> {task.dueDate || 'بدون تاريخ'} <span className="w-1 h-1 rounded-full bg-white/20 mx-1" /> {task.priority}</small></a>)}{!topTasks.length && <div className="flex-1 flex items-center justify-center text-white/40 text-sm">لا توجد مهام مفتوحة حالياً.</div>}</div>
          </article>

          {modules.map((module) => <a key={module.href} href={module.href} className="p-8 rounded-[32px] border border-white/10 bg-[#0a0a0a]/40 backdrop-blur-xl hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all hover:-translate-y-1 group flex flex-col"><div className="flex items-center gap-3 mb-6"><div className="p-2 rounded-xl bg-white/5 text-white/50 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors"><module.icon className="w-6 h-6" /></div><span className="text-cyan-400/80 text-[10px] font-black tracking-widest uppercase">{module.tag}</span></div><strong className="text-2xl font-bold text-white mb-2">{module.title}</strong><small className="text-white/50 text-sm leading-relaxed mt-auto">{module.desc}</small></a>)}
        </motion.section>
      </motion.div>

      <nav className="lg:hidden fixed bottom-6 left-4 right-4 p-2 rounded-3xl border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-2xl shadow-2xl z-50 grid grid-cols-5 gap-2">
        <a href="/agents" className="h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-[11px] font-bold active:scale-95 transition-transform">الوكلاء</a>
        <a href="/tasks" className="h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-[11px] font-bold active:scale-95 transition-transform">المهام</a>
        <a href="/calendar" className="h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-[11px] font-bold active:scale-95 transition-transform">التقويم</a>
        <a href="/directory" className="h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-[11px] font-bold active:scale-95 transition-transform">الدليل</a>
        <a href="/system" className="h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white text-[11px] font-bold active:scale-95 transition-transform">النظام</a>
      </nav>
    </main>
  );
}
