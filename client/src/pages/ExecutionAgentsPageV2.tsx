import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Priority } from '@/lib/localMemory';
import { createGmailDraft, createGoogleCalendarEvent, createGoogleSheet } from '@/lib/googleDriveCloud';
import { addExecutionLog } from '@/lib/executionLog';
import { upsertTable } from '@/lib/internalTables';

type AgentId = 'chief' | 'assistant' | 'style' | 'finance' | 'message' | 'calendar' | 'excel' | 'operations' | 'learning';
type ActionType = 'create_task' | 'calendar_file' | 'csv_file' | 'message_draft' | 'create_note';
type Action = { id: string; type: ActionType; title: string; description: string; dueDate?: string; dueTime?: string; priority?: Priority; payload?: any; executed?: boolean; failed?: boolean };
type Agent = { id: AgentId; name: string; icon: string; promise: string; examples: string[] };
type Msg = { id: string; role: 'user' | 'agent'; text: string; at: string };
type Session = { id: string; agentId: AgentId; title: string; icon: string; messages: Msg[]; actions: Action[]; result: string; createdAt: string; updatedAt: string };

const SESSION_KEY = 'focus-flow-agent-sessions-v2';
const DIRECTORY_KEY = 'focus-flow-directory-contacts';

const agents: Agent[] = [
  { id: 'chief', name: 'القائد العام', icon: '🧠', promise: 'يفهم الهدف ويختار الأدوات وينفذ ويحفظ تقرير.', examples: ['رتب يومي ونفذ أهم الإجراءات', 'حوّل هذا المشروع لخطة تنفيذ'] },
  { id: 'assistant', name: 'السكرتير', icon: '🗂️', promise: 'يبحث ويحصر وينظم المتابعات.', examples: ['احصر عيادات أطفال الأنابيب في الرياض من 4 إلى 5', 'ليش ما ظهر البريد في الجدول؟'] },
  { id: 'style', name: 'الستايل', icon: '👔', promise: 'يحلل الصورة ويجهز قائمة مقارنة.', examples: ['حلل الصورة وابحث عن مشابه', 'رتب النتائج من الأرخص للأغلى'] },
  { id: 'finance', name: 'المال', icon: '💳', promise: 'ينشئ خطة مالية وجداول متابعة.', examples: ['رتب ديوني وخطة السداد', 'اشرح لي ليش رتبتها بهذا الشكل'] },
  { id: 'message', name: 'الرسائل', icon: '✉️', promise: 'ينشئ مسودات ومتابعات.', examples: ['اكتب إيميل رسمي واحفظ متابعة', 'عدّل الصياغة وخليها أكثر رسمية'] },
  { id: 'calendar', name: 'التقويم', icon: '📅', promise: 'ينشئ مواعيد وتنبيهات.', examples: ['جدول لي متابعة غدًا 9', 'وين ظهر الموعد؟'] },
  { id: 'excel', name: 'الجداول', icon: '📊', promise: 'ينشئ جداول داخل التطبيق.', examples: ['جهز جدول متابعة', 'أضف أعمدة الحالة والمسؤول والملاحظات'] },
  { id: 'operations', name: 'العمليات', icon: '⚙️', promise: 'يقسم العمل لمراحل ومتابعة.', examples: ['قسم المشروع إلى مراحل', 'اشرح لي الخطة'] },
  { id: 'learning', name: 'التعلم', icon: '🎓', promise: 'ينشئ خطة تعلم ومراجعة.', examples: ['علمني GitHub خلال أسبوع', 'اختبرني على الدرس السابق'] },
];

function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }
function titleOf(text: string) { return text.trim().replace(/\s+/g, ' ').slice(0, 46) || 'محادثة جديدة'; }
function loadSessions(): Session[] { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]'); } catch { return []; } }
function saveSessions(items: Session[]) { localStorage.setItem(SESSION_KEY, JSON.stringify(items)); }
function isExecution(text: string) { return /نفذ|نفّذ|سو|اعمل|أنشئ|انشئ|أضف|اضف|عدّل|عدل|غيّر|غير|احذف|رتب|جدول|موعد|مسودة|اكتب|احصر|ابحث|قارن|حلل|احفظ|خطط|قسم|قسّم/i.test(text); }
function isChatOnly(text: string, hasActions: boolean) { return /^(ليش|لماذا|كيف|وين|أين|وش|ما|ماذا|هل|اشرح|وضح|يعني|متى)/i.test(text.trim()) || (hasActions && !isExecution(text)); }
function normalizeType(type: string): ActionType { if (['calendar_event', 'google_calendar'].includes(type)) return 'calendar_file'; if (['google_sheet', 'sheet', 'shopping_table', 'create_table'].includes(type)) return 'csv_file'; if (['email_draft', 'gmail_draft'].includes(type)) return 'message_draft'; return ['create_task', 'calendar_file', 'csv_file', 'message_draft', 'create_note'].includes(type) ? type as ActionType : 'create_task'; }
function ensureRows(action: Action): Action { if (action.type !== 'csv_file') return action; const columns = Array.isArray(action.payload?.columns) && action.payload.columns.length ? action.payload.columns : ['البند', 'الوصف', 'الحالة', 'ملاحظات']; const rows = Array.isArray(action.payload?.rows) && action.payload.rows.length ? action.payload.rows : [[action.title, action.description, 'جديد', 'يمكن تعديله من نفس المحادثة']]; return { ...action, payload: { ...(action.payload || {}), columns, rows } }; }
function toActions(raw: any[], text: string, prompt: string): Action[] { return raw.map((a) => ensureRows({ id: uid(), type: normalizeType(a.type || 'create_task'), title: a.title || 'إجراء', description: a.description || text || prompt, dueDate: a.dueDate || '', dueTime: a.dueTime || '', priority: a.priority || 'medium', payload: a.payload || {} })); }
function fallback(agent: Agent, prompt: string): Action[] { if (agent.id === 'excel' || agent.id === 'finance') return [{ id: uid(), type: 'csv_file', title: 'جدول تنفيذ', description: prompt, priority: 'medium', payload: { columns: ['البند', 'الوصف', 'الحالة'], rows: [[prompt, 'تم إنشاؤه بواسطة الوكيل', 'جديد']] } }]; if (agent.id === 'message') return [{ id: uid(), type: 'message_draft', title: 'مسودة رسالة', description: prompt, priority: 'medium', payload: { subject: 'متابعة', body: prompt } }]; return [{ id: uid(), type: 'create_task', title: 'تنفيذ الطلب', description: prompt, dueDate: today(), priority: 'medium' }]; }
function saveDirectory(items: any[]) { const old = JSON.parse(localStorage.getItem(DIRECTORY_KEY) || '[]'); const next = items.map((x) => ({ ...x, id: x.id || uid(), source: x.source || 'Gemini', status: x.status || 'جديد', lastContact: '', nextFollowUp: '' })); localStorage.setItem(DIRECTORY_KEY, JSON.stringify([...next, ...old])); }
function isDirectoryRequest(text: string) { return /احصر|ابحث|أرقام|ارقام|هواتف|هاتف|عيادات|شركات|مطاعم|مراكز|عملاء|جهات|تواصل/i.test(text); }

export default function ExecutionAgentsPageV2() {
  const memory = useLocalMemory();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState('');
  const [agentId, setAgentId] = useState<AgentId>('assistant');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const agent = useMemo(() => agents.find((a) => a.id === agentId) || agents[0], [agentId]);
  const active = sessions.find((s) => s.id === activeId && s.agentId === agentId) || null;
  const agentSessions = sessions.filter((s) => s.agentId === agentId);
  const openTasks = useMemo(() => memory.tasks.filter((task) => task.status !== 'done').slice(0, 5), [memory.tasks]);

  useEffect(() => { const saved = loadSessions(); setSessions(saved); setActiveId(saved[0]?.id || ''); }, []);
  function persist(next: Session[], id: string) { setSessions(next); saveSessions(next); setActiveId(id); }
  function makeSession(text = ''): Session { return { id: uid(), agentId, title: text ? titleOf(text) : 'محادثة جديدة', icon: agent.icon, messages: [], actions: [], result: '', createdAt: now(), updatedAt: now() }; }
  function upsert(session: Session) { const exists = sessions.some((s) => s.id === session.id); persist(exists ? sessions.map((s) => s.id === session.id ? session : s) : [session, ...sessions], session.id); }
  function removeSession(id: string) { const next = sessions.filter((s) => s.id !== id); persist(next, next.find((s) => s.agentId === agentId)?.id || ''); }

  async function execute(action: Action) {
    const safe = ensureRows(action);
    if (safe.type === 'create_task') await memory.saveTask({ title: safe.title, description: safe.description, priority: safe.priority || 'medium', status: 'todo', dueDate: safe.dueDate || today(), dueTime: safe.dueTime || '', listName: agent.name, recurrence: 'none' });
    if (safe.type === 'create_note') await memory.saveNote({ title: safe.title, body: safe.description, tags: ['agent', agent.id], pinned: false });
    if (safe.type === 'calendar_file') { const task = await memory.saveTask({ title: safe.title, description: safe.description, priority: safe.priority || 'medium', status: 'todo', dueDate: safe.dueDate || today(), dueTime: safe.dueTime || '09:00', listName: agent.name, recurrence: 'none' }); try { await createGoogleCalendarEvent(task); } catch { await memory.saveNote({ title: `موعد محفوظ: ${safe.title}`, body: `${safe.description}\n${safe.dueDate || today()} ${safe.dueTime || '09:00'}`, tags: ['calendar', 'agent'], pinned: true }); } }
    if (safe.type === 'message_draft') { try { await createGmailDraft({ to: safe.payload?.to || '', subject: safe.payload?.subject || safe.title, body: safe.payload?.body || safe.description }); } catch {} await memory.saveNote({ title: `مسودة: ${safe.title}`, body: safe.payload?.body || safe.description, tags: ['draft', 'agent'], pinned: true }); }
    if (safe.type === 'csv_file') { const table = upsertTable({ title: safe.title, columns: safe.payload?.columns || ['البند', 'الوصف'], rows: safe.payload?.rows || [[safe.title, safe.description]], source: agent.name, notes: safe.description }); try { await createGoogleSheet({ title: table.title, columns: table.columns, rows: table.rows }); } catch { /* يبقى محفوظًا داخليًا */ } }
  }

  async function runActions(session: Session, goal: string, summary: string, actions: Action[]) {
    const done: Action[] = [];
    const failed: string[] = [];
    for (const action of actions.map(ensureRows)) { try { await execute(action); done.push({ ...action, executed: true }); } catch { done.push({ ...action, failed: true }); failed.push(action.title); } }
    const reply = `${summary}\n\nتم تنفيذ ${done.filter((a) => a.executed).length} إجراء. ${failed.length ? `فشل: ${failed.join(', ')}` : 'الجداول تحفظ داخل /tables ولا يتم تنزيل ملفات تلقائيًا.'}`;
    const updated: Session = { ...session, messages: [...session.messages, { id: uid(), role: 'agent', text: reply, at: now() }], actions: done, result: summary, updatedAt: now(), title: session.title === 'محادثة جديدة' ? titleOf(goal) : session.title };
    upsert(updated);
    addExecutionLog({ agentName: agent.name, goal, status: failed.length ? 'needs_user' : 'done', summary, results: done.filter((a) => a.executed).map((a) => `${a.title} (${a.type})`), failures: failed, nextSteps: ['راجع النتائج في المهام/التقويم/الدليل/الجداول/سجل التنفيذ.'] });
  }

  async function directoryPlan(text: string) {
    const res = await fetch('/api/directory/gemini-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text }) });
    const data = await res.json();
    if (!res.ok || !data.ok) return null;
    const contacts = (data.contacts || []).slice(0, 10);
    saveDirectory(contacts);
    const rows = contacts.length ? contacts.map((c: any) => [c.name, c.phone || '', c.email || '', c.website || '', c.address || '', c.mapsUrl || '', 'جديد', c.notes || 'تحقق قبل الاعتماد']) : [[text, '', '', '', '', '', 'يحتاج بحث إضافي', 'لم ترجع نتائج كافية']];
    return { summary: `تم حفظ ${contacts.length} جهة في الدليل وإنشاء جدول داخلي للنتائج.`, actions: [{ id: uid(), type: 'csv_file' as ActionType, title: 'جدول نتائج البحث', description: 'جدول جهات محفوظ داخل التطبيق.', priority: 'high' as Priority, payload: { columns: ['الجهة', 'الهاتف', 'البريد', 'الموقع', 'العنوان', 'الخريطة', 'الحالة', 'ملاحظات'], rows } }] };
  }

  async function chatReply(session: Session, text: string) {
    const previous = session.actions.length ? `\nالإجراءات السابقة:\n${session.actions.map((a) => `${a.title} - ${a.type}`).join('\n')}` : '';
    const conversation = session.messages.map((m) => `${m.role === 'user' ? 'المستخدم' : 'الوكيل'}: ${m.text}`).join('\n');
    const r = await fetch('/api/agents/personal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: 'assistant', prompt: `${conversation}${previous}\n\nرسالة متابعة فقط: ${text}\nأجب شرحًا فقط ولا تنشئ actions.` }) });
    const data = await r.json();
    return data.plan?.guidance || data.plan?.summary || data.text || 'هذه رسالة متابعة فقط، ولم أنفذ إجراء جديد.';
  }

  async function send() {
    const text = prompt.trim();
    if (!text) return;
    setBusy(true); setError('');
    const base = active || makeSession(text);
    const session: Session = { ...base, title: base.messages.length ? base.title : titleOf(text), messages: [...base.messages, { id: uid(), role: 'user', text, at: now() }], updatedAt: now() };
    upsert(session);
    try {
      if (isChatOnly(text, session.actions.length > 0)) {
        const reply = await chatReply(session, text);
        upsert({ ...session, messages: [...session.messages, { id: uid(), role: 'agent', text: reply, at: now() }], result: reply, updatedAt: now() });
        setPrompt(''); return;
      }
      let plan: { summary: string; actions: Action[] } | null = null;
      if (!session.actions.length && ['assistant', 'chief', 'excel'].includes(agent.id) && isDirectoryRequest(text)) plan = await directoryPlan(text);
      if (!plan) {
        const previous = session.actions.length ? `\nالإجراءات السابقة:\n${session.actions.map((a) => `${a.title} | ${a.type}`).join('\n')}` : '';
        const r = await fetch('/api/agents/personal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: 'assistant', prompt: `${session.messages.map((m) => `${m.role}: ${m.text}`).join('\n')}${previous}\n\nأنت ${agent.name}. إذا كان الطلب تنفيذًا فارجع JSON actions مع summary. لا تنشئ جدولًا فارغًا. الجداول داخلية.` }) });
        const data = await r.json();
        const summary = data.plan?.guidance || data.plan?.summary || data.text || 'تم تنفيذ الطلب.';
        plan = { summary, actions: Array.isArray(data.plan?.actions) ? toActions(data.plan.actions, summary, text) : fallback(agent, text) };
      }
      await runActions(session, text, plan.summary, plan.actions.length ? plan.actions : fallback(agent, text));
      setPrompt('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير معروف';
      setError(msg);
      upsert({ ...session, messages: [...session.messages, { id: uid(), role: 'agent', text: `فشل التنفيذ: ${msg}`, at: now() }], updatedAt: now() });
    } finally { setBusy(false); }
  }

  return <main className="agents-shell" dir="rtl"><style>{styles}</style><header className="hero-card"><a className="back" href="/">← الرئيسية</a><a className="hub" href="/execution">سجل التنفيذ</a><span className="eyebrow">Agent Workspaces V2</span><h1>الوكلاء التنفيذيون</h1><p>الأوامر تنفذ، والأسئلة تظل محادثة. الجداول محفوظة داخل التطبيق.</p></header><section className="agent-grid">{agents.map((a) => <button key={a.id} className={`agent-tile ${a.id === agentId ? 'active' : ''}`} onClick={() => { setAgentId(a.id); const first = sessions.find((s) => s.agentId === a.id); setActiveId(first?.id || ''); }}><b>{a.icon}</b><strong>{a.name}</strong><small>{a.promise}</small></button>)}</section><section className="layout"><aside className="sessions-panel"><div className="section-title"><h2>المحادثات</h2><button onClick={() => upsert(makeSession())}>+</button></div>{agentSessions.map((s) => <div key={s.id} className={`session-card ${s.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(s.id)}><span>{s.icon}</span><div><b>{s.title}</b><small>{new Date(s.updatedAt).toLocaleString('ar-SA')}</small></div><button onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}>حذف</button></div>)}{!agentSessions.length && <small>اكتب طلبك وسيتم إنشاء محادثة تلقائيًا.</small>}</aside><section className="workspace"><div className="panel"><h2>{agent.icon} {agent.name}</h2><p>{agent.promise}</p><div className="chips">{agent.examples.map((x) => <button key={x} onClick={() => setPrompt(x)}>{x}</button>)}</div><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="اكتب أمر تنفيذ أو سؤال متابعة..." /><button className="primary" disabled={busy} onClick={send}>{busy ? 'جاري...' : active ? 'إرسال' : 'أنشئ محادثة وأرسل'}</button>{error && <div className="error">{error}</div>}</div><div className="panel"><h2>المحادثة</h2><div className="chat-box">{active?.messages.map((m) => <div key={m.id} className={`msg ${m.role}`}>{m.text}</div>)}{!active && <small>لا توجد محادثة مفتوحة.</small>}</div></div></section></section><section className="panel"><div className="section-title"><h2>آخر الإجراءات</h2><a className="mini-link" href="/tables">فتح الجداول</a></div><div className="action-list">{active?.actions.map((a) => <article key={a.id} className={a.failed ? 'failed action-card' : a.executed ? 'done action-card' : 'action-card'}><div><b>{a.title}</b><p>{a.description}</p><small>{a.type} · {a.dueDate || 'بدون تاريخ'} · {a.dueTime || 'بدون وقت'} {a.type === 'csv_file' ? `· صفوف: ${a.payload?.rows?.length || 0}` : ''}</small></div><button disabled>{a.failed ? 'فشل' : 'تم'}</button></article>)}{!active?.actions.length && <small>لا توجد إجراءات تنفيذية في هذه المحادثة.</small>}</div></section><section className="panel"><h2>مهام مفتوحة</h2><div className="task-list">{openTasks.map((t) => <div key={t.id} className="task-row"><b>{t.title}</b><small>{t.dueDate || 'بدون تاريخ'} · {t.priority}</small></div>)}</div></section></main>;
}

const styles = `:root{color-scheme:dark;font-family:Cairo,-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#050816}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0%,rgba(37,99,235,.35),transparent 34%),radial-gradient(circle at 90% 8%,rgba(124,58,237,.32),transparent 30%),#050816;color:#f8fafc}.agents-shell{max-width:1180px;margin:auto;padding:18px 14px 90px}.hero-card,.panel,.agent-tile,.sessions-panel,.session-card{border:1px solid rgba(255,255,255,.14);background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04));border-radius:34px;box-shadow:0 24px 80px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(18px)}.hero-card{padding:26px;text-align:center;display:grid;gap:12px;position:relative;overflow:hidden}.back,.hub,.mini-link{position:relative;color:#bfdbfe;text-decoration:none}.back{justify-self:start}.hub{position:absolute;left:24px;top:24px}.eyebrow{color:#67e8f9;letter-spacing:.24em;text-transform:uppercase;font-size:12px}.hero-card h1{font-size:clamp(42px,10vw,82px);letter-spacing:-.05em;margin:0}.hero-card p,.panel p,.task-row small,.action-card small,.session-card small{color:#cbd5e1;line-height:1.6}.agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:18px 0}.agent-tile{padding:15px;text-align:right;color:#fff;display:grid;gap:8px;min-height:136px}.agent-tile b{font-size:24px}.agent-tile.active{outline:2px solid rgba(103,232,249,.8);background:linear-gradient(145deg,rgba(37,99,235,.36),rgba(124,58,237,.2))}.layout{display:grid;grid-template-columns:320px 1fr;gap:16px}.sessions-panel,.panel{padding:18px}.section-title{display:flex;justify-content:space-between;align-items:center;gap:12px}.section-title button{border:0;border-radius:14px;width:42px;height:42px;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);color:#fff;font-weight:900}.session-card{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px;margin-top:10px;border-radius:22px;cursor:pointer;box-shadow:none}.session-card.active{outline:2px solid rgba(103,232,249,.75)}.session-card span{font-size:22px}.session-card b{display:block;font-size:14px}.session-card button{border:0;border-radius:12px;padding:8px 10px;background:rgba(239,68,68,.18);color:#fecaca;font-weight:900}.workspace{display:grid;grid-template-columns:1fr 1fr;gap:16px}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.chips button,.action-card button{border:0;color:#bfdbfe;background:rgba(59,130,246,.16);border-radius:999px;padding:10px 13px;font-weight:800}textarea{width:100%;min-height:155px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:rgba(15,23,42,.72);color:#fff;padding:16px;font:inherit;line-height:1.7;outline:none}.primary{margin-top:12px;width:100%;min-height:54px;border:0;border-radius:22px;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);color:white;font-weight:950;display:grid;place-items:center}.error{margin-top:12px;border-radius:18px;background:rgba(239,68,68,.16);color:#fecaca;padding:12px}.chat-box{display:grid;gap:10px;max-height:430px;overflow:auto}.msg{padding:12px 14px;border-radius:18px;line-height:1.7;white-space:pre-wrap}.msg.user{background:rgba(59,130,246,.18);border:1px solid rgba(59,130,246,.25)}.msg.agent{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.22)}.action-list,.task-list{display:grid;gap:10px}.action-card{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.6);padding:14px;border-radius:20px}.action-card.done{border-color:rgba(34,197,94,.5);background:rgba(22,101,52,.18)}.action-card.failed{border-color:rgba(239,68,68,.55);background:rgba(127,29,29,.22)}.action-card div{display:grid;gap:5px}.action-card p{margin:0}.task-row{display:grid;gap:4px;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.62);padding:14px;border-radius:18px}@media(max-width:900px){.agents-shell{padding:12px 10px 70px}.layout,.workspace{grid-template-columns:1fr}.agent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hub{position:static;justify-self:start}.action-card{align-items:stretch;flex-direction:column}}`;
