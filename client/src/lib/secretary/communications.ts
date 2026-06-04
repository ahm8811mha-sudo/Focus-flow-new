import { addContactHistory, updateContactStatus, type SecretaryContact } from './contactCRM';

export type SecretaryMessageStatus = 'draft' | 'ready' | 'sent' | 'failed' | 'waiting_reply';

export type SecretaryEmailDraft = {
  id: string;
  projectId: string;
  projectName: string;
  contactId?: string;
  to: string;
  subject: string;
  body: string;
  status: SecretaryMessageStatus;
  createdAt: string;
  updatedAt: string;
};

const DRAFTS_KEY = 'focus-flow-secretary-email-drafts';

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function arr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export function loadSecretaryEmailDrafts(): SecretaryEmailDraft[] {
  try {
    const data = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSecretaryEmailDrafts(items: SecretaryEmailDraft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr(items)));
}

export function createSecretaryEmailDraft(args: {
  projectId: string;
  projectName: string;
  contact?: SecretaryContact;
  to?: string;
  subject?: string;
  body?: string;
}) {
  const draft: SecretaryEmailDraft = {
    id: uid(),
    projectId: args.projectId,
    projectName: args.projectName,
    contactId: args.contact?.id || '',
    to: args.to || args.contact?.email || '',
    subject: args.subject || `طلب معلومات بخصوص ${args.projectName}`,
    body: args.body || `السلام عليكم،\n\nنرغب بالحصول على معلومات وتفاصيل بخصوص ${args.projectName}.\n\nالرجاء تزويدنا بالتفاصيل المتاحة ووسائل التواصل المناسبة.\n\nشكرًا لكم.`,
    status: 'draft',
    createdAt: now(),
    updatedAt: now(),
  };
  saveSecretaryEmailDrafts([draft, ...loadSecretaryEmailDrafts()]);
  if (args.contact?.id) {
    addContactHistory(args.contact.id, { type: 'email', summary: `تم إنشاء مسودة بريد: ${draft.subject}` });
    updateContactStatus(args.contact.id, 'draft_ready', 'تم تجهيز مسودة بريد للجهة');
  }
  return draft;
}

export function createSecretaryCallFollowUp(contact: SecretaryContact, projectName: string) {
  addContactHistory(contact.id, { type: 'call', summary: `تم إنشاء متابعة اتصال لمشروع ${projectName}` });
  updateContactStatus(contact.id, 'contacted', 'تم تجهيز متابعة اتصال');
  return { contactId: contact.id, title: `اتصال متابعة: ${contact.name}`, phone: contact.phone || contact.mobile || '', projectName };
}

export function createSecretaryAppointmentReminder(contact: SecretaryContact, projectName: string) {
  addContactHistory(contact.id, { type: 'appointment', summary: `تم إنشاء تذكير موعد لمشروع ${projectName}` });
  updateContactStatus(contact.id, 'appointment_set', 'تم تجهيز موعد متابعة');
  return { contactId: contact.id, title: `موعد متابعة: ${contact.name}`, projectName };
}
