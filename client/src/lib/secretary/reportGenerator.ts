import { loadSecretaryContacts } from './contactCRM';
import { loadSecretaryEmailDrafts } from './communications';

type ReportInput = {
  projectId: string;
  projectName: string;
  requestType?: string;
  savedTables?: number;
  createdTasks?: number;
  createdEvents?: number;
  failures?: string[];
  nextActions?: string[];
};

export function generateSecretaryExecutiveReport(input: ReportInput) {
  const contacts = loadSecretaryContacts().filter((x) => x.projectId === input.projectId);
  const drafts = loadSecretaryEmailDrafts().filter((x) => x.projectId === input.projectId);
  const missingPhone = contacts.filter((x) => !x.phone && !x.mobile).length;
  const missingEmail = contacts.filter((x) => !x.email).length;
  const waiting = contacts.filter((x) => x.status === 'waiting_reply').length;
  const contacted = contacts.filter((x) => x.status === 'contacted').length;
  const lines = [
    `تقرير السكرتير التنفيذي - ${input.projectName}`,
    `نوع الطلب: ${input.requestType || 'غير محدد'}`,
    '',
    `تم حصر ${contacts.length} جهة مرتبطة بالمشروع.`,
    `تم إنشاء ${drafts.length} مسودة بريد.`,
    `تم إنشاء ${input.createdTasks || 0} مهمة متابعة.`,
    `تم إنشاء ${input.createdEvents || 0} موعد/تذكير.`,
    `تم حفظ ${input.savedTables || 0} جدول.`,
    '',
    `جهات تم التواصل معها: ${contacted}`,
    `جهات بانتظار الرد: ${waiting}`,
    `جهات بدون رقم هاتف: ${missingPhone}`,
    `جهات بدون بريد: ${missingEmail}`,
    '',
    input.failures?.length ? `تعذر تنفيذ: ${input.failures.join('، ')}` : 'لا توجد أخطاء مسجلة.',
    '',
    'الإجراء المطلوب:',
    ...(input.nextActions?.length ? input.nextActions.map((x) => `- ${x}`) : ['- راجع الجهات الناقصة وابدأ المتابعة من جدول المشروع.']),
  ];
  return {
    title: `تقرير السكرتير - ${input.projectName}`,
    summary: lines.join('\n'),
    metrics: { contacts: contacts.length, drafts: drafts.length, missingPhone, missingEmail, waiting, contacted },
  };
}
