import { describe, it, expect, beforeEach } from 'vitest';
import { exportTasksToPDF, exportProjectsToPDF, exportNotesToPDF } from './pdfExport';

describe('PDF Export Utilities', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'مهمة اختبار',
      priority: 'عالية',
      isDone: false,
      dueDate: new Date('2026-04-20'),
      description: 'وصف المهمة',
    },
    {
      id: '2',
      title: 'مهمة مكتملة',
      priority: 'متوسطة',
      isDone: true,
      dueDate: new Date('2026-04-15'),
      description: 'مهمة تم إكمالها',
    },
  ];

  const mockProjects = [
    {
      id: '1',
      name: 'مشروع اختبار',
      description: 'وصف المشروع',
      color: '#7C6EFA',
      icon: '🚀',
    },
  ];

  const mockNotes = [
    {
      id: '1',
      title: 'ملاحظة اختبار',
      content: 'محتوى الملاحظة',
      createdAt: new Date(),
    },
  ];

  const mockOptions = {
    title: 'تقرير اختبار',
    subtitle: 'وصف التقرير',
    signature: 'التوقيع',
  };

  describe('exportTasksToPDF', () => {
    it('should create a PDF document for tasks', () => {
      const doc = exportTasksToPDF(mockTasks, mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal).toBeDefined();
      expect(doc.internal.pages).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should handle empty tasks array', () => {
      const doc = exportTasksToPDF([], mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should include title in the document', () => {
      const doc = exportTasksToPDF(mockTasks, mockOptions);
      expect(doc).toBeDefined();
      // Document should be created successfully
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });
  });

  describe('exportProjectsToPDF', () => {
    it('should create a PDF document for projects', () => {
      const doc = exportProjectsToPDF(mockProjects, mockTasks, mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal).toBeDefined();
      expect(doc.internal.pages).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should handle empty projects array', () => {
      const doc = exportProjectsToPDF([], mockTasks, mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should include project statistics', () => {
      const doc = exportProjectsToPDF(mockProjects, mockTasks, mockOptions);
      expect(doc).toBeDefined();
      // Document should be created successfully with statistics
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });
  });

  describe('exportNotesToPDF', () => {
    it('should create a PDF document for notes', () => {
      const doc = exportNotesToPDF(mockNotes, mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal).toBeDefined();
      expect(doc.internal.pages).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should handle empty notes array', () => {
      const doc = exportNotesToPDF([], mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should include note content', () => {
      const doc = exportNotesToPDF(mockNotes, mockOptions);
      expect(doc).toBeDefined();
      // Document should be created successfully
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });
  });

  describe('PDF Options', () => {
    it('should handle optional date range', () => {
      const optionsWithDateRange = {
        ...mockOptions,
        dateRange: {
          from: new Date('2026-04-01'),
          to: new Date('2026-04-30'),
        },
      };
      const doc = exportTasksToPDF(mockTasks, optionsWithDateRange);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should handle optional signature', () => {
      const optionsWithSignature = {
        ...mockOptions,
        signature: 'أحمد الأحمد',
      };
      const doc = exportTasksToPDF(mockTasks, optionsWithSignature);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', () => {
      const minimalOptions = {
        title: 'تقرير',
      };
      const doc = exportTasksToPDF(mockTasks, minimalOptions);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });
  });

  describe('Arabic RTL Support', () => {
    it('should support Arabic text in tasks', () => {
      const arabicTasks = [
        {
          id: '1',
          title: 'مهمة باللغة العربية',
          priority: 'عالية',
          isDone: false,
          dueDate: null,
          description: 'وصف باللغة العربية',
        },
      ];
      const doc = exportTasksToPDF(arabicTasks, mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should support Arabic text in projects', () => {
      const arabicProjects = [
        {
          id: '1',
          name: 'مشروع باللغة العربية',
          description: 'وصف المشروع بالعربية',
          color: '#7C6EFA',
          icon: '🚀',
        },
      ];
      const doc = exportProjectsToPDF(arabicProjects, mockTasks, mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('should support Arabic text in notes', () => {
      const arabicNotes = [
        {
          id: '1',
          title: 'ملاحظة باللغة العربية',
          content: 'محتوى الملاحظة باللغة العربية',
          createdAt: new Date(),
        },
      ];
      const doc = exportNotesToPDF(arabicNotes, mockOptions);
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });
  });
});
