import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Download, FileJson, FileText } from "lucide-react";

interface SearchFilters {
  query: string;
  priority: "all" | "منخفضة" | "متوسطة" | "عالية";
  status: "all" | "pending" | "completed";
  startDate: string;
  endDate: string;
  listId: string;
  projectId: string;
}

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    priority: "all",
    status: "all",
    startDate: "",
    endDate: "",
    listId: "",
    projectId: "",
  });

  const tasksQuery = trpc.tasks.list.useQuery();
  const listsQuery = trpc.lists.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();

  const tasks = tasksQuery.data || [];
  const lists = listsQuery.data || [];
  const projects = projectsQuery.data || [];

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    // Text search
    if (
      filters.query &&
      !task.name.toLowerCase().includes(filters.query.toLowerCase()) &&
      !task.description?.toLowerCase().includes(filters.query.toLowerCase())
    ) {
      return false;
    }

    // Priority filter
    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }

    // Status filter
    if (filters.status === "pending" && task.isDone) return false;
    if (filters.status === "completed" && !task.isDone) return false;

    // Date range filter
    if (filters.startDate && task.dueDate && task.dueDate < filters.startDate) {
      return false;
    }
    if (filters.endDate && task.dueDate && task.dueDate > filters.endDate) {
      return false;
    }

    // List filter
    if (filters.listId && task.listId !== filters.listId) {
      return false;
    }

    // Project filter
    if (filters.projectId && task.projectId !== filters.projectId) {
      return false;
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ["العنوان", "الأولوية", "الحالة", "التاريخ", "الوقت", "الوصف"];
    const rows = filteredTasks.map(task => [
      task.name,
      task.priority,
      task.isDone ? "مكتملة" : "قيد التنفيذ",
      task.dueDate || "",
      task.dueTime || "",
      task.description || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const data = filteredTasks.map(task => ({
      عنوان: task.name,
      أولوية: task.priority,
      حالة: task.isDone ? "مكتملة" : "قيد التنفيذ",
      تاريخ: task.dueDate,
      وقت: task.dueTime,
      وصف: task.description,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">بحث متقدم</h1>
        <p className="text-muted-foreground mt-1">
          البحث والتصفية المتقدمة للمهام
        </p>
      </div>

      {/* Search Filters */}
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">البحث</label>
          <div className="relative mt-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث عن المهام..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full pl-3 pr-10 py-2 border rounded-lg bg-background"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">الأولوية</label>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  priority: e.target.value as any,
                })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">الكل</option>
              <option value="منخفضة">منخفضة</option>
              <option value="متوسطة">متوسطة</option>
              <option value="عالية">عالية</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">الحالة</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as any,
                })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">الكل</option>
              <option value="pending">قيد التنفيذ</option>
              <option value="completed">مكتملة</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">من التاريخ</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
            />
          </div>

          <div>
            <label className="text-sm font-medium">إلى التاريخ</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
            />
          </div>

          <div>
            <label className="text-sm font-medium">القائمة</label>
            <select
              value={filters.listId}
              onChange={(e) =>
                setFilters({ ...filters, listId: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
            >
              <option value="">الكل</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.icon} {list.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">المشروع</label>
            <select
              value={filters.projectId}
              onChange={(e) =>
                setFilters({ ...filters, projectId: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
            >
              <option value="">الكل</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.icon} {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                query: "",
                priority: "all",
                status: "all",
                startDate: "",
                endDate: "",
                listId: "",
                projectId: "",
              })
            }
          >
            إعادة تعيين
          </Button>
        </div>
      </Card>

      {/* Export Options */}
      <div className="flex gap-2">
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          تصدير CSV
        </Button>
        <Button onClick={exportToJSON} variant="outline" className="gap-2">
          <FileJson className="w-4 h-4" />
          تصدير JSON
        </Button>
      </div>

      {/* Results */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          النتائج ({filteredTasks.length})
        </h2>

        {filteredTasks.length > 0 ? (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{task.name}</h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {task.priority}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {task.isDone ? "مكتملة" : "قيد التنفيذ"}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </div>
  );
}
