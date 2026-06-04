export type SecretaryContactStatus = 'new' | 'contacted' | 'waiting_reply' | 'appointment_set' | 'draft_ready' | 'sent' | 'closed' | 'rejected' | 'missing_data';

export type CommunicationRecord = {
  id: string;
  type: 'note' | 'email' | 'call' | 'whatsapp' | 'appointment' | 'status';
  date: string;
  summary: string;
};

export type SecretaryContact = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  mapLink?: string;
  address?: string;
  contactPerson?: string;
  status: SecretaryContactStatus;
  notes: string;
  communicationHistory: CommunicationRecord[];
  lastContactDate?: string;
  nextFollowUpDate?: string;
  followUpCount: number;
  sourceTableId?: string;
  sourceRowIndex?: number;
  createdAt: string;
  updatedAt: string;
};

const CRM_KEY = 'focus-flow-secretary-contacts';

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function arr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export function loadSecretaryContacts(): SecretaryContact[] {
  try {
    const data = JSON.parse(localStorage.getItem(CRM_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSecretaryContacts(items: SecretaryContact[]) {
  localStorage.setItem(CRM_KEY, JSON.stringify(arr(items)));
}

export function upsertSecretaryContact(input: Partial<SecretaryContact> & { projectId: string; projectName: string; name: string }) {
  const contacts = loadSecretaryContacts();
  const existing = contacts.find((x) => x.id === input.id || (x.projectId === input.projectId && x.name === input.name));
  const contact: SecretaryContact = {
    id: existing?.id || input.id || uid(),
    projectId: input.projectId,
    projectName: input.projectName,
    name: input.name,
    phone: input.phone || existing?.phone || '',
    mobile: input.mobile || existing?.mobile || '',
    email: input.email || existing?.email || '',
    website: input.website || existing?.website || '',
    mapLink: input.mapLink || existing?.mapLink || '',
    address: input.address || existing?.address || '',
    contactPerson: input.contactPerson || existing?.contactPerson || '',
    status: input.status || existing?.status || 'new',
    notes: input.notes || existing?.notes || '',
    communicationHistory: arr(input.communicationHistory || existing?.communicationHistory),
    lastContactDate: input.lastContactDate || existing?.lastContactDate || '',
    nextFollowUpDate: input.nextFollowUpDate || existing?.nextFollowUpDate || '',
    followUpCount: typeof input.followUpCount === 'number' ? input.followUpCount : existing?.followUpCount || 0,
    sourceTableId: input.sourceTableId || existing?.sourceTableId || '',
    sourceRowIndex: typeof input.sourceRowIndex === 'number' ? input.sourceRowIndex : existing?.sourceRowIndex,
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
  };
  saveSecretaryContacts(existing ? contacts.map((x) => x.id === contact.id ? contact : x) : [contact, ...contacts]);
  return contact;
}

export function addContactHistory(contactId: string, record: Omit<CommunicationRecord, 'id' | 'date'> & { date?: string }) {
  const contacts = loadSecretaryContacts();
  const entry: CommunicationRecord = { id: uid(), date: record.date || now(), type: record.type, summary: record.summary };
  const next = contacts.map((x) => x.id === contactId ? { ...x, communicationHistory: [entry, ...arr(x.communicationHistory)], lastContactDate: entry.date, followUpCount: x.followUpCount + 1, updatedAt: now() } : x);
  saveSecretaryContacts(next);
  return next.find((x) => x.id === contactId) || null;
}

export function updateContactStatus(contactId: string, status: SecretaryContactStatus, note?: string) {
  const contacts = loadSecretaryContacts();
  const entry = note ? { id: uid(), date: now(), type: 'status' as const, summary: note } : null;
  const next = contacts.map((x) => x.id === contactId ? { ...x, status, communicationHistory: entry ? [entry, ...arr(x.communicationHistory)] : arr(x.communicationHistory), updatedAt: now() } : x);
  saveSecretaryContacts(next);
  return next.find((x) => x.id === contactId) || null;
}
