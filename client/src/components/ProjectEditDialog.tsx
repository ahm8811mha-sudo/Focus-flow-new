import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const ICONS = ['🚀', '📱', '💼', '🎯', '📊', '🔧', '📚', '🎨', '🎭', '🏆', '⚡', '🌟'];
const PRIORITIES = ['منخفضة', 'متوسطة', 'عالية'];
const STATUSES = ['active', 'on-hold', 'completed', 'archived'];
const STATUS_LABELS = { active: 'نشط', 'on-hold': 'معلق', completed: 'مكتمل', archived: 'مؤرشف' };

interface ProjectEditDialogProps {
  project?: any;
  onSave: (data: any) => Promise<void>;
  trigger?: React.ReactNode;
}

export function ProjectEditDialog({ project, onSave, trigger }: ProjectEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    icon: project?.icon || ICONS[0],
    color: project?.color || COLORS[0],
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    priority: project?.priority || 'متوسطة',
    status: project?.status || 'active',
    visibility: project?.visibility || 'private',
  });

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setIsLoading(true);
    try {
      await onSave(formData);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit2 className="w-4 h-4 mr-2" />
            تعديل
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'تعديل المشروع' : 'إنشاء مشروع جديد'}</DialogTitle>
          <DialogDescription>
            أضف أو عدّل تفاصيل المشروع الشاملة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">المعلومات الأساسية</h3>
            <Input
              placeholder="اسم المشروع"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Textarea
              placeholder="وصف المشروع"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">الأيقونة</label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`p-3 text-2xl rounded-lg border-2 transition ${
                    formData.icon === icon
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">اللون</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg border-2 transition ${
                    formData.color === color
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">تاريخ البدء</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">تاريخ الانتهاء</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الأولوية</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="text-sm font-medium">الرؤية</label>
            <div className="flex gap-2">
              {['private', 'shared', 'public'].map((v) => (
                <button
                  key={v}
                  onClick={() => setFormData({ ...formData, visibility: v })}
                  className={`px-3 py-2 rounded-md border transition ${
                    formData.visibility === v
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {v === 'private' ? 'خاص' : v === 'shared' ? 'مشترك' : 'عام'}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ المشروع'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
