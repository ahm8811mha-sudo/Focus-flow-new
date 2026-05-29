import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit2, Trash2, BarChart3, Users, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ProjectForm {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
const ICONS = ["🚀", "📱", "💼", "🎯", "📊", "🔧", "📚", "🎨"];

export default function ProjectsPageAdvanced() {
  const [, navigate] = useLocation();
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectForm>({
    name: "",
    description: "",
    color: COLORS[0],
    icon: ICONS[0],
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
      color: COLORS[0],
      icon: ICONS[0],
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

  const handleDeleteProject = async (id: string) => {
    if (confirm("هل تريد حذف هذا المشروع؟")) {
      try {
        await deleteProjectMutation.mutateAsync({ id });
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    }
  };

  const chartData = projects.map(project => {
    const stats = getProjectStats(project.id);
    return {
      name: project.name,
      مكتمل: stats.completed,
      معلق: stats.pending,
    };
  });

  const priorityData = [
    {
      name: "عالية",
      value: tasks.filter(t => t.priority === "عالية").length,
    },
    {
      name: "متوسطة",
      value: tasks.filter(t => t.priority === "متوسطة").length,
    },
    {
      name: "منخفضة",
      value: tasks.filter(t => t.priority === "منخفضة").length,
    },
  ];

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const selectedProjectStats = selectedProject ? getProjectStats(selectedProject) : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">المشاريع</h1>
            <p className="text-muted-foreground">إدارة مشاريعك وتتبع التقدم</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setEditingProject(null);
              setShowAddProject(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            مشروع جديد
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">إجمالي المشاريع</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">إجمالي المهام</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">المهام المكتملة</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.isDone).length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">نسبة الإنجاز</p>
                <p className="text-2xl font-bold">
                  {tasks.length > 0 ? Math.round((tasks.filter(t => t.isDone).length / tasks.length) * 100) : 0}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tasks by Project */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">المهام حسب المشروع</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="مكتمل" fill="#10b981" />
                  <Bar dataKey="معلق" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">لا توجد مشاريع بعد</p>
            )}
          </Card>

          {/* Priority Distribution */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">توزيع الأولويات</h2>
            {priorityData.some(d => d.value > 0) ? (
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">لا توجد مهام بعد</p>
            )}
          </Card>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const stats = getProjectStats(project.id);
            return (
              <Card
                key={project.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: project.color + "20" }}
                    >
                      {project.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({
                          name: project.name,
                          description: project.description || "",
                          color: project.color || COLORS[0],
                          icon: project.icon || ICONS[0],
                        });
                        setEditingProject(project.id);
                        setShowAddProject(true);
                      }}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">التقدم</span>
                    <span className="text-sm text-muted-foreground">{stats.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">إجمالي</p>
                    <p className="font-semibold">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">مكتمل</p>
                    <p className="font-semibold text-green-600">{stats.completed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">معلق</p>
                    <p className="font-semibold text-yellow-600">{stats.pending}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Selected Project Details */}
        {selectedProjectData && selectedProjectStats && (
          <Card className="mt-8 p-6">
            <h2 className="text-xl font-semibold mb-4">تفاصيل المشروع: {selectedProjectData.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">إجمالي المهام</p>
                <p className="text-2xl font-bold">{selectedProjectStats.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">المهام المكتملة</p>
                <p className="text-2xl font-bold text-green-600">{selectedProjectStats.completed}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">المهام المعلقة</p>
                <p className="text-2xl font-bold text-yellow-600">{selectedProjectStats.pending}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">نسبة الإنجاز</p>
                <p className="text-2xl font-bold text-blue-600">{selectedProjectStats.progress}%</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Add/Edit Project Dialog */}
      <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "تعديل المشروع" : "مشروع جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">اسم المشروع</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mt-1"
                placeholder="أدخل اسم المشروع"
              />
            </div>

            <div>
              <label className="text-sm font-medium">الوصف</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mt-1"
                placeholder="أدخل وصف المشروع"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">اللون</label>
              <div className="flex gap-2 mt-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      formData.color === color ? "border-black" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">الأيقونة</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 rounded-lg border-2 text-xl ${
                      formData.icon === icon ? "border-black bg-muted" : "border-transparent"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProject(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddProject}>
              {editingProject ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
