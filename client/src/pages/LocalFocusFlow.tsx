import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Priority, Project, ProjectStatus, Task, TaskStatus } from '@/lib/localMemory';
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
type TaskForm = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'dueTime' | 'listName' | 'recurrence'> & { projectId: string };
type ProjectForm = Pick<Project, 'title' | 'description' | 'status' | 'priority' | 'icon' | 'color' | 'budgetEstimate' | 'actualCost' | 'startDate' | 'endDate'>;

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

const priorityLabel: Record<Priority, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const statusLabel: Record<TaskStatus, string> = { todo: 'جديدة', in_progress: 'قيد التنفيذ', review: 'مراجعة', done: 'مكتملة', blocked: 'معلقة' };
const projectStatusLabel: Record<ProjectStatus, string> = { active: 'نشط', paused: 'متوقف', done: 'مكتمل', archived: 'مؤرشف' };
const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];
const priorityOrder: Priority[] = ['low', 'medium', 'high', 'urgent'];

const agentKinds: { id: AgentKind; label: string; desc: string }[] = [
  { id: 'planner', label: 'Planner Agent', desc: 'يبني خطة تنفيذ ومراحل.' },
  { id: 'executor', label: 'Execution Agent', desc: 'يعطيك مهام اليوم.' },
  { id: 'calendar', label: 'Calendar AI', desc: 'يرتب المواعيد والتعثر.' },
  { id: 'risk', label: 'Risk Agent', desc: 'يكشف المخاطر والتأخير.' },
  { id: 'memory', label: 'Memory Engine', desc: 'يفهم بياناتك المحفوظة.' },
  { id: 'notification', label: 'Notifications AI', desc: 'يقترح تنبيهات ذكية.' },
];

const emptyTaskForm: TaskForm = {
  projectId: '',
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  dueTime: '',
  listName: 'Focus',
  recurrence: 'none',
};

const emptyProjectForm: ProjectForm = {
  title: '',
  description: '',
  status: 'active',
  priority: 'medium',
  icon: '🚀',
  color: '#3b82f6',
  budgetEstimate: 0,
  actualCost: 0,
  startDate: '',
  endDate: '',
};

function ShellCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`premium-card ${className}`}>{children}</section>;
}

function Metric({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: string }) {
  return <ShellCard className={`metric ${tone}`}><div className="metric-shape" /><span>{label}</span><strong>{value}</strong><small>{hint}</small></ShellCard>;
}

function CloudBadge({ connected }: { connected: boolean }) {
  return <span className={`cloud-badge ${connected ? 'ok' : ''}`}>{connected ? 'Google Drive متصل' : 'محلي أولًا'}</span>;
}

function formatDate(date?: string, fallback = 'بدون تاريخ') {
  if (!date) return fallback;
  return new Date(`${date}T12:00:00`).toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isOverdue(task: Task) {
  return Boolean(task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10));
}

export default function LocalFocusFlow() {
  const memory = useLocalMemory();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [prompt, setPrompt] = useState('');
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
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);

  const projectsById = useMemo(() => new Map(memory.projects.map((project) => [project.id, project])), [memory.projects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memory.projects;
    return memory.projects.filter((project) => `${project.title} ${project.description} ${projectStatusLabel[project.status]}`.toLowerCase().includes(q));
  }, [memory.projects, query]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || activeTab !== 'kanban') return memory.tasks;
    return memory.tasks.filter((task) => `${task.title} ${task.description} ${task.listName} ${projectsById.get(task.projectId || '')?.title || ''}`.toLowerCase().includes(q));
  }, [activeTab, memory.tasks, projectsById, query]);

  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [], blocked: [] };
    for (const task of filteredTasks) groups[task.status].push(task);
    return groups;
  }, [filteredTasks]);

  const upcomingTasks = memory.tasks.filter((task) => task.dueDate && task.status !== 'done').sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 6);
  const insights = createMemoryInsights({ projects: memory.projects, tasks: memory.tasks, notes: memory.notes });
  const smartPlan = buildSmartPlan(prompt || 'Focus Flow');
  const latestProject = memory.projects[0];
  const overdueCount = memory.tasks.filter(isOverdue).length;
  const withoutDate = memory.tasks.filter((task) => !task.dueDate && task.status !== 'done').length;

  async function runCloud(action: () => Promise<unknown>, success: string) {
    try {
      setCloudBusy(true);
      setCloudMessage('جاري التنفيذ...');
      await action();
      setCloudMessage(success);
      setDriveConnected(Boolean(getStoredDriveToken()));
      await memory.refresh();
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : 'حدث خطأ غير معروف');
    } finally {
      setCloudBusy(false);
    }
  }

  function openNewProject() {
    setEditingProjectId(null);
    setProjectForm({ ...emptyProjectForm, startDate: new Date().toISOString().slice(0, 10) });
    setProjectModalOpen(true);
  }

  function openEditProject(project: Project) {
    setEditingProjectId(project.id);
    setProjectForm({
      title: project.title,
      description: project.description,
      status: project.status,
      priority: project.priority,
      icon: project.icon,
      color: project.color,
      budgetEstimate: project.budgetEstimate,
      actualCost: project.actualCost,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
    });
    setProjectModalOpen(true);
  }

  async function saveProjectFromModal(event: FormEvent) {
    event.preventDefault();
    if (!projectForm.title.trim()) return;
    await memory.saveProject({ id: editingProjectId || undefined, ...projectForm, title: projectForm.title.trim() });
    setProjectModalOpen(false);
    setActiveTab('projects');
  }

  async function deleteProject(project: Project) {
    const linkedTasks = memory.tasks.filter((task) => task.projectId === project.id);
    for (const task of linkedTasks) await memory.remove('tasks', task.id);
    await memory.remove('projects', project.id);
    setProjectModalOpen(false);
  }

  function openNewTask(projectId = '') {
    setEditingTaskId(null);
    setTaskForm({ ...emptyTaskForm, projectId: projectId || memory.projects[0]?.id || '', dueDate: new Date().toISOString().slice(0, 10) });
    setTaskModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTaskId(task.id);
    setTaskForm({
      projectId: task.projectId || '',
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
      dueTime: task.dueTime || '',
      listName: task.listName,
      recurrence: task.recurrence,
    });
    setTaskModalOpen(true);
  }

  async function saveTaskFromModal(event: FormEvent) {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    await memory.saveTask({
      id: editingTaskId || undefined,
      ...taskForm,
      projectId: taskForm.projectId || undefined,
      title: taskForm.title.trim(),
    });
    setTaskModalOpen(false);
    setActiveTab('kanban');
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    await memory.saveTask({ ...task, status });
  }

  async function deleteTask(task: Task) {
    await memory.remove('tasks', task.id);
    setTaskModalOpen(false);
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
    setPrompt('');
    setActiveTab('projects');
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
        <div className="hero-bg" />
        <div className="hero-top"><div className="brand-orb">F</div><CloudBadge connected={driveConnected} /></div>
        <div className="hero-copy"><span className="eyebrow">Personal AI Execution OS</span><h1>Focus Flow</h1><p>نظام جوال شخصي لإدارة المشاريع والمهام والوكلاء، يعمل محليًا أولًا مع AI وذاكرة وسحابة اختيارية.</p></div>
        <div className="hero-actions"><button onClick={() => setActiveTab('plan')}>✨ Smart Planning</button><button className="ghost" onClick={() => openNewTask()}>+ مهمة كاملة</button></div>
      </header>

      <nav className="premium-tabs" aria-label="Focus Flow navigation">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}><b>{tab.icon}</b><small>{tab.label}</small></button>)}</nav>

      {activeTab === 'dashboard' && <section className="screen-stack">
        <div className="metrics-grid"><Metric label="المشاريع" value={memory.stats.totalProjects} hint="إجمالي المشاريع" tone="blue" /><Metric label="المهام" value={memory.stats.totalTasks} hint="كل المهام" tone="green" /><Metric label="مكتملة" value={memory.stats.completed} hint="تم إنجازها" tone="purple" /><Metric label="متأخرة" value={overdueCount} hint="تحتاج متابعة" tone="orange" /></div>
        <ShellCard className="focus-panel"><div><span>مؤشر التنفيذ</span><h2>{memory.stats.progress}%</h2><p>{memory.stats.completed} من {memory.stats.totalTasks} مهمة مكتملة · {withoutDate} بدون تاريخ</p></div><div className="ring" style={{ ['--p' as any]: `${memory.stats.progress * 3.6}deg` }}><span>{memory.stats.progress}%</span></div></ShellCard>
        <ShellCard><div className="section-title"><h2>مهام تحتاج قرار</h2><button onClick={() => openNewTask()}>+ إضافة</button></div><div className="task-list compact">{memory.tasks.filter((task) => task.status !== 'done').slice(0, 5).map((task) => <button className="task-row" key={task.id} onClick={() => openEditTask(task)}><b>{task.title}</b><small>{projectsById.get(task.projectId || '')?.title || 'بدون مشروع'} · {formatDate(task.dueDate)} · {priorityLabel[task.priority]}</small></button>)}</div></ShellCard>
        <ShellCard><div className="section-title"><h2>نبض اليوم</h2><span>{new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div><div className="activity-feed">{memory.activities.slice(0, 5).map((activity) => <div key={activity.id}><b>{activity.title}</b><small>{activity.detail}</small></div>)}</div></ShellCard>
        <ShellCard><div className="section-title"><h2>AI Memory Insights</h2><span>محلي</span></div><div className="insight-grid">{insights.map((i) => <div key={i.title} className="insight"><b>{i.title}</b><p>{i.detail}</p><span>{i.score}%</span></div>)}</div></ShellCard>
      </section>}

      {activeTab === 'plan' && <section className="screen-stack"><ShellCard className="ai-console"><div className="section-title"><h2>Smart Planning</h2><span>AI-ready</span></div><p>اكتب فكرة المشروع وسيتم توليد مشروع ومهام وتواريخ ووكلاء داخل ذاكرة الجوال.</p><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="مثال: خطة تطوير مصنع حلويات خلال 90 يومًا..." /><button onClick={aiPlan}>إنشاء خطة تنفيذ ✨</button></ShellCard><ShellCard><h2>الخطة المتوقعة</h2><div className="plan-steps">{smartPlan.map((step, i) => <div key={step.title}><span>{i + 1}</span><section><b>{step.title}</b><small>{step.description} · {step.suggestedDate}</small></section></div>)}</div></ShellCard></section>}

      {activeTab === 'projects' && <section className="screen-stack">
        <div className="command-row"><button className="primary-wide" onClick={openNewProject}>+ مشروع بتفاصيل كاملة</button></div>
        <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن مشروع..." />
        <div className="project-list">{filteredProjects.map((project) => {
          const tasks = memory.tasks.filter((task) => task.projectId === project.id);
          const done = tasks.filter((task) => task.status === 'done').length;
          const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
          return <ShellCard key={project.id} className="project-tile clickable"><button className="tile-main" onClick={() => openEditProject(project)}><div className="tile-head"><div className="project-icon" style={{ background: project.color }}>{project.icon}</div><div><h3>{project.title}</h3><p>{project.description || 'لا يوجد وصف بعد'}</p></div></div><div className="progress-line"><i style={{ width: `${progress}%` }} /></div><div className="tile-foot"><span>{progress}% إنجاز</span><span>{done}/{tasks.length} مهمة</span><span>{projectStatusLabel[project.status]}</span></div></button><button className="secondary-action" onClick={() => openNewTask(project.id)}>+ مهمة للمشروع</button></ShellCard>;
        })}</div>
      </section>}

      {activeTab === 'kanban' && <section className="screen-stack">
        <div className="command-row"><button className="primary-wide" onClick={() => openNewTask()}>+ مهمة بتفاصيل كاملة</button></div>
        <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في المهام، الوصف، المشروع..." />
        <div className="kanban-board">{statusOrder.map((status) => <div className="kanban-col" key={status}><h3>{statusLabel[status]} <span>{tasksByStatus[status].length}</span></h3>{tasksByStatus[status].map((task) => <article key={task.id} className={isOverdue(task) ? 'overdue' : ''}><button className="task-card-main" onClick={() => openEditTask(task)}><b>{task.title}</b><p>{task.description || 'اضغط لإضافة وصف وتفاصيل'}</p><small>{projectsById.get(task.projectId || '')?.title || 'بدون مشروع'} · {formatDate(task.dueDate)} {task.dueTime ? `· ${task.dueTime}` : ''}</small><div className="chips"><span>{priorityLabel[task.priority]}</span><span>{task.listName}</span>{isOverdue(task) && <span className="danger-chip">متأخرة</span>}</div></button><div className="status-actions">{statusOrder.filter((next) => next !== task.status).slice(0, 3).map((next) => <button key={next} onClick={() => updateTaskStatus(task, next)}>{statusLabel[next]}</button>)}</div></article>)}</div>)}</div>
      </section>}

      {activeTab === 'calendar' && <section className="screen-stack"><ShellCard className="calendar-card"><div className="section-title"><h2>Calendar AI</h2><span>{new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</span></div><div className="calendar-grid">{Array.from({ length: 35 }, (_, i) => <span className={i === new Date().getDate() - 1 ? 'today' : ''} key={i}>{(i % 31) + 1}</span>)}</div></ShellCard><ShellCard><h2>المهام القادمة</h2><div className="activity-feed">{upcomingTasks.map((task) => <button className="task-row" key={task.id} onClick={() => openEditTask(task)}><b>{task.title}</b><small>{formatDate(task.dueDate)} · {task.dueTime || 'بدون وقت'} · {projectsById.get(task.projectId || '')?.title || 'بدون مشروع'}</small></button>)}</div></ShellCard></section>}

      {activeTab === 'agents' && <section className="screen-stack"><ShellCard className="agent-hero"><div className="section-title"><h2>AI Agents داخل النظام</h2><button onClick={createAgentTeam}>إنشاء فريق وكلاء</button></div><p>طبقة وكلاء تعمل محليًا الآن ومهيأة للربط لاحقًا بـ API فعلي.</p></ShellCard><ShellCard className="ai-console"><select value={agentKind} onChange={(e) => setAgentKind(e.target.value as AgentKind)}>{agentKinds.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select><textarea value={agentInput} onChange={(e) => setAgentInput(e.target.value)} /><button onClick={askAgent}>اسأل الوكيل</button></ShellCard>{agentResult && <ShellCard><div className="section-title"><h2>{agentResult.agent}</h2><span>{agentResult.confidence}% ثقة</span></div><h3>{agentResult.title}</h3><p>{agentResult.summary}</p><div className="plan-steps">{agentResult.actions.map((a, i) => <div key={a}><span>{i + 1}</span>{a}</div>)}</div></ShellCard>}{memory.agents.map((agent) => <ShellCard key={agent.id}><div className="tile-head"><div className="project-icon">🤖</div><div><h3>{agent.name}</h3><p>{agent.role} · {agent.mission}</p></div></div><span className="cloud-badge ok">نشط</span></ShellCard>)}</section>}

      {activeTab === 'memory' && <section className="screen-stack"><ShellCard className="agent-hero"><h2>Memory Engine</h2><p>ذاكرة تشغيل محلية على الجوال تحفظ المشاريع، المهام، الملاحظات، الوكلاء، وسجل النشاط.</p></ShellCard>{insights.map((i) => <ShellCard key={i.title}><div className="section-title"><h2>{i.title}</h2><span>{i.score}%</span></div><p>{i.detail}</p><div className="progress-line"><i style={{ width: `${i.score}%` }} /></div></ShellCard>)}</section>}

      {activeTab === 'voice' && <section className="screen-stack"><ShellCard className="voice-panel"><h2>Voice Assistant</h2><p>يدعم الأوامر الصوتية من الجوال حسب دعم المتصفح للمايكروفون.</p><button onClick={startVoice}>🎙️ ابدأ التحدث</button><div className="voice-box"><b>{voiceStatus}</b><small>{voiceText || 'مثال: أضف مهمة متابعة الطلبات اليوم'}</small></div></ShellCard><ShellCard><h2>أوامر مدعومة</h2><div className="plan-steps"><div><span>1</span>أضف مهمة ...</div><div><span>2</span>أنشئ مشروع ...</div><div><span>3</span>أي كلام آخر يتحول إلى ملاحظة صوتية</div></div></ShellCard></section>}

      {activeTab === 'notifications' && <section className="screen-stack"><ShellCard><div className="section-title"><h2>Notifications AI</h2><span>جاهز للتفعيل</span></div><p>تنبيهات ذكية محلية حسب التأخير والأولوية.</p></ShellCard>{notificationRules.map((n) => <ShellCard key={n.title}><div className="section-title"><h2>{n.title}</h2><span>{n.level}</span></div><p>{n.body}</p></ShellCard>)}</section>}

      {activeTab === 'sync' && <section className="screen-stack"><ShellCard className="cloud-panel"><div className="section-title"><h2>Sync Engine</h2><span>Local-first</span></div><div className="storage-choice"><div><b>ذاكرة الجوال</b><small>IndexedDB · المصدر الأساسي</small></div><span className="cloud-badge ok">أساسي</span></div><div className="storage-choice"><div><b>Google Drive</b><small>نسخة احتياطية إلى appDataFolder</small></div><span className={`cloud-badge ${driveConnected ? 'ok' : ''}`}>{driveConnected ? 'متصل' : 'غير متصل'}</span></div><label className="client-field">Google OAuth Client ID<input value={clientId} onChange={(event) => setClientIdState(event.target.value)} placeholder="ضع Client ID هنا" /></label><div className="cloud-actions"><button disabled={cloudBusy} onClick={() => { setGoogleClientId(clientId); setCloudMessage('تم حفظ Client ID'); }}>حفظ Client ID</button><button disabled={cloudBusy} onClick={() => runCloud(connectGoogleDrive, 'تم الاتصال بـ Google Drive')}>ربط Google Drive</button><button disabled={cloudBusy} onClick={() => runCloud(backupToGoogleDrive, 'تم رفع النسخة الاحتياطية')}>رفع نسخة</button><button disabled={cloudBusy} onClick={() => runCloud(restoreFromGoogleDrive, 'تمت الاستعادة من Drive')}>استعادة</button><button className="ghost" onClick={() => { disconnectGoogleDrive(); setDriveConnected(false); setCloudMessage('تم فصل Google Drive'); }}>فصل</button></div>{cloudMessage && <p className="cloud-message">{cloudMessage}</p>}</ShellCard></section>}

      {activeTab === 'native' && <section className="screen-stack"><ShellCard className="agent-hero"><h2>Mobile App Native</h2><p>التطبيق الحالي PWA، والمرحلة التالية Capacitor.</p></ShellCard>{getNativeAppRoadmap().map((item, i) => <ShellCard key={item}><div className="tile-head"><div className="project-icon">{i + 1}</div><div><h3>{item}</h3><p>جاهز كمسار تطوير بعد تثبيت النسخة على Vercel.</p></div></div></ShellCard>)}</section>}

      {activeTab === 'notes' && <section className="screen-stack"><div className="command-row"><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="عنوان الملاحظة" /><button onClick={quickNote}>+ ملاحظة</button></div>{memory.notes.map((note) => <ShellCard key={note.id}><div className="tile-head"><div className="project-icon">{note.pinned ? '📌' : '📝'}</div><div><h3>{note.title}</h3><p>{note.body}</p></div></div><div className="chips">{note.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></ShellCard>)}</section>}

      {activeTab === 'settings' && <section className="screen-stack"><ShellCard><div className="section-title"><h2>نسخ احتياطي يدوي</h2><span>JSON</span></div><div className="cloud-actions"><button onClick={memory.exportBackup}>تصدير ملف</button><label className="import-button">استيراد ملف<input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && memory.importBackup(event.target.files[0])} /></label><button className="danger" onClick={() => confirm('حذف كل الذاكرة المحلية؟') && memory.clearAll()}>تهيئة الذاكرة</button></div></ShellCard><ShellCard><h2>Google OAuth المطلوب منك</h2><p>أنشئ OAuth Client ID من Google Cloud، وفعل Google Drive API، ثم ضع Client ID في Sync Engine. لا تضع Client Secret داخل الواجهة.</p></ShellCard></section>}

      {taskModalOpen && <div className="modal-backdrop" onMouseDown={() => setTaskModalOpen(false)}><form className="modal-card" onSubmit={saveTaskFromModal} onMouseDown={(event) => event.stopPropagation()}><div className="section-title"><h2>{editingTaskId ? 'تعديل المهمة' : 'مهمة جديدة'}</h2><button type="button" className="ghost small" onClick={() => setTaskModalOpen(false)}>إغلاق</button></div><label>العنوان<input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="اكتب اسم المهمة" autoFocus /></label><label>الوصف<textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="تفاصيل المهمة، المطلوب، الملاحظات..." /></label><div className="form-grid"><label>المشروع<select value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}><option value="">بدون مشروع</option>{memory.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>القائمة<input value={taskForm.listName} onChange={(e) => setTaskForm({ ...taskForm, listName: e.target.value })} /></label><label>الحالة<select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}>{statusOrder.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></label><label>الأولوية<select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Priority })}>{priorityOrder.map((priority) => <option key={priority} value={priority}>{priorityLabel[priority]}</option>)}</select></label><label>التاريخ<input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></label><label>الوقت<input type="time" value={taskForm.dueTime} onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })} /></label><label>التكرار<select value={taskForm.recurrence} onChange={(e) => setTaskForm({ ...taskForm, recurrence: e.target.value as Task['recurrence'] })}><option value="none">بدون تكرار</option><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option></select></label></div><div className="modal-actions"><button type="submit">حفظ المهمة</button>{editingTaskId && <button type="button" className="danger" onClick={() => { const task = memory.tasks.find((item) => item.id === editingTaskId); if (task) deleteTask(task); }}>حذف</button>}</div></form></div>}

      {projectModalOpen && <div className="modal-backdrop" onMouseDown={() => setProjectModalOpen(false)}><form className="modal-card" onSubmit={saveProjectFromModal} onMouseDown={(event) => event.stopPropagation()}><div className="section-title"><h2>{editingProjectId ? 'تعديل المشروع' : 'مشروع جديد'}</h2><button type="button" className="ghost small" onClick={() => setProjectModalOpen(false)}>إغلاق</button></div><label>اسم المشروع<input value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} placeholder="اكتب اسم المشروع" autoFocus /></label><label>الوصف<textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="تفاصيل المشروع والهدف" /></label><div className="form-grid"><label>الأيقونة<input value={projectForm.icon} onChange={(e) => setProjectForm({ ...projectForm, icon: e.target.value })} /></label><label>اللون<input type="color" value={projectForm.color} onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })} /></label><label>الحالة<select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })}>{Object.entries(projectStatusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>الأولوية<select value={projectForm.priority} onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value as Priority })}>{priorityOrder.map((priority) => <option key={priority} value={priority}>{priorityLabel[priority]}</option>)}</select></label><label>الميزانية<input type="number" value={projectForm.budgetEstimate} onChange={(e) => setProjectForm({ ...projectForm, budgetEstimate: Number(e.target.value) })} /></label><label>التكلفة الفعلية<input type="number" value={projectForm.actualCost} onChange={(e) => setProjectForm({ ...projectForm, actualCost: Number(e.target.value) })} /></label><label>تاريخ البداية<input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} /></label><label>تاريخ النهاية<input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} /></label></div><div className="modal-actions"><button type="submit">حفظ المشروع</button>{editingProjectId && <button type="button" className="danger" onClick={() => { const project = memory.projects.find((item) => item.id === editingProjectId); if (project) deleteProject(project); }}>حذف المشروع ومهامه</button>}</div></form></div>}

      <footer className="safe-footer">{latestProject ? `آخر مشروع: ${latestProject.title}` : 'Focus Flow جاهز'}</footer>
    </main>
  );
}

const premiumStyles = `
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;background:#05060b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 30% 0%,#172554 0,#080a12 34%,#04050a 100%);color:#f8fafc}.premium-shell{min-height:100vh;padding:18px 16px 110px;max-width:920px;margin:0 auto;position:relative;overflow-x:hidden}.premium-shell:before{content:"";position:fixed;inset:-20%;background:radial-gradient(circle at 85% 10%,rgba(59,130,246,.28),transparent 30%),radial-gradient(circle at 10% 45%,rgba(168,85,247,.16),transparent 26%);pointer-events:none;filter:blur(18px)}button,input,textarea,select{font:inherit}button{border:0;cursor:pointer;color:#fff}.loader{min-height:78vh;display:grid;place-items:center;color:#bfdbfe}.hero{position:relative;isolation:isolate;padding:22px;border:1px solid rgba(255,255,255,.12);border-radius:34px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.045));box-shadow:0 24px 80px rgba(0,0,0,.32);overflow:hidden}.hero-bg{position:absolute;inset:0;background:radial-gradient(circle at 18% 20%,rgba(255,255,255,.16),transparent 20%),linear-gradient(135deg,rgba(37,99,235,.28),rgba(15,23,42,.1));z-index:-1}.hero-top{display:flex;align-items:center;justify-content:space-between;gap:14px}.brand-orb{width:54px;height:54px;border-radius:18px;background:#dbeafe;color:#0f172a;display:grid;place-items:center;font-weight:900;font-size:26px}.cloud-badge{display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:13px}.cloud-badge.ok{background:rgba(34,197,94,.16);color:#bbf7d0}.hero-copy{text-align:center;padding:22px 4px}.eyebrow{text-transform:uppercase;letter-spacing:.22em;color:#bfdbfe;font-size:12px}.hero h1{font-size:clamp(52px,14vw,96px);margin:16px 0 4px;line-height:.9}.hero p{margin:0 auto;max-width:680px;color:#cbd5e1;font-size:18px;line-height:1.8}.hero-actions,.cloud-actions,.modal-actions{display:flex;gap:12px;flex-wrap:wrap}.hero-actions button,.ai-console button,.section-title button,.command-row button,.cloud-actions button,.modal-actions button,.voice-panel button,.import-button{flex:1;min-height:54px;border-radius:22px;background:linear-gradient(135deg,#2563eb,#7c3aed);font-weight:800;padding:0 18px;display:grid;place-items:center}.ghost{background:rgba(255,255,255,.1)!important}.danger{background:linear-gradient(135deg,#dc2626,#f97316)!important}.small{min-height:auto!important;padding:8px 12px!important;border-radius:14px!important;flex:initial!important}.premium-tabs{position:sticky;top:10px;z-index:20;margin:18px 0 28px;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:28px;background:rgba(8,10,18,.82);backdrop-filter:blur(18px);display:flex;gap:10px;overflow-x:auto;scrollbar-width:none}.premium-tabs::-webkit-scrollbar{display:none}.premium-tabs button{min-width:108px;padding:14px 10px;border-radius:22px;background:transparent;color:#94a3b8;display:grid;gap:8px;place-items:center}.premium-tabs button b{font-size:24px}.premium-tabs button.active{background:rgba(255,255,255,.14);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}.screen-stack{display:grid;gap:18px;position:relative;z-index:1}.premium-card{border:1px solid rgba(255,255,255,.12);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.095),rgba(255,255,255,.04));box-shadow:0 20px 60px rgba(0,0,0,.28);padding:20px;overflow:hidden}.metrics-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.metric{min-height:150px;position:relative;display:grid;gap:10px}.metric-shape{width:68px;height:68px;border-radius:24px;background:#2563eb}.metric.green .metric-shape{background:#16a34a}.metric.purple .metric-shape{background:#9333ea}.metric.orange .metric-shape{background:#ea580c}.metric strong{font-size:54px;line-height:1}.metric span,.section-title span,.metric small,small{color:#94a3b8}.focus-panel{display:flex;align-items:center;justify-content:space-between;gap:18px}.focus-panel h2{font-size:54px;margin:0}.ring{--p:0deg;width:118px;height:118px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#60a5fa var(--p),rgba(255,255,255,.12) 0)}.ring span{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;background:#0f172a;font-weight:900}.section-title{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.section-title h2,h3,p{margin-top:0}.activity-feed,.task-list{display:grid;gap:10px}.activity-feed>div,.task-row,.storage-choice{padding:14px;border-radius:18px;background:rgba(15,23,42,.72);display:grid;gap:6px;border:1px solid rgba(255,255,255,.08);text-align:right;color:#fff;width:100%}.task-row:hover,.tile-main:hover,.task-card-main:hover{background:rgba(59,130,246,.12)}.insight-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.insight{padding:14px;border-radius:20px;background:rgba(15,23,42,.7)}.insight p{color:#cbd5e1;font-size:13px;line-height:1.6}.command-row{display:flex;gap:10px;position:relative;z-index:1}.command-row input,.search,input,textarea,select{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(15,23,42,.86);color:#fff;padding:15px 16px;outline:none}.search{position:relative;z-index:1}textarea{min-height:120px;resize:vertical;line-height:1.7}.primary-wide{width:100%}.project-list{display:grid;gap:14px}.tile-main,.task-card-main{width:100%;background:transparent;color:#fff;text-align:right;padding:0}.tile-head{display:flex;align-items:flex-start;gap:14px}.project-icon{min-width:64px;width:64px;height:64px;border-radius:24px;background:#2563eb;display:grid;place-items:center;font-weight:900;font-size:24px}.tile-head h3{margin:4px 0 6px}.tile-head p{color:#cbd5e1;line-height:1.6;margin:0}.progress-line{height:8px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;margin:18px 0}.progress-line i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#a855f7)}.tile-foot,.chips,.status-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.tile-foot span,.chips span,.status-actions button{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:12px}.secondary-action{width:100%;margin-top:14px;padding:13px;border-radius:18px;background:rgba(37,99,235,.16);color:#bfdbfe;font-weight:800}.kanban-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}.kanban-col{border:1px solid rgba(255,255,255,.1);border-radius:24px;background:rgba(2,6,23,.48);padding:14px;min-height:180px}.kanban-col h3{display:flex;justify-content:space-between;align-items:center}.kanban-col article{padding:14px;border-radius:20px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);margin-bottom:12px}.kanban-col article.overdue{border-color:rgba(248,113,113,.55);background:rgba(127,29,29,.2)}.task-card-main p{margin:7px 0;color:#cbd5e1;line-height:1.55}.danger-chip{background:rgba(239,68,68,.22)!important;color:#fecaca!important}.status-actions{margin-top:12px}.status-actions button{background:rgba(59,130,246,.14);color:#bfdbfe}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.calendar-grid span{aspect-ratio:1;border-radius:16px;background:rgba(255,255,255,.06);display:grid;place-items:center;color:#cbd5e1}.calendar-grid .today{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff}.ai-console,.voice-panel,.cloud-panel{display:grid;gap:14px}.plan-steps{display:grid;gap:10px}.plan-steps>div{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:18px;background:rgba(15,23,42,.72)}.plan-steps span{min-width:34px;height:34px;border-radius:12px;background:rgba(59,130,246,.22);display:grid;place-items:center;color:#bfdbfe}.voice-box{padding:16px;border-radius:20px;background:rgba(15,23,42,.8);display:grid;gap:8px}.client-field,label{display:grid;gap:8px;color:#cbd5e1}.import-button{position:relative;overflow:hidden}.import-button input{position:absolute;inset:0;opacity:0}.cloud-message{color:#bfdbfe}.modal-backdrop{position:fixed;inset:0;z-index:80;background:rgba(2,6,23,.72);backdrop-filter:blur(18px);display:grid;place-items:end center;padding:18px}.modal-card{width:min(720px,100%);max-height:88vh;overflow:auto;border:1px solid rgba(255,255,255,.14);border-radius:30px;background:#0b1020;box-shadow:0 30px 90px rgba(0,0,0,.55);padding:20px;display:grid;gap:14px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.safe-footer{position:fixed;left:16px;right:16px;bottom:12px;z-index:30;max-width:860px;margin:auto;padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:rgba(15,23,42,.88);backdrop-filter:blur(18px);text-align:center;color:#cbd5e1;box-shadow:0 12px 40px rgba(0,0,0,.35)}@media(max-width:640px){.premium-shell{padding:18px 14px 96px}.hero{border-radius:30px;padding:20px}.hero p{font-size:16px}.metrics-grid,.form-grid{grid-template-columns:1fr}.focus-panel{align-items:flex-start}.ring{width:96px;height:96px}.ring span{width:72px;height:72px}.premium-tabs button{min-width:96px}.modal-backdrop{padding:10px;align-items:end}.modal-card{border-radius:26px;padding:16px}.hero-actions button{min-width:0}.kanban-board{grid-template-columns:1fr}}
`;
