import { addActivity, getSnapshot, importLocalMemorySnapshot, type Task } from './localMemory';

const CLIENT_ID_KEY = 'focus-flow-google-client-id';
const TOKEN_KEY = 'focus-flow-google-drive-token';
const BACKUP_FILE_NAME = 'focus-flow-premium-backup.json';
const GOOGLE_SCOPE = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

declare global {
  interface Window {
    google?: any;
  }
}

export type CloudStatus = 'idle' | 'ready' | 'missing-client-id' | 'connected' | 'error';

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

function toGoogleDateTime(task: Task) {
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
