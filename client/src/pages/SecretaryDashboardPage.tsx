import { useMemo, useState } from 'react';
import { loadSecretaryContacts, updateContactStatus, addContactHistory, type SecretaryContactStatus } from '@/lib/secretary/contactCRM';
import { loadSecretaryEmailDrafts } from '@/lib/secretary/communications';
import { generateSecretaryExecutiveReport } from '@/lib/secretary/reportGenerator';

const statusLabels: Record<SecretaryContactStatus, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  waiting_reply: 'بانتظار الرد',
  appointment_set: 'تم تحديد موعد',
  draft_ready: 'مسودة جاهزة',
  sent: 'تم الإرسال',
  closed: 'مغلق',
  rejected: 'مرفوض',
  missing_data: 'بيانات ناقصة',
};

export default function SecretaryDashboardPage() {
  const [version, setVersion] = useState(0);
  const contacts = useMemo(() => loadSecretaryContacts(), [version]);
  const drafts = useMemo(() => loadSecretaryEmailDrafts(), [version]);
  const [projectId, setProjectId] = useState('');
  const projects = Array.from(new Map(contacts.map((x) => [x.projectId, x.projectName])).entries());
  const selectedProjectId = projectId || projects[0]?.[0] || '';
  const selectedProjectName = projects.find(([id]) => id === selectedProjectId)?.[1] || 'بدون مشروع';
  const filteredContacts = contacts.filter((x) => !selectedProjectId || x.projectId === selectedProjectId);
  const filteredDrafts = drafts.filter((x) => !selectedProjectId || x.projectId === selectedProjectId);
  const report = selectedProjectId ? generateSecretaryExecutiveReport({ projectId: selectedProjectId, projectName: selectedProjectName, requestType: 'DASHBOARD' }) : null;

  function changeStatus(id: string, status: SecretaryContactStatus) {
    updateContactStatus(id, status, `تحديث الحالة من لوحة السكرتير إلى: ${statusLabels[status]}`);
    setVersion((x) => x + 1);
  }

  function addNote(id: string) {
    const note = window.prompt('اكتب ملاحظة التواصل');
    if (!note) return;
    addContactHistory(id, { type: 'note', summary: note });
    setVersion((x) => x + 1);
  }

  return (
    <main className="secretary-shell" dir="rtl">
      <style>{styles}</style>
      <header className="hero-card"><a className="back" href="/projects">← المشاريع</a><span className="eyebrow">SECRETARY CRM</span><h1>لوحة السكرتير</h1><p>إدارة الجهات، المسودات، سجل التواصل، والتقارير التنفيذية المرتبطة بالمشاريع.</p></header>
      <section className="toolbar"><select value={selectedProjectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><button onClick={() => setVersion((x) => x + 1)}>تحديث</button></section>
      <section className="stats-grid"><article><b>{filteredContacts.length}</b><span>جهات</span></article><article><b>{filteredDrafts.length}</b><span>مسودات</span></article><article><b>{filteredContacts.filter((x) => x.status === 'waiting_reply').length}</b><span>بانتظار الرد</span></article><article><b>{filteredContacts.filter((x) => !x.email || !x.phone).length}</b><span>بيانات ناقصة</span></article></section>
      <section className="panel"><h2>التقرير التنفيذي</h2><pre>{report?.summary || 'لا توجد بيانات كافية للتقرير.'}</pre></section>
      <section className="panel"><h2>جهات السكرتير CRM</h2><div className="cards">{filteredContacts.map((contact) => <article className="card" key={contact.id}><div className="card-head"><b>{contact.name}</b><select value={contact.status} onChange={(e) => changeStatus(contact.id, e.target.value as SecretaryContactStatus)}>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div><p>{contact.phone || contact.mobile || 'لا يوجد رقم'} · {contact.email || 'لا يوجد بريد'}</p><p>{contact.address || contact.website || contact.mapLink || 'لا توجد تفاصيل إضافية'}</p><div className="actions"><button onClick={() => addNote(contact.id)}>إضافة ملاحظة</button></div><details><summary>سجل التواصل</summary>{contact.communicationHistory?.length ? contact.communicationHistory.map((h) => <p key={h.id}>{new Date(h.date).toLocaleString('ar-SA')} — {h.type} — {h.summary}</p>) : <p>لا يوجد سجل.</p>}</details></article>)}</div>{!filteredContacts.length && <p>لا توجد جهات محفوظة بعد.</p>}</section>
      <section className="panel"><h2>مسودات البريد</h2><div className="cards">{filteredDrafts.map((draft) => <article className="card" key={draft.id}><b>{draft.subject}</b><p>إلى: {draft.to || 'غير محدد'}</p><pre>{draft.body}</pre><small>{draft.status} · {new Date(draft.createdAt).toLocaleString('ar-SA')}</small></article>)}</div>{!filteredDrafts.length && <p>لا توجد مسودات بريد بعد.</p>}</section>
    </main>
  );
}

const styles = `body{margin:0;background:#030305;color:#f8fafc;font-family:Cairo,-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif}.secretary-shell{min-height:100vh;padding:18px 14px 100px;background:radial-gradient(circle at 15% 0%,rgba(34,211,238,.16),transparent 30%),radial-gradient(circle at 90% 0%,rgba(124,58,237,.18),transparent 30%),#020202}.hero-card,.toolbar,.panel,.stats-grid article,.card{border:1px solid rgba(255,255,255,.13);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border-radius:30px;box-shadow:0 24px 80px rgba(0,0,0,.34);backdrop-filter:blur(22px)}.hero-card{max-width:1180px;margin:auto;text-align:center;padding:30px;display:grid;gap:12px}.back{color:#bfdbfe;text-decoration:none;justify-self:start}.eyebrow{color:#67e8f9;letter-spacing:.22em;font-size:12px;font-weight:950}.hero-card h1{font-size:clamp(46px,10vw,82px);margin:0;letter-spacing:-.05em}.hero-card p,.card p,.panel p,small{color:#cbd5e1;line-height:1.8}.toolbar,.panel,.stats-grid{max-width:1180px;margin:16px auto}.toolbar{padding:14px;display:flex;gap:10px}select,button{border:1px solid rgba(255,255,255,.13);border-radius:18px;background:rgba(15,23,42,.72);color:#fff;padding:12px;font:inherit}button{background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);font-weight:900;border:0}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stats-grid article{padding:18px}.stats-grid b{font-size:38px}.stats-grid span{display:block;color:#67e8f9}.panel{padding:18px}.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{padding:14px}.card-head{display:flex;justify-content:space-between;gap:10px}.actions{display:flex;gap:8px;flex-wrap:wrap}pre{white-space:pre-wrap;color:#dbeafe;background:rgba(15,23,42,.55);border-radius:16px;padding:12px;overflow:auto}@media(max-width:900px){.stats-grid,.cards{grid-template-columns:1fr}.toolbar{display:grid}}`;
