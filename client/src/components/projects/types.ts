import type { Priority } from '@/lib/localMemory';

export type StageStatus = 'not_started' | 'in_progress' | 'waiting' | 'done';
export type ProjectAgent = 'chief' | 'assistant' | 'calendar' | 'finance' | 'learning';

export type AgentResult = {
  status: 'done' | 'in_progress' | 'failed';
  summary: string;
  outputs: string[];
  rows?: any[];
  columns?: string[];
  tables?: number;
  tasks?: number;
  drafts?: number;
  events?: number;
  updatedAt: string;
};

export type ProjectStage = {
  id: string;
  title: string;
  owner: ProjectAgent;
  status: StageStatus;
  dueDate?: string;
  notes?: string;
  deliverable?: string;
  lastRun?: string;
  runCount?: number;
  agentResult?: AgentResult;
};

export type ProjectTask = {
  id: string;
  title: string;
  owner: ProjectAgent;
  status: StageStatus;
  dueDate?: string;
  notes?: string;
  result?: string;
  lastRun?: string;
  runCount?: number;
  agentResult?: AgentResult;
};

export type StoredAgentResult = {
  id: string;
  agentName: string;
  goal: string;
  status: string;
  summary: string;
  results?: string[];
  failures?: string[];
  tasks?: string[];
  tables?: string[];
  events?: string[];
  drafts?: string[];
  createdAt: string;
};

export type ManagedProject = {
  id: string;
  name: string;
  description: string;
  priority: Priority | 'urgent';
  status: StageStatus;
  objective: string;
  scope: string;
  createdAt: string;
  dueDate?: string;
  stages: ProjectStage[];
  projectTasks?: ProjectTask[];
  executionLog?: string[];
  agentResults?: StoredAgentResult[];
};

export const STORAGE_KEY = 'focus-flow-managed-projects-v3';
export const agentLabel: Record<ProjectAgent, string> = { chief: 'القائد العام', assistant: 'السكرتير الشامل', calendar: 'التقويم', finance: 'المال', learning: 'التعلم' };
export const statusLabel: Record<StageStatus, string> = { not_started: 'لم يبدأ', in_progress: 'قيد التنفيذ', waiting: 'بانتظار قرار', done: 'مكتمل' };
