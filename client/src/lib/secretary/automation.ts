import { classifySecretaryRequest } from './requestClassifier';
import { buildSecretaryProjectContext } from './projectContext';
import { generateSecretaryExecutiveReport } from './reportGenerator';
import { upsertSecretaryContact, addContactHistory } from './contactCRM';
import { createSecretaryEmailDraft, createSecretaryCallLog, createSecretaryAppointmentReminder } from './communications';
import { upsertTable } from '@/lib/internalTables';
import type { ManagedProject } from '@/components/projects/types';

function nextIsoDate(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildRows(project: ManagedProject, request: string) {
  return [
    ['السكرتير التنفيذي', 'متابعة المشروع', request, 'جديد', nextIsoDate(1), 'تم إنشاؤه داخل المشروع'],
    ['مدير المشروع', 'مراجعة المخرجات', project.objective || project.name, 'بانتظار مراجعة', nextIsoDate(2), 'مرتبط بسياق المشروع'],
    ['صاحب القرار', 'اعتماد الخطوة التالية', project.scope || 'نطاق المشروع', 'مطلوب إجراء', nextIsoDate(3), 'تقرير تنفيذي مطلوب'],
  ];
}

export function runSecretaryAutomation(project: ManagedProject, request: string) {
  const context = buildSecretaryProjectContext(project);
  const intent = classifySecretaryRequest(request);

  const actions: string[] = [];
  const createdContacts: string[] = [];
  const createdDrafts: string[] = [];
  const createdCalls: string[] = [];
  const createdEvents: string[] = [];
  const createdTables: string[] = [];

  let tableId = '';
  let primaryContactId = '';

  if (intent.needsContacts || intent.needsTable || intent.needsCalls || intent.needsEmail || intent.needsSchedule) {
    const table = upsertTable({
      title: `متابعة السكرتير - ${project.name}`,
      columns: ['الجهة', 'نوع المتابعة', 'المطلوب', 'الحالة', 'الموعد', 'ملاحظات'],
      rows: buildRows(project, request),
      source: 'السكرتير التنفيذي',
      notes: `طلب السكرتير: ${request}`,
      projectId: project.id,
      projectName: project.name,
      agentId: 'secretary',
    });
    tableId = table.id;
    createdTables.push(table.title);
    actions.push('حفظ جدول متابعة داخل المشروع');
  }

  if (intent.needsContacts || intent.needsCalls || intent.needsEmail || intent.needsSchedule) {
    const contact = upsertSecretaryContact({
      projectId: project.id,
      projectName: project.name,
      name: `جهة متابعة - ${project.name}`,
      contactPerson: 'مسؤول المتابعة',
      status: intent.needsEmail ? 'draft_ready' : intent.needsCalls ? 'contacted' : 'new',
      notes: `تم إنشاؤها من طلب السكرتير: ${request}`,
      sourceTableId: tableId,
      sourceRowIndex: 0,
      nextFollowUpDate: nextIsoDate(1),
    });
    primaryContactId = contact.id;
    createdContacts.push(contact.name);
    addContactHistory(contact.id, { type: 'note', summary: `تم ربط الجهة بالمشروع: ${project.name}` });
    actions.push('حفظ جهة متابعة داخل CRM المشروع');
  }

  if (intent.needsEmail) {
    const draft = createSecretaryEmailDraft({
      projectId: project.id,
      projectName: project.name,
      contactId: primaryContactId,
      to: '',
      subject: `متابعة بخصوص ${project.name}`,
      body: `السلام عليكم،\n\nنرغب في المتابعة بخصوص: ${request}\n\nالمشروع: ${project.name}\nالهدف: ${project.objective || project.description || project.name}\n\nوشكرًا.`,
      status: 'draft',
    });
    createdDrafts.push(draft.subject);
    actions.push('إنشاء مسودة بريد مرتبطة بالمشروع');
  }

  if (intent.needsCalls) {
    createSecretaryCallLog({
      projectId: project.id,
      projectName: project.name,
      contactId: primaryContactId,
      summary: `متابعة اتصال: ${request}`,
      status: 'planned',
      dueDate: nextIsoDate(1),
      dueTime: '10:00',
    });
    createdCalls.push('متابعة اتصال مجدولة');
    actions.push('إنشاء متابعة اتصال داخل المشروع');
  }

  if (intent.needsSchedule) {
    createSecretaryAppointmentReminder({
      projectId: project.id,
      projectName: project.name,
      contactId: primaryContactId,
      title: `موعد متابعة - ${project.name}`,
      description: request,
      dueDate: nextIsoDate(1),
      dueTime: '11:00',
      status: 'planned',
    });
    createdEvents.push('موعد متابعة داخل المشروع');
    actions.push('إنشاء موعد متابعة مرتبط بالمشروع');
  }

  if (!actions.length) {
    actions.push('تحليل الطلب وربطه بسياق المشروع');
  }

  const report = generateSecretaryExecutiveReport({
    projectId: project.id,
    projectName: project.name,
    requestType: intent.type,
    savedTables: createdTables.length,
    createdTasks: createdContacts.length + createdCalls.length,
    createdEvents: createdEvents.length,
    failures: [],
    nextActions: actions,
  });

  return {
    context,
    intent,
    actions,
    report,
    projectOutputs: {
      projectId: project.id,
      projectName: project.name,
      contacts: createdContacts,
      drafts: createdDrafts,
      calls: createdCalls,
      events: createdEvents,
      tables: createdTables,
      tableId,
      primaryContactId,
    },
  };
}
