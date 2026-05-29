import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const KANBAN_COLUMNS = [
  { id: "todo", label: "للتنفيذ", color: "bg-blue-100" },
  { id: "in-progress", label: "جارٍ", color: "bg-yellow-100" },
  { id: "review", label: "مراجعة", color: "bg-purple-100" },
  { id: "done", label: "مكتمل", color: "bg-green-100" },
];

interface TaskForm {
  name: string;
  description: string;
  priority: "منخفضة" | "متوسطة" | "عالية";
  dueDate: string;
}

export default function KanbanPage() {
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("todo");
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskForm>({
    name: "",
    description: "",
    priority: "متوسطة",
    dueDate: "",
  });

  const tasksQuery = trpc.tasks.list.useQuery();
  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
    },
  });
  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      resetForm();
      setShowAddTask(false);
    },
  });
  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
    },
  });

  const tasks = tasksQuery.data || [];

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      priority: "متوسطة",
      dueDate: "",
    });
  };

  const handleAddTask = async () => {
    if (!formData.name.trim()) return;
    
    try {
      await createTaskMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        listId: "inbox",
      });
      // Update kanban column after creation
      const newTasks = await tasksQuery.refetch();
      const lastTask = newTasks.data?.[newTasks.data.length - 1];
      if (lastTask) {
        await updateTaskMutation.mutateAsync({
          id: lastTask.id,
          kanbanColumn: selectedColumn,
        });
      }
    } catch (error) {
      console.error("Failed to create task:", error);
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

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedTask) return;
    
    try {
      await updateTaskMutation.mutateAsync({
        id: draggedTask,
        kanbanColumn: columnId,
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setDraggedTask(null);
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
          <h1 className="text-3xl font-bold">كانبان</h1>
          <p className="text-muted-foreground mt-1">إدارة مرئية للمهام</p>
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

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KANBAN_COLUMNS.map(column => {
          const columnTasks = tasks.filter(t => t.kanbanColumn === column.id);
          
          return (
            <div
              key={column.id}
              className="space-y-4"
            >
              {/* Column Header */}
              <div className={`${column.color} rounded-lg p-4`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{column.label}</h2>
                  <span className="bg-white/50 px-2 py-1 rounded text-sm font-medium">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                className="space-y-3 min-h-96 p-3 rounded-lg border-2 border-dashed border-border/50 hover:border-border transition-colors bg-muted/30"
              >
                {columnTasks.length > 0 ? (
                  columnTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{task.name}</h3>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
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
                      </div>
                      <div className="flex gap-2 mt-3 justify-end">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    لا توجد مهام
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مهمة جديدة</DialogTitle>
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
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background h-20 resize-none"
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
              <label className="text-sm font-medium">العمود</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              >
                {KANBAN_COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddTask(false);
              resetForm();
            }}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!formData.name.trim()}
            >
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
