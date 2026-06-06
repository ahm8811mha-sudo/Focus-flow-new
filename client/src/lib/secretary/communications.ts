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

export type SecretaryCallStatus = 'planned' | 'done' | 'cancelled' | 'failed';

export type SecretaryCallLog = {
  id: string;
  projectId: string;
  projectName: string;
  contactId?: string;
  summary: string;
  status: SecretaryCallStatus;
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  updatedAt: string;
};

export type SecretaryAppointmentStatus = 'planned' | 'done' | 'cancelled' | 'failed';

export type SecretaryAppointmentReminder = {
  id: string;
  projectId: string;
  projectName: string;
  contactId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  status: SecretaryAppointmentStatus;
  createdAt: string;
  updatedAt: string;
};

const DRAFTS_KEY = 'focus-flow-secretary-email-drafts';
const CALL_LOGS_KEY = 'focus-flow-secretary-call-logs';
const APPOINTMENT_REMINDERS_KEY = 'focus-flow-secretary-appointment-reminders';

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
    body:
      args.body ||
      `السلام عليكم،

نرغب بالحصول على معلومات وتفاصيل بخصوص ${args.projectName}.

الرجاء تزويدنا بالتفاصيل المتاحة ووسائل التواصل المناسبة.

شكرًا لكم.`,
    status: 'draft',
    createdAt: now(),
    updatedAt: now(),
  };

  saveSecretaryEmailDrafts([draft, ...loadSecretaryEmailDrafts()]);

  if (args.contact?.id) {
    addContactHistory(args.contact.id, {
      type: 'email',
      summary: `تم إنشاء مسودة بريد: ${draft.subject}`,
    });
    updateContactStatus(args.contact.id, 'draft_ready', 'تم تجهيز مسودة بريد للجهة');
  }

  return draft;
}

export function loadSecretaryCallLogs(): SecretaryCallLog[] {
  try {
    const data = JSON.parse(localStorage.getItem(CALL_LOGS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSecretaryCallLogs(items: SecretaryCallLog[]) {
  localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(arr(items)));
}

export function createSecretaryCallFollowUp(contact: SecretaryContact, projectName: string) {
  addContactHistory(contact.id, {
    type: 'call',
    summary: `تم إنشاء متابعة اتصال لمشروع ${projectName}`,
  });

  updateContactStatus(contact.id, 'contacted', 'تم تجهيز متابعة اتصال');

  return {
    contactId: contact.id,
    title: `اتصال متابعة: ${contact.name}`,
    phone: contact.phone || contact.mobile || '',
    projectName,
  };
}

export function createSecretaryCallLog(args: {
  projectId: string;
  projectName: string;
  contactId?: string;
  summary: string;
  status?: SecretaryCallStatus;
  dueDate?: string;
  dueTime?: string;
}) {
  const callLog: SecretaryCallLog = {
    id: uid(),
    projectId: args.projectId,
    projectName: args.projectName,
    contactId: args.contactId || '',
    summary: args.summary || `متابعة اتصال لمشروع ${args.projectName}`,
    status: args.status || 'planned',
    dueDate: args.dueDate || '',
    dueTime: args.dueTime || '',
    createdAt: now(),
    updatedAt: now(),
  };

  saveSecretaryCallLogs([callLog, ...loadSecretaryCallLogs()]);

  if (args.contactId) {
    addContactHistory(args.contactId, {
      type: 'call',
      summary: callLog.summary,
    });
    updateContactStatus(args.contactId, 'contacted', 'تم تجهيز متابعة اتصال');
  }

  return callLog;
}

export function loadSecretaryAppointmentReminders(): SecretaryAppointmentReminder[] {
  try {
    const data = JSON.parse(localStorage.getItem(APPOINTMENT_REMINDERS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSecretaryAppointmentReminders(items: SecretaryAppointmentReminder[]) {
  localStorage.setItem(APPOINTMENT_REMINDERS_KEY, JSON.stringify(arr(items)));
}

export function createSecretaryAppointmentReminder(args: {
  projectId: string;
  projectName: string;
  contactId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  status?: SecretaryAppointmentStatus;
}) {
  const reminder: SecretaryAppointmentReminder = {
    id: uid(),
    projectId: args.projectId,
    projectName: args.projectName,
    contactId: args.contactId || '',
    title: args.title || `موعد متابعة: ${args.projectName}`,
    description: args.description || '',
    dueDate: args.dueDate || '',
    dueTime: args.dueTime || '',
    status: args.status || 'planned',
    createdAt: now(),
    updatedAt: now(),
  };

  saveSecretaryAppointmentReminders([
    reminder,
    ...loadSecretaryAppointmentReminders(),
  ]);

  if (args.contactId) {
    addContactHistory(args.contactId, {
      type: 'appointment',
      summary: reminder.title,
    });
    updateContactStatus(args.contactId, 'appointment_set', 'تم تجهيز موعد متابعة');
  }

  return reminder;
}