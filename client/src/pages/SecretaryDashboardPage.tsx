import { useMemo, useState } from 'react';
import { loadSecretaryContacts, updateContactStatus, addContactHistory, type SecretaryContactStatus } from '@/lib/secretary/contactCRM';
import { loadSecretaryEmailDrafts } from '@/lib/secretary/communications';
import { generateSecretaryExecutiveReport } from '@/lib/secretary/reportGenerator';
import './secretary-dashboard.css';

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
      <header className="hero-card"><a className="back" href="/projects">← المشاريع</a><span className="eyebrow">SECRETARY CRM</span><h1>لوحة السكرتير</h1><p>إدارة الجهات، المسودات، سجل التواصل، والتقارير التنفيذية المرتبطة بالمشاريع.</p></header>
      <section className="toolbar"><select value={selectedProjectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><button onClick={() => setVersion((x) => x + 1)}>تحديث</button></section>
      <section className="stats-grid"><article><b>{filteredContacts.length}</b><span>جهات</span></article><article><b>{filteredDrafts.length}</b><span>مسودات</span></article><article><b>{filteredContacts.filter((x) => x.status === 'waiting_reply').length}</b><span>بانتظار الرد</span></article><article><b>{filteredContacts.filter((x) => !x.email || !x.phone).length}</b><span>بيانات ناقصة</span></article></section>
      <section className="panel"><h2>التقرير التنفيذي</h2><pre>{report?.summary || 'لا توجد بيانات كافية للتقرير.'}</pre></section>
      <section className="panel"><h2>جهات السكرتير CRM</h2><div className="cards">{filteredContacts.map((contact) => <article className="card" key={contact.id}><div className="card-head"><b>{contact.name}</b><select value={contact.status} onChange={(e) => changeStatus(contact.id, e.target.value as SecretaryContactStatus)}>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div><p>{contact.phone || contact.mobile || 'لا يوجد رقم'} · {contact.email || 'لا يوجد بريد'}</p><p>{contact.address || contact.website || contact.mapLink || 'لا توجد تفاصيل إضافية'}</p><div className="actions"><button onClick={() => addNote(contact.id)}>إضافة ملاحظة</button></div><details><summary>سجل التواصل</summary>{contact.communicationHistory?.length ? contact.communicationHistory.map((h) => <p key={h.id}>{new Date(h.date).toLocaleString('ar-SA')} — {h.type} — {h.summary}</p>) : <p>لا يوجد سجل.</p>}</details></article>)}</div>{!filteredContacts.length && <p>لا توجد جهات محفوظة بعد.</p>}</section>
      <section className="panel"><h2>مسودات البريد</h2><div className="cards">{filteredDrafts.map((draft) => <article className="card" key={draft.id}><b>{draft.subject}</b><p>إلى: {draft.to || 'غير محدد'}</p><pre>{draft.body}</pre><small>{draft.status} · {new Date(draft.createdAt).toLocaleString('ar-SA')}</small></article>)}</div>{!filteredDrafts.length && <p>لا توجد مسودات بريد بعد.</p>}</section>
    </main>
  );
}
