import type { ProjectStage, StageStatus } from './types';

export type PMPStageHealth = 'green' | 'yellow' | 'red' | 'gray';

export type PMPExtension = {
  startDate?: string;
  endDate?: string;
  progress?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  acceptanceCriteria?: string[];
  stakeholders?: string[];
  approvals?: string[];
  constraints?: string[];
  assumptions?: string[];
  budgetEstimate?: string;
  actualCost?: string;
  ownerRole?: string;
};

export type PMPStage = ProjectStage & PMPExtension;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function statusProgress(status: StageStatus) {
  if (status === 'done') return 100;
  if (status === 'in_progress') return 50;
  if (status === 'waiting') return 25;
  return 0;
}

export function enhancePMPStage(stage: ProjectStage): PMPStage {
  return {
    ...stage,
    startDate: (stage as PMPStage).startDate || todayIso(),
    endDate: (stage as PMPStage).endDate || stage.dueDate || todayIso(),
    progress: typeof (stage as PMPStage).progress === 'number' ? (stage as PMPStage).progress : statusProgress(stage.status),
    riskLevel: (stage as PMPStage).riskLevel || (stage.status === 'waiting' ? 'medium' : 'low'),
    dependencies: Array.isArray((stage as PMPStage).dependencies) ? (stage as PMPStage).dependencies : [],
    acceptanceCriteria: Array.isArray((stage as PMPStage).acceptanceCriteria) ? (stage as PMPStage).acceptanceCriteria : [stage.deliverable || 'مخرج واضح قابل للمراجعة'],
    stakeholders: Array.isArray((stage as PMPStage).stakeholders) ? (stage as PMPStage).stakeholders : [],
    approvals: Array.isArray((stage as PMPStage).approvals) ? (stage as PMPStage).approvals : [],
    constraints: Array.isArray((stage as PMPStage).constraints) ? (stage as PMPStage).constraints : [],
    assumptions: Array.isArray((stage as PMPStage).assumptions) ? (stage as PMPStage).assumptions : [],
    budgetEstimate: (stage as PMPStage).budgetEstimate || '',
    actualCost: (stage as PMPStage).actualCost || '',
    ownerRole: (stage as PMPStage).ownerRole || '',
  };
}

export function stageHealth(stage: PMPStage): PMPStageHealth {
  if (stage.status === 'done') return 'green';
  if (stage.riskLevel === 'critical' || stage.riskLevel === 'high') return 'red';
  if (stage.status === 'waiting' || stage.riskLevel === 'medium') return 'yellow';
  if (stage.status === 'not_started') return 'gray';
  return 'green';
}

export function pmpCompletion(stage: PMPStage) {
  const fields = [stage.title, stage.deliverable, stage.startDate, stage.endDate, stage.acceptanceCriteria?.length, stage.owner, stage.status];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
