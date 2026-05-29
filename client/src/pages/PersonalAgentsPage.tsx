import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import type { Task } from '@/lib/localMemory';

type PersonalAgentId = 'assistant' | 'style' | 'fitness' | 'food' | 'shows' | 'image';

type AgentProfile = {
  id: PersonalAgentId;
  name: string;
  icon: string;
  promise: string;
  examples: string[];
  image?: boolean;
};

const agents: AgentProfile[] = [
  { id: 'assistant', name: 'المساعد الشخصي', icon: '🧑‍💼', promise: 'يكتب لك مسودات، يرتب مهامك، ويحول طلباتك إلى خطوات عمل.', examples: ['اكتب إيميل متابعة', 'رتب لي يومي', 'جهز جدول متابعة'] },
  { id: 'style', name: 'وكيل الملابس', icon: '👔', promise: 'ارفع صورة واكتب المناسبة ليقترح لك لبس وألوان مناسبة.', examples: ['لبس رسمي لاجتماع', 'تنسيق كاجوال', 'ألوان مناسبة للصورة'], image: true },
  { id: 'fitness', name: 'وكيل الرياضة', icon: '🏃', promise: 'يعطيك خطة نشاط وتمارين حسب وقتك ومستواك.', examples: ['مشي خفيف أسبوعي', 'تمارين منزلية 20 دقيقة', 'خطة رجوع للنشاط'] },
  { id: 'food', name: 'وكيل الأكل', icon: '🍽️', promise: 'يقترح وجبات وخيارات مطاعم حسب احتياجك.', examples: ['عشاء خفيف', 'أكل مناسب بعد المشي', 'خيارات صحية وسريعة'] },
  { id: 'shows', name: 'وكيل المسلسلات', icon: '🎬', promise: 'يقترح أفلام ومسلسلات حسب ذوقك ووقتك.', examples: ['مسلسل قصير', 'دراما قوية', 'شيء عائلي'] },
  { id: 'image', name: 'وكيل الصور', icon: '🖼️', promise: 'يحلل الصور ويعطيك اقتراحات عملية.', examples: ['حلل هذه الصورة', 'اقترح تحسينات', 'اعطني أفكار تصميم'], image: true },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function dateTimeForIcs(task: Task) {
  const date = task.dueDate || today();
  const time = task.dueTime || '09:00';
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return { start: fmt(start), end: fmt(end) };
}

function downloadIcs(task: Task) {
  const { start, end } = dateTimeForIcs(task);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Focus Flow//Tasks//AR',
    'BEGIN:VEVENT',
    `UID:${task.id}@focus-flow`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(task.title)}`,
    `DESCRIPTION:${escapeIcs(task.description || 'Focus Flow task')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${task.title || 'focus-flow-task'}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PersonalAgentsPage() {
  const memory = useLocalMemory();
  const [agentId, setAgentId] = useState<PersonalAgentId>('assistant');
  const [prompt, setPrompt] = useState('رتب لي أهم شيء أسويه الآن بناءً على مهامي');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ openaiConfigured?: boolean; model?: string } | null>(null);
  const [error, setError] = useState('');

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === agentId) || agents[0], [agentId]);
  const datedTasks = useMemo(() => memory.tasks.filter((task) => task.dueDate).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 8), [memory.tasks]);

  useEffect(() => {
    fetch('/api/agents/status').then((res) => res.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageDataUrl(await fileToDataUrl(file));
  }

  async function askAgent() {
    setBusy(true);
    setError('');
    setResult('');
    try {
      const response = await fetch('/api/agents/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          prompt,
          imageDataUrl,
          context: { projects: memory.projects, tasks: memory.tasks, notes: memory.notes },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'فشل تشغيل الوكيل');
      setResult(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setBusy(false);
    }
  }

  async function saveResultAsNote() {
    if (!result.trim()) return;
    await memory.saveNote({ title: `نتيجة ${selectedAgent.name}`, body: result, tags: ['agent', selectedAgent.id], pinned: false });
  }

  async function saveResultAsTask() {
    if (!result.trim()) return;
    await memory.saveTask({ title: `متابعة: ${selectedAgent.name}`, description: result.slice(0, 1200), priority: 'medium', status: 'todo', dueDate: today(), listName: 'AI Agents', recurrence: 'none' });
  }

  return (
    <main className="agents-shell" dir="rtl">
      <style>{styles}</style>
      <header className="hero-card">
        <a className="back" href="/">← الرجوع للرئيسية</a>
        <span className="eyebrow">Real OpenAI Agents</span>
        <h1>وكلاؤك الشخصيون</h1>
        <p>هذه الصفحة مربوطة بسيرفر التطبيق. عند إضافة OPENAI_API_KEY في Vercel سيعمل الوكيل الحقيقي ويستقبل النص والصور.</p>
        <div className="status-pill">{status?.openaiConfigured ? `OpenAI متصل · ${status.model}` : 'OpenAI غير مفعّل: أضف OPENAI_API_KEY في Vercel'}</div>
      </header>

      <section className="agent-grid">
        {agents.map((agent) => (
          <button key={agent.id} className={`agent-tile ${agent.id === agentId ? 'active' : ''}`} onClick={() => setAgentId(agent.id)}>
            <b>{agent.icon}</b>
            <strong>{agent.name}</strong>
            <small>{agent.promise}</small>
          </button>
        ))}
      </section>

      <section className="workspace">
        <div className="panel composer">
          <div className="section-title"><h2>{selectedAgent.icon} {selectedAgent.name}</h2><span>{selectedAgent.image ? 'يدعم الصور' : 'نص ومهام'}</span></div>
          <p>{selectedAgent.promise}</p>
          <div className="chips">{selectedAgent.examples.map((item) => <button key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="اكتب طلبك للوكيل..." />
          {selectedAgent.image && <label className="upload">ارفع صورة للوكيل<input type="file" accept="image/*" onChange={handleImage} /></label>}
          {imageDataUrl && <img className="preview" src={imageDataUrl} alt="الصورة المرفوعة" />}
          <button className="primary" disabled={busy} onClick={askAgent}>{busy ? 'جاري تشغيل الوكيل...' : 'شغّل الوكيل الحقيقي'}</button>
          {error && <div className="error">{error}</div>}
        </div>

        <div className="panel result">
          <div className="section-title"><h2>النتيجة</h2><span>OpenAI</span></div>
          <pre>{result || 'ستظهر نتيجة الوكيل هنا. لو ظهر خطأ OPENAI_API_KEY فالمفتاح لم يُضف في Vercel بعد.'}</pre>
          <div className="actions"><button onClick={saveResultAsNote}>حفظ كملاحظة</button><button onClick={saveResultAsTask}>تحويل لمهمة</button></div>
        </div>
      </section>

      <section className="panel calendar-panel">
        <div className="section-title"><h2>ربط التقويم السريع</h2><span>ICS</span></div>
        <p>أي مهمة لها تاريخ تقدر تضيفها لتقويم iPhone أو Google Calendar بتحميل ملف ICS.</p>
        <div className="task-list">
          {datedTasks.map((task) => <div key={task.id} className="task-row"><div><b>{task.title}</b><small>{task.dueDate} · {task.dueTime || 'بدون وقت'}</small></div><button onClick={() => downloadIcs(task)}>أضف للتقويم</button></div>)}
          {!datedTasks.length && <small>لا توجد مهام مؤرخة بعد.</small>}
        </div>
      </section>

      <section className="panel setup">
        <h2>كيف تفعل الربط الحقيقي؟</h2>
        <ol>
          <li>افتح Vercel ثم Project Settings.</li>
          <li>ادخل Environment Variables.</li>
          <li>أضف متغير باسم OPENAI_API_KEY وضع مفتاح OpenAI الخاص بك.</li>
          <li>اختياريًا أضف OPENAI_MODEL بقيمة gpt-4o-mini أو gpt-4o.</li>
          <li>اعمل Redeploy للمشروع.</li>
        </ol>
      </section>
    </main>
  );
}

const styles = `
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#060816}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0%,#1d2b6b 0,#080b18 40%,#04050b 100%);color:#f8fafc}.agents-shell{max-width:1080px;margin:auto;padding:20px 16px 80px}.hero-card,.panel,.agent-tile{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.04));border-radius:32px;box-shadow:0 24px 70px rgba(0,0,0,.3)}.hero-card{padding:26px;text-align:center;display:grid;gap:12px}.back{color:#bfdbfe;text-decoration:none;justify-self:start}.eyebrow{color:#a5b4fc;letter-spacing:.2em;text-transform:uppercase;font-size:12px}.hero-card h1{font-size:clamp(42px,10vw,78px);margin:0}.hero-card p{max-width:760px;margin:auto;color:#cbd5e1;line-height:1.8}.status-pill{display:inline-flex;justify-self:center;padding:11px 16px;border-radius:999px;background:rgba(59,130,246,.16);color:#bfdbfe}.agent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin:18px 0}.agent-tile{padding:18px;text-align:right;color:#fff;display:grid;gap:10px;min-height:165px}.agent-tile b{font-size:32px}.agent-tile strong{font-size:18px}.agent-tile small,.panel p,.task-row small{color:#cbd5e1;line-height:1.6}.agent-tile.active{outline:2px solid rgba(129,140,248,.8);background:linear-gradient(145deg,rgba(37,99,235,.32),rgba(124,58,237,.18))}.workspace{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:20px}.section-title{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.section-title h2{margin:0}.section-title span{color:#94a3b8}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.chips button,.actions button,.task-row button{border:0;color:#bfdbfe;background:rgba(59,130,246,.16);border-radius:999px;padding:10px 13px;font-weight:700}textarea{width:100%;min-height:160px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(15,23,42,.86);color:#fff;padding:16px;font:inherit;line-height:1.7;outline:none}.primary,.upload{margin-top:12px;width:100%;min-height:54px;border:0;border-radius:22px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;font-weight:900;display:grid;place-items:center}.primary:disabled{opacity:.65}.upload{position:relative;overflow:hidden}.upload input{position:absolute;inset:0;opacity:0}.preview{width:100%;max-height:320px;object-fit:cover;border-radius:22px;margin-top:12px;border:1px solid rgba(255,255,255,.12)}.error{margin-top:12px;border-radius:18px;background:rgba(239,68,68,.16);color:#fecaca;padding:12px}.result pre{white-space:pre-wrap;font-family:inherit;line-height:1.9;color:#e5e7eb;min-height:250px;margin:0}.actions{display:flex;gap:10px;margin-top:12px}.actions button{flex:1;min-height:48px}.calendar-panel,.setup{margin-top:16px}.task-list{display:grid;gap:10px}.task-row{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.68);padding:14px;border-radius:20px}.task-row div{display:grid;gap:4px}.setup li{margin-bottom:8px;color:#dbeafe}@media(max-width:760px){.agents-shell{padding:14px 12px 70px}.workspace{grid-template-columns:1fr}.hero-card{border-radius:28px}.agent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.agent-tile{min-height:150px;padding:14px}.task-row{align-items:stretch;flex-direction:column}.task-row button{width:100%;border-radius:16px}.actions{flex-direction:column}}
`;
