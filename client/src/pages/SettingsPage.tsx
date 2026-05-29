import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, User, Bell, Palette, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PDFExportDialog } from "@/components/PDFExportDialog";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [showPDFExport, setShowPDFExport] = useState(false);

  const tasksQuery = trpc.tasks.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const notesQuery = trpc.notes.list.useQuery();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
    },
  });

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة تفضيلاتك وحسابك</p>
      </div>

      {/* Profile Section */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-l from-accent to-accent/70 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name || "المستخدم"}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-3 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">طريقة تسجيل الدخول</span>
            <span className="font-medium">{user?.loginMethod || "Manus OAuth"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">تاريخ الانضمام</span>
            <span className="font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "-"}
            </span>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">الإشعارات</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">إشعارات المهام المستحقة</p>
              <p className="text-sm text-muted-foreground">تنبيهات للمهام التي تقترب تواريخ استحقاقها</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">إشعارات المهام المكتملة</p>
              <p className="text-sm text-muted-foreground">تنبيهات عند إكمال المهام</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">إشعارات يومية</p>
              <p className="text-sm text-muted-foreground">ملخص يومي لمهامك</p>
            </div>
            <input type="checkbox" className="w-5 h-5" />
          </div>
        </div>
      </Card>

      {/* Appearance Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">المظهر</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-3">المظهر</p>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg border-2 border-accent bg-accent/10 text-accent font-medium">
                فاتح
              </button>
              <button className="px-4 py-2 rounded-lg border border-border hover:bg-muted">
                غامق
              </button>
              <button className="px-4 py-2 rounded-lg border border-border hover:bg-muted">
                تلقائي
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">التصدير</h3>
        </div>
        <p className="text-muted-foreground mb-4">تصدير بيانات التطبيق إلى ملفات PDF احترافية</p>
        <Button 
          onClick={() => setShowPDFExport(true)}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          تصدير إلى PDF
        </Button>
      </Card>

      {/* About Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">حول التطبيق</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الإصدار</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">آخر تحديث</span>
            <span className="font-medium">18 مارس 2026</span>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm">
              سياسة الخصوصية
            </Button>
            <Button variant="outline" size="sm">
              شروط الاستخدام
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-900 mb-4">منطقة الخطر</h3>
        <p className="text-sm text-red-700 mb-4">
          تسجيل الخروج سيقطع اتصالك بحسابك. ستتمكن من تسجيل الدخول مرة أخرى في أي وقت.
        </p>
        <Button
          variant="destructive"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          {logoutMutation.isPending ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
        </Button>
      </Card>

      {/* PDF Export Dialog */}
      <PDFExportDialog
        open={showPDFExport}
        onOpenChange={setShowPDFExport}
        tasks={tasksQuery.data || []}
        projects={projectsQuery.data || []}
        notes={notesQuery.data || []}
      />
    </div>
  );
}
