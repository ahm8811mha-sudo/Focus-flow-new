import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import ProjectHeader from '@/components/projects/ProjectHeader';
import ProjectStats from '@/components/projects/ProjectStats';
import ProjectStageBridge from '@/components/projects/ProjectStageBridge';
import ProjectLinkedTables from '@/components/projects/ProjectLinkedTables';
import SecretaryCommandPanel from '@/components/projects/SecretaryCommandPanel';
import ProjectLinkedResources from '@/components/ProjectLinkedResources';
import { STORAGE_KEY, type ManagedProject, type ProjectAgent, type ProjectStage, type ProjectTask } from '@/components/projects/types';
import './projects-pmp.css';

function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function asArray<T = any>(value: any): T[] { return Array.isArray(value) ? value : []; }

function defaultStages(projectName: string): ProjectStage[] {
  return [
    { id: uid(), title: 'Project Charter / ميثاق المشروع', owner: 'chief', status: 'in_progress', dueDate: today(), deliverable: 'ميثاق مشروع واضح: الهدف، النطاق، أصحاب المصلحة، القيود، المخاطر', notes: `تأسيس مشروع: ${projectName}` },
    { id: uid(), title: 'Scope & Requirements / النطاق والمتطلبات', owner: 'chief', status: 'not_started', dueDate: today(), deliverable: 'قائمة متطلبات ومعايير قبول', notes: 'تحديد ما يدخل وما لا يدخل في المشروع' },
    { id: uid(), title: 'Execution Planning / خطة التنفيذ', owner: 'assistant', status: 'not_started', dueDate: today(), deliverable: 'مهام، جداول، مواعيد، ومسؤوليات', notes: 'السكرتير الشامل يحول الخطة إلى إجراءات' },
    { id: uid(), title: 'Monitoring & Follow-up / المتابعة والتحكم', owner: 'calendar', status: 'not_started', dueDate: today(), deliverable: 'مواعيد متابعة وسجل تقدم', notes: 'متابعة التنفيذ وتعديل المواعيد' },
    { id: uid(), title: 'Closing / الإغلاق والتوصيات', owner: 'chief', status: 'not_started', dueDate: today(), deliverable: 'تقرير إغلاق وخطوة تالية', notes: 'اعتماد النتائج وتوثيق الدروس المستفادة' },
  ];
}

function defaultTasks(projectName: string): ProjectTask[] {
  return [
    { id: uid(), title: 'تحليل الهدف وتحديد المخرجات', owner: 'chief', status: 'not_started', dueDate: today(), notes: `تحليل مشروع ${projectName}`, result: 'ملخص تنفيذي' },
    { id: uid(), title: 'حصر الجهات والبيانات', owner: 'assistant', status: 'not_started', dueDate: today(), notes: 'أسماء، هواتف، بريد، عنوان، رابط خريطة، حالة المتابعة', result: 'جدول جهات' },
    { id: uid(), title: 'جدولة المتابعات', owner: 'calendar', status: 'not_started', dueDate: today(), notes: 'مواعيد واتصالات وتذكيرات', result: 'تقويم متابعة' },
  ];
}

function hydrateProject(raw: any): ManagedProject {
  const name = raw?.name || raw?.title || 'مشروع بدون اسم';
  return {
    id: raw?.id || uid(),
    name,
    description: raw?.description || raw?.objective || '',
    priority: raw?.priority || 'high',
    status: raw?.status || 'in_progress',
    objective: raw?.objective || raw?.description || name,
    scope: raw?.scope || 'حدد نطاق المشروع ومخرجاته هنا.',
    createdAt: raw?.createdAt || new Date().toISOString(),
    dueDate: raw?.dueDate || today(),
    stages: asArray<ProjectStage>(raw?.stages).length ? raw.stages : defaultStages(name),
    projectTasks: asArray<ProjectTask>(raw?.projectTasks).length ? raw.projectTasks : defaultTasks(name),
    executionLog: asArray<string>(raw?.executionLog),
    agentResults: asArray(raw?.agentResults),
  };
}

function progress(project: ManagedProject) {
  const items = [...asArray<ProjectStage>(project.stages), ...asArray<ProjectTask>(project.projectTasks)];
  if (!items.length) return 0;
  return Math.round((items.filter((item) => item.status === 'done').length / items.length) * 100);
}

export default function ProjectsPMPPage() {
  const memory = useLocalMemory();
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [activeId, setActiveId] = useState('');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [scope, setScope] = useState('');
  const [busyItem, setBusyItem] = useState('');
  const [notice, setNotice] = useState('');
  const tasks = useMemo(() => asArray<any>(memory.tasks), [memory.tasks]);

  useEffect(() => {
    const stored = asArray<any>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')).map(hydrateProject);
    setProjects(stored);
    setActiveId(stored[0]?.id || '');
  }, []);

  function save(items: ManagedProject[], id = activeId) {
    const hydrated = items.map(hydrateProject);
    setProjects(hydrated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
    setActiveId(id);
  }

  function createProject() {
    const clean = name.trim();
    if (!clean) return;
    const project = hydrateProject({ id: uid(), name: clean, objective: objective.trim() || clean, scope: scope.trim(), createdAt: new Date().toISOString() });
    save([project, ...projects], project.id);
    setName(''); setObjective(''); setScope('');
  }

  function updateStage(stageId: string, patch: Partial<any>) {
    save(projects.map((p) => p.id !== activeId ? p : { ...p, stages: asArray<ProjectStage>(p.stages).map((s) => s.id === stageId ? { ...s, ...patch } : s) }));
  }

  function addStage(owner: ProjectAgent) {
    save(projects.map((p) => p.id !== activeId ? p : { ...p, stages: [...asArray<ProjectStage>(p.stages), { id: uid(), title: 'مرحلة PMP جديدة', owner, status: 'not_started', dueDate: today(), deliverable: 'مخرج قابل للقبول', notes: '' }] }));
  }

  function handleSecretaryResult(summary: string, payload: any) {
    const activeProject = projects.find((p) => p.id === activeId);
    if (!activeProject) return;
    const stamp = new Date().toLocaleString('ar-SA');
    save(projects.map((p) => p.id !== activeId ? p : {
      ...p,
      executionLog: [`${stamp} — السكرتير الشامل — ${summary.split('\n')[0]}`, ...asArray<string>(p.executionLog)].slice(0, 30),
      agentResults: [{ id: uid(), agentName: 'السكرتير الشامل', goal: payload.intent?.type || 'Secretary Automation', status: 'done', summary, results: payload.actions || [], tasks: payload.intent?.needsContacts ? ['1 مهمة'] : [], tables: payload.intent?.needsTable ? ['1 جدول'] : [], events: payload.intent?.needsSchedule ? ['1 موعد'] : [], drafts: payload.intent?.needsEmail ? ['1 مسودة'] : [], createdAt: stamp }, ...asArray<any>(p.agentResults)].slice(0, 50),
    }));
    setNotice('تم تشغيل السكرتير وحفظ التقرير داخل المشروع.');
  }

  async function runWorkItem(kind: 'stage', stage: ProjectStage) {
    const activeProject = projects.find((p) => p.id === activeId);
    if (!activeProject) return;
    setBusyItem(stage.id);
    const stamp = new Date().toLocaleString('ar-SA');
    const summary = `تم تجهيز ${stage.title} داخل نموذج PMP وفتح مهمة متابعة. لم يُنفذ أي نشاط خارجي ولم تُسجل نتيجة كمنجزة.`;
    const result = { status: 'in_progress' as const, summary, outputs: ['تحديث بيانات المرحلة', 'إنشاء مهمة متابعة', 'ربط المرحلة بسجل المشروع'], tasks: 1, tables: 0, drafts: 0, events: 0, updatedAt: stamp };
    await memory.saveTask({ title: `PMP: ${stage.title}`, description: summary, priority: 'high', status: 'todo', dueDate: stage.dueDate || today(), dueTime: '', listName: `مشروع: ${activeProject.name}`, projectId: activeProject.id, projectName: activeProject.name, recurrence: 'none' });
    save(projects.map((p) => p.id !== activeId ? p : { ...p, stages: asArray<ProjectStage>(p.stages).map((s) => s.id === stage.id ? { ...s, status: 'in_progress', lastRun: stamp, runCount: (s.runCount || 0) + 1, agentResult: result } : s), executionLog: [`${stamp} — ${stage.title} — ${summary}`, ...asArray<string>(p.executionLog)].slice(0, 30), agentResults: [{ id: uid(), agentName: 'PMP', goal: stage.title, status: 'in_progress', summary, results: result.outputs, tasks: ['1 مهمة'], tables: [], events: [], drafts: [], createdAt: stamp }, ...asArray<any>(p.agentResults)].slice(0, 50) }));
    setNotice(summary);
    setBusyItem('');
  }

  const active = projects.find((p) => p.id === activeId) || projects[0] || null;
  const linkedTasks = active ? tasks.filter((t) => t.projectId === active.id || t.projectName === active.name || t.listName === `مشروع: ${active.name}`) : [];

  return (
    <main className="projects-shell" dir="rtl">
      <header className="hero-card"><a className="back" href="/">← الرئيسية</a><a className="agents" href="/projects-legacy">النسخة القديمة</a><span className="eyebrow">PMP MODE</span><h1>مشاريع PMP</h1><p>نسخة مفككة وآمنة لربط مراحل المشروع بنموذج PMP الفعلي.</p></header>
      {notice && <section className="notice">{notice}</section>}
      <section className="create-panel"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المشروع" /><textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="الهدف" /><textarea value={scope} onChange={(e) => setScope(e.target.value)} placeholder="النطاق" /><button onClick={createProject}>+ إنشاء مشروع PMP</button></section>
      <section className="layout"><aside className="sidebar">{projects.map((p) => <button key={p.id} className={`project-tab ${p.id === active?.id ? 'active' : ''}`} onClick={() => setActiveId(p.id)}><span>{p.name}</span><small>{progress(p)}%</small></button>)}</aside><section className="workspace">{active ? <><ProjectHeader name={active.name} objective={active.objective} progress={progress(active)} /><ProjectStats stages={active.stages.length} tasks={asArray(active.projectTasks).length} linkedTasks={linkedTasks.length} agentResults={asArray(active.agentResults).length} /><SecretaryCommandPanel project={active} onResult={handleSecretaryResult} /><ProjectLinkedResources project={active} tasks={tasks} /><ProjectLinkedTables project={active} /><ProjectStageBridge stages={active.stages} busyItem={busyItem} updateStage={updateStage} runWorkItem={runWorkItem} addStage={addStage} /><section className="panel"><h3>نطاق المشروع</h3><p>{active.scope}</p></section></> : <section className="panel">لا يوجد مشروع.</section>}</section></section>
    </main>
  );
}
