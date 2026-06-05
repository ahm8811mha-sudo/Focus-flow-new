import { useMemo, useState } from 'react';
import { loadSecretaryContacts, updateContactStatus, addContactHistory, type SecretaryContactStatus } from '@/lib/secretary/contactCRM';
import { loadSecretaryEmailDrafts, createSecretaryEmailDraft, createSecretaryAppointmentReminder, createSecretaryCallFollowUp } from '@/lib/secretary/communications';
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
  const [statusFilter, setStatusFilter] = useState<'all' | SecretaryContactStatus>('all');
  const [search, setSearch] = useState('');
  const projects = Array.from(new Map(contacts.map((x) => [x.projectId, x.projectName])).entries());
  const selectedProjectId = projectId || projects[0]?.[0] || '';
  const selectedProjectName = projects.find(([id]) => id === selectedProjectId)?.[1] || 'بدون مشروع';
  const filteredContacts = contacts.filter((x) => {
    const inProject = !selectedProjectId || x.projectId === selectedProjectId;
    const inStatus = statusFilter === 'all' || x.status === statusFilter;
    const q = search.trim().toLowerCase();
    const inSearch = !q || `${x.name} ${x.phone} ${x.mobile} ${x.email} ${x.address} ${x.notes}`.toLowerCase().includes(q);
    return inProject && inStatus && inSearch;
  });
  const filteredDrafts = drafts.filter((x) => !selectedProjectId || x.projectId === selectedProjectId);
  const report = selectedProjectId ? generateSecretaryExecutiveReport({ projectId: selectedProjectId, projectName: selectedProjectName, requestType: 'DASHBOARD' }) : null;

  function refresh() { setVersion((x) => x + 1); }
  function changeStatus(id: string, status: SecretaryContactStatus) { updateContactStatus(id, status, `تحديث الحالة من لوحة السكرتير إلى: ${statusLabels[status]}`); refresh(); }
  function addNote(id: string) { const note = window.prompt('اكتب ملاحظة التواصل'); if (!note) return; addContactHistory(id, { type: 'note', summary: note }); refresh(); }
  function makeDraft(contact: any) { createSecretaryEmailDraft({ projectId: contact.projectId, projectName: contact.projectName, contact }); refresh(); }
  function makeCall(contact: any) { createSecretaryCallFollowUp(contact, contact.projectName); refresh(); }
  function makeAppointment(contact: any) { createSecretaryAppointmentReminder(contact, contact.projectName); refresh(); }

  return (
    <main className="secretary-shell" dir="rtl">
      <header className="hero-card"><a className="back" href="/projects">← المشاريع</a><span className="eyebrow">SECRETARY CRM</span><h1>لوحة السكرتير</h1><p>إدارة الجهات، المسودات، سجل التواصل، والتقارير التنفيذية المرتبطة بالمشاريع.</p></header>
      <section className="toolbar"><select value={selectedProjectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}><option value="all">كل الحالات</option>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الجهات" /><button onClick={refresh}>تحديث</button></section>
      <section className="stats-grid"><article><b>{filteredContacts.length}</b><span>جهات</span></article><article><b>{filteredDrafts.length}</b><span>مسودات</span></article><article><b>{filteredContacts.filter((x) => x.status === 'waiting_reply').length}</b><span>بانتظار الرد</span></article><article><b>{filteredContacts.filter((x) => !x.email || !x.phone).length}</b><span>بيانات ناقصة</span></article></section>
      <section className="panel"><h2>التقرير التنفيذي</h2><pre>{report?.summary || 'لا توجد بيانات كافية للتقرير.'}</pre></section>
      <section className="panel"><h2>جهات السكرتير CRM</h2><div className="cards">{filteredContacts.map((contact) => <article className="card" key={contact.id}><div className="card-head"><b>{contact.name}</b><span className={`status-badge status-${contact.status}`}>{statusLabels[contact.status]}</span></div><select value={contact.status} onChange={(e) => changeStatus(contact.id, e.target.value as SecretaryContactStatus)}>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><p>{contact.phone || contact.mobile || 'لا يوجد رقم'} · {contact.email || 'لا يوجد بريد'}</p><p>{contact.address || contact.website || contact.mapLink || 'لا توجد تفاصيل إضافية'}</p><div className="actions"><button onClick={() => makeDraft(contact)}>مسودة</button><button onClick={() => makeCall(contact)}>اتصال</button><button onClick={() => makeAppointment(contact)}>موعد</button><button onClick={() => addNote(contact.id)}>ملاحظة</button></div><details><summary>سجل التواصل</summary>{contact.communicationHistory?.length ? contact.communicationHistory.map((h) => <p key={h.id}>{new Date(h.date).toLocaleString('ar-SA')} — {h.type} — {h.summary}</p>) : <p>لا يوجد سجل.</p>}</details></article>)}</div>{!filteredContacts.length && <p>لا توجد جهات محفوظة بعد.</p>}</section>
      <section className="panel"><h2>مسودات البريد</h2><div className="cards">{filteredDrafts.map((draft) => <article className="card" key={draft.id}><b>{draft.subject}</b><p>إلى: {draft.to || 'غير محدد'}</p><pre>{draft.body}</pre><small>{draft.status} · {new Date(draft.createdAt).toLocaleString('ar-SA')}</small></article>)}</div>{!filteredDrafts.length && <p>لا توجد مسودات بريد بعد.</p>}</section>
    </main>
  );
}
