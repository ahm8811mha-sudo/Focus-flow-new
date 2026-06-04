import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import ProjectHeader from '@/components/projects/ProjectHeader';
import ProjectStats from '@/components/projects/ProjectStats';
import ProjectStageBridge from '@/components/projects/ProjectStageBridge';
import ProjectLinkedTables from '@/components/projects/ProjectLinkedTables';
import ProjectLinkedResources from '@/components/ProjectLinkedResources';
import { STORAGE_KEY, type ManagedProject, type ProjectAgent, type ProjectStage, type ProjectTask } from '@/components/projects/types';

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

  async function runWorkItem(kind: 'stage', stage: ProjectStage) {
    const activeProject = projects.find((p) => p.id === activeId);
    if (!activeProject) return;
    setBusyItem(stage.id);
    const stamp = new Date().toLocaleString('ar-SA');
    const summary = `تم تشغيل ${stage.title} ضمن نموذج PMP. تم حفظ النتيجة داخل المرحلة وسجل المشروع.`;
    const result = { status: 'done' as const, summary, outputs: ['تحديث بيانات المرحلة', 'إنشاء سجل متابعة', 'ربط النتيجة بالمشروع'], tasks: 1, tables: 1, drafts: 0, events: 0, updatedAt: stamp };
    await memory.saveTask({ title: `PMP: ${stage.title}`, description: summary, priority: 'high', status: 'todo', dueDate: stage.dueDate || today(), dueTime: '', listName: `مشروع: ${activeProject.name}`, projectId: activeProject.id, projectName: activeProject.name, recurrence: 'none' });
    save(projects.map((p) => p.id !== activeId ? p : { ...p, stages: asArray<ProjectStage>(p.stages).map((s) => s.id === stage.id ? { ...s, status: 'in_progress', lastRun: stamp, runCount: (s.runCount || 0) + 1, agentResult: result } : s), executionLog: [`${stamp} — ${stage.title} — ${summary}`, ...asArray<string>(p.executionLog)].slice(0, 30), agentResults: [{ id: uid(), agentName: 'PMP', goal: stage.title, status: 'done', summary, results: result.outputs, tasks: ['1 مهمة'], tables: ['1 جدول'], events: [], drafts: [], createdAt: stamp }, ...asArray<any>(p.agentResults)].slice(0, 50) }));
    setNotice(summary);
    setBusyItem('');
  }

  const active = projects.find((p) => p.id === activeId) || projects[0] || null;
  const linkedTasks = active ? tasks.filter((t) => t.projectId === active.id || t.projectName === active.name || t.listName === `مشروع: ${active.name}`) : [];

  return (
    <main className="projects-shell" dir="rtl">
      <style>{styles}</style>
      <header className="hero-card"><a className="back" href="/">← الرئيسية</a><a className="agents" href="/projects-legacy">النسخة القديمة</a><span className="eyebrow">PMP MODE</span><h1>مشاريع PMP</h1><p>نسخة مفككة وآمنة لربط مراحل المشروع بنموذج PMP الفعلي.</p></header>
      {notice && <section className="notice">{notice}</section>}
      <section className="create-panel"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المشروع" /><textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="الهدف" /><textarea value={scope} onChange={(e) => setScope(e.target.value)} placeholder="النطاق" /><button onClick={createProject}>+ إنشاء مشروع PMP</button></section>
      <section className="layout"><aside className="sidebar">{projects.map((p) => <button key={p.id} className={`project-tab ${p.id === active?.id ? 'active' : ''}`} onClick={() => setActiveId(p.id)}><span>{p.name}</span><small>{progress(p)}%</small></button>)}</aside><section className="workspace">{active ? <><ProjectHeader name={active.name} objective={active.objective} progress={progress(active)} /><ProjectStats stages={active.stages.length} tasks={asArray(active.projectTasks).length} linkedTasks={linkedTasks.length} agentResults={asArray(active.agentResults).length} /><ProjectLinkedResources project={active} tasks={tasks} /><ProjectLinkedTables project={active} /><ProjectStageBridge stages={active.stages} busyItem={busyItem} updateStage={updateStage} runWorkItem={runWorkItem} addStage={addStage} /><section className="panel"><h3>نطاق المشروع</h3><p>{active.scope}</p></section></> : <section className="panel">لا يوجد مشروع.</section>}</section></section>
    </main>
  );
}

const styles = `body{margin:0;background:#030305;color:#f8fafc;font-family:Cairo,-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif}.projects-shell{min-height:100vh;padding:18px 14px 100px;background:radial-gradient(circle at 15% 0%,rgba(34,211,238,.18),transparent 32%),radial-gradient(circle at 90% 0%,rgba(124,58,237,.2),transparent 30%),#020202}.hero-card,.create-panel,.sidebar,.project-tab,.project-hero,.stats-grid a,.panel,.stage,.notice,.resource-card,.quick-actions,.result-box{border:1px solid rgba(255,255,255,.13);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border-radius:34px;box-shadow:0 24px 80px rgba(0,0,0,.34);backdrop-filter:blur(22px)}.hero-card{max-width:1180px;margin:auto;text-align:center;padding:30px;display:grid;gap:12px;position:relative}.back,.agents,.mini-link{color:#bfdbfe;text-decoration:none}.back{justify-self:start}.agents{position:absolute;left:26px;top:26px}.eyebrow{color:#67e8f9;letter-spacing:.22em;font-size:12px;font-weight:950;text-transform:uppercase}.hero-card h1{font-size:clamp(48px,12vw,92px);letter-spacing:-.06em;margin:0}.hero-card p,.panel p,.project-tab small,.resource-row small{color:#cbd5e1;line-height:1.8}.notice,.create-panel{max-width:1180px;margin:14px auto 0;padding:16px}.create-panel{display:grid;gap:10px}input,textarea,select{width:100%;border:1px solid rgba(255,255,255,.13);border-radius:20px;background:rgba(15,23,42,.72);color:#fff;padding:14px;font:inherit;outline:none}textarea{min-height:86px}button{border:0;border-radius:18px;min-height:46px;padding:0 16px;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);color:#fff;font-weight:950}.layout{max-width:1180px;margin:16px auto;display:grid;grid-template-columns:300px 1fr;gap:16px}.sidebar,.panel{padding:16px}.project-tab{color:#fff;text-align:right;padding:14px;display:grid;gap:6px;margin-bottom:10px}.project-tab.active{outline:2px solid rgba(103,232,249,.75)}.workspace{display:grid;gap:16px}.project-hero{padding:24px;display:flex;justify-content:space-between;gap:20px}.project-hero h2{font-size:clamp(34px,7vw,62px);margin:4px 0;letter-spacing:-.05em}.score{text-align:center}.score b{font-size:52px}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stats-grid a{padding:18px;display:grid;gap:8px;text-decoration:none;color:#fff}.resource-grid,.pmp-grid,.pmp-kpis,.stage-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.resource-card,.stage{padding:14px}.resource-row,.result-box{border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:10px;background:rgba(15,23,42,.55);display:grid;gap:6px;margin-top:8px}.stage-head{display:grid;grid-template-columns:1fr 220px;gap:10px}.pmp-kpis span{background:rgba(255,255,255,.08);border-radius:14px;padding:8px;color:#dbeafe}.result-table{overflow:auto;margin-top:12px}.result-table table{width:100%;border-collapse:collapse;min-width:760px}.result-table th,.result-table td{border:1px solid rgba(255,255,255,.12);padding:10px;text-align:right;vertical-align:top}.result-table th{color:#67e8f9;background:rgba(59,130,246,.14)}.table-row-actions{display:flex;flex-wrap:wrap;gap:6px}.table-row-actions button{min-height:34px;border-radius:12px;padding:0 10px;font-size:12px}.linked-table-list{display:grid;gap:12px}.health-red{border-color:rgba(239,68,68,.7)}.health-yellow{border-color:rgba(245,158,11,.7)}.health-green{border-color:rgba(34,197,94,.7)}.health-gray{border-color:rgba(148,163,184,.5)}@media(max-width:900px){.layout,.stats-grid,.resource-grid,.pmp-grid,.pmp-kpis,.stage-meta,.stage-head{grid-template-columns:1fr}.agents{position:static;justify-self:start}}`;
