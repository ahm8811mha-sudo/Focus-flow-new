import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Priority, Task } from '@/lib/localMemory';
import { createGmailDraft, createGoogleCalendarEvent, createGoogleSheet } from '@/lib/googleDriveCloud';

type PersonalAgentId = 'chief' | 'assistant' | 'operations' | 'calendar' | 'message' | 'excel' | 'style' | 'fitness' | 'food' | 'shows' | 'image' | 'finance' | 'shopping' | 'travel' | 'learning';
type BackendAgentId = 'assistant' | 'style' | 'fitness' | 'food' | 'shows' | 'image';
type ActionType = 'create_task' | 'create_note' | 'calendar_file' | 'message_draft' | 'csv_file' | 'checklist' | 'open_service';

type AgentProfile = { id: PersonalAgentId; backend: BackendAgentId; name: string; icon: string; promise: string; examples: string[]; image?: boolean };
type AgentAction = { id: string; type: ActionType; title: string; description: string; dueDate?: string; dueTime?: string; priority?: Priority; payload?: any; executed?: boolean };

const agents: AgentProfile[] = [
  { id: 'chief', backend: 'assistant', name: 'القائد العام', icon: '🧠', promise: 'يفهم الطلب ويوزع التنفيذ على بقية الوكلاء.', examples: ['قرر ماذا أفعل اليوم ونفّذ', 'رتب أولوياتي', 'حوّل الفوضى إلى خطة'] },
  { id: 'assistant', backend: 'assistant', name: 'السكرتير الشخصي', icon: '🧑‍💼', promise: 'ينشئ مهام وملاحظات ومسودات متابعة.', examples: ['اكتب مسودة متابعة', 'رتب لي يومي', 'اعمل خطة متابعة'] },
  { id: 'operations', backend: 'assistant', name: 'وكيل العمليات', icon: '⚙️', promise: 'يحوّل المشاريع إلى خطوات تنفيذية ومتابعة.', examples: ['قسم المشروع إلى خطوات', 'اعمل checklist للتشغيل', 'حدد المتعثر'] },
  { id: 'calendar', backend: 'assistant', name: 'وكيل التقويم', icon: '📅', promise: 'يحوّل الطلب إلى موعد ويرسله إلى Google Calendar.', examples: ['جدول لي المهمة غدًا 9 صباحًا', 'رتب أسبوعي', 'أضف متابعة للتقويم'] },
  { id: 'message', backend: 'assistant', name: 'وكيل الرسائل', icon: '✉️', promise: 'يجهز مسودات Gmail ورسائل متابعة.', examples: ['اكتب إيميل رسمي', 'جهز رسالة متابعة', 'اكتب رد مختصر'] },
  { id: 'excel', backend: 'assistant', name: 'وكيل Excel', icon: '📊', promise: 'ينشئ جداول ويرسلها إلى Google Sheets.', examples: ['جهز جدول متابعة', 'اعمل ملف مصاريف', 'نظم قائمة عملاء'] },
  { id: 'style', backend: 'style', name: 'وكيل الملابس', icon: '👔', promise: 'يحلل صورة أو مناسبة ويقترح لبس.', examples: ['اقترح لبس رسمي', 'حلل صورتي للبس', 'رتب الألوان'], image: true },
  { id: 'fitness', backend: 'fitness', name: 'وكيل الرياضة', icon: '🏃', promise: 'ينشئ خطة نشاط وتمارين عملية.', examples: ['خطة مشي أسبوعية', 'تمارين 20 دقيقة', 'ارجعني للنشاط'] },
  { id: 'food', backend: 'food', name: 'وكيل الأكل', icon: '🍽️', promise: 'يقترح وجبات ويحوّلها لقائمة.', examples: ['عشاء خفيف', 'خيارات صحية', 'قائمة أكل أسبوعية'] },
  { id: 'shows', backend: 'shows', name: 'وكيل المسلسلات', icon: '🎬', promise: 'يقترح مشاهدة حسب وقتك وذوقك.', examples: ['مسلسل قصير', 'فيلم اليوم', 'شيء عائلي'] },
  { id: 'image', backend: 'image', name: 'وكيل الصور', icon: '🖼️', promise: 'يحلل الصور ويخرج إجراءات.', examples: ['حلل هذه الصورة', 'ما الذي أعدله؟', 'اعطني أفكار تصميم'], image: true },
  { id: 'finance', backend: 'assistant', name: 'وكيل المال', icon: '💰', promise: 'ينظم المصاريف والديون كمهام وجداول.', examples: ['رتب ديوني', 'جدول مصاريف شهرية', 'خطة سداد'] },
  { id: 'shopping', backend: 'assistant', name: 'وكيل المشتريات', icon: '🛒', promise: 'يحوّل الاحتياج إلى مقارنة وقائمة شراء.', examples: ['قارن خيارات', 'اعمل قائمة مشتريات', 'وش الأفضل أشتري؟'] },
  { id: 'travel', backend: 'assistant', name: 'وكيل السفر', icon: '✈️', promise: 'يبني خطة سفر وقوائم وتجهيزات.', examples: ['جهز رحلة يومين', 'قائمة شنطة', 'خطة تنقلات'] },
  { id: 'learning', backend: 'assistant', name: 'وكيل التعلم', icon: '📚', promise: 'يحول هدف التعلم إلى خطة يومية.', examples: ['علمني أساسيات GitHub', 'خطة تعلم AI', 'اختبرني يوميًا'] },
];

function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function escapeIcs(text: string) { return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n'); }
function dateTimeForIcs(date = today(), time = '09:00') { const start = new Date(`${date}T${time || '09:00'}:00`); const end = new Date(start.getTime() + 60 * 60 * 1000); const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); return { start: fmt(start), end: fmt(end) }; }
function downloadTextFile(filename: string, text: string, type: string) { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function downloadIcs(title: string, description: string, date?: string, time?: string) { const { start, end } = dateTimeForIcs(date || today(), time || '09:00'); const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Focus Flow//Agent Actions//AR', 'BEGIN:VEVENT', `UID:${uid()}@focus-flow`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escapeIcs(title)}`, `DESCRIPTION:${escapeIcs(description || 'Focus Flow action')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'); downloadTextFile(`${title || 'focus-flow-calendar'}.ics`, ics, 'text/calendar;charset=utf-8'); }
async function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = reject; reader.readAsDataURL(file); }); }

function buildFallbackActions(agent: AgentProfile, prompt: string, text: string): AgentAction[] {
  const lower = `${prompt} ${agent.id}`.toLowerCase();
  const actions: AgentAction[] = [];
  actions.push({ id: uid(), type: 'create_note', title: `قرار ${agent.name}`, description: text || prompt, priority: 'medium' });
  if (lower.includes('excel') || lower.includes('جدول') || agent.id === 'excel' || agent.id === 'finance') actions.push({ id: uid(), type: 'csv_file', title: `جدول ${agent.name}`, description: 'إنشاء Google Sheet وجدول CSV احتياطي', payload: { columns: ['البند', 'الحالة', 'الموعد', 'ملاحظة'], rows: [['إجراء 1', 'جديد', today(), prompt], ['متابعة', 'قيد التنفيذ', today(), text.slice(0, 120)]] } });
  if (lower.includes('تقويم') || lower.includes('موعد') || lower.includes('جدول') || agent.id === 'calendar') actions.push({ id: uid(), type: 'calendar_file', title: prompt.slice(0, 50) || 'موعد من الوكيل', description: text, dueDate: today(), dueTime: '09:00', priority: 'medium' });
  if (lower.includes('ايميل') || lower.includes('إيميل') || lower.includes('رسالة') || lower.includes('email') || agent.id === 'message') actions.push({ id: uid(), type: 'message_draft', title: `مسودة ${agent.name}`, description: text || prompt, priority: 'medium', payload: { to: '', subject: `متابعة - ${agent.name}` } });
  actions.push({ id: uid(), type: 'create_task', title: `تنفيذ: ${prompt.slice(0, 45) || agent.name}`, description: text || prompt, dueDate: today(), priority: 'high' });
  return actions.slice(0, 5);
}

function normalizeType(type: string): ActionType {
  if (type === 'calendar_event' || type === 'google_calendar') return 'calendar_file';
  if (type === 'email_draft' || type === 'gmail_draft') return 'message_draft';
  if (type === 'google_sheet' || type === 'sheet') return 'csv_file';
  if (['create_task', 'create_note', 'calendar_file', 'message_draft', 'csv_file', 'checklist', 'open_service'].includes(type)) return type as ActionType;
  return 'create_task';
}

function tryParseActions(text: string, agent: AgentProfile, prompt: string): AgentAction[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.actions)) return parsed.actions.map((a: any) => ({ id: uid(), type: normalizeType(a.type || 'create_task'), title: a.title || 'إجراء من الوكيل', description: a.description || parsed.guidance || text, dueDate: a.dueDate || '', dueTime: a.dueTime || '', priority: a.priority || 'medium', payload: a.payload || {} }));
    } catch {}
  }
  return buildFallbackActions(agent, prompt, text);
}

export default function PersonalAgentsPage() {
  const memory = useLocalMemory();
  const [agentId, setAgentId] = useState<PersonalAgentId>('chief');
  const [prompt, setPrompt] = useState('قرر أهم إجراء الآن ونفذه داخل النظام');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [result, setResult] = useState('');
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ openaiConfigured?: boolean; model?: string } | null>(null);
  const [error, setError] = useState('');

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === agentId) || agents[0], [agentId]);
  const openTasks = useMemo(() => memory.tasks.filter((task) => task.status !== 'done').slice(0, 6), [memory.tasks]);

  useEffect(() => { fetch('/api/agents/status').then((res) => res.json()).then(setStatus).catch(() => setStatus(null)); }, []);

  async function handleImage(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setImageDataUrl(await fileToDataUrl(file)); }

  async function askAgent() {
    setBusy(true); setError(''); setResult(''); setActions([]);
    const executablePrompt = `${prompt}\n\nأجب بقرار مختصر ثم اقترح إجراءات تنفيذية داخل التطبيق. إن استطعت أرجع JSON يحتوي actions بأنواع: create_task, create_note, calendar_file, message_draft, csv_file, checklist, open_service. عند طلب التقويم استخدم calendar_file. عند طلب إيميل استخدم message_draft. عند طلب Excel استخدم csv_file.`;
    try {
      const response = await fetch('/api/agents/personal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: selectedAgent.backend, prompt: executablePrompt, imageDataUrl, context: { projects: memory.projects, tasks: memory.tasks, notes: memory.notes } }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'فشل تشغيل الوكيل');
      const text = data.plan?.guidance || data.plan?.summary || data.text || '';
      const serverActions = Array.isArray(data.plan?.actions) ? data.plan.actions : null;
      const nextActions = serverActions ? serverActions.map((a: any) => ({ id: uid(), type: normalizeType(a.type || 'create_task'), title: a.title || 'إجراء', description: a.description || text, dueDate: a.dueDate || '', dueTime: a.dueTime || '', priority: a.priority || 'medium', payload: a.payload || {} })) : tryParseActions(data.text || text, selectedAgent, prompt);
      setResult(text || data.text || 'تم توليد إجراءات تنفيذية.');
      setActions(nextActions);
    } catch (err) { setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف'); }
    finally { setBusy(false); }
  }

  async function executeAction(action: AgentAction) {
    try {
      if (action.type === 'create_task' || action.type === 'checklist') {
        await memory.saveTask({ title: action.title, description: action.description, priority: action.priority || 'medium', status: 'todo', dueDate: action.dueDate || today(), dueTime: action.dueTime || '', listName: selectedAgent.name, recurrence: 'none' });
      }
      if (action.type === 'create_note') {
        await memory.saveNote({ title: action.title, body: action.description, tags: ['agent', selectedAgent.id, action.type], pinned: false });
      }
      if (action.type === 'message_draft') {
        await createGmailDraft({ to: action.payload?.to || '', subject: action.payload?.subject || action.title, body: action.description });
        await memory.saveNote({ title: `مسودة Gmail: ${action.title}`, body: action.description, tags: ['gmail', 'draft', selectedAgent.id], pinned: true });
      }
      if (action.type === 'calendar_file') {
        const task = await memory.saveTask({ title: action.title, description: action.description, priority: action.priority || 'medium', status: 'todo', dueDate: action.dueDate || today(), dueTime: action.dueTime || '09:00', listName: selectedAgent.name, recurrence: 'none' });
        try { await createGoogleCalendarEvent(task); } catch { downloadIcs(action.title, action.description, action.dueDate || today(), action.dueTime || '09:00'); }
      }
      if (action.type === 'csv_file') {
        const columns = action.payload?.columns || ['العنوان', 'الوصف'];
        const rows = action.payload?.rows || [[action.title, action.description]];
        try { await createGoogleSheet({ title: action.title || 'Agent Sheet', columns, rows }); }
        catch {
          const csv = [columns, ...rows].map((row: any[]) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
          downloadTextFile(`${action.title || 'agent-table'}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
        }
      }
      if (action.type === 'open_service') window.location.href = '/system';
      setActions((items) => items.map((item) => item.id === action.id ? { ...item, executed: true } : item));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تنفيذ الإجراء');
    }
  }

  async function executeAll() { for (const action of actions.filter((item) => !item.executed)) await executeAction(action); }

  return (
    <main className="agents-shell" dir="rtl"><style>{styles}</style>
      <header className="hero-card"><a className="back" href="/">← الرئيسية</a><a className="hub" href="/system">مركز النظام</a><span className="eyebrow">Agent Command Center</span><h1>الوكلاء التنفيذيون</h1><p>الوكيل هنا لا يرد فقط. يقرر ويحوّل قراره إلى إجراءات قابلة للتنفيذ داخل التطبيق وGoogle.</p><div className="status-pill">{status?.openaiConfigured ? `OpenAI متصل · ${status.model}` : 'OpenAI غير مفعّل: أضف OPENAI_API_KEY في Vercel'}</div></header>
      <section className="agent-grid">{agents.map((agent) => <button key={agent.id} className={`agent-tile ${agent.id === agentId ? 'active' : ''}`} onClick={() => setAgentId(agent.id)}><b>{agent.icon}</b><strong>{agent.name}</strong><small>{agent.promise}</small></button>)}</section>
      <section className="workspace"><div className="panel composer"><div className="section-title"><h2>{selectedAgent.icon} {selectedAgent.name}</h2><span>{selectedAgent.image ? 'يدعم الصور' : 'ينفذ إجراءات'}</span></div><p>{selectedAgent.promise}</p><div className="chips">{selectedAgent.examples.map((item) => <button key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="اطلب من الوكيل قرار وتنفيذ..." />{selectedAgent.image && <label className="upload">ارفع صورة<input type="file" accept="image/*" onChange={handleImage} /></label>}{imageDataUrl && <img className="preview" src={imageDataUrl} alt="الصورة المرفوعة" />}<button className="primary" disabled={busy} onClick={askAgent}>{busy ? 'جاري التفكير والتنفيذ...' : 'اطلب قرار + إجراءات'}</button>{error && <div className="error">{error}</div>}</div>
      <div className="panel result"><div className="section-title"><h2>قرار الوكيل</h2><span>{actions.length} إجراء</span></div><pre>{result || 'اكتب طلبك، وسيحوّله الوكيل إلى إجراءات تنفيذية.'}</pre>{actions.length > 0 && <button className="primary" onClick={executeAll}>نفّذ كل الإجراءات</button>}</div></section>
      <section className="panel"><div className="section-title"><h2>إجراءات قابلة للتنفيذ</h2><span>Tasks / Gmail / Sheets / Calendar</span></div><div className="action-list">{actions.map((action) => <article key={action.id} className={action.executed ? 'done action-card' : 'action-card'}><div><b>{action.title}</b><p>{action.description}</p><small>{action.type} · {action.dueDate || 'بدون تاريخ'} · {action.priority || 'medium'}</small></div><button onClick={() => executeAction(action)}>{action.executed ? 'تم' : 'نفّذ'}</button></article>)}{!actions.length && <small>لا توجد إجراءات بعد.</small>}</div></section>
      <section className="panel"><div className="section-title"><h2>سياق من نظامك</h2><span>ذاكرة محلية</span></div><div className="task-list">{openTasks.map((task: Task) => <div key={task.id} className="task-row"><b>{task.title}</b><small>{task.dueDate || 'بدون تاريخ'} · {task.priority}</small></div>)}</div></section>
    </main>
  );
}

const styles = `
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#060816}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0%,#1d2b6b 0,#080b18 40%,#04050b 100%);color:#f8fafc}.agents-shell{max-width:1120px;margin:auto;padding:18px 14px 90px}.hero-card,.panel,.agent-tile{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.04));border-radius:32px;box-shadow:0 24px 70px rgba(0,0,0,.3)}.hero-card{padding:24px;text-align:center;display:grid;gap:10px;position:relative}.back,.hub{color:#bfdbfe;text-decoration:none}.back{justify-self:start}.hub{position:absolute;left:24px;top:24px}.eyebrow{color:#a5b4fc;letter-spacing:.2em;text-transform:uppercase;font-size:12px}.hero-card h1{font-size:clamp(40px,10vw,76px);margin:0}.hero-card p{max-width:780px;margin:auto;color:#cbd5e1;line-height:1.8}.status-pill{display:inline-flex;justify-self:center;padding:11px 16px;border-radius:999px;background:rgba(59,130,246,.16);color:#bfdbfe}.agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:18px 0}.agent-tile{padding:16px;text-align:right;color:#fff;display:grid;gap:9px;min-height:150px;border:1px solid rgba(255,255,255,.12)}.agent-tile b{font-size:30px}.agent-tile strong{font-size:17px}.agent-tile small,.panel p,.task-row small,.action-card small{color:#cbd5e1;line-height:1.55}.agent-tile.active{outline:2px solid rgba(129,140,248,.8);background:linear-gradient(145deg,rgba(37,99,235,.32),rgba(124,58,237,.18))}.workspace{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:20px;margin-top:16px}.section-title{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.section-title h2{margin:0}.section-title span{color:#94a3b8}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.chips button,.action-card button{border:0;color:#bfdbfe;background:rgba(59,130,246,.16);border-radius:999px;padding:10px 13px;font-weight:700}textarea{width:100%;min-height:155px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(15,23,42,.86);color:#fff;padding:16px;font:inherit;line-height:1.7;outline:none}.primary,.upload{margin-top:12px;width:100%;min-height:54px;border:0;border-radius:22px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;font-weight:900;display:grid;place-items:center}.primary:disabled{opacity:.65}.upload{position:relative;overflow:hidden}.upload input{position:absolute;inset:0;opacity:0}.preview{width:100%;max-height:320px;object-fit:cover;border-radius:22px;margin-top:12px;border:1px solid rgba(255,255,255,.12)}.error{margin-top:12px;border-radius:18px;background:rgba(239,68,68,.16);color:#fecaca;padding:12px}.result pre{white-space:pre-wrap;font-family:inherit;line-height:1.9;color:#e5e7eb;min-height:250px;margin:0}.action-list,.task-list{display:grid;gap:10px}.action-card{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.68);padding:14px;border-radius:20px}.action-card.done{border-color:rgba(34,197,94,.5);background:rgba(22,101,52,.18)}.action-card div{display:grid;gap:5px}.action-card p{margin:0}.action-card button{min-width:95px;color:#fff;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:16px}.task-row{display:grid;gap:4px;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.68);padding:14px;border-radius:18px}@media(max-width:760px){.agents-shell{padding:12px 10px 70px}.workspace{grid-template-columns:1fr}.agent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.agent-tile{min-height:142px;padding:13px}.hub{position:static;justify-self:start}.action-card{align-items:stretch;flex-direction:column}.action-card button{width:100%;min-height:46px}}
`;
