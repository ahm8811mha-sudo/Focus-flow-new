import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Download } from "lucide-react";
import {
  exportTasksToPDF,
  exportProjectsToPDF,
  exportNotesToPDF,
  downloadPDF,
} from "@/utils/pdfExport";

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks?: any[];
  projects?: any[];
  notes?: any[];
}

export function PDFExportDialog({
  open,
  onOpenChange,
  tasks = [],
  projects = [],
  notes = [],
}: PDFExportDialogProps) {
  const [exportType, setExportType] = useState<"tasks" | "projects" | "notes">(
    "tasks"
  );
  const [title, setTitle] = useState("تقرير المهام");
  const [subtitle, setSubtitle] = useState("تقرير شامل للمهام والإحصائيات");
  const [signature, setSignature] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let doc;
      let filename = "";

      const options = {
        title,
        subtitle: subtitle || undefined,
        signature: signature || undefined,
        dateRange:
          dateFrom && dateTo
            ? {
                from: new Date(dateFrom),
                to: new Date(dateTo),
              }
            : undefined,
      };

      if (exportType === "tasks") {
        doc = exportTasksToPDF(tasks, options);
        filename = `تقرير_المهام_${new Date().toISOString().split("T")[0]}.pdf`;
      } else if (exportType === "projects") {
        doc = exportProjectsToPDF(projects, tasks, options);
        filename = `تقرير_المشاريع_${new Date().toISOString().split("T")[0]}.pdf`;
      } else {
        doc = exportNotesToPDF(notes, options);
        filename = `تقرير_الملاحظات_${new Date().toISOString().split("T")[0]}.pdf`;
      }

      downloadPDF(doc, filename);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("فشل تصدير PDF. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsExporting(false);
    }
  };

  const updateTitle = (type: "tasks" | "projects" | "notes") => {
    const titles = {
      tasks: "تقرير المهام",
      projects: "تقرير المشاريع",
      notes: "تقرير الملاحظات",
    };
    setTitle(titles[type]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            تصدير إلى PDF
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={exportType}
          onValueChange={(value) => {
            setExportType(value as "tasks" | "projects" | "notes");
            updateTitle(value as "tasks" | "projects" | "notes");
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">المهام</TabsTrigger>
            <TabsTrigger value="projects">المشاريع</TabsTrigger>
            <TabsTrigger value="notes">الملاحظات</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان التقرير</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان التقرير"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="أدخل وصف التقرير"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>من التاريخ (اختياري)</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>إلى التاريخ (اختياري)</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>التوقيع (اختياري)</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="أدخل التوقيع أو الاسم"
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
              <p className="text-blue-900 dark:text-blue-100">
                سيتم تصدير {tasks.length} مهمة
              </p>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان التقرير</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان التقرير"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="أدخل وصف التقرير"
              />
            </div>
            <div className="space-y-2">
              <Label>التوقيع (اختياري)</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="أدخل التوقيع أو الاسم"
              />
            </div>
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm">
              <p className="text-green-900 dark:text-green-100">
                سيتم تصدير {projects.length} مشروع و {tasks.length} مهمة
              </p>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان التقرير</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان التقرير"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="أدخل وصف التقرير"
              />
            </div>
            <div className="space-y-2">
              <Label>التوقيع (اختياري)</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="أدخل التوقيع أو الاسم"
              />
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg text-sm">
              <p className="text-purple-900 dark:text-purple-100">
                سيتم تصدير {notes.length} ملاحظة
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "جاري التصدير..." : "تصدير"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
