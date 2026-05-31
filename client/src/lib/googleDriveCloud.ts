import { addActivity, getSnapshot, importLocalMemorySnapshot, type Task } from './localMemory';

const CLIENT_ID_KEY = 'focus-flow-google-client-id';
const TOKEN_KEY = 'focus-flow-google-drive-token';
const BACKUP_FILE_NAME = 'focus-flow-premium-backup.json';
const GOOGLE_SCOPE = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

declare global {
  interface Window {
    google?: any;
  }
}

export type CloudStatus = 'idle' | 'ready' | 'missing-client-id' | 'connected' | 'error';
export type GmailDraftInput = { to?: string; subject: string; body: string; cc?: string; bcc?: string };
export type SheetInput = { title: string; columns: string[]; rows: Array<Array<string | number | boolean | null | undefined>> };

export function getGoogleClientId() {
  return localStorage.getItem(CLIENT_ID_KEY) || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

export function setGoogleClientId(clientId: string) {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
}

export function getStoredDriveToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function disconnectGoogleDrive() {
  localStorage.removeItem(TOKEN_KEY);
}

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('تعذر تحميل Google Identity Services'));
    document.head.appendChild(script);
  });
}

export async function connectGoogleDrive(): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('أدخل Google OAuth Client ID أولًا');
  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      prompt: 'consent',
      callback: (response: any) => {
        if (response?.access_token) {
          localStorage.setItem(TOKEN_KEY, response.access_token);
          resolve(response.access_token);
        } else {
          reject(new Error('لم يتم استلام رمز Google'));
        }
      },
      error_callback: () => reject(new Error('تم إلغاء الاتصال بـ Google')),
    });
    client.requestAccessToken();
  });
}

async function googleFetch(path: string, token: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Google API error ${response.status}`);
  }
  return response;
}

function base64Url(input: string) {
  const utf8 = new TextEncoder().encode(input);
  let binary = '';
  utf8.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeMailHeader(value: string) {
  const clean = String(value || '').replace(/[\r\n]+/g, ' ').trim();
  if (!clean) return '';
  if (/^[\x00-\x7F]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${base64Url(clean).replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat((4 - (base64Url(clean).length % 4)) % 4)}?=`;
}

function normalizeMailBody(value: string) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r\n')
    .trim();
}

async function findBackupFile(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=1`;
  const response = await googleFetch(url, token);
  const data = await response.json();
  return data?.files?.[0]?.id ?? null;
}

export async function backupToGoogleDrive(token = getStoredDriveToken()) {
  if (!token) throw new Error('اربط Google أولًا');
  const snapshot = await getSnapshot();
  const content = JSON.stringify({ ...snapshot, exportedAt: new Date().toISOString(), app: 'Focus Flow Premium' }, null, 2);
  const fileId = await findBackupFile(token);

  if (fileId) {
    await googleFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    });
  } else {
    const boundary = 'focus_flow_boundary';
    const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json', parents: ['appDataFolder'] };
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    await googleFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', token, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
  }

  await addActivity('نسخة Google Drive', 'تم رفع نسخة احتياطية إلى Google Drive', 'system');
  return true;
}

export async function restoreFromGoogleDrive(token = getStoredDriveToken()) {
  if (!token) throw new Error('اربط Google أولًا');
  const fileId = await findBackupFile(token);
  if (!fileId) throw new Error('لا توجد نسخة احتياطية في Google Drive لهذا التطبيق');
  const response = await googleFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, token);
  const data = await response.json();
  await importLocalMemorySnapshot(data);
  await addActivity('استعادة Google Drive', 'تمت استعادة النسخة الاحتياطية من Google Drive', 'system');
  return true;
}

function toGoogleDateTime(task: Pick<Task, 'dueDate' | 'dueTime'>) {
  const date = task.dueDate || new Date().toISOString().slice(0, 10);
  const time = task.dueTime || '09:00';
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export async function createGoogleCalendarEvent(task: Task, token = getStoredDriveToken()) {
  if (!token) throw new Error('اربط Google أولًا');
  const { start, end } = toGoogleDateTime(task);
  const payload = {
    summary: task.title,
    description: task.description || 'Focus Flow task',
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: { useDefault: true },
  };
  const response = await googleFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  await addActivity('Google Calendar', `تمت إضافة المهمة إلى التقويم: ${task.title}`, 'task');
  return data;
}

export async function syncTasksToGoogleCalendar(tasks: Task[], token = getStoredDriveToken()) {
  if (!token) throw new Error('اربط Google أولًا');
  const dated = tasks.filter((task) => task.dueDate && task.status !== 'done');
  const results = [];
  for (const task of dated) {
    results.push(await createGoogleCalendarEvent(task, token));
  }
  await addActivity('مزامنة التقويم', `تم إرسال ${results.length} مهمة إلى Google Calendar`, 'system');
  return results;
}

export async function createGmailDraft(input: GmailDraftInput, token = getStoredDriveToken()) {
  if (!token) throw new Error('اربط Google أولًا');
  const body = normalizeMailBody(input.body || '');
  const lines = [
    'MIME-Version: 1.0',
    input.to ? `To: ${input.to}` : '',
    input.cc ? `Cc: ${input.cc}` : '',
    input.bcc ? `Bcc: ${input.bcc}` : '',
    `Subject: ${encodeMailHeader(input.subject || 'رسالة من Focus Flow')}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body || 'تم إنشاء هذه المسودة من Focus Flow.',
  ].filter((line) => line !== '').join('\r\n');
  const response = await googleFetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw: base64Url(lines) } }),
  });
  const data = await response.json();
  await addActivity('Gmail Draft', `تم إنشاء مسودة Gmail: ${input.subject}`, 'system');
  return data;
}

export async function createGoogleSheet(input: SheetInput, token = getStoredDriveToken()) {
  if (!token) throw new Error('اربط Google أولًا');
  const createResponse = await googleFetch('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title: input.title || 'Focus Flow Sheet' } }),
  });
  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const values = [input.columns, ...input.rows].map((row) => row.map((cell) => cell ?? ''));
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  await addActivity('Google Sheets', `تم إنشاء Google Sheet: ${input.title}`, 'system');
  return spreadsheet;
}

export async function exportTasksToGoogleSheet(tasks: Task[], token = getStoredDriveToken()) {
  return createGoogleSheet({
    title: `Focus Flow Tasks ${new Date().toISOString().slice(0, 10)}`,
    columns: ['العنوان', 'الوصف', 'الحالة', 'الأولوية', 'التاريخ', 'الوقت', 'القائمة'],
    rows: tasks.map((task) => [task.title, task.description, task.status, task.priority, task.dueDate || '', task.dueTime || '', task.listName]),
  }, token);
}
