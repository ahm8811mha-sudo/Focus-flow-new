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

  const projects = projectsQuery.data || [];
  const tasks = tasksQuery.data || [];

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
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const completedTasks = projectTasks.filter(t => t.isDone).length;
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
    const completedTasks = tasks.filter(t => t.isDone).length;
    const pendingTasks = totalTasks - completedTasks;
    const highPriorityTasks = tasks.filter(t => t.priority === "عالية").length;
    
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
      عالية: projects.filter(p => p.priority === "عالية").length,
      متوسطة: projects.filter(p => p.priority === "متوسطة").length,
      منخفضة: projects.filter(p => p.priority === "منخفضة").length,
    };
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getStatusDistribution = () => {
    const distribution = {
      "نشط": projects.filter(p => p.status === "active").length,
      "معلق": projects.filter(p => p.status === "on-hold").length,
      "مكتمل": projects.filter(p => p.status === "completed").length,
    };
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getTasksPerProject = () => {
    return projects.map(p => ({
      name: p.name,
      المهام: tasks.filter(t => t.projectId === p.id).length,
      مكتملة: tasks.filter(t => t.projectId === p.id && t.isDone).length,
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
      name: project.name,
      description: project.description || "",
      color: project.color,
      icon: project.icon,
      priority: project.priority || "متوسطة",
      status: project.status || "نشط",
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
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "الكل" || (p.status as string) === filterStatus;
    const matchesPriority = filterPriority === "الكل" || p.priority === filterPriority;
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
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">المهام حسب المشروع</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={tasksPerProject}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="المهام" fill="#3b82f6" />
                <Bar dataKey="مكتملة" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
              <Input
                placeholder="ابحث عن مشروع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <option value="الكل">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="on-hold">معلق</option>
              <option value="completed">مكتمل</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <option value="الكل">جميع الأولويات</option>
              <option value="عالية">عالية</option>
              <option value="متوسطة">متوسطة</option>
              <option value="منخفضة">منخفضة</option>
            </select>
            <Button onClick={() => { resetForm(); setEditingProject(null); setShowAddProject(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              مشروع جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const stats = getProjectStats(project.id);
              return (
                <Card key={project.id} className="p-6 hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{project.icon}</div>
                      <div>
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <p className="text-sm text-gray-400">{project.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>التقدم</span>
                        <span className="font-semibold">{stats.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.progress}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-800/50 p-2 rounded">
                        <p className="text-xs text-gray-400">إجمالي</p>
                        <p className="font-semibold">{stats.total}</p>
                      </div>
                      <div className="bg-green-900/20 p-2 rounded">
                        <p className="text-xs text-gray-400">مكتملة</p>
                        <p className="font-semibold text-green-400">{stats.completed}</p>
                      </div>
                      <div className="bg-orange-900/20 p-2 rounded">
                        <p className="text-xs text-gray-400">معلقة</p>
                        <p className="font-semibold text-orange-400">{stats.pending}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-gray-800 rounded">الأولوية: {project.priority}</span>
                      <span className="px-2 py-1 bg-gray-800 rounded">الحالة: {project.status === "active" ? "نشط" : project.status === "on-hold" ? "معلق" : project.status === "completed" ? "مكتمل" : "مؤرشف"}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">الجدول الزمني للمشاريع</h3>
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl">{project.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{project.name}</h4>
                    <p className="text-sm text-gray-400">{project.startDate || "لم يتم تحديد"} - {project.endDate || "لم يتم تحديد"}</p>
                  </div>
                    <span className="px-3 py-1 bg-blue-900/20 text-blue-400 rounded-full text-sm">{project.status === "active" ? "نشط" : project.status === "on-hold" ? "معلق" : project.status === "completed" ? "مكتمل" : "مؤرشف"}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">تقرير الأداء</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">متوسط التقدم</p>
                  <p className="text-2xl font-bold">{Math.round(projects.reduce((acc, p) => acc + getProjectStats(p.id).progress, 0) / (projects.length || 1))}%</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">المشاريع النشطة</p>
                  <p className="text-2xl font-bold">{projects.filter(p => p.status === "active").length}</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">إعدادات المشاريع</h3>
            <p className="text-gray-400">قريباً: إعدادات متقدمة للمشاريع والقوالب والأدوار</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Project Dialog */}
      <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? "تعديل المشروع" : "مشروع جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">اسم المشروع</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم المشروع"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">الوصف</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="أدخل وصف المشروع"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">اللون</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS_PALETTE.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-lg border-2 ${formData.color === color ? "border-white" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">الأيقونة</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center ${formData.icon === icon ? "border-white bg-gray-700" : "border-gray-700"}`}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">الأولوية</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                >
                  <option value="عالية">عالية</option>
                  <option value="متوسطة">متوسطة</option>
                  <option value="منخفضة">منخفضة</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                >
                  <option value="active">نشط</option>
                  <option value="on-hold">معلق</option>
                  <option value="completed">مكتمل</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddProject(false); setEditingProject(null); resetForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleAddProject} disabled={!formData.name.trim()}>
              {editingProject ? "حفظ التغييرات" : "إنشاء المشروع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
