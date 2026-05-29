import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
// Using browser alerts for notifications

interface AIProjectGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
  onSuccess?: () => void;
}

export function AIProjectGenerationDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onSuccess,
}: AIProjectGenerationDialogProps) {
  const [projectDescription, setProjectDescription] = useState("");
  const [projectType, setProjectType] = useState("عام");
  const [isGenerating, setIsGenerating] = useState(false);


  const generateMutation = trpc.aiProjectGenerator.generateWithAI.useMutation({
    onSuccess: (data) => {
      alert(`✅ تم توليد خطة المشروع بنجاح!\nتم إضافة ${data.stepsCount} خطوات و ${data.requirementsCount} احتياج`);
      setProjectDescription("");
      setProjectType("عام");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      alert(`❌ خطأ في توليد الخطة:\n${error.message}`);
    },
  });

  const handleGenerate = async () => {
    if (!projectDescription.trim()) {
      alert("❌ الرجاء إدخال وصف المشروع تفصيلياً");
      return;
    }

    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({
        projectId,
        projectDescription,
        projectType,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            توليد خطة المشروع بالذكاء الاصطناعي
          </DialogTitle>
          <DialogDescription>
            أدخل وصفاً تفصيلياً لمشروعك وسيقوم الذكاء الاصطناعي بتوليد الخطوات والاحتياجات والميزانية تلقائياً
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {projectName && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>المشروع:</strong> {projectName}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">نوع المشروع</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              disabled={isGenerating}
            >
              <option value="عام">عام</option>
              <option value="موقع إلكتروني تجاري">موقع إلكتروني تجاري</option>
              <option value="تطبيق جوال">تطبيق جوال</option>
              <option value="سجل تجاري">سجل تجاري</option>
              <option value="متجر إلكتروني">متجر إلكتروني</option>
              <option value="نظام إدارة">نظام إدارة</option>
              <option value="مشروع إنشائي">مشروع إنشائي</option>
              <option value="مشروع تسويقي">مشروع تسويقي</option>
              <option value="مشروع استثماري">مشروع استثماري</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              وصف المشروع <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="مثال: أريد إنشاء موقع إلكتروني تجاري لبيع المنتجات الإلكترونية. الموقع يجب أن يحتوي على نظام دفع آمن، سلة تسوق، إدارة المخزون، وتقارير المبيعات. الميزانية المتوقعة حوالي 50,000 ريال والمدة المتوقعة 3 أشهر."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              disabled={isGenerating}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              كلما كان الوصف أكثر تفصيلاً، كانت النتائج أفضل
            </p>
          </div>

          {isGenerating && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-900">
                جاري تحليل المشروع وتوليد الخطة... قد يستغرق دقيقة واحدة
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !projectDescription.trim()}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التوليد...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                توليد الخطة
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
