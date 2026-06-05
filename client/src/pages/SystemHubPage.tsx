import { useEffect, useMemo, useState } from 'react';
import { useLocalMemory } from '@/hooks/useLocalMemory';
import { backupToGoogleDrive, connectGoogleDrive, createGmailDraft, createGoogleCalendarEvent, createGoogleSheet, disconnectGoogleDrive, exportTasksToGoogleSheet, getGoogleClientId, getStoredDriveToken, restoreFromGoogleDrive, setGoogleClientId, syncTasksToGoogleCalendar } from '@/lib/googleDriveCloud';
import './system-hub.css';

function today() { return new Date().toISOString().slice(0, 10); }
function asArray<T = any>(value: any): T[] { return Array.isArray(value) ? value : []; }
type GoogleState = 'disconnected' | 'checking' | 'connected' | 'invalid';

export default function SystemHubPage() {
  const memory = useLocalMemory();
  const [clientId, setClientIdState] = useState(getGoogleClientId());
  const [googleState, setGoogleState] = useState<GoogleState>(getStoredDriveToken() ? 'checking' : 'disconnected');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [aiStatus, setAiStatus] = useState<{ geminiConfigured?: boolean; openaiConfigured?: boolean; model?: string } | null>(null);
  const tasks = useMemo(() => asArray<any>(memory.tasks), [memory.tasks]);
  const datedTasks = useMemo(() => tasks.filter((task) => task.dueDate && task.status !== 'done'), [tasks]);
  const urgentTasks = useMemo(() => tasks.filter((task) => task.status !== 'done' && (task.priority === 'urgent' || task.priority === 'high')), [tasks]);
  const geminiReady = Boolean(aiStatus?.geminiConfigured || aiStatus?.openaiConfigured);
  const googleConnected = googleState === 'connected';

  useEffect(() => { fetch('/api/agents/status').then((res) => res.json()).then(setAiStatus).catch(() => setAiStatus(null)); }, []);
  useEffect(() => { verifyGoogleToken(); }, []);

  async function verifyGoogleToken() {
    const token = getStoredDriveToken();
    if (!token) { setGoogleState('disconnected'); return false; }
    setGoogleState('checking');
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + encodeURIComponent(token));
      if (!res.ok) throw new Error('Google token invalid');
      setGoogleState('connected');
      return true;
    } catch {
      setGoogleState('invalid');
      return false;
    }
  }

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      setBusy(true);
      setMessage(`جاري تنفيذ: ${label}`);
      await action();
      await verifyGoogleToken();
      await memory.refresh();
      setMessage(`تم: ${label}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
      if (/401|unauthenticated|invalid|expired|credential/i.test(msg)) setGoogleState('invalid');
      setMessage(msg);
    } finally { setBusy(false); }
  }

  const googleLabel = googleState === 'connected' ? 'متصل فعلاً' : googleState === 'checking' ? 'جاري التحقق' : googleState === 'invalid' ? 'التوكن منتهي' : 'غير متصل';
  const googleHint = googleState === 'invalid' ? 'افصل Google ثم اربطه من جديد' : 'Drive + Calendar + Gmail + Sheets';

  return (
    <main className="system-shell" dir="rtl">
      <header className="hero-card"><a className="back" href="/">← الرجوع للرئيسية</a><a className="agents-link" href="/agents">الوكلاء التنفيذيون</a><span className="eyebrow">Focus Flow Operating System</span><h1>مركز النظام والخدمات</h1><p>مركز تشغيل Gemini وخدمات Google والنسخ الاحتياطي والمزامنة.</p></header>
      <section className="status-grid"><div className="status-card"><b>Gemini</b><strong>{geminiReady ? 'متصل' : 'غير مفعل'}</strong><small>{aiStatus?.model || 'أضف GEMINI_API_KEY في Vercel'}</small></div><div className={`status-card ${googleState === 'invalid' ? 'danger' : ''}`}><b>Google</b><strong>{googleLabel}</strong><small>{googleHint}</small></div><div className="status-card"><b>مهام مؤرخة</b><strong>{datedTasks.length}</strong><small>جاهزة للمزامنة مع التقويم</small></div><div className="status-card"><b>أولوية عالية</b><strong>{urgentTasks.length}</strong><small>تحتاج متابعة اليوم</small></div></section>
      <section className="panel"><div className="section-title"><h2>Google Cloud Integration</h2><span>Drive + Calendar + Gmail + Sheets</span></div><p>هذا الربط يستخدم Google OAuth Client ID من جهة الواجهة. إذا ظهرت حالة "التوكن منتهي" افصل Google ثم اربطه من جديد.</p><label>Google OAuth Client ID<input value={clientId} onChange={(event) => setClientIdState(event.target.value)} placeholder="ضع Google OAuth Client ID هنا" /></label><div className="actions"><button disabled={busy} onClick={() => { setGoogleClientId(clientId); setMessage('تم حفظ Google Client ID'); }}>حفظ Client ID</button><button disabled={busy} onClick={() => run('ربط Google', connectGoogleDrive)}>ربط Google</button><button disabled={busy || !googleConnected} onClick={() => run('نسخ احتياطي إلى Drive', backupToGoogleDrive)}>نسخ Drive</button><button disabled={busy || !googleConnected} onClick={() => confirm('سيتم استبدال البيانات المحلية بآخر نسخة محفوظة. متأكد؟') && run('استعادة من Drive', restoreFromGoogleDrive)}>استعادة Drive</button><button className="ghost" onClick={() => { disconnectGoogleDrive(); setGoogleState('disconnected'); setMessage('تم فصل Google'); }}>فصل Google</button><button className="ghost" disabled={busy} onClick={verifyGoogleToken}>تحقق من الاتصال</button></div>{message && <div className={`message ${googleState === 'invalid' ? 'danger-message' : ''}`}>{message}</div>}</section>
      <section className="panel"><div className="section-title"><h2>المهام والتقويم</h2><span>Google Calendar</span></div><div className="actions"><button disabled={busy || !googleConnected || !datedTasks.length} onClick={() => run('مزامنة كل المهام المؤرخة مع Google Calendar', () => syncTasksToGoogleCalendar(tasks))}>مزامنة التقويم</button><button disabled={busy || !googleConnected} onClick={() => run('تصدير المهام إلى Google Sheets', () => exportTasksToGoogleSheet(tasks))}>تصدير Sheets</button><button disabled={busy || !googleConnected} onClick={() => run('اختبار مسودة Gmail', () => createGmailDraft({ subject: 'اختبار Focus Flow', body: 'هذه مسودة تجريبية من Focus Flow.' }))}>اختبار Gmail Draft</button><button disabled={busy || !googleConnected} onClick={() => run('إنشاء Google Sheet تجريبي', () => createGoogleSheet({ title: `Focus Flow Test ${today()}`, columns: ['البند', 'الحالة', 'التاريخ'], rows: [['اختبار الربط', 'ناجح عند عدم ظهور خطأ', today()], ['المصدر', 'System Hub', today()]] }))}>إنشاء Sheet تجريبي</button></div><div className="task-list">{datedTasks.slice(0, 12).map((task) => <div className="task-row" key={task.id}><div><b>{task.title}</b><small>{task.dueDate || today()} · {task.dueTime || '09:00'} · {task.priority}</small></div><button disabled={busy || !googleConnected} onClick={() => run(`إضافة ${task.title} إلى التقويم`, () => createGoogleCalendarEvent(task))}>أضف للتقويم</button></div>)}{!datedTasks.length && <small>لا توجد مهام مؤرخة. أضف تاريخًا للمهمة أولًا.</small>}</div></section>
      <section className="panel setup"><h2>ما الذي يحتاج إعداد منك؟</h2><ul><li>في Vercel أضف GEMINI_API_KEY ثم Redeploy.</li><li>في Google Cloud فعّل Drive API و Calendar API و Gmail API و Sheets API.</li><li>أنشئ OAuth Client ID للويب وأضف رابط Vercel ضمن Authorized JavaScript origins.</li><li>ضع Client ID في هذا المركز واضغط ربط Google.</li></ul></section>
    </main>
  );
}
