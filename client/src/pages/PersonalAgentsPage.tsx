import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Priority, Task } from '@/lib/localMemory';
import { createGmailDraft, createGoogleCalendarEvent, createGoogleSheet } from '@/lib/googleDriveCloud';

type PersonalAgentId = 'chief' | 'assistant' | 'operations' | 'calendar' | 'message' | 'excel' | 'finance' | 'learning';
type BackendAgentId = 'assistant';
type ActionType = 'create_task' | 'create_note' | 'calendar_file' | 'message_draft' | 'csv_file' | 'checklist' | 'open_service';
type AgentProfile = { id: PersonalAgentId; backend: BackendAgentId; name: string; mark: string; promise: string; examples: string[] };
type AgentAction = { id: string; type: ActionType; title: string; description: string; dueDate?: string; dueTime?: string; priority?: Priority; payload?: any; executed?: boolean; failed?: boolean };
type DirectoryContact = { id?: string; name: string; phone?: string; email?: string; website?: string; address?: string; mapsUrl?: string; category?: string; notes?: string; source?: string };

const DIRECTORY_KEY = 'focus-flow-directory-contacts';

const agents: AgentProfile[] = [
  { id: 'chief', backend: 'assistant', name: 'القائد العام', mark: '01', promise: 'يتخذ القرار ويقسمه إلى تنفيذ فعلي ومتابعة.', examples: ['قرر أهم 3 إجراءات اليوم ونفذها', 'رتب أولوياتي كمواعيد ومهام', 'حوّل المشروع إلى خطة تنفيذ'] },
  { id: 'assistant', backend: 'assistant', name: 'السكرتير', mark: '02', promise: 'يبحث، يحصر، ينظم، يكتب، ويجدول المتابعة.', examples: ['احصر عيادات أطفال الأنابيب في الرياض واتصل عليهم من 4 إلى 5', 'جهز رسالة رسمية مع موعد متابعة', 'اجمع أرقام جهات واتصل بها'] },
  { id: 'operations', backend: 'assistant', name: 'العمليات', mark: '03', promise: 'يفكك المشاريع إلى إجراءات تشغيل ومسؤوليات وتواريخ.', examples: ['قسم المشروع إلى مراحل تنفيذ', 'اعمل checklist للتشغيل', 'حدد المتعثر وخطة علاجه'] },
  { id: 'calendar', backend: 'assistant', name: 'التقويم', mark: '04', promise: 'يحول الكلام إلى مواعيد وتنبيهات وبلوكات عمل.', examples: ['جدول لي متابعة غدًا 9', 'رتب أسبوعي بمواعيد واضحة', 'أضف موعد اتصال من 4 إلى 5'] },
  { id: 'message', backend: 'assistant', name: 'الرسائل', mark: '05', promise: 'ينشئ مسودات Gmail ويربطها بتذكير متابعة.', examples: ['اكتب إيميل رسمي واحفظ متابعة', 'جهز رد مختصر', 'اكتب رسالة متابعة للعميل'] },
  { id: 'excel', backend: 'assistant', name: 'Excel', mark: '06', promise: 'ينشئ جداول متابعة ويفتح إجراءات مراجعتها.', examples: ['جهز جدول متابعة جهات', 'اعمل ملف مصاريف', 'نظم قائمة عملاء'] },
  { id: 'finance', backend: 'assistant', name: 'المال', mark: '07', promise: 'يرتب الديون والمصاريف كجداول ومواعيد دفع.', examples: ['رتب ديوني وخطة السداد', 'خطة سداد شهرية', 'جدول مصاريف مع تنبيهات'] },
  { id: 'learning', backend: 'assistant', name: 'التعلم', mark: '08', promise: 'يحول هدف التعلم إلى تدريب يومي واختبارات.', examples: ['علمني GitHub خلال أسبوع', 'خطة تعلم AI', 'اختبرني يوميًا'] },
];

function today() { return new Date().toISOString().slice(0, 10); }
function addDays(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function escapeIcs(text: string) { return String(text || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n'); }
function timeToMinutes(time: string) { const [h, m] = time.split(':').map(Number); return h * 60 + (m || 0); }
function minutesToTime(minutes: number) { const h = Math.floor(minutes / 60) % 24; const m = minutes % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
function dateTimeForIcs(date = today(), time = '09:00') { const start = new Date(`${date}T${time || '09:00'}:00`); const end = new Date(start.getTime() + 60 * 60 * 1000); const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); return { start: fmt(start), end: fmt(end) }; }
function downloadTextFile(filename: string, text: string, type: string) { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function downloadIcs(title: string, description: string, date?: string, time?: string) { const { start, end } = dateTimeForIcs(date || today(), time || '09:00'); const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Focus Flow//Agent Actions//AR', 'BEGIN:VEVENT', `UID:${uid()}@focus-flow`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escapeIcs(title)}`, `DESCRIPTION:${escapeIcs(description || 'Focus Flow action')}`, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'); downloadTextFile(`${title || 'focus-flow-calendar'}.ics`, ics, 'text/calendar;charset=utf-8'); }
function normalizeType(type: string): ActionType { if (type === 'calendar_event' || type === 'google_calendar') return 'calendar_file'; if (type === 'email_draft' || type === 'gmail_draft') return 'message_draft'; if (type === 'google_sheet' || type === 'sheet') return 'csv_file'; return ['create_task', 'create_note', 'calendar_file', 'message_draft', 'csv_file', 'checklist', 'open_service'].includes(type) ? type as ActionType : 'create_task'; }

function extractTimeRange(text: string) {
  const source = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const range = source.match(/(?:من\s*)?(?:الساعة\s*)?(\d{1,2})(?::(\d{2}))?\s*(صباح|ص|مساء|م|عصر)?\s*(?:إلى|الى|-|لـ|ل)\s*(?:الساعة\s*)?(\d{1,2})(?::(\d{2}))?\s*(صباح|ص|مساء|م|عصر)?/i);
  const single = source.match(/(?:الساعة\s*)?(\d{1,2})(?::(\d{2}))?\s*(صباح|ص|مساء|م|عصر)/i);
  if (!range && !single) return { start: '09:00', end: '10:00' };
  const toHour = (hRaw: string, mer?: string, base?: number) => { let h = Number(hRaw); const pm = /مساء|م|عصر/i.test(mer || '') || (!mer && base !== undefined && h <= base); const am = /صباح|ص/i.test(mer || ''); if (pm && h < 12) h += 12; if (am && h === 12) h = 0; return h; };
  if (range) { const h1 = toHour(range[1], range[3]); const m1 = Number(range[2] || 0); const h2 = toHour(range[4], range[6], h1); const m2 = Number(range[5] || 0); return { start: minutesToTime(h1 * 60 + m1), end: minutesToTime(Math.max(h2 * 60 + m2, h1 * 60 + m1 + 60)) }; }
  if (single) { const h = toHour(single[1], single[3]); const m = Number(single[2] || 0); return { start: minutesToTime(h * 60 + m), end: minutesToTime(h * 60 + m + 60) }; }
  return { start: '09:00', end: '10:00' };
}

function splitTimes(count: number, start: string, end: string) { const s = timeToMinutes(start); const e = Math.max(timeToMinutes(end), s + count * 10); const step = Math.max(10, Math.floor((e - s) / Math.max(count, 1))); return Array.from({ length: count }, (_, i) => minutesToTime(s + i * step)); }
function isDirectoryRequest(text: string) { return /احصر|ابحث|أرقام|ارقام|هواتف|هاتف|عيادات|شركات|مطاعم|مراكز|مستشفيات|عملاء|جهات|اتصل|اتصال|تواصل/i.test(text); }
function directoryQuery(prompt: string) { return prompt.replace(/(حط|ضع|سو|سوي|رتب|اتصل|اتصال|تذكير|تذكيرات|من الساعة.*|الساعة.*)/gi, '').trim() || prompt; }
function loadDirectory(): DirectoryContact[] { try { return JSON.parse(localStorage.getItem(DIRECTORY_KEY) || '[]'); } catch { return []; } }
function saveDirectory(items: DirectoryContact[]) { localStorage.setItem(DIRECTORY_KEY, JSON.stringify(items)); }
function appendDirectory(items: DirectoryContact[]) { const current = loadDirectory(); const withIds = items.map((item) => ({ ...item, id: item.id || uid(), source: item.source || 'Gemini' })); saveDirectory([...withIds, ...current]); return withIds; }

function fallbackActions(agent: AgentProfile, prompt: string, text = ''): AgentAction[] {
  const desc = text || prompt || 'طلب جديد';
  if (agent.id === 'finance') return [
    { id: uid(), type: 'csv_file', title: 'جدول مالي للتنفيذ', description: desc, dueDate: today(), priority: 'high', payload: { columns: ['البند', 'المبلغ', 'تاريخ الاستحقاق', 'الحالة', 'ملاحظات'], rows: [] } },
    { id: uid(), type: 'calendar_file', title: 'مراجعة الالتزامات المالية', description: 'راجع جدول السداد والمصاريف.', dueDate: addDays(1), dueTime: '18:00', priority: 'high' },
    { id: uid(), type: 'create_task', title: 'تحديث المصروفات والديون', description: desc, dueDate: today(), dueTime: '20:00', priority: 'medium' },
  ];
  if (agent.id === 'message') return [
    { id: uid(), type: 'message_draft', title: 'مسودة رسالة جاهزة', description: desc, dueDate: today(), priority: 'medium', payload: { subject: 'متابعة', body: desc } },
    { id: uid(), type: 'calendar_file', title: 'متابعة الرد على الرسالة', description: 'تحقق من الرد واتخذ الإجراء التالي.', dueDate: addDays(1), dueTime: '10:00', priority: 'medium' },
  ];
  if (agent.id === 'calendar') { const range = extractTimeRange(prompt); return [
    { id: uid(), type: 'calendar_file', title: 'موعد تنفيذ الطلب', description: desc, dueDate: today(), dueTime: range.start, priority: 'high' },
    { id: uid(), type: 'create_task', title: 'تجهيز ما قبل الموعد', description: desc, dueDate: today(), dueTime: minutesToTime(Math.max(0, timeToMinutes(range.start) - 30)), priority: 'medium' },
  ]; }
  if (agent.id === 'excel') return [
    { id: uid(), type: 'csv_file', title: 'جدول متابعة', description: desc, dueDate: today(), priority: 'high', payload: { columns: ['البند', 'المسؤول', 'التاريخ', 'الحالة', 'ملاحظات'], rows: [] } },
    { id: uid(), type: 'create_task', title: 'مراجعة الجدول وتحديثه', description: desc, dueDate: today(), dueTime: '17:00', priority: 'medium' },
  ];
  if (agent.id === 'learning') return [
    { id: uid(), type: 'create_task', title: 'درس اليوم', description: desc, dueDate: today(), dueTime: '20:00', priority: 'high' },
    { id: uid(), type: 'calendar_file', title: 'مراجعة واختبار قصير', description: 'راجع ما تعلمته واختبر نفسك.', dueDate: addDays(1), dueTime: '20:00', priority: 'medium' },
  ];
  return [
    { id: uid(), type: 'create_task', title: 'تنفيذ الطلب الأساسي', description: desc, dueDate: today(), dueTime: '09:00', priority: 'high' },
    { id: uid(), type: 'csv_file', title: 'جدول متابعة التنفيذ', description: desc, dueDate: today(), priority: 'medium', payload: { columns: ['الإجراء', 'الحالة', 'الموعد', 'الملاحظات'], rows: [] } },
    { id: uid(), type: 'calendar_file', title: 'مراجعة التنفيذ', description: desc, dueDate: addDays(1), dueTime: '10:00', priority: 'medium' },
  ];
}

function parseActions(text: string, agent: AgentProfile, prompt: string): AgentAction[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { const parsed = JSON.parse(match[0]); if (Array.isArray(parsed.actions)) return parsed.actions.map((a: any) => ({ id: uid(), type: normalizeType(a.type || 'create_task'), title: a.title || 'إجراء', description: a.description || parsed.guidance || text, dueDate: a.dueDate || '', dueTime: a.dueTime || '', priority: a.priority || 'medium', payload: a.payload || {} })); } catch {} }
  return fallbackActions(agent, prompt, text);
}

function normalizeServerActions(serverActions: any[] | null, agent: AgentProfile, prompt: string, text: string): AgentAction[] {
  const next = serverActions ? serverActions.map((a: any) => ({ id: uid(), type: normalizeType(a.type || 'create_task'), title: a.title || 'إجراء', description: a.description || text || prompt, dueDate: a.dueDate || '', dueTime: a.dueTime || '', priority: a.priority || 'medium', payload: a.payload || {} })) : parseActions(text, agent, prompt);
  if (!next.length || (next.length === 1 && next[0].type === 'create_note') || next.every((a) => /تحديد المطلوب|جمع البيانات/i.test(a.title))) return fallbackActions(agent, prompt, text);
  return next;
}

async function buildDirectoryExecution(prompt: string): Promise<{ result: string; actions: AgentAction[] } | null> {
  if (!isDirectoryRequest(prompt)) return null;
  const range = extractTimeRange(prompt);
  const date = today();
  const response = await fetch('/api/directory/gemini-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: directoryQuery(prompt) }) });
  const data = await response.json();
  if (!response.ok || !data.ok) return null;
  const contacts = appendDirectory((data.contacts || []).slice(0, 8));
  if (!contacts.length) return null;
  const times = splitTimes(contacts.length, range.start, range.end);
  const rows = contacts.map((c, i) => [c.name, c.phone || '', c.email || '', c.website || '', c.address || '', c.mapsUrl || '', times[i], 'لم يتم الاتصال', c.notes || 'تحقق من البيانات قبل الاتصال']);
  const actions: AgentAction[] = [
    { id: uid(), type: 'csv_file', title: 'جدول جهات الاتصال والمتابعة', description: `تم حصر ${contacts.length} جهة وحفظها في الدليل.`, dueDate: date, priority: 'high', payload: { columns: ['الجهة', 'الهاتف', 'البريد', 'الموقع', 'العنوان', 'الخريطة', 'وقت الاتصال', 'الحالة', 'ملاحظات'], rows } },
    ...contacts.map((c, i) => ({ id: uid(), type: 'calendar_file' as ActionType, title: `اتصل بـ ${c.name}`, description: `الهاتف: ${c.phone || 'غير متوفر - تحقق من الدليل'}\nالعنوان: ${c.address || '-'}\nالموقع: ${c.website || c.mapsUrl || '-'}\nملاحظات: ${c.notes || 'تحقق قبل الاتصال'}`, dueDate: date, dueTime: times[i], priority: 'high' as Priority, payload: { contact: c } })),
    { id: uid(), type: 'create_task', title: 'تحديث نتائج الاتصال في الدليل', description: 'بعد الاتصال، حدّث حالة كل جهة والنتيجة والملاحظات.', dueDate: date, dueTime: range.end, priority: 'medium' },
  ];
  return { result: `تم البحث عبر Gemini وحفظ ${contacts.length} جهة في الدليل، وإنشاء جدول ومواعيد اتصال من ${range.start} إلى ${range.end}.`, actions };
}

export default function PersonalAgentsPage() {
  const memory = useLocalMemory();
  const [agentId, setAgentId] = useState<PersonalAgentId>('chief');
  const [prompt, setPrompt] = useState('قرر أهم إجراء الآن ونفذه داخل النظام');
  const [result, setResult] = useState('');
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ geminiConfigured?: boolean; openaiConfigured?: boolean; model?: string } | null>(null);
  const [error, setError] = useState('');
  const selectedAgent = useMemo(() => agents.find((a) => a.id === agentId) || agents[0], [agentId]);
  const openTasks = useMemo(() => memory.tasks.filter((task) => task.status !== 'done').slice(0, 6), [memory.tasks]);
  const geminiReady = Boolean(status?.geminiConfigured || status?.openaiConfigured);
  useEffect(() => { fetch('/api/agents/status').then((res) => res.json()).then(setStatus).catch(() => setStatus(null)); }, []);

  async function executeAction(action: AgentAction, updateUi = true) {
    try {
      if (action.type === 'create_task' || action.type === 'checklist') await memory.saveTask({ title: action.title, description: action.description, priority: action.priority || 'medium', status: 'todo', dueDate: action.dueDate || today(), dueTime: action.dueTime || '', listName: selectedAgent.name, recurrence: 'none' });
      if (action.type === 'create_note') await memory.saveNote({ title: action.title, body: action.description, tags: ['agent', selectedAgent.id, action.type], pinned: false });
      if (action.type === 'message_draft') { try { await createGmailDraft({ to: action.payload?.to || '', subject: action.payload?.subject || action.title, body: action.payload?.body || action.description }); } catch {} await memory.saveNote({ title: `مسودة Gmail: ${action.title}`, body: action.payload?.body || action.description, tags: ['gmail', 'draft', selectedAgent.id], pinned: true }); }
      if (action.type === 'calendar_file') { const task = await memory.saveTask({ title: action.title, description: action.description, priority: action.priority || 'medium', status: 'todo', dueDate: action.dueDate || today(), dueTime: action.dueTime || '09:00', listName: selectedAgent.name, recurrence: 'none' }); try { await createGoogleCalendarEvent(task); } catch { downloadIcs(action.title, action.description, action.dueDate || today(), action.dueTime || '09:00'); } }
      if (action.type === 'csv_file') { const columns = action.payload?.columns || ['العنوان', 'الوصف']; const rows = action.payload?.rows || [[action.title, action.description]]; try { await createGoogleSheet({ title: action.title || 'Agent Sheet', columns, rows }); } catch { const csv = [columns, ...rows].map((row: any[]) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n'); downloadTextFile(`${action.title || 'agent-table'}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8'); } }
      if (action.type === 'open_service') window.location.href = '/system';
      if (updateUi) setActions((items) => items.map((item) => item.id === action.id ? { ...item, executed: true } : item));
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'فشل تنفيذ الإجراء'); throw err; }
  }

  async function executeActions(nextActions: AgentAction[]) {
    const executed: AgentAction[] = [];
    for (const action of nextActions) {
      try { await executeAction(action, false); executed.push({ ...action, executed: true }); }
      catch { executed.push({ ...action, failed: true }); }
    }
    setActions(executed);
  }

  async function askAgent() {
    setBusy(true); setError(''); setResult(''); setActions([]);
    try {
      const directoryPlan = ['assistant', 'chief', 'excel'].includes(selectedAgent.id) ? await buildDirectoryExecution(prompt) : null;
      if (directoryPlan) { await executeActions(directoryPlan.actions); setResult(directoryPlan.result); return; }
      const executablePrompt = `${prompt}\n\nأنت ${selectedAgent.name}. لا ترجع كلام فقط. نفذ حسب صفتك كوكيل. أرجع JSON يحتوي actions بأنواع create_task, create_note, calendar_file, message_draft, csv_file, checklist, open_service. إذا كان الطلب يتضمن حصر جهات أو أرقام أو اتصال فأنشئ جدول ومواعيد اتصال، وليس تذكير عام.`;
      const response = await fetch('/api/agents/personal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: selectedAgent.backend, prompt: executablePrompt, context: { projects: memory.projects, tasks: memory.tasks, notes: memory.notes } }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'فشل تشغيل الوكيل');
      const text = data.plan?.guidance || data.plan?.summary || data.text || '';
      const serverActions = Array.isArray(data.plan?.actions) ? data.plan.actions : null;
      const nextActions = normalizeServerActions(serverActions, selectedAgent, prompt, data.text || text);
      await executeActions(nextActions);
      setResult(text || data.text || 'تم إنشاء وتنفيذ الإجراءات تلقائيًا.');
    } catch (err) { setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف'); }
    finally { setBusy(false); }
  }

  async function executeAll() { await executeActions(actions.filter((item) => !item.executed)); }
  const hasPendingActions = actions.some((action) => !action.executed && !action.failed);

  return <main className="agents-shell" dir="rtl"><style>{styles}</style><header className="hero-card"><a className="back" href="/">← الرئيسية</a><a className="hub" href="/directory">الدليل</a><span className="eyebrow">Execution Agents</span><h1>الوكلاء التنفيذيون</h1><p>كل وكيل ينفذ حسب تخصصه: بحث، دليل، مهام، تقويم، جداول، رسائل، ومتابعة فعلية.</p><div className="status-pill">{geminiReady ? `Gemini متصل · ${status?.model || 'gemini-2.5-flash'}` : 'Gemini غير مفعّل: أضف GEMINI_API_KEY في Vercel'}</div></header><section className="agent-grid">{agents.map((agent) => <button key={agent.id} className={`agent-tile ${agent.id === agentId ? 'active' : ''}`} onClick={() => setAgentId(agent.id)}><b>{agent.mark}</b><strong>{agent.name}</strong><small>{agent.promise}</small></button>)}</section><section className="workspace"><div className="panel composer"><div className="section-title"><h2>{selectedAgent.name}</h2><span>ينفذ لا يذكّر فقط</span></div><p>{selectedAgent.promise}</p><div className="chips">{selectedAgent.examples.map((item) => <button key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="اكتب طلبًا تنفيذيًا: احصر، اكتب، جدول، اتصل، أنشئ ملف..." /><button className="primary" disabled={busy} onClick={askAgent}>{busy ? 'جاري التنفيذ...' : 'نفّذ كوكيل فعلي'}</button>{error && <div className="error">{error}</div>}</div><div className="panel result"><div className="section-title"><h2>نتيجة التنفيذ</h2><span>{actions.length} إجراء</span></div><pre>{result || 'اكتب طلبك، وسيقوم الوكيل بتنفيذ الإجراءات المناسبة حسب تخصصه.'}</pre>{hasPendingActions && <button className="primary" onClick={executeAll}>نفّذ المتبقي</button>}</div></section><section className="panel"><div className="section-title"><h2>الإجراءات المنفذة</h2><span>Tasks / Calendar / Sheets / Gmail / Directory</span></div><div className="action-list">{actions.map((action) => <article key={action.id} className={action.failed ? 'failed action-card' : action.executed ? 'done action-card' : 'action-card'}><div><b>{action.title}</b><p>{action.description}</p><small>{action.type} · {action.dueDate || 'بدون تاريخ'} · {action.dueTime || 'بدون وقت'} · {action.priority || 'medium'}</small></div><button disabled={action.executed} onClick={() => executeAction(action)}>{action.failed ? 'فشل' : action.executed ? 'تم' : 'نفّذ'}</button></article>)}{!actions.length && <small>لا توجد إجراءات بعد.</small>}</div></section><section className="panel"><div className="section-title"><h2>سياق من نظامك</h2><span>ذاكرة محلية</span></div><div className="task-list">{openTasks.map((task: Task) => <div key={task.id} className="task-row"><b>{task.title}</b><small>{task.dueDate || 'بدون تاريخ'} · {task.priority}</small></div>)}</div></section></main>;
}

const styles = `:root{color-scheme:dark;font-family:Cairo,-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#050816}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0%,rgba(37,99,235,.35),transparent 34%),radial-gradient(circle at 90% 8%,rgba(124,58,237,.32),transparent 30%),#050816;color:#f8fafc}.agents-shell{max-width:1180px;margin:auto;padding:18px 14px 90px}.hero-card,.panel,.agent-tile{border:1px solid rgba(255,255,255,.14);background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04));border-radius:34px;box-shadow:0 24px 80px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(18px)}.hero-card{padding:26px;text-align:center;display:grid;gap:12px;position:relative;overflow:hidden}.hero-card:before{content:"";position:absolute;inset:-120px 25% auto;width:380px;height:380px;border-radius:999px;background:rgba(6,182,212,.18);filter:blur(55px)}.back,.hub{position:relative;color:#bfdbfe;text-decoration:none}.back{justify-self:start}.hub{position:absolute;left:24px;top:24px}.eyebrow{color:#67e8f9;letter-spacing:.24em;text-transform:uppercase;font-size:12px}.hero-card h1{position:relative;font-size:clamp(42px,10vw,82px);letter-spacing:-.05em;margin:0}.hero-card p{position:relative;max-width:800px;margin:auto;color:#cbd5e1;line-height:1.9}.status-pill{position:relative;display:inline-flex;justify-self:center;padding:11px 18px;border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.28);color:#bbf7d0}.agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}.agent-tile{padding:16px;text-align:right;color:#fff;display:grid;gap:9px;min-height:150px;transition:.2s ease}.agent-tile:hover{transform:translateY(-4px);border-color:rgba(103,232,249,.45)}.agent-tile b{font-size:24px;color:#67e8f9}.agent-tile strong{font-size:17px}.agent-tile small,.panel p,.task-row small,.action-card small{color:#cbd5e1;line-height:1.55}.agent-tile.active{outline:2px solid rgba(103,232,249,.8);background:linear-gradient(145deg,rgba(37,99,235,.36),rgba(124,58,237,.2))}.workspace{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:20px;margin-top:16px}.section-title{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.section-title h2{margin:0}.section-title span{color:#94a3b8}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.chips button,.action-card button{border:0;color:#bfdbfe;background:rgba(59,130,246,.16);border-radius:999px;padding:10px 13px;font-weight:800}textarea{width:100%;min-height:155px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:rgba(15,23,42,.72);color:#fff;padding:16px;font:inherit;line-height:1.7;outline:none}.primary{margin-top:12px;width:100%;min-height:54px;border:0;border-radius:22px;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);color:white;font-weight:950;display:grid;place-items:center;box-shadow:0 16px 45px rgba(37,99,235,.28)}.primary:disabled,.action-card button:disabled{opacity:.75}.error{margin-top:12px;border-radius:18px;background:rgba(239,68,68,.16);color:#fecaca;padding:12px}.result pre{white-space:pre-wrap;font-family:inherit;line-height:1.9;color:#e5e7eb;min-height:250px;margin:0}.action-list,.task-list{display:grid;gap:10px}.action-card{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.6);padding:14px;border-radius:20px}.action-card.done{border-color:rgba(34,197,94,.5);background:rgba(22,101,52,.18)}.action-card.failed{border-color:rgba(239,68,68,.55);background:rgba(127,29,29,.22)}.action-card div{display:grid;gap:5px}.action-card p{margin:0}.action-card button{min-width:95px;color:#fff;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:16px}.task-row{display:grid;gap:4px;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.62);padding:14px;border-radius:18px}@media(max-width:760px){.agents-shell{padding:12px 10px 70px}.workspace{grid-template-columns:1fr}.agent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.agent-tile{min-height:142px;padding:13px}.hub{position:static;justify-self:start}.action-card{align-items:stretch;flex-direction:column}.action-card button{width:100%;min-height:46px}}`;
