import { classifySecretaryRequest } from './requestClassifier';
import { buildSecretaryProjectContext } from './projectContext';
import { generateSecretaryExecutiveReport } from './reportGenerator';
import type { ManagedProject } from '@/components/projects/types';

export function runSecretaryAutomation(project: ManagedProject, request: string) {
  const context = buildSecretaryProjectContext(project);
  const intent = classifySecretaryRequest(request);

  const actions: string[] = [];

  if (intent.needsContacts) {
    actions.push('إنشاء جدول جهات');
  }

  if (intent.needsEmail) {
    actions.push('إنشاء مسودات بريد');
  }

  if (intent.needsCalls) {
    actions.push('إنشاء متابعات اتصال');
  }

  if (intent.needsSchedule) {
    actions.push('إنشاء مواعيد وتقويم');
  }

  const report = generateSecretaryExecutiveReport({
    projectId: project.id,
    projectName: project.name,
    requestType: intent.type,
    savedTables: intent.needsTable ? 1 : 0,
    createdTasks: intent.needsContacts ? 1 : 0,
    createdEvents: intent.needsSchedule ? 1 : 0,
    nextActions: actions,
  });

  return {
    context,
    intent,
    actions,
    report,
  };
}
