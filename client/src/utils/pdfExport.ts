import jsPDF from 'jspdf';
import type { Task, Note, Project } from '@/types';

interface PDFOptions {
  title: string;
  subtitle?: string;
  logo?: string;
  signature?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Download PDF file
 */
export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

/**
 * Format date to Arabic format
 */
const formatDateArabic = (date: Date | null | undefined): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

/**
 * Get priority label in Arabic
 */
const getPriorityLabel = (priority: string | null): string => {
  const priorities: Record<string, string> = {
    عالية: 'عالية',
    متوسطة: 'متوسطة',
    منخفضة: 'منخفضة',
  };
  return priorities[priority || ''] || priority || '-';
};

/**
 * Export tasks to PDF with professional formatting
 */
export const exportTasksToPDF = (
  tasks: any[],
  options: PDFOptions
) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header
    let yPosition = 15;
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(options.title || 'تقرير المهام', doc.internal.pageSize.getWidth() / 2, yPosition, {
      align: 'center',
    });

    yPosition += 10;
    if (options.subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(options.subtitle, doc.internal.pageSize.getWidth() / 2, yPosition, {
        align: 'center',
      });
    }

    // Date range
    yPosition += 8;
    if (options.dateRange) {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const dateText = `من ${formatDateArabic(options.dateRange.from)} إلى ${formatDateArabic(options.dateRange.to)}`;
      doc.text(dateText, doc.internal.pageSize.getWidth() / 2, yPosition, {
        align: 'center',
      });
    }

    // Summary
    yPosition += 12;
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    const completed = tasks.filter((t: any) => t.isDone).length;
    const pending = tasks.length - completed;
    
    doc.text(`إجمالي المهام: ${tasks.length}`, 20, yPosition);
    yPosition += 6;
    doc.text(`المهام المكتملة: ${completed}`, 20, yPosition);
    yPosition += 6;
    doc.text(`المهام المتبقية: ${pending}`, 20, yPosition);
    yPosition += 6;
    doc.text(`نسبة الإنجاز: ${tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0}%`, 20, yPosition);

    // Table
    yPosition += 10;
    const tableData = tasks.map((task: any) => [
      task.title || '-',
      getPriorityLabel(task.priority),
      task.isDone ? 'مكتملة' : 'معلقة',
      formatDateArabic(task.dueDate),
    ]);

    (doc as any).autoTable({
      head: [['المهمة', 'الأولوية', 'الحالة', 'التاريخ المستحق']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      styles: {
        font: 'courier',
        fontSize: 10,
        textColor: [40, 40, 40],
      },
      headStyles: {
        fillColor: [123, 110, 250],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      
      if (options.signature) {
        doc.text(`التوقيع: ${options.signature}`, 20, doc.internal.pageSize.getHeight() - 10);
      }
      
      doc.text(
        `صفحة ${i} من ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      doc.text(
        `تم الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    return doc;
  } catch (error) {
    console.error('Error exporting tasks to PDF:', error);
    throw new Error('فشل تصدير المهام إلى PDF');
  }
};

/**
 * Export projects to PDF with statistics and charts
 */
export const exportProjectsToPDF = (
  projects: any[],
  tasks: any[],
  options: PDFOptions
) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header
    let yPosition = 15;
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(options.title || 'تقرير المشاريع', doc.internal.pageSize.getWidth() / 2, yPosition, {
      align: 'center',
    });

    yPosition += 10;
    if (options.subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(options.subtitle, doc.internal.pageSize.getWidth() / 2, yPosition, {
        align: 'center',
      });
    }

    // Summary
    yPosition += 12;
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`إجمالي المشاريع: ${projects.length}`, 20, yPosition);
    yPosition += 6;
    doc.text(`إجمالي المهام: ${tasks.length}`, 20, yPosition);
    yPosition += 6;
    const completedTasks = tasks.filter((t: any) => t.isDone).length;
    doc.text(`المهام المكتملة: ${completedTasks}`, 20, yPosition);
    yPosition += 6;
    doc.text(`نسبة الإنجاز الكلية: ${tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%`, 20, yPosition);

    // Projects Table
    yPosition += 12;
    const projectTableData = projects.map((project: any) => {
      const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
      const projectCompleted = projectTasks.filter((t: any) => t.isDone).length;
      const projectProgress = projectTasks.length > 0 ? Math.round((projectCompleted / projectTasks.length) * 100) : 0;
      
      return [
        project.name || '-',
        projectTasks.length.toString(),
        projectCompleted.toString(),
        `${projectProgress}%`,
      ];
    });

    (doc as any).autoTable({
      head: [['المشروع', 'إجمالي المهام', 'المهام المكتملة', 'نسبة الإنجاز']],
      body: projectTableData,
      startY: yPosition,
      theme: 'grid',
      styles: {
        font: 'courier',
        fontSize: 10,
        textColor: [40, 40, 40],
      },
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      
      if (options.signature) {
        doc.text(`التوقيع: ${options.signature}`, 20, doc.internal.pageSize.getHeight() - 10);
      }
      
      doc.text(
        `صفحة ${i} من ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      doc.text(
        `تم الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    return doc;
  } catch (error) {
    console.error('Error exporting projects to PDF:', error);
    throw new Error('فشل تصدير المشاريع إلى PDF');
  }
};

/**
 * Export notes to PDF
 */
export const exportNotesToPDF = (
  notes: any[],
  options: PDFOptions
) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header
    let yPosition = 15;
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(options.title || 'تقرير الملاحظات', doc.internal.pageSize.getWidth() / 2, yPosition, {
      align: 'center',
    });

    yPosition += 10;
    if (options.subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(options.subtitle, doc.internal.pageSize.getWidth() / 2, yPosition, {
        align: 'center',
      });
    }

    // Summary
    yPosition += 12;
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`إجمالي الملاحظات: ${notes.length}`, 20, yPosition);

    // Notes
    yPosition += 10;
    notes.forEach((note: any, index: number) => {
      if (yPosition > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`${index + 1}. ${note.title || 'بدون عنوان'}`, 20, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const splitContent = doc.splitTextToSize(note.content || '', 170);
      doc.text(splitContent, 20, yPosition);
      yPosition += splitContent.length * 5 + 5;

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`التاريخ: ${formatDateArabic(note.createdAt)}`, 20, yPosition);
      yPosition += 8;
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      
      if (options.signature) {
        doc.text(`التوقيع: ${options.signature}`, 20, doc.internal.pageSize.getHeight() - 10);
      }
      
      doc.text(
        `صفحة ${i} من ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      doc.text(
        `تم الإنشاء: ${new Date().toLocaleDateString('ar-SA')}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }

    return doc;
  } catch (error) {
    console.error('Error exporting notes to PDF:', error);
    throw new Error('فشل تصدير الملاحظات إلى PDF');
  }
};
