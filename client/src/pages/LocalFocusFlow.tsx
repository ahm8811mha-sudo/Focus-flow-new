import { useMemo, useState, type ReactNode } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Project, TaskStatus } from '@/lib/localMemory';
import { buildSmartPlan, createMemoryInsights, getNativeAppRoadmap, runAgent, type AgentKind } from '@/lib/advancedAI';
import {
  backupToGoogleDrive,
  connectGoogleDrive,
  disconnectGoogleDrive,
  getGoogleClientId,
  getStoredDriveToken,
  restoreFromGoogleDrive,
  setGoogleClientId,
} from '@/lib/googleDriveCloud';

type Tab = 'dashboard' | 'projects' | 'plan' | 'kanban' | 'calendar' | 'notes' | 'agents' | 'memory' | 'voice' | 'notifications' | 'sync' | 'native' | 'settings';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'القيادة', icon: '◈' },
  { id: 'projects', label: 'المشاريع', icon: '▣' },
  { id: 'plan', label: 'Smart Plan', icon: '✦' },
  { id: 'kanban', label: 'كانبان', icon: '▤' },
  { id: 'calendar', label: 'Calendar AI', icon: '◷' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'memory', label: 'Memory', icon: '◎' },
  { id: 'voice', label: 'Voice', icon: '◉' },
  { id: 'notifications', label: 'تنبيهات', icon: '⚡' },
  { id: 'sync', label: 'Sync', icon: '☁' },
  { id: 'native', label: 'Mobile', icon: '▯' },
  { id: 'notes', label: 'ملاحظات', icon: '✎' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙' },
];

const priorityLabel = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' } as const;
const statusLabel = { todo: 'جديدة', in_progress: 'قيد التنفيذ', review: 'مراجعة', done: 'مكتملة', blocked: 'معلقة' } as const;
const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];
const agentKinds: { id: AgentKind; label: string; desc: string }[] = [
  { id: 'planner', label: 'Planner Agent', desc: 'يبني خطة تنفيذ ومراحل.' },
  { id: 'executor', label: 'Execution Agent', desc: 'يعطيك مهام اليوم.' },
  { id: 'calendar', label: 'Calendar AI', desc: 'يرتب المواعيد والتعثر.' },
  { id: 'risk', label: 'Risk Agent', desc: 'يكشف المخاطر والتأخير.' },
  { id: 'memory', label: 'Memory Engine', desc: 'يفهم بياناتك المحفوظة.' },
  { id: 'notification', label: 'Notifications AI', desc: 'يقترح تنبيهات ذكية.' },
];

function ShellCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`premium-card ${className}`}>{children}</section>;
}

function Metric({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: string }) {
  return <ShellCard className={`metric ${tone}`}><div className="metric-shape" /><span>{label}</span><strong>{value}</strong><small>{hint}</small></ShellCard>;
}

function CloudBadge({ connected }: { connected: boolean }) {
  return <span className={`cloud-badge ${connected ? 'ok' : ''}`}>{connected ? 'Google Drive متصل' : 'محلي أولًا'}</span>;
}

function ProjectTile({ project, tasksCount, doneCount }: { project: Project; tasksCount: number; doneCount: number }) {
  const progress = tasksCount ? Math.round((doneCount / tasksCount) * 100) : 0;
  return (
    <ShellCard className="project-tile">
      <div className="tile-head"><div className="project-icon">{project.icon}</div><div><h3>{project.title}</h3><p>{project.description || 'مشروع محفوظ في ذاكرة الجوال'}</p></div></div>
      <div className="progress-line"><i style={{ width: `${progress}%` }} /></div>
      <div className="tile-foot"><span>{progress}% إنجاز</span><span>{doneCount}/{tasksCount} مهمة</span><span>{priorityLabel[project.priority]}</span></div>
    </ShellCard>
  );
}

export default function LocalFocusFlow() {
  const memory = useLocalMemory();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [prompt, setPrompt] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [query, setQuery] = useState('');
  const [clientId, setClientIdState] = useState(getGoogleClientId());
  const [cloudMessage, setCloudMessage] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [driveConnected, setDriveConnected] = useState(Boolean(getStoredDriveToken()));
  const [agentInput, setAgentInput] = useState('حلل مشاريعي ومهامي واعطني الخطوة التالية');
  const [agentKind, setAgentKind] = useState<AgentKind>('planner');
  const [agentResult, setAgentResult] = useState<ReturnType<typeof runAgent> | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('جاهز للأوامر الصوتية');

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memory.projects;
    return memory.projects.filter((project) => `${project.title} ${project.description}`.toLowerCase().includes(q));
  }, [memory.projects, query]);

  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, typeof memory.tasks> = { todo: [], in_progress: [], review: [], done: [], blocked: [] };
    for (const task of memory.tasks) groups[task.status].push(task);
    return groups;
  }, [memory.tasks]);

  const upcomingTasks = memory.tasks.filter((task) => task.dueDate).slice(0, 6);
  const insights = createMemoryInsights({ projects: memory.projects, tasks: memory.tasks, notes: memory.notes });
  const smartPlan = buildSmartPlan(prompt || 'Focus Flow');
  const latestProject = memory.projects[0];

  async function runCloud(action: () => Promise<unknown>, success: string) {
    try { setCloudBusy(true); setCloudMessage('جاري التنفيذ...'); await action(); setCloudMessage(success); setDriveConnected(Boolean(getStoredDriveToken())); await memory.refresh(); }
    catch (error) { setCloudMessage(error instanceof Error ? error.message : 'حدث خطأ غير معروف'); }
    finally { setCloudBusy(false); }
  }

  async function quickProject() {
    if (!projectTitle.trim()) return;
    await memory.saveProject({ title: projectTitle.trim(), description: 'مشروع محفوظ محليًا مع قابلية النسخ السحابي.', icon: '🚀', priority: 'medium', budgetEstimate: 0 });
    setProjectTitle(''); setActiveTab('projects');
  }

  async function quickTask() {
    if (!taskTitle.trim()) return;
    await memory.saveTask({ title: taskTitle.trim(), description: '', status: 'todo', priority: 'medium', listName: 'Focus' });
    setTaskTitle(''); setActiveTab('kanban');
  }

  async function quickNote() {
    if (!noteTitle.trim()) return;
    await memory.saveNote({ title: noteTitle.trim(), body: 'ملاحظة محفوظة داخل ذاكرة الجوال.', tags: ['focus'], pinned: false });
    setNoteTitle('');
  }

  async function aiPlan() {
    if (!prompt.trim()) return;
    const project = await memory.generatePlan(prompt);
    for (const item of smartPlan) await memory.saveTask({ projectId: project.id, title: item.title, description: item.description, priority: item.priority, dueDate: item.suggestedDate, status: 'todo', listName: 'Smart Planning' });
    setPrompt(''); setActiveTab('projects');
  }

  async function createAgentTeam() {
    const projectId = memory.projects[0]?.id;
    for (const agent of agentKinds) await memory.saveAgent({ projectId, name: agent.label, role: agent.id, mission: agent.desc, active: true });
    setActiveTab('agents');
  }

  function askAgent() {
    setAgentResult(runAgent(agentKind, agentInput, { projects: memory.projects, tasks: memory.tasks, notes: memory.notes, agents: memory.agents }));
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceStatus('المتصفح لا يدعم الأوامر الصوتية. استخدم Safari/Chrome أحدث نسخة.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA'; recognition.interimResults = false; recognition.continuous = false;
    recognition.onstart = () => setVoiceStatus('استمع الآن... قل: أضف مهمة، أنشئ مشروع، أو اكتب ملاحظة');
    recognition.onresult = async (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setVoiceText(text); setVoiceStatus('تم التقاط الأمر');
      if (text.includes('مهمة')) await memory.saveTask({ title: text.replace('أضف مهمة', '').trim() || text, description: 'أضيفت بالصوت', status: 'todo', priority: 'medium', listName: 'Voice' });
      else if (text.includes('مشروع')) await memory.saveProject({ title: text.replace('أنشئ مشروع', '').trim() || text, description: 'أضيف بالصوت', icon: '🎙️', priority: 'medium', budgetEstimate: 0 });
      else await memory.saveNote({ title: 'ملاحظة صوتية', body: text, tags: ['voice'], pinned: false });
      await memory.refresh();
    };
    recognition.onerror = () => setVoiceStatus('تعذر تشغيل الصوت. تأكد من السماح للمايكروفون.');
    recognition.start();
  }

  const notificationRules = [
    { title: 'تنبيه صباحي', body: 'أهم 3 مهام قبل الساعة 10 صباحًا', level: 'ذكي' },
    { title: 'تنبيه التعثر', body: 'أي مهمة تتجاوز تاريخها بدون إنجاز', level: 'عاجل' },
    { title: 'تقرير مسائي', body: 'ملخص الإنجاز والمهام المنقولة لليوم التالي', level: 'متوسط' },
  ];

  if (memory.loading) return <main className="premium-shell" dir="rtl"><style>{premiumStyles}</style><div className="loader">تحميل ذاكرة Focus Flow...</div></main>;

  return (
    <main className="premium-shell" dir="rtl">
      <style>{premiumStyles}</style>
      <header className="hero">
        <div className="hero-bg" /><div className="hero-top"><div className="brand-orb">F</div><CloudBadge connected={driveConnected} /></div>
        <div className="hero-copy"><span className="eyebrow">Personal AI Execution OS</span><h1>Focus Flow</h1><p>نظام جوال شخصي لإدارة المشاريع والمهام والوكلاء، يعمل محليًا أولًا مع AI وذاكرة وسحابة اختيارية.</p></div>
        <div className="hero-actions"><button onClick={() => setActiveTab('plan')}>✨ Smart Planning</button><button className="ghost" onClick={() => setActiveTab('agents')}>🤖 AI Agents</button></div>
      </header>

      <nav className="premium-tabs" aria-label="Focus Flow navigation">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}><b>{tab.icon}</b><small>{tab.label}</small></button>)}</nav>

      {activeTab === 'dashboard' && <section className="screen-stack"><div className="metrics-grid"><Metric label="المشاريع" value={memory.stats.totalProjects} hint="إجمالي المشاريع" tone="blue" /><Metric label="المهام" value={memory.stats.totalTasks} hint="كل المهام" tone="green" /><Metric label="مكتملة" value={memory.stats.completed} hint="تم إنجازها" tone="purple" /><Metric label="متأخرة" value={memory.stats.overdue} hint="تحتاج متابعة" tone="orange" /></div><ShellCard className="focus-panel"><div><span>مؤشر التنفيذ</span><h2>{memory.stats.progress}%</h2><p>{memory.stats.completed} من {memory.stats.totalTasks} مهمة مكتملة</p></div><div className="ring" style={{ ['--p' as any]: `${memory.stats.progress * 3.6}deg` }}><span>{memory.stats.progress}%</span></div></ShellCard><ShellCard><div className="section-title"><h2>نبض اليوم</h2><span>{new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div><div className="activity-feed">{memory.activities.slice(0, 5).map((activity) => <div key={activity.id}><b>{activity.title}</b><small>{activity.detail}</small></div>)}</div></ShellCard><ShellCard><div className="section-title"><h2>AI Memory Insights</h2><span>محلي</span></div><div className="insight-grid">{insights.map((i) => <div key={i.title} className="insight"><b>{i.title}</b><p>{i.detail}</p><span>{i.score}%</span></div>)}</div></ShellCard></section>}

      {activeTab === 'plan' && <section className="screen-stack"><ShellCard className="ai-console"><div className="section-title"><h2>Smart Planning</h2><span>AI-ready</span></div><p>اكتب فكرة المشروع وسيتم توليد مشروع ومهام وتواريخ ووكلاء داخل ذاكرة الجوال. جاهز لاحقًا للربط بنموذج AI سحابي.</p><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="مثال: خطة تطوير مصنع حلويات خلال 90 يومًا..." /><button onClick={aiPlan}>إنشاء خطة تنفيذ ✨</button></ShellCard><ShellCard><h2>الخطة المتوقعة</h2><div className="plan-steps">{smartPlan.map((step, i) => <div key={step.title}><span>{i + 1}</span><section><b>{step.title}</b><small>{step.description} · {step.suggestedDate}</small></section></div>)}</div></ShellCard></section>}

      {activeTab === 'projects' && <section className="screen-stack"><div className="command-row"><input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} placeholder="اسم مشروع جديد" /><button onClick={quickProject}>+ مشروع</button></div><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن مشروع..." /><div className="project-list">{filteredProjects.map((project) => <ProjectTile key={project.id} project={project} tasksCount={memory.tasks.filter((task) => task.projectId === project.id).length} doneCount={memory.tasks.filter((task) => task.projectId === project.id && task.status === 'done').length} />)}</div></section>}

      {activeTab === 'kanban' && <section className="screen-stack"><div className="command-row"><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="مهمة جديدة" /><button onClick={quickTask}>+ مهمة</button></div><div className="kanban-board">{statusOrder.map((status) => <div className="kanban-col" key={status}><h3>{statusLabel[status]} <span>{tasksByStatus[status].length}</span></h3>{tasksByStatus[status].map((task) => <article key={task.id}><b>{task.title}</b><small>{priorityLabel[task.priority]}</small></article>)}</div>)}</div></section>}

      {activeTab === 'calendar' && <section className="screen-stack"><ShellCard className="calendar-card"><div className="section-title"><h2>Calendar AI</h2><span>{new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</span></div><div className="calendar-grid">{Array.from({ length: 35 }, (_, i) => <span className={i === 27 ? 'today' : ''} key={i}>{(i % 31) + 1}</span>)}</div></ShellCard><ShellCard><h2>اقتراحات التقويم</h2><div className="activity-feed"><div><b>نافذة تركيز</b><small>90 دقيقة للمهام الثقيلة صباحًا</small></div><div><b>مراجعة يومية</b><small>10 دقائق قبل نهاية اليوم</small></div>{upcomingTasks.map((task) => <div key={task.id}><b>{task.title}</b><small>{task.dueDate} · {task.dueTime || 'بدون وقت'}</small></div>)}</div></ShellCard></section>}

      {activeTab === 'agents' && <section className="screen-stack"><ShellCard className="agent-hero"><div className="section-title"><h2>AI Agents حقيقيين داخل النظام</h2><button onClick={createAgentTeam}>إنشاء فريق وكلاء</button></div><p>هذه طبقة وكلاء تعمل محليًا الآن، ومهيأة للربط لاحقًا بـ API فعلي. كل وكيل يقرأ مشاريعك ومهامك وملاحظاتك من ذاكرة الجوال.</p></ShellCard><ShellCard className="ai-console"><select value={agentKind} onChange={(e) => setAgentKind(e.target.value as AgentKind)}>{agentKinds.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select><textarea value={agentInput} onChange={(e) => setAgentInput(e.target.value)} /><button onClick={askAgent}>اسأل الوكيل</button></ShellCard>{agentResult && <ShellCard><div className="section-title"><h2>{agentResult.agent}</h2><span>{agentResult.confidence}% ثقة</span></div><h3>{agentResult.title}</h3><p>{agentResult.summary}</p><div className="plan-steps">{agentResult.actions.map((a, i) => <div key={a}><span>{i + 1}</span>{a}</div>)}</div></ShellCard>}{memory.agents.map((agent) => <ShellCard key={agent.id}><div className="tile-head"><div className="project-icon">🤖</div><div><h3>{agent.name}</h3><p>{agent.role} · {agent.mission}</p></div></div><span className="cloud-badge ok">نشط</span></ShellCard>)}</section>}

      {activeTab === 'memory' && <section className="screen-stack"><ShellCard className="agent-hero"><h2>Memory Engine</h2><p>ذاكرة تشغيل محلية على الجوال تحفظ المشاريع، المهام، الملاحظات، الوكلاء، وسجل النشاط. ليست مربوطة بصفحة أو حساب.</p></ShellCard>{insights.map((i) => <ShellCard key={i.title}><div className="section-title"><h2>{i.title}</h2><span>{i.score}%</span></div><p>{i.detail}</p><div className="progress-line"><i style={{ width: `${i.score}%` }} /></div></ShellCard>)}</section>}

      {activeTab === 'voice' && <section className="screen-stack"><ShellCard className="voice-panel"><h2>Voice Assistant</h2><p>يدعم الأوامر الصوتية من الجوال حسب دعم المتصفح للمايكروفون.</p><button onClick={startVoice}>🎙️ ابدأ التحدث</button><div className="voice-box"><b>{voiceStatus}</b><small>{voiceText || 'مثال: أضف مهمة متابعة الطلبات اليوم'}</small></div></ShellCard><ShellCard><h2>أوامر مدعومة</h2><div className="plan-steps"><div><span>1</span>أضف مهمة ...</div><div><span>2</span>أنشئ مشروع ...</div><div><span>3</span>أي كلام آخر يتحول إلى ملاحظة صوتية</div></div></ShellCard></section>}

      {activeTab === 'notifications' && <section className="screen-stack"><ShellCard><div className="section-title"><h2>Notifications AI</h2><span>جاهز للتفعيل</span></div><p>تنبيهات ذكية محلية حسب التأخير والأولوية. Push Notifications الحقيقية تحتاج السماح من المتصفح أو تطبيق Native.</p></ShellCard>{notificationRules.map((n) => <ShellCard key={n.title}><div className="section-title"><h2>{n.title}</h2><span>{n.level}</span></div><p>{n.body}</p></ShellCard>)}</section>}

      {activeTab === 'sync' && <section className="screen-stack"><ShellCard className="cloud-panel"><div className="section-title"><h2>Sync Engine</h2><span>Local-first</span></div><div className="storage-choice"><div><b>ذاكرة الجوال</b><small>IndexedDB · المصدر الأساسي</small></div><span className="cloud-badge ok">أساسي</span></div><div className="storage-choice"><div><b>Google Drive</b><small>نسخة احتياطية إلى appDataFolder</small></div><span className={`cloud-badge ${driveConnected ? 'ok' : ''}`}>{driveConnected ? 'متصل' : 'غير متصل'}</span></div><label className="client-field">Google OAuth Client ID<input value={clientId} onChange={(event) => setClientIdState(event.target.value)} placeholder="ضع Client ID هنا" /></label><div className="cloud-actions"><button disabled={cloudBusy} onClick={() => { setGoogleClientId(clientId); setCloudMessage('تم حفظ Client ID'); }}>حفظ Client ID</button><button disabled={cloudBusy} onClick={() => runCloud(connectGoogleDrive, 'تم الاتصال بـ Google Drive')}>ربط Google Drive</button><button disabled={cloudBusy} onClick={() => runCloud(backupToGoogleDrive, 'تم رفع النسخة الاحتياطية')}>رفع نسخة</button><button disabled={cloudBusy} onClick={() => runCloud(restoreFromGoogleDrive, 'تمت الاستعادة من Drive')}>استعادة</button><button className="ghost" onClick={() => { disconnectGoogleDrive(); setDriveConnected(false); setCloudMessage('تم فصل Google Drive'); }}>فصل</button></div>{cloudMessage && <p className="cloud-message">{cloudMessage}</p>}</ShellCard></section>}

      {activeTab === 'native' && <section className="screen-stack"><ShellCard className="agent-hero"><h2>Mobile App Native</h2><p>تم تجهيز خارطة التحويل إلى تطبيق جوال أصلي. التطبيق الحالي PWA، والمرحلة التالية Capacitor.</p></ShellCard>{getNativeAppRoadmap().map((item, i) => <ShellCard key={item}><div className="tile-head"><div className="project-icon">{i + 1}</div><div><h3>{item}</h3><p>جاهز كمسار تطوير بعد تثبيت النسخة على Vercel.</p></div></div></ShellCard>)}</section>}

      {activeTab === 'notes' && <section className="screen-stack"><div className="command-row"><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="عنوان الملاحظة" /><button onClick={quickNote}>+ ملاحظة</button></div>{memory.notes.map((note) => <ShellCard key={note.id}><div className="tile-head"><div className="project-icon">{note.pinned ? '📌' : '📝'}</div><div><h3>{note.title}</h3><p>{note.body}</p></div></div><div className="chips">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></ShellCard>)}</section>}

      {activeTab === 'settings' && <section className="screen-stack"><ShellCard><div className="section-title"><h2>نسخ احتياطي يدوي</h2><span>JSON</span></div><div className="cloud-actions"><button onClick={memory.exportBackup}>تصدير ملف</button><label className="import-button">استيراد ملف<input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && memory.importBackup(event.target.files[0])} /></label><button className="danger" onClick={() => confirm('حذف كل الذاكرة المحلية؟') && memory.clearAll()}>تهيئة الذاكرة</button></div></ShellCard><ShellCard><h2>Google OAuth المطلوب منك</h2><p>أنشئ OAuth Client ID من Google Cloud، وفعل Google Drive API، ثم ضع Client ID في Sync Engine. لا تضع Client Secret داخل الواجهة.</p></ShellCard></section>}

      <footer className="safe-footer">{latestProject ? `آخر مشروع: ${latestProject.title}` : 'Focus Flow جاهز'}</footer>
    </main>
  );
}

const premiumStyles = `
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;background:#05060b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 30% 0%,#172554 0,#080a12 34%,#04050a 100%);color:#f8fafc}.premium-shell{min-height:100vh;padding:18px 16px 110px;max-width:860px;margin:0 auto;position:relative;overflow:hidden}.premium-shell:before{content:"";position:fixed;inset:-20%;background:radial-gradient(circle at 85% 10%,rgba(59,130,246,.28),transparent 30%),radial-gradient(circle at 10% 45%,rgba(168,85,247,.16),transparent 26%);pointer-events:none;filter:blur(18px)}.loader{min-height:78vh;display:grid;place-items:center;color:#bfdbfe}.hero{position:relative;isolation:isolate;padding:22px;border:1px solid rgba(255,255,255,.12);border-radius:34px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.045));box-shadow:0 28px 90px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.14);overflow:hidden}.hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,rgba(37,99,235,.28),transparent 45%),radial-gradient(circle at 18% 18%,rgba(255,255,255,.25),transparent 9%);z-index:-1}.hero-top,.hero-actions,.tile-head,.tile-foot,.section-title,.command-row,.cloud-actions,.storage-choice{display:flex;align-items:center;gap:12px}.hero-top,.tile-foot,.section-title,.storage-choice{justify-content:space-between}.brand-orb{width:52px;height:52px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,#ffffff,#93c5fd);color:#0f172a;font-weight:900;font-size:25px;box-shadow:0 18px 42px rgba(59,130,246,.35)}.eyebrow,.cloud-badge{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd}.hero h1{font-size:54px;margin:26px 0 4px;line-height:.95}.hero p,.premium-card p,.metric small,.tile-foot,.activity-feed small,.storage-choice small,.plan-steps small,.voice-box small{color:#94a3b8;line-height:1.7}.hero-actions button,.ai-console button,.command-row button,.cloud-actions button,.import-button,.agent-hero button,.voice-panel button{border:0;border-radius:18px;padding:14px 16px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:white;font-weight:800;box-shadow:0 12px 28px rgba(37,99,235,.25);cursor:pointer}.hero-actions .ghost,.cloud-actions .ghost{background:rgba(255,255,255,.09);box-shadow:none}.premium-tabs{position:sticky;top:8px;z-index:10;margin:16px 0;display:flex;gap:8px;overflow:auto;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:rgba(20,22,31,.75);backdrop-filter:blur(28px)}.premium-tabs button{min-width:78px;border:0;border-radius:18px;background:transparent;color:#94a3b8;padding:10px 8px;display:grid;gap:6px;place-items:center}.premium-tabs button.active{background:rgba(255,255,255,.12);color:white;box-shadow:inset 0 1px rgba(255,255,255,.16)}.premium-tabs b{font-size:22px}.premium-tabs small{font-size:12px}.screen-stack{display:grid;gap:16px;position:relative;z-index:1}.premium-card{border:1px solid rgba(255,255,255,.12);border-radius:28px;background:linear-gradient(150deg,rgba(255,255,255,.105),rgba(255,255,255,.04));box-shadow:0 18px 60px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.1);padding:20px;backdrop-filter:blur(22px)}.premium-card h2,.premium-card h3{margin:0 0 8px}.metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.metric{min-height:150px;position:relative;overflow:hidden}.metric span{color:#cbd5e1}.metric strong{display:block;font-size:42px;margin-top:18px}.metric-shape{position:absolute;left:18px;top:18px;width:58px;height:58px;border-radius:22px;opacity:.8}.blue .metric-shape{background:#2563eb}.green .metric-shape{background:#16a34a}.purple .metric-shape{background:#9333ea}.orange .metric-shape{background:#f97316}.focus-panel{display:flex;justify-content:space-between;align-items:center}.focus-panel h2{font-size:48px}.ring{--p:0deg;width:122px;height:122px;border-radius:50%;background:conic-gradient(#60a5fa var(--p),rgba(255,255,255,.11) 0);display:grid;place-items:center;position:relative}.ring:before{content:"";position:absolute;width:86px;height:86px;border-radius:50%;background:#0b1020}.ring span{position:relative;font-weight:900}.activity-feed,.plan-steps,.insight-grid{display:grid;gap:10px}.activity-feed div,.voice-box{padding:12px;border-radius:18px;background:rgba(15,23,42,.65);display:grid;gap:4px}.ai-console textarea,.ai-console select{width:100%;min-height:56px;margin:12px 0;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(2,6,23,.58);color:white;padding:16px;resize:vertical}.ai-console textarea{min-height:135px}.plan-steps div{display:flex;gap:12px;align-items:center;padding:14px;border-radius:18px;background:rgba(37,99,235,.12)}.plan-steps span{min-width:32px;height:32px;border-radius:12px;background:#2563eb;display:grid;place-items:center}.command-row input,.search,.client-field input{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(15,23,42,.75);color:white;padding:15px}.project-list{display:grid;gap:14px}.project-icon{width:54px;height:54px;border-radius:20px;display:grid;place-items:center;background:rgba(96,165,250,.16);font-size:25px}.project-tile h3{font-size:24px}.progress-line{height:9px;border-radius:999px;background:rgba(148,163,184,.24);overflow:hidden;margin:16px 0}.progress-line i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#60a5fa,#a78bfa)}.tile-foot{font-size:13px;color:#cbd5e1}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips span,.cloud-badge{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.09)}.cloud-badge.ok{color:#bbf7d0;background:rgba(34,197,94,.14)}.kanban-board{display:flex;gap:12px;overflow:auto;padding-bottom:8px}.kanban-col{min-width:260px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:rgba(255,255,255,.055);padding:14px}.kanban-col h3{display:flex;justify-content:space-between}.kanban-col article{padding:14px;margin:10px 0;border-radius:18px;background:rgba(15,23,42,.72);display:grid;gap:8px}.kanban-col small{color:#93c5fd}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:16px}.calendar-grid span{height:48px;border-radius:16px;display:grid;place-items:center;background:rgba(255,255,255,.06);color:#cbd5e1}.calendar-grid .today{background:#2563eb;color:white}.agent-hero{background:linear-gradient(135deg,rgba(79,70,229,.25),rgba(14,165,233,.12))}.cloud-panel{display:grid;gap:14px}.storage-choice{padding:14px;border-radius:20px;background:rgba(15,23,42,.65)}.client-field{display:grid;gap:8px;color:#cbd5e1}.cloud-actions{flex-wrap:wrap}.cloud-actions button,.import-button{font-size:14px}.import-button input{display:none}.danger{background:linear-gradient(135deg,#dc2626,#991b1b)!important}.cloud-message{padding:12px;border-radius:16px;background:rgba(59,130,246,.15);color:#bfdbfe}.insight{padding:15px;border-radius:20px;background:rgba(15,23,42,.62);display:grid;gap:4px}.insight span{color:#93c5fd;font-weight:900}.safe-footer{position:fixed;right:16px;left:16px;bottom:14px;max-width:820px;margin:auto;padding:12px 16px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(15,23,42,.76);backdrop-filter:blur(22px);color:#cbd5e1;text-align:center;z-index:20}@media(min-width:760px){.premium-shell{padding:28px 20px 120px}.metrics-grid{grid-template-columns:repeat(4,1fr)}.hero{padding:30px}.hero h1{font-size:74px}.screen-stack{grid-template-columns:1fr 1fr}.screen-stack>.ai-console,.screen-stack>.focus-panel,.screen-stack>.cloud-panel,.screen-stack>.calendar-card,.screen-stack>.agent-hero,.screen-stack>.voice-panel{grid-column:1/-1}.project-list{grid-template-columns:1fr 1fr}.insight-grid{grid-template-columns:1fr 1fr}}
`;
