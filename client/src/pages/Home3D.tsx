import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { ThreeDProjectDashboard } from '@/components/ThreeDProjectDashboard';
import { ThreeDStatistics } from '@/components/ThreeDStatistics';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, FileText, FolderOpen, LayoutDashboard, Search, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';

type ProjectFor3D = {
  id: string;
  name: string;
  progress: number;
  color: number;
};

const demoProjects: ProjectFor3D[] = [
  { id: 'demo-operations', name: 'تشغيل يومي', progress: 76, color: 0xc9a24d },
  { id: 'demo-sales', name: 'متابعة المبيعات', progress: 54, color: 0x6ee7d8 },
  { id: 'demo-growth', name: 'خطة تطوير', progress: 88, color: 0xa78bfa },
];

export function Home3D() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: projects = [] } = trpc.projects.list.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });

  const palette = [0xc9a24d, 0x6ee7d8, 0xa78bfa, 0x86efac, 0xf59e0b, 0xf472b6];
  const projectsFor3D: ProjectFor3D[] = user
    ? projects.map((project, index) => ({
        id: project.id,
        name: project.name,
        progress: Math.min(100, 24 + index * 11),
        color: palette[index % palette.length],
      }))
    : demoProjects;

  const completion = projectsFor3D.length
    ? Math.round(projectsFor3D.reduce((sum, item) => sum + item.progress, 0) / projectsFor3D.length)
    : 0;

  const statisticsData = [
    { label: 'المشاريع', value: projectsFor3D.length, maxValue: Math.max(projectsFor3D.length, 10), color: 0xc9a24d },
    { label: 'متوسط الإنجاز', value: completion, maxValue: 100, color: 0x86efac },
    { label: 'لوحات العمل', value: 4, maxValue: 6, color: 0x6ee7d8 },
    { label: 'مراكز التحكم', value: 8, maxValue: 10, color: 0xa78bfa },
  ];

  const quickActions = [
    { icon: LayoutDashboard, title: 'المهام', text: 'إدارة وتنفيذ اليوميات', path: '/tasks' },
    { icon: FolderOpen, title: 'المشاريع', text: 'متابعة المتطلبات والخطط', path: '/projects' },
    { icon: Calendar, title: 'التقويم', text: 'المواعيد والجداول الزمنية', path: '/calendar' },
    { icon: FileText, title: 'الملاحظات', text: 'توثيق الأفكار والملفات', path: '/notes' },
    { icon: CheckCircle2, title: 'كانبان', text: 'سير العمل حسب المرحلة', path: '/kanban' },
    { icon: Search, title: 'بحث متقدم', text: 'الوصول السريع للمحتوى', path: '/search' },
  ];

  const goToApp = (path: string) => {
    if (user) {
      navigate(path);
      return;
    }

    try {
      window.location.href = getLoginUrl();
    } catch (error) {
      console.error(error);
      alert('تسجيل الدخول غير مهيأ بعد. أضف VITE_OAUTH_PORTAL_URL و VITE_APP_ID في إعدادات الاستضافة.');
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground" dir="rtl">
        <div className="lateen-glass rounded-3xl px-8 py-6 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-primary" />
          <p className="text-muted-foreground">جاري تجهيز الواجهة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,#332715_0%,#0b0a08_42%,#050504_100%)] text-foreground" dir="rtl">
      <div className="lateen-orb right-[-120px] top-[-80px] h-80 w-80 bg-primary" />
      <div className="lateen-orb bottom-[-120px] left-[-100px] h-96 w-96 bg-teal-300" />

      <header className="sticky top-0 z-40 border-b border-primary/15 bg-black/25 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-primary">Lateen Notes</h1>
              <p className="text-sm text-muted-foreground">منصة إنتاجية ومشاريع بواجهة ثلاثية الأبعاد</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => goToApp('/tasks')} className="border-primary/30 bg-black/20">
              {user ? 'الدخول للوحة' : 'تسجيل الدخول'}
            </Button>
            <Button onClick={() => goToApp('/projects')} className="bg-primary text-primary-foreground hover:bg-primary/90">المشاريع</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-7">
            <div className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary">
              {user ? `مرحباً ${user.name || 'بك'} — نفس بياناتك وخصائصك بشكل أفخم` : 'نسخة عرض 3D — سجّل الدخول لعرض بياناتك الحقيقية'}
            </div>
            <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">لوحة تحكم 3D لإدارة المهام، المشاريع، الملاحظات، والتقويم.</h2>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              تم الحفاظ على بنية التطبيق والبيانات الحالية، مع تحويل الواجهة إلى تجربة احترافية داكنة بألوان ذهبية مناسبة لتطبيق إنتاجية وتنظيم أعمال.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => goToApp('/projects')} className="bg-primary text-primary-foreground hover:bg-primary/90">ابدأ من المشاريع</Button>
              <Button size="lg" variant="outline" onClick={() => goToApp('/statistics')} className="border-primary/30 bg-black/20">عرض الإحصائيات</Button>
            </div>
          </div>

          <div className="lateen-glass lateen-3d-card overflow-hidden rounded-[2rem] p-3">
            <ThreeDProjectDashboard
              projects={projectsFor3D}
              onProjectClick={(id) => {
                if (!id.startsWith('demo-')) goToApp(`/projects/${id}`);
              }}
            />
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-4">
          {statisticsData.map((item) => (
            <div key={item.label} className="lateen-glass lateen-3d-card rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-4xl font-black text-primary">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div className="lateen-glass overflow-hidden rounded-[2rem] p-3">
            <ThreeDStatistics data={statisticsData} title="إحصائيات المنصة" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button key={action.path} onClick={() => goToApp(action.path)} className="lateen-glass lateen-3d-card rounded-3xl p-5 text-right">
                <action.icon className="mb-4 h-7 w-7 text-primary" />
                <h3 className="text-lg font-bold">{action.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{action.text}</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
