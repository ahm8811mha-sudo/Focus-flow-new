import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

export default function StatisticsPage() {
  const tasksQuery = trpc.tasks.list.useQuery();
  const tasks = tasksQuery.data || [];

  // Calculate statistics
  const completedTasks = tasks.filter(t => t.isDone).length;
  const pendingTasks = tasks.filter(t => !t.isDone).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority distribution
  const priorityData = [
    {
      name: "عالية",
      value: tasks.filter(t => t.priority === "عالية").length,
      color: "#EF4444",
    },
    {
      name: "متوسطة",
      value: tasks.filter(t => t.priority === "متوسطة").length,
      color: "#F59E0B",
    },
    {
      name: "منخفضة",
      value: tasks.filter(t => t.priority === "منخفضة").length,
      color: "#3B82F6",
    },
  ];

  // Status distribution
  const statusData = [
    {
      name: "مكتملة",
      value: completedTasks,
      color: "#10B981",
    },
    {
      name: "قيد الانتظار",
      value: pendingTasks,
      color: "#F59E0B",
    },
  ];

  // Tasks by kanban column
  const kanbanData = [
    {
      name: "للتنفيذ",
      count: tasks.filter(t => t.kanbanColumn === "todo").length,
    },
    {
      name: "جارٍ",
      count: tasks.filter(t => t.kanbanColumn === "in-progress").length,
    },
    {
      name: "مراجعة",
      count: tasks.filter(t => t.kanbanColumn === "review").length,
    },
    {
      name: "مكتمل",
      count: tasks.filter(t => t.kanbanColumn === "done").length,
    },
  ];

  // Overdue tasks
  const today = new Date();
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.isDone) return false;
    try {
      const dueDate = new Date(t.dueDate);
      return dueDate < today;
    } catch {
      return false;
    }
  }).length;

  // Upcoming tasks (next 7 days)
  const upcomingTasks = tasks.filter(t => {
    if (!t.dueDate || t.isDone) return false;
    try {
      const dueDate = new Date(t.dueDate);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      return dueDate >= today && dueDate <= sevenDaysFromNow;
    } catch {
      return false;
    }
  }).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">الإحصائيات والتقارير</h1>
        <p className="text-muted-foreground mt-1">تحليل إنتاجيتك وتقدمك</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المهام</p>
              <p className="text-3xl font-bold mt-2">{totalTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">المهام المكتملة</p>
              <p className="text-3xl font-bold mt-2">{completedTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">المهام المعلقة</p>
              <p className="text-3xl font-bold mt-2">{pendingTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">معدل الإنجاز</p>
              <p className="text-3xl font-bold mt-2">{completionRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {(overdueTasks > 0 || upcomingTasks > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {overdueTasks > 0 && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">{overdueTasks} مهام متأخرة</p>
                  <p className="text-sm text-red-700">تحتاج إلى اهتمام فوري</p>
                </div>
              </div>
            </Card>
          )}
          {upcomingTasks > 0 && (
            <Card className="p-4 border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">{upcomingTasks} مهام قادمة</p>
                  <p className="text-sm text-blue-700">في الأيام السبعة القادمة</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">توزيع الأولويات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">توزيع الحالة</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Kanban Column Distribution */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">توزيع المهام حسب الحالة</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kanbanData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#7C6EFA" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">ملخص الأداء</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">معدل إنجاز المهام</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent/70"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="font-semibold">{completionRate}%</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">المهام ذات الأولوية العالية</span>
            <span className="font-semibold">{priorityData[0].value}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">المهام المتأخرة</span>
            <span className="font-semibold text-red-600">{overdueTasks}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">المهام القادمة</span>
            <span className="font-semibold text-blue-600">{upcomingTasks}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
