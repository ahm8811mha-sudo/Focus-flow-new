import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Banknote, Bot, BriefcaseBusiness, CheckCircle2, ChevronLeft, CircleAlert, FileCheck2, Lightbulb, PauseCircle, PlayCircle, Send, ShieldCheck, XCircle } from 'lucide-react';
import { canClose, companyStages, createIdea, departments, departmentLabel, loadCompanyIdeas, makeWorkOrders, saveCompanyIdeas, stageLabel, type CompanyIdea, type CompanyStage, type Department, type WorkOrder } from '@/lib/companyWorkflow';
import './company-os.css';

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });

function statusClass(stage: CompanyStage) { return ['closed', 'rejected'].includes(stage) ? 'complete' : ['postponed', 'funding', 'decision', 'proof'].includes(stage) ? 'waiting' : 'active'; }

export default function CompanyOSPage() {
  const [ideas, setIdeas] = useState<CompanyIdea[]>([]);
  const [activeId, setActiveId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [budget, setBudget] = useState('');
  const [risk, setRisk] = useState<CompanyIdea['risk']>('medium');
  const [dueDate, setDueDate] = useState(today());
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>(['procurement', 'operations']);
  const [postponeReason, setPostponeReason] = useState('');
  const [reminderDate, setReminderDate] = useState(today());
  const [proofOrderId, setProofOrderId] = useState('');
  const [proofTitle, setProofTitle] = useState('');
  const [proofReference, setProofReference] = useState('');

  useEffect(() => { const stored = loadCompanyIdeas(); setIdeas(stored); setActiveId(stored[0]?.id || ''); }, []);
  const active = ideas.find((idea) => idea.id === activeId) || ideas[0];
  const pendingDecisions = ideas.filter((idea) => idea.stage === 'decision').length;
  const pendingFunding = ideas.filter((idea) => idea.stage === 'funding').length;
  const evidenceNeeded = ideas.reduce((count, idea) => count + idea.workOrders.filter((order) => order.requiresProof && !order.proof.length).length, 0);

  function persist(next: CompanyIdea[], focusId = activeId) { setIdeas(next); saveCompanyIdeas(next); setActiveId(focusId); }
  function updateActive(mutator: (idea: CompanyIdea) => CompanyIdea) { if (!active) return; persist(ideas.map((idea) => idea.id === active.id ? { ...mutator(idea), updatedAt: new Date().toISOString() } : idea)); }
  function log(idea: CompanyIdea, outcome: CompanyIdea['decisions'][number]['outcome'], note: string) { return { ...idea, decisions: [{ id: uid('decision'), outcome, note, createdAt: stamp() }, ...idea.decisions] }; }

  function submitIdea() {
    if (!title.trim()) return;
    const idea = createIdea({ title: title.trim(), description: description.trim(), expectedValue: value.trim(), risk, budget: Number(budget) || 0, departments: selectedDepartments, decisionDueDate: dueDate });
    persist([idea, ...ideas], idea.id);
    setTitle(''); setDescription(''); setValue(''); setBudget(''); setSelectedDepartments(['procurement', 'operations']);
  }
  function moveToDecision() { updateActive((idea) => log({ ...idea, stage: 'decision' }, 'postponed', 'اكتملت الدراسة الأولية. مطلوب قرار المالك قبل إنشاء أوامر العمل.')); }
  function approveDecision() { updateActive((idea) => log({ ...idea, stage: 'funding' }, 'approved', 'تم اعتماد الفكرة مبدئيًا. متوقف الآن على الاعتماد المالي.')); }
  function rejectDecision() { updateActive((idea) => log({ ...idea, stage: 'rejected' }, 'rejected', 'تم رفض الفكرة. لا توجد أوامر عمل أو صرف مسموح.')); }
  function postpone() {
    if (!postponeReason.trim()) return;
    updateActive((idea) => log({ ...idea, stage: 'postponed', postponementReason: postponeReason.trim(), reminderDate }, 'postponed', `تأجيل: ${postponeReason.trim()} · تذكير ${reminderDate}`));
    setPostponeReason('');
  }
  function resumeDecision() { updateActive((idea) => ({ ...idea, stage: 'decision' })); }
  function approveFunding() { updateActive((idea) => log({ ...idea, stage: 'execution', workOrders: makeWorkOrders(idea) }, 'funded', `اعتماد مالي بقيمة ${idea.budget.toLocaleString('ar-SA')} ر.س. تم إنشاء أوامر العمل وتوجيهها تلقائيًا.`)); }
  function setOrderStatus(orderId: string, status: WorkOrder['status']) { updateActive((idea) => ({ ...idea, workOrders: idea.workOrders.map((order) => order.id === orderId ? { ...order, status } : order) })); }
  function addProof() {
    if (!proofOrderId || !proofTitle.trim() || !proofReference.trim()) return;
    updateActive((idea) => ({ ...idea, workOrders: idea.workOrders.map((order) => order.id === proofOrderId ? { ...order, status: 'verified', proof: [{ id: uid('proof'), title: proofTitle.trim(), reference: proofReference.trim(), createdAt: stamp() }, ...order.proof] } : order) }));
    setProofTitle(''); setProofReference(''); setProofOrderId('');
  }
  function requestClosure() { if (!active || !canClose(active)) return; updateActive((idea) => log({ ...idea, stage: 'closed' }, 'closed', 'تم الإغلاق بعد التحقق من إثباتات الأعمال الخارجية المطلوبة.')); }

  return <main className="company-shell" dir="rtl">
    <header className="company-hero">
      <div><a className="back" href="/">← الرئيسية</a><span className="eyebrow"><BriefcaseBusiness size={15} /> COMPANY OPERATING SYSTEM</span><h1>من الفكرة إلى نتيجة مثبتة.</h1><p>مركز واحد لإصدار الأفكار، الدراسة، القرار، التمويل، أوامر العمل، والإثبات. لا يعامل النظام الخطة كأنها تنفيذ.</p></div>
      <div className="truth-card"><ShieldCheck size={30} /><b>قاعدة الحقيقة</b><span>لا إغلاق لأي عمل خارجي بلا إثبات محفوظ.</span></div>
    </header>

    <section className="company-metrics">
      <Metric icon={<Lightbulb />} label="أفكار نشطة" value={ideas.filter((idea) => !['closed', 'rejected'].includes(idea.stage)).length} href="#ideas" />
      <Metric icon={<CircleAlert />} label="قرارات مطلوبة" value={pendingDecisions} warning />
      <Metric icon={<Banknote />} label="اعتمادات مالية" value={pendingFunding} warning />
      <Metric icon={<FileCheck2 />} label="إثباتات ناقصة" value={evidenceNeeded} danger={evidenceNeeded > 0} />
    </section>

    <section className="idea-composer">
      <div className="section-heading"><div><span>IDEA INTAKE</span><h2>إصدار فكرة جديدة</h2></div><small>يصدر رقمًا موحدًا ويبدأ بالدراسة فقط</small></div>
      <div className="idea-grid"><label>اسم الفكرة<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: خط إنتاج جديد" /></label><label>القيمة المتوقعة<input value={value} onChange={(event) => setValue(event.target.value)} placeholder="العائد أو أثر الفكرة" /></label><label>الميزانية التقديرية (ر.س)<input inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="0" /></label><label>موعد القرار<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label className="wide">المشكلة أو الفرصة<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="ما المشكلة التي تحلها الفكرة؟ وما النتيجة المطلوبة؟" /></label><label>درجة المخاطرة<select value={risk} onChange={(event) => setRisk(event.target.value as CompanyIdea['risk'])}><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option></select></label><div className="department-picker"><span>التوجيه بعد الاعتماد</span><div>{departments.filter(([key]) => key !== 'finance').map(([key, meta]) => <label key={key}><input type="checkbox" checked={selectedDepartments.includes(key)} onChange={() => setSelectedDepartments((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} /> {meta.label}</label>)}</div></div></div>
      <button className="primary-action" onClick={submitIdea}><Send size={17} /> إصدار الفكرة للدراسة</button>
    </section>

    <section className="company-layout" id="ideas">
      <aside className="idea-list"><div className="section-heading"><div><span>PORTFOLIO</span><h2>سجل الأفكار</h2></div><small>{ideas.length}</small></div>{ideas.map((idea) => <button key={idea.id} className={`idea-row ${idea.id === active?.id ? 'selected' : ''}`} onClick={() => setActiveId(idea.id)}><span className={`status-dot ${statusClass(idea.stage)}`} /><div><b>{idea.title}</b><small>{idea.number} · {stageLabel(idea.stage)}</small></div><ChevronLeft size={17} /></button>)}{!ideas.length && <div className="empty-state">لم تصدر أي فكرة بعد.</div>}</aside>

      <section className="company-workspace">{active ? <>
        <div className="idea-title"><div><span>{active.number}</span><h2>{active.title}</h2><p>{active.description || 'لم تُضف تفاصيل بعد.'}</p></div><span className={`stage-badge ${statusClass(active.stage)}`}>{stageLabel(active.stage)}</span></div>
        <div className="lifecycle">{companyStages.map((step, index) => { const current = companyStages.findIndex((item) => item.id === active.stage); const reached = active.stage === 'closed' ? true : index <= current; return <div key={step.id} className={reached ? 'reached' : ''}><i>{index + 1}</i><span>{step.label}</span></div>; })}</div>
        <section className="decision-dossier"><div className="section-heading"><div><span>DECISION DOSSIER</span><h3>ملف القرار</h3></div><small>لا يفتح التنفيذ من هذه البطاقة</small></div><div className="dossier-grid"><Dossier label="الهدف" value={active.study.objective} /><Dossier label="الفائدة" value={active.study.benefit} /><Dossier label="المخاطر" value={active.study.risk} /><Dossier label="توصية النظام" value={active.study.recommendation} /></div></section>

        {active.stage === 'study' && <section className="action-panel"><Bot /><div><b>الدراسة جاهزة للمراجعة</b><p>لا توجد أوامر عمل أو اعتماد صرف حتى الآن.</p></div><button onClick={moveToDecision}>إرسال إلى مركز القرار</button></section>}
        {active.stage === 'decision' && <section className="decision-actions"><div><h3>قرار المالك مطلوب</h3><p>الاعتماد ينقل الفكرة إلى المالية فقط؛ لا يبدأ العمل قبل اعتماد الميزانية.</p></div><div><button className="approve" onClick={approveDecision}><CheckCircle2 size={16} /> اعتماد الفكرة</button><button className="reject" onClick={rejectDecision}><XCircle size={16} /> رفض</button></div><PostponeFields reason={postponeReason} setReason={setPostponeReason} reminder={reminderDate} setReminder={setReminderDate} onPostpone={postpone} /></section>}
        {active.stage === 'funding' && <section className="action-panel finance"><Banknote /><div><b>الاعتماد المالي هو البوابة التالية</b><p>الميزانية المطلوبة: {active.budget.toLocaleString('ar-SA')} ر.س. اعتمادها ينشئ أوامر عمل للأقسام المطلوبة.</p></div><button onClick={approveFunding}>اعتماد الميزانية وإنشاء أوامر العمل</button></section>}
        {active.stage === 'postponed' && <section className="postponed-card"><PauseCircle /><div><b>الفكرة مؤجلة</b><p>{active.postponementReason} · تذكير: {active.reminderDate}</p></div><button onClick={resumeDecision}>إعادتها لمركز القرار</button></section>}
        {active.workOrders.length > 0 && <section className="work-orders"><div className="section-heading"><div><span>WORK ORDERS</span><h3>أوامر العمل</h3></div><small>توجيه واضح + إثبات قبل الإغلاق</small></div>{active.workOrders.map((order) => <article key={order.id} className="work-order"><div className="order-top"><span className="department">{departmentLabel(order.department)}</span><span className={`order-status ${order.status}`}>{order.status === 'verified' ? 'مثبت' : order.status === 'in_progress' ? 'قيد التنفيذ' : order.status === 'awaiting_proof' ? 'بانتظار إثبات' : 'جديد'}</span></div><h4>{order.title}</h4><p>{order.external ? 'عمل خارجي: يلزم إثبات قبل الإغلاق.' : 'عمل داخلي: يوثق ضمن سجل التنفيذ.'}</p><div className="order-actions">{order.status === 'queued' && <button onClick={() => setOrderStatus(order.id, 'in_progress')}><PlayCircle size={15} /> بدء التنفيذ</button>}{order.status === 'in_progress' && <button onClick={() => setOrderStatus(order.id, order.requiresProof ? 'awaiting_proof' : 'verified')}>طلب/تسجيل النتيجة</button>}{order.requiresProof && order.status !== 'verified' && <button className="proof-button" onClick={() => setProofOrderId(order.id)}><FileCheck2 size={15} /> إضافة إثبات</button>}{order.proof.map((proof) => <small key={proof.id} className="proof-line"><BadgeCheck size={14} /> {proof.title}: {proof.reference}</small>)}</div></article>)}</section>}
        {proofOrderId && <section className="proof-form"><div><h3>توثيق إثبات التنفيذ</h3><p>اكتب رقم العرض أو الفاتورة أو رابط النتيجة أو مرجع الخطاب. هذا ليس تنفيذًا؛ بل توثيق قابل للمراجعة.</p></div><input value={proofTitle} onChange={(event) => setProofTitle(event.target.value)} placeholder="نوع الإثبات: فاتورة، رابط حملة، خطاب..." /><input value={proofReference} onChange={(event) => setProofReference(event.target.value)} placeholder="الرابط أو الرقم المرجعي" /><button onClick={addProof}>حفظ الإثبات</button><button className="plain" onClick={() => setProofOrderId('')}>إلغاء</button></section>}
        {active.stage === 'execution' && <section className="closure-gate"><div><ShieldCheck /><div><h3>بوابة الإغلاق</h3><p>{canClose(active) ? 'اكتملت متطلبات الإثبات للأعمال الخارجية.' : 'لا يمكن الإغلاق الآن: يوجد عمل خارجي بلا إثبات.'}</p></div></div><button disabled={!canClose(active)} onClick={requestClosure}>إغلاق المشروع بإثبات</button></section>}
        <section className="audit-log"><div className="section-heading"><div><span>AUDIT TRAIL</span><h3>سجل القرار</h3></div><small>لا يحذف السجل عند التأجيل أو الرفض</small></div>{active.decisions.map((decision) => <div key={decision.id}><span className={decision.outcome}>{decision.outcome}</span><p>{decision.note}</p><small>{decision.createdAt}</small></div>)}</section>
      </> : <div className="empty-workspace"><Lightbulb size={34} /><h2>ابدأ بإصدار فكرة</h2><p>ستنتقل إلى الدراسة، وليس إلى التنفيذ مباشرة.</p></div>}</section>
    </section>
  </main>;
}

function Metric({ icon, label, value, warning, danger }: { icon: React.ReactNode; label: string; value: number; warning?: boolean; danger?: boolean; href?: string }) { return <article className={`metric-card ${danger ? 'danger' : warning ? 'warning' : ''}`}>{icon}<span>{label}</span><b>{value}</b></article>; }
function Dossier({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><p>{value}</p></article>; }
function PostponeFields({ reason, setReason, reminder, setReminder, onPostpone }: { reason: string; setReason: (value: string) => void; reminder: string; setReminder: (value: string) => void; onPostpone: () => void }) { return <div className="postpone-fields"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب التأجيل (إلزامي)" /><input type="date" value={reminder} onChange={(event) => setReminder(event.target.value)} /><button onClick={onPostpone}>تأجيل مع تذكير</button></div>; }
