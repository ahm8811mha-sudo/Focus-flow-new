export type CompanyStage = 'idea' | 'study' | 'decision' | 'funding' | 'execution' | 'proof' | 'closed' | 'rejected' | 'postponed';
export type Department = 'finance' | 'procurement' | 'operations' | 'marketing' | 'government';
export type WorkOrderStatus = 'queued' | 'in_progress' | 'awaiting_proof' | 'verified' | 'blocked';

export type Proof = {
  id: string;
  title: string;
  reference: string;
  createdAt: string;
};

export type WorkOrder = {
  id: string;
  department: Department;
  title: string;
  status: WorkOrderStatus;
  external: boolean;
  requiresProof: boolean;
  budget: number;
  proof: Proof[];
};

export type DecisionLog = {
  id: string;
  outcome: 'approved' | 'rejected' | 'postponed' | 'funded' | 'closed';
  note: string;
  createdAt: string;
};

export type CompanyIdea = {
  id: string;
  number: string;
  title: string;
  description: string;
  expectedValue: string;
  risk: 'low' | 'medium' | 'high';
  budget: number;
  departments: Department[];
  stage: CompanyStage;
  decisionDueDate: string;
  postponementReason?: string;
  reminderDate?: string;
  study: { objective: string; benefit: string; risk: string; recommendation: string };
  workOrders: WorkOrder[];
  decisions: DecisionLog[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'focus-flow-company-workflow-v1';
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const departmentMeta: Record<Department, { label: string; work: string; external: boolean }> = {
  finance: { label: 'المالية', work: 'اعتماد الميزانية وخطة الصرف', external: false },
  procurement: { label: 'المشتريات', work: 'طلب عروض الأسعار واختيار المورد', external: true },
  operations: { label: 'التشغيل', work: 'تجهيز خطة التشغيل والتنفيذ الميداني', external: true },
  marketing: { label: 'التسويق', work: 'إطلاق الحملة وقياس النتائج', external: true },
  government: { label: 'العلاقات الحكومية', work: 'مراجعة المتطلبات والإجراءات الحكومية', external: true },
};

export const companyStages: Array<{ id: CompanyStage; label: string }> = [
  { id: 'idea', label: 'فكرة' },
  { id: 'study', label: 'دراسة' },
  { id: 'decision', label: 'قرار' },
  { id: 'funding', label: 'اعتماد مالي' },
  { id: 'execution', label: 'تنفيذ' },
  { id: 'proof', label: 'إثبات' },
  { id: 'closed', label: 'إغلاق' },
];

export const departments = Object.entries(departmentMeta) as Array<[Department, { label: string; work: string; external: boolean }]>;

export function departmentLabel(department: Department) { return departmentMeta[department].label; }
export function stageLabel(stage: CompanyStage) {
  return ({ idea: 'فكرة جديدة', study: 'قيد الدراسة', decision: 'بانتظار قرار', funding: 'بانتظار اعتماد مالي', execution: 'قيد التنفيذ', proof: 'بانتظار الإثبات', closed: 'مغلق بإثبات', rejected: 'مرفوض', postponed: 'مؤجل' } as Record<CompanyStage, string>)[stage];
}

export function createIdea(input: Pick<CompanyIdea, 'title' | 'description' | 'expectedValue' | 'risk' | 'budget' | 'departments' | 'decisionDueDate'>): CompanyIdea {
  const createdAt = now();
  const number = `IDEA-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const scope = input.description || input.title;
  return {
    id: id('idea'), number, ...input, stage: 'study', createdAt, updatedAt: createdAt,
    study: {
      objective: scope,
      benefit: input.expectedValue || 'حدد العائد التشغيلي أو التجاري المتوقع قبل اتخاذ القرار.',
      risk: input.risk === 'high' ? 'المخاطر عالية؛ لا تعتمد قبل تحديد المالك والميزانية وخطة التخفيف.' : 'تحقق من الميزانية والمالك ومعيار النجاح قبل الاعتماد.',
      recommendation: 'أكمل الدراسة ثم حوّلها إلى مركز القرار. لا يُنشأ أي أمر عمل أو صرف في هذه المرحلة.',
    },
    workOrders: [],
    decisions: [{ id: id('decision'), outcome: 'postponed', note: 'أنشئت الفكرة وتحتاج استكمال الدراسة قبل القرار.', createdAt }],
  };
}

export function makeWorkOrders(idea: CompanyIdea): WorkOrder[] {
  const routes = idea.departments.includes('finance') ? idea.departments : ['finance', ...idea.departments] as Department[];
  return routes.map((department) => ({
    id: id('wo'), department, title: departmentMeta[department].work,
    status: 'queued', external: departmentMeta[department].external,
    requiresProof: departmentMeta[department].external,
    budget: department === 'finance' ? idea.budget : 0,
    proof: [],
  }));
}

export function canClose(idea: CompanyIdea) {
  return idea.workOrders.length > 0 && idea.workOrders.every((order) => !order.requiresProof || order.proof.length > 0);
}

export function loadCompanyIdeas(): CompanyIdea[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

export function saveCompanyIdeas(ideas: CompanyIdea[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas)); }
