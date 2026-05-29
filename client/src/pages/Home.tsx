import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { LayoutGrid, Calendar, Kanban, FileText, FolderOpen, BarChart3, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user && !loading) {
      navigate("/tasks");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-l from-accent to-accent/70 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/50" dir="rtl">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-l from-accent to-accent/70 flex items-center justify-center text-white font-bold">
              ل
            </div>
            <div>
              <h1 className="font-bold text-lg">Lateen Notes</h1>
              <p className="text-xs text-muted-foreground">إدارة مهامك بذكاء</p>
            </div>
          </div>
          <Button onClick={() => window.location.href = getLoginUrl()}>
            تسجيل الدخول
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-5xl md:text-6xl font-black leading-tight">
            أدرِ مهامك بكفاءة
            <br />
            <span className="bg-gradient-to-l from-accent to-accent/70 bg-clip-text text-transparent">
              وحقق أحلامك
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            تطبيق إدارة مهام عربي شامل مع دعم التقويم الهجري والميلادي، لوحة كانبان، وملاحظات ذكية
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
              className="gap-2"
            >
              ابدأ الآن
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline">
              اعرف المزيد
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon={<LayoutGrid className="w-6 h-6" />}
            title="إدارة المهام"
            description="أنشئ وتتبع مهامك مع أولويات وتواريخ استحقاق"
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="تقويم ذكي"
            description="دعم كامل للتقويم الهجري والميلادي"
          />
          <FeatureCard
            icon={<Kanban className="w-6 h-6" />}
            title="لوحة كانبان"
            description="عرض مرئي لمراحل المهام بسهولة"
          />
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            title="الملاحظات"
            description="احفظ أفكارك بدعم Markdown"
          />
          <FeatureCard
            icon={<FolderOpen className="w-6 h-6" />}
            title="المشاريع"
            description="نظم مهامك في مشاريع منفصلة"
          />
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="الإحصائيات"
            description="تحليل إنتاجيتك وتقدمك"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 bg-muted/50 py-20">
        <div className="container max-w-4xl mx-auto px-4 text-center space-y-6">
          <h3 className="text-3xl font-bold">جاهز لتنظيم حياتك؟</h3>
          <p className="text-lg text-muted-foreground">
            انضم إلى الآلاف من المستخدمين الذين يستخدمون Lateen Notes لتحسين إنتاجيتهم
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
            className="gap-2"
          >
            ابدأ مجاناً
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container max-w-6xl mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2026 Lateen Notes. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:border-accent/50 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
