import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, BarChart3, Users, CheckCircle2, Clock, Calendar, Layout, FileText, Settings, Search, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface ProjectForm {
  name: string;
  description: string;
  color: string;
  icon: string;
  startDate?: string;
  endDate?: string;
  priority?: "منخفضة" | "متوسطة" | "عالية";
  status?: "active" | "archived" | "completed" | "on-hold";
}

const COLORS_PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"];
const ICONS = ["🚀", "📱", "💼", "🎯", "📊", "🔧", "📚", "🎨", "🌟", "⚡"];
const CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
const asArray = <T,>(value: any): T[] => Array.isArray(value) ? value : [];

export default function ProjectsPageEnhanced() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("الكل");
  const [filterPriority, setFilterPriority] = useState<string>("الكل");
  
  const [formData, setFormData] = useState<ProjectForm>({
    name: "",
    description: "",
    color: COLORS_PALETTE[0],
    icon: ICONS[0],
    priority: "متوسطة",
    status: "active",
  });

  const projectsQuery = trpc.projects.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery();
  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      resetForm();
      setShowAddProject(false);
    },
  });
  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      resetForm();
      setEditingProject(null);
    },
  });
  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
    },
  });

  const projects = asArray<any>(projectsQuery.data);
  const tasks = asArray<any>(tasksQuery.data);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: COLORS_PALETTE[0],
      icon: ICONS[0],
      priority: "متوسطة",
      status: "active",
    });
  };

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(t => t?.projectId === projectId);
    const completedTasks = projectTasks.filter(t => t?.isDone || t?.status === 'done').length;
    const totalTasks = projectTasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      total: totalTasks,
      completed: completedTasks,
      pending: totalTasks - completedTasks,
      progress: Math.round(progress),
    };
  };

  const getOverallStats = () => {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t?.isDone || t?.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;
    const highPriorityTasks = tasks.filter(t => t?.priority === "عالية" || t?.priority === 'high' || t?.priority === 'urgent').length;
    
    return {
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      highPriorityTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  };

  const getPriorityDistribution = () => {
    const distribution = {
      عالية: projects.filter(p => p?.priority === "عالية" || p?.priority === 'high' || p?.priority === 'urgent').length,
      متوسطة: projects.filter(p => !p?.priority || p?.priority === "متوسطة" || p?.priority === 'medium').length,
      منخفضة: projects.filter(p => p?.priority === "منخفضة" || p?.priority === 'low').length,
    };
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getStatusDistribution = () => {
    const distribution = {
      "نشط": projects.filter(p => !p?.status || p?.status === "active").length,
      "معلق": projects.filter(p => p?.status === "on-hold").length,
      "مكتمل": projects.filter(p => p?.status === "completed" || p?.status === 'done').length,
    };
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getTasksPerProject = () => {
    return projects.map(p => ({
      name: p?.name || p?.title || 'مشروع',
      المهام: tasks.filter(t => t?.projectId === p?.id).length,
      مكتملة: tasks.filter(t => t?.projectId === p?.id && (t?.isDone || t?.status === 'done')).length,
    }));
  };

  const handleAddProject = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingProject) {
        await updateProjectMutation.mutateAsync({
          id: editingProject,
          ...formData,
        });
      } else {
        await createProjectMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project.id);
    setFormData({
      name: project?.name || project?.title || '',
      description: project?.description || "",
      color: project?.color || COLORS_PALETTE[0],
      icon: project?.icon || ICONS[0],
      priority: project?.priority || "متوسطة",
      status: project?.status || "active",
    });
    setShowAddProject(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المشروع؟")) {
      try {
        await deleteProjectMutation.mutateAsync({ id: projectId });
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    }
  };

  const filteredProjects = projects.filter(p => {
    const projectName = String(p?.name || p?.title || '').toLowerCase();
    const matchesSearch = projectName.includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "الكل" || String(p?.status || 'active') === filterStatus;
    const matchesPriority = filterPriority === "الكل" || p?.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = getOverallStats();
  const priorityData = getPriorityDistribution();
  const statusData = getStatusDistribution();
  const tasksPerProject = getTasksPerProject();

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">المشاريع</h1>
        <p className="text-gray-400">إدارة مشاريعك وتتبع تقدمك</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            <span className="hidden sm:inline">المشاريع</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">الجدول الزمني</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">التحليلات</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">الإعدادات</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">إجمالي المشاريع</p>
                  <p className="text-3xl font-bold text-blue-400">{stats.totalProjects}</p>
                </div>
                <Layout className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">إجمالي المهام</p>
                  <p className="text-3xl font-bold text-green-400">{stats.totalTasks}</p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">مكتملة</p>
                  <p className="text-3xl font-bold text-purple-400">{stats.completedTasks}</p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">معلقة</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.pendingTasks}</p>
                </div>
                <Clock className="w-12 h-12 text-orange-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">نسبة الإنجاز</p>
                  <p className="text-3xl font-bold text-red-400">{stats.completionRate}%</p>
                </div>
                <BarChart3 className="w-12 h-12 text-red-500 opacity-20" />
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">توزيع الأولويات</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">توزيع الحالات</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <Input placeholder="البحث في المشاريع..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
            </div>
            <Button onClick={() => setShowAddProject(true)}>
              <Plus className="w-4 h-4 ml-2" />
              مشروع جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const projectStats = getProjectStats(project.id);
              return (
                <Card key={project.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-3xl mb-2">{project.icon || '📁'}</div>
                      <h3 className="text-xl font-bold">{project.name || project.title || 'مشروع'}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEditProject(project)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteProject(project.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{project.description || 'بدون وصف'}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>التقدم</span><span>{projectStats.progress}%</span></div>
                    <div className="w-full bg-gray-700 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${projectStats.progress}%` }} /></div>
                    <div className="flex justify-between text-sm text-gray-400"><span>{projectStats.completed} مكتملة</span><span>{projectStats.total} إجمالي</span></div>
                  </div>
                </Card>
              );
            })}
            {!filteredProjects.length && <Card className="p-8 text-center text-gray-400">لا توجد مشاريع مطابقة.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card className="p-6"><h3 className="text-lg font-semibold mb-4">الجدول الزمني</h3><p className="text-gray-400">عرض زمني للمشاريع والمهام قيد التطوير.</p></Card>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-6">
          <Card className="p-6"><h3 className="text-lg font-semibold mb-4">المهام حسب المشروع</h3><ResponsiveContainer width="100%" height={300}><BarChart data={tasksPerProject}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="المهام" fill="#3b82f6" /><Bar dataKey="مكتملة" fill="#10b981" /></BarChart></ResponsiveContainer></Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-6"><Card className="p-6"><h3 className="text-lg font-semibold mb-4">إعدادات المشاريع</h3><p className="text-gray-400">تخصيص إعدادات المشاريع قيد التطوير.</p></Card></TabsContent>
      </Tabs>

      <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProject ? "تعديل المشروع" : "مشروع جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="اسم المشروع" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Textarea placeholder="وصف المشروع" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddProject(false)}>إلغاء</Button><Button onClick={handleAddProject}>{editingProject ? "حفظ" : "إضافة"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
