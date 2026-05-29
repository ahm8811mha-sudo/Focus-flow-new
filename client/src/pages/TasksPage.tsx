import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Search, Filter, Edit2, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TaskForm {
  name: string;
  description: string;
  priority: "منخفضة" | "متوسطة" | "عالية";
  dueDate: string;
  dueTime: string;
  listId: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndDate: string;
}

export default function TasksPage() {
  const [searchText, setSearchText] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedList, setSelectedList] = useState("inbox");
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskForm>({
    name: "",
    description: "",
    priority: "متوسطة",
    dueDate: "",
    dueTime: "",
    listId: "inbox",
    recurrence: "none",
    recurrenceEndDate: "",
  });

  const tasksQuery = trpc.tasks.list.useQuery();
  const listsQuery = trpc.lists.list.useQuery();
  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      resetForm();
      setShowAddTask(false);
    },
  });
  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      resetForm();
      setEditingTask(null);
    },
  });
  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
    },
  });
  const toggleTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
    },
  });

  const tasks = tasksQuery.data || [];
  const lists = listsQuery.data || [];

  const filteredTasks = tasks.filter(task => 
    task.name.includes(searchText) || task.description?.includes(searchText)
  );

  const pendingTasks = filteredTasks.filter(t => !t.isDone);
  const completedTasks = filteredTasks.filter(t => t.isDone);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      priority: "متوسطة",
      dueDate: "",
      dueTime: "",
      listId: "inbox",
      recurrence: "none",
      recurrenceEndDate: "",
    });
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      await toggleTaskMutation.mutateAsync({
        id: taskId,
        isDone: !currentStatus,
      });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const handleAddTask = async () => {
    if (!formData.name.trim()) return;
    
    try {
      await createTaskMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        dueTime: formData.dueTime || undefined,
        listId: formData.listId,
        recurrence: formData.recurrence || "none",
      });
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!formData.name.trim()) return;
    
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        name: formData.name,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        dueTime: formData.dueTime || undefined,
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
      try {
        await deleteTaskMutation.mutateAsync({ id: taskId });
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "عالية":
        return "bg-red-100 text-red-700";
      case "متوسطة":
        return "bg-yellow-100 text-yellow-700";
      case "منخفضة":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مهامي</h1>
          <p className="text-muted-foreground mt-1">
            {pendingTasks.length} مهمة معلقة
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setEditingTask(null);
          setShowAddTask(true);
        }} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة مهمة
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث في المهام..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-3 pr-10 py-2 border rounded-lg bg-background"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          تصفية
        </Button>
      </div>

      {/* Lists */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {lists.map(list => (
          <button
            key={list.id}
            onClick={() => setSelectedList(list.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedList === list.id
                ? "bg-accent text-accent-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {list.icon} {list.name}
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="space-y-4">
        {pendingTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">المهام المعلقة</h2>
            <div className="space-y-2">
              {pendingTasks.map(task => (
                <Card key={task.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.isDone ?? false}
                      onChange={() => handleToggleTask(task.id, task.isDone ?? false)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{task.name}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {task.priority && (
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted">
                            {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setFormData({
                            name: task.name,
                            description: task.description || "",
                            priority: (task.priority as "منخفضة" | "متوسطة" | "عالية") || "متوسطة",
                            dueDate: task.dueDate || "",
                            dueTime: task.dueTime || "",
                            listId: task.listId,
                            recurrence: (task.recurrence as "none" | "daily" | "weekly" | "monthly") || "none",
                            recurrenceEndDate: task.recurrenceEndDate || "",
                          });
                          setEditingTask(task.id);
                          setShowAddTask(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
              المهام المكتملة ({completedTasks.length})
            </h2>
            <div className="space-y-2">
              {completedTasks.map(task => (
                <Card key={task.id} className="p-4 opacity-60">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.isDone ?? false}
                      onChange={() => handleToggleTask(task.id, task.isDone ?? false)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium line-through">{task.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleTask(task.id, task.isDone ?? false)}
                        className="p-2 hover:bg-yellow-100 rounded-lg text-yellow-600"
                        title="إرجاع إلى المهام المعلقة"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد مهام</p>
          </div>
        )}
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "تعديل المهمة" : "إضافة مهمة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">عنوان المهمة *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل عنوان المهمة"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              />
            </div>

            <div>
              <label className="text-sm font-medium">الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="أدخل وصف المهمة (اختياري)"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background h-24 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium">الأولوية</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              >
                <option value="منخفضة">منخفضة</option>
                <option value="متوسطة">متوسطة</option>
                <option value="عالية">عالية</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">التاريخ</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">الوقت</label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">القائمة</label>
              <select
                value={formData.listId}
                onChange={(e) => setFormData({ ...formData, listId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              >
                {lists.map(list => (
                  <option key={list.id} value={list.id}>
                    {list.icon} {list.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">تكرار المهمة</label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              >
                <option value="none">بدون تكرار</option>
                <option value="daily">يومياً</option>
                <option value="weekly">أسبوعياً</option>
                <option value="monthly">شهرياً</option>
              </select>
            </div>

            {formData.recurrence !== "none" && (
              <div>
                <label className="text-sm font-medium">انتهاء التكرار (اختياري)</label>
                <input
                  type="date"
                  value={formData.recurrenceEndDate}
                  onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddTask(false);
              resetForm();
              setEditingTask(null);
            }}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (editingTask) {
                  handleUpdateTask(editingTask);
                } else {
                  handleAddTask();
                }
              }}
              disabled={!formData.name.trim()}
            >
              {editingTask ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
