import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import {
  backupToGoogleDrive,
  connectGoogleDrive,
  createGoogleCalendarEvent,
  disconnectGoogleDrive,
  getGoogleClientId,
  getStoredDriveToken,
  restoreFromGoogleDrive,
  setGoogleClientId,
  syncTasksToGoogleCalendar,
} from '@/lib/googleDriveCloud';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function SystemHubPage() {
  const memory = useLocalMemory();
  const [clientId, setClientIdState] = useState(getGoogleClientId());
  const [googleConnected, setGoogleConnected] = useState(Boolean(getStoredDriveToken()));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [openaiStatus, setOpenaiStatus] = useState<{ openaiConfigured?: boolean; model?: string } | null>(null);

  const datedTasks = useMemo(() => memory.tasks.filter((task) => task.dueDate && task.status !== 'done'), [memory.tasks]);
  const urgentTasks = useMemo(() => memory.tasks.filter((task) => task.status !== 'done' && (task.priority === 'urgent' || task.priority === 'high')), [memory.tasks]);

  useEffect(() => {
    fetch('/api/agents/status').then((res) => res.json()).then(setOpenaiStatus).catch(() => setOpenaiStatus(null));
  }, []);

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      setBusy(true);
      setMessage(`جاري تنفيذ: ${label}`);
      await action();
      setGoogleConnected(Boolean(getStoredDriveToken()));
      await memory.refresh();
      setMessage(`تم: ${label}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'حدث خطأ غير معروف');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="system-shell" dir="rtl">
      <style>{styles}</style>
      <header className="hero-card">
        <a className="back" href="/">← الرجوع للرئيسية</a>
        <span className="eyebrow">Focus Flow Operating System</span>
        <h1>مركز النظام والخدمات</h1>
        <p>هنا تجمع الربط السحابي، OpenAI، Google Calendar، Google Drive، والنسخ الاحتياطي. هذا هو قلب النظام وليس مجرد تصميم.</p>
      </header>

      <section className="status-grid">
        <div className="status-card"><b>OpenAI</b><strong>{openaiStatus?.openaiConfigured ? 'متصل' : 'غير مفعل'}</strong><small>{openaiStatus?.model || 'أضف OPENAI_API_KEY في Vercel'}</small></div>
        <div className="status-card"><b>Google</b><strong>{googleConnected ? 'متصل' : 'غير متصل'}</strong><small>Drive + Calendar Events</small></div>
        <div className="status-card"><b>مهام مؤرخة</b><strong>{datedTasks.length}</strong><small>جاهزة للمزامنة مع التقويم</small></div>
        <div className="status-card"><b>أولوية عالية</b><strong>{urgentTasks.length}</strong><small>تحتاج متابعة اليوم</small></div>
      </section>

      <section className="panel">
        <div className="section-title"><h2>Google Cloud Integration</h2><span>Drive + Calendar</span></div>
        <p>هذا الربط يستخدم Google OAuth Client ID من جهة الواجهة. لازم تضيف Client ID وتسمح بالنطاقات الخاصة بـ Drive و Calendar.</p>
        <label>Google OAuth Client ID<input value={clientId} onChange={(event) => setClientIdState(event.target.value)} placeholder="ضع Google OAuth Client ID هنا" /></label>
        <div className="actions">
          <button disabled={busy} onClick={() => { setGoogleClientId(clientId); setMessage('تم حفظ Google Client ID'); }}>حفظ Client ID</button>
          <button disabled={busy} onClick={() => run('ربط Google', connectGoogleDrive)}>ربط Google</button>
          <button disabled={busy} onClick={() => run('نسخ احتياطي إلى Drive', backupToGoogleDrive)}>نسخ Drive</button>
          <button disabled={busy} onClick={() => confirm('سيتم استبدال البيانات المحلية بآخر نسخة محفوظة. متأكد؟') && run('استعادة من Drive', restoreFromGoogleDrive)}>استعادة Drive</button>
          <button disabled={busy || !datedTasks.length} onClick={() => run('مزامنة كل المهام المؤرخة مع Google Calendar', () => syncTasksToGoogleCalendar(memory.tasks))}>مزامنة التقويم</button>
          <button className="ghost" onClick={() => { disconnectGoogleDrive(); setGoogleConnected(false); setMessage('تم فصل Google'); }}>فصل Google</button>
        </div>
        {message && <div className="message">{message}</div>}
      </section>

      <section className="panel">
        <div className="section-title"><h2>المهام والتقويم</h2><span>Google Calendar</span></div>
        <div className="task-list">
          {datedTasks.slice(0, 12).map((task) => (
            <div className="task-row" key={task.id}>
              <div><b>{task.title}</b><small>{task.dueDate || today()} · {task.dueTime || '09:00'} · {task.priority}</small></div>
              <button disabled={busy} onClick={() => run(`إضافة ${task.title} إلى التقويم`, () => createGoogleCalendarEvent(task))}>أضف للتقويم</button>
            </div>
          ))}
          {!datedTasks.length && <small>لا توجد مهام مؤرخة. أضف تاريخًا للمهمة أولًا.</small>}
        </div>
      </section>

      <section className="panel setup">
        <h2>ما الذي أصبح حقيقيًا الآن؟</h2>
        <ul>
          <li>OpenAI يعمل من السيرفر عبر OPENAI_API_KEY وليس من المتصفح.</li>
          <li>Google Drive يرفع ويستعيد نسخة احتياطية.</li>
          <li>Google Calendar يضيف المهام المؤرخة إلى التقويم الأساسي.</li>
          <li>صفحة الوكلاء تستقبل نص وصورة وتربط الرد بمهام وملاحظات.</li>
        </ul>
        <h2>ما الذي يحتاج إعداد منك؟</h2>
        <ul>
          <li>في Vercel أضف OPENAI_API_KEY ثم Redeploy.</li>
          <li>في Google Cloud فعّل Google Drive API و Google Calendar API.</li>
          <li>أنشئ OAuth Client ID للويب وأضف رابط Vercel ضمن Authorized JavaScript origins.</li>
          <li>ضع Client ID في هذا المركز واضغط ربط Google.</li>
        </ul>
      </section>
    </main>
  );
}

const styles = `
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;background:#060816}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0%,#1d2b6b 0,#080b18 42%,#04050b 100%);color:#f8fafc}.system-shell{max-width:1100px;margin:auto;padding:20px 16px 80px}.hero-card,.panel,.status-card{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.04));border-radius:32px;box-shadow:0 24px 70px rgba(0,0,0,.3)}.hero-card{padding:28px;text-align:center;display:grid;gap:12px}.back{color:#bfdbfe;text-decoration:none;justify-self:start}.eyebrow{color:#a5b4fc;letter-spacing:.2em;text-transform:uppercase;font-size:12px}.hero-card h1{font-size:clamp(42px,10vw,74px);margin:0}.hero-card p{max-width:780px;margin:auto;color:#cbd5e1;line-height:1.8}.status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0}.status-card{padding:18px;display:grid;gap:10px}.status-card b,.section-title span,.task-row small,.panel p{color:#cbd5e1}.status-card strong{font-size:34px}.panel{padding:22px;margin-top:16px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.section-title h2{margin:0}label{display:grid;gap:8px;color:#dbeafe}input{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(15,23,42,.86);color:#fff;padding:15px 16px;outline:none;font:inherit}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.actions button,.task-row button{border:0;min-height:48px;border-radius:18px;padding:0 16px;color:#fff;font-weight:900;background:linear-gradient(135deg,#2563eb,#7c3aed)}.actions button:disabled,.task-row button:disabled{opacity:.55}.ghost{background:rgba(255,255,255,.1)!important}.message{margin-top:14px;border-radius:18px;background:rgba(59,130,246,.16);color:#bfdbfe;padding:14px}.task-list{display:grid;gap:10px}.task-row{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.68);padding:14px;border-radius:20px}.task-row div{display:grid;gap:4px}.setup li{margin-bottom:8px;color:#dbeafe;line-height:1.7}@media(max-width:780px){.system-shell{padding:14px 12px 70px}.status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.task-row{align-items:stretch;flex-direction:column}.task-row button{width:100%}.actions button{flex:1;min-width:calc(50% - 8px)}}
`;
