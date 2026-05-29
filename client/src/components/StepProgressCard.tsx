import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit2,
  Save,
  X,
} from "lucide-react";
import type { ProjectStep } from "@/types";

interface StepProgressCardProps {
  step: ProjectStep;
  onUpdate: (step: Partial<ProjectStep>) => Promise<void>;
  isLoading?: boolean;
}

export function StepProgressCard({
  step,
  onUpdate,
  isLoading = false,
}: StepProgressCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    isCompleted: step.isCompleted || false,
    status: step.status || "pending",
    progress: step.progress || 0,
    actualStartDate: step.actualStartDate || "",
    actualEndDate: step.actualEndDate || "",
    notes: step.notes || "",
  });

  const handleSave = async () => {
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update step:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "delayed":
        return <AlertCircle className="w-4 h-4" />;
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const calculateDaysRemaining = () => {
    if (!step.plannedEndDate) return null;
    const endDate = new Date(step.plannedEndDate);
    const today = new Date();
    const daysRemaining = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysRemaining;
  };

  const daysRemaining = calculateDaysRemaining();

  if (isEditing) {
    return (
      <Card className="p-4 border-l-4 border-l-blue-500">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{step.name}</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-1" />
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-1" />
                حفظ
              </Button>
            </div>
          </div>

          {/* Completion Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id={`completed-${step.id}`}
              checked={formData.isCompleted}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  isCompleted: checked as boolean,
                  status: checked ? "completed" : formData.status,
                })
              }
            />
            <Label htmlFor={`completed-${step.id}`} className="cursor-pointer">
              تم إنجاز هذه الخطوة
            </Label>
          </div>

          {/* Status Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">الحالة</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled' | 'delayed' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="in-progress">قيد التنفيذ</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="delayed">متأخرة</SelectItem>
                <SelectItem value="on-hold">معلقة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Progress Slider */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              نسبة الإنجاز: {formData.progress}%
            </Label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  progress: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                تاريخ البدء الفعلي
              </Label>
              <Input
                type="date"
                value={formData.actualStartDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actualStartDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                تاريخ الانتهاء الفعلي
              </Label>
              <Input
                type="date"
                value={formData.actualEndDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actualEndDate: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">ملاحظات</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="أضف ملاحظات حول هذه الخطوة..."
              className="min-h-[100px]"
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header with Status */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-600">
                الخطوة #{step.id.slice(0, 4)}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  formData.status
                )}`}
              >
                {getStatusIcon(formData.status)}
                {formData.status === "pending" && "قيد الانتظار"}
                {formData.status === "in-progress" && "قيد التنفيذ"}
                {formData.status === "completed" && "مكتملة"}
                {formData.status === "delayed" && "متأخرة"}
                {formData.status === "on-hold" && "معلقة"}
                {formData.status === "cancelled" && "ملغاة"}
              </span>
            </div>
            <h3 className="font-semibold text-lg">{step.name}</h3>
            {step.description && (
              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-600">
              نسبة الإنجاز
            </span>
            <span className="text-sm font-semibold">{formData.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${formData.progress}%` }}
            />
          </div>
        </div>

        {/* Timeline Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600">البدء المخطط:</span>
            <p className="font-medium">{step.startDate || "غير محدد"}</p>
          </div>
          <div>
            <span className="text-gray-600">الانتهاء المخطط:</span>
            <p className="font-medium">{step.plannedEndDate || "غير محدد"}</p>
          </div>
        </div>

        {/* Actual Dates if available */}
        {(formData.actualStartDate || formData.actualEndDate) && (
          <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded">
            <div>
              <span className="text-gray-600">البدء الفعلي:</span>
              <p className="font-medium">{formData.actualStartDate || "-"}</p>
            </div>
            <div>
              <span className="text-gray-600">الانتهاء الفعلي:</span>
              <p className="font-medium">{formData.actualEndDate || "-"}</p>
            </div>
          </div>
        )}

        {/* Days Remaining */}
        {daysRemaining !== null && (
          <div
            className={`text-xs p-2 rounded ${
              daysRemaining < 0
                ? "bg-red-50 text-red-700"
                : daysRemaining < 3
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-green-50 text-green-700"
            }`}
          >
            {daysRemaining < 0
              ? `متأخرة بـ ${Math.abs(daysRemaining)} أيام`
              : daysRemaining === 0
                ? "ينتهي اليوم"
                : `${daysRemaining} أيام متبقية`}
          </div>
        )}

        {/* Notes Preview */}
        {formData.notes && (
          <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
            <p className="text-gray-700">
              <strong>ملاحظات:</strong> {formData.notes}
            </p>
          </div>
        )}

        {/* Completion Badge */}
        {formData.isCompleted && (
          <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 p-2 rounded">
            <CheckCircle className="w-4 h-4" />
            تم إنجاز هذه الخطوة بنجاح
          </div>
        )}
      </div>
    </Card>
  );
}
