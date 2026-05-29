import type { Agent, Project, Task, Note } from './localMemory';

export type AgentKind = 'planner' | 'executor' | 'calendar' | 'risk' | 'memory' | 'notification';

export interface AgentOutput {
  agent: string;
  title: string;
  summary: string;
  actions: string[];
  confidence: number;
}

export interface MemoryInsight {
  title: string;
  detail: string;
  score: number;
  type: 'priority' | 'risk' | 'habit' | 'deadline' | 'focus';
}

export interface SmartPlanItem {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  durationDays: number;
  suggestedDate: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function normalize(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

export function runAgent(kind: AgentKind, input: string, context: { projects: Project[]; tasks: Task[]; notes: Note[]; agents: Agent[] }): AgentOutput {
  const prompt = normalize(input || 'حلل حالة النظام واقترح التالي');
  const openTasks = context.tasks.filter((task) => task.status !== 'done');
  const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < today());
  const urgent = openTasks.filter((task) => task.priority === 'urgent' || task.priority === 'high');

  const library: Record<AgentKind, AgentOutput> = {
    planner: {
      agent: 'وكيل التخطيط',
      title: 'خطة تنفيذ عملية',
      summary: `تم تحليل الطلب: ${prompt}. الأفضل تحويله إلى مراحل قصيرة لا تتجاوز 7 أيام لكل مرحلة.`,
      actions: ['حدد نتيجة قابلة للقياس', 'قسّم المشروع إلى 5 مهام رئيسية', 'اربط كل مهمة بتاريخ', 'راجع الخطة يوميًا لمدة 10 دقائق'],
      confidence: 88,
    },
    executor: {
      agent: 'وكيل التنفيذ',
      title: 'خطة اليوم',
      summary: `لديك ${openTasks.length} مهمة مفتوحة. ابدأ بالمهام عالية الأولوية قبل إضافة أي مهام جديدة.`,
      actions: urgent.slice(0, 3).map((task) => `ابدأ: ${task.title}`).concat(['اقفل مهمة واحدة بالكامل قبل الانتقال للتالية']),
      confidence: 82,
    },
    calendar: {
      agent: 'Calendar AI',
      title: 'جدولة ذكية',
      summary: overdue.length ? `يوجد ${overdue.length} مهمة متأخرة تحتاج إعادة جدولة.` : 'لا يوجد تعثر زمني واضح. حافظ على نافذة تركيز يومية.',
      actions: ['احجز 90 دقيقة للمهام الثقيلة', 'اجعل المتابعة آخر اليوم', 'لا تضع أكثر من 3 مهام رئيسية يوميًا'],
      confidence: 79,
    },
    risk: {
      agent: 'وكيل المخاطر',
      title: 'تحليل التعثر',
      summary: overdue.length ? 'الخطر الأساسي الآن هو تراكم المهام المتأخرة.' : 'الخطر الحالي منخفض، لكن راقب المهام بدون تاريخ.',
      actions: ['أضف تاريخًا لكل مهمة مفتوحة', 'حوّل المهام الكبيرة إلى مهام أصغر', 'راجع المشاريع التي لم تتحدث منذ 7 أيام'],
      confidence: 84,
    },
    memory: {
      agent: 'Memory Engine',
      title: 'ذاكرة العمل',
      summary: `تمت قراءة ${context.projects.length} مشروع و${context.tasks.length} مهمة و${context.notes.length} ملاحظة من ذاكرة الجوال.`,
      actions: ['استخرج القرارات المهمة من الملاحظات', 'اربط كل ملاحظة بمشروع', 'احفظ سبب كل تأخير حتى يتعلم النظام نمطك'],
      confidence: 91,
    },
    notification: {
      agent: 'Notifications AI',
      title: 'تنبيهات ذكية',
      summary: 'الأفضل إرسال التنبيه حسب الأولوية وليس حسب الوقت فقط.',
      actions: ['تنبيه عاجل للمهام المتأخرة', 'تنبيه صباحي لأهم 3 مهام', 'تنبيه مسائي بتقرير الإنجاز'],
      confidence: 76,
    },
  };

  const result = library[kind];
  return { ...result, actions: result.actions.length ? result.actions : ['لا توجد توصيات كافية الآن'] };
}

export function buildSmartPlan(prompt: string): SmartPlanItem[] {
  const base = normalize(prompt || 'مشروع جديد');
  return [
    { title: 'تحديد الهدف النهائي', description: `صياغة نتيجة واضحة لـ ${base}.`, priority: 'high', durationDays: 1, suggestedDate: addDays(1) },
    { title: 'تحليل المتطلبات', description: 'حصر البيانات، الأدوات، الأشخاص، والقيود.', priority: 'high', durationDays: 2, suggestedDate: addDays(3) },
    { title: 'بناء خطة تنفيذ', description: 'تقسيم العمل إلى مراحل أسبوعية ومهام قابلة للقياس.', priority: 'medium', durationDays: 3, suggestedDate: addDays(6) },
    { title: 'تنفيذ النسخة الأولى', description: 'تنفيذ MVP سريع للاختبار العملي.', priority: 'urgent', durationDays: 5, suggestedDate: addDays(11) },
    { title: 'مراجعة وتحسين', description: 'تحليل النتائج، إصلاح التعثر، وإعادة ترتيب الأولويات.', priority: 'medium', durationDays: 2, suggestedDate: addDays(14) },
  ];
}

export function createMemoryInsights(context: { projects: Project[]; tasks: Task[]; notes: Note[] }): MemoryInsight[] {
  const open = context.tasks.filter((task) => task.status !== 'done');
  const overdue = open.filter((task) => task.dueDate && task.dueDate < today());
  const noDate = open.filter((task) => !task.dueDate);
  const high = open.filter((task) => task.priority === 'high' || task.priority === 'urgent');
  return [
    { title: 'الأولوية الآن', detail: high[0]?.title || 'ابدأ بإضافة مهمة عالية الأولوية اليوم.', score: high.length ? 92 : 58, type: 'priority' },
    { title: 'خطر التعثر', detail: overdue.length ? `${overdue.length} مهمة متأخرة تحتاج إجراء.` : 'لا توجد مهام متأخرة مسجلة.', score: overdue.length ? 81 : 22, type: 'risk' },
    { title: 'ذاكرة ناقصة', detail: noDate.length ? `${noDate.length} مهمة بدون تاريخ.` : 'المهام مؤرخة بشكل جيد.', score: noDate.length ? 74 : 31, type: 'deadline' },
    { title: 'تركيز اليوم', detail: 'اختر 3 مهام فقط: مهمة ثقيلة، مهمة متابعة، ومهمة إغلاق.', score: 86, type: 'focus' },
  ];
}

export function getNativeAppRoadmap() {
  return [
    'تحويل PWA إلى تطبيق iOS/Android عبر Capacitor',
    'تفعيل SQLite محلي بدل IndexedDB داخل التطبيق الأصلي',
    'إضافة Push Notifications أصلية',
    'إضافة Voice Assistant من Speech Recognition / Native Speech',
    'إضافة Background Sync للنسخ الاحتياطي',
    'رفع التطبيق لاحقًا إلى TestFlight وGoogle Play Internal Testing',
  ];
}
