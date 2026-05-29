import { describe, it, expect, vi } from 'vitest';
import {
  suggestTaskPriority,
  summarizeNote,
  generateTaskReport,
  detectSimilarTasks,
  generateTaskSuggestions,
} from './ai';

// Mock the LLM module
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn(async (params) => {
    // Mock responses based on the message content
    const messageContent = params.messages[params.messages.length - 1]?.content;

    if (messageContent?.includes('أولوية')) {
      return {
        choices: [{ message: { content: 'عالية' } }],
      };
    }

    if (messageContent?.includes('تلخيص')) {
      return {
        choices: [{ message: { content: 'ملخص المحتوى بشكل موجز' } }],
      };
    }

    if (messageContent?.includes('تقرير')) {
      return {
        choices: [{ message: { content: 'تقرير تحليلي شامل' } }],
      };
    }

    return {
      choices: [{ message: { content: '' } }],
    };
  }),
}));

describe('AI Features', () => {
  it('should suggest high priority for urgent tasks', async () => {
    const priority = await suggestTaskPriority(
      'إصلاح خطأ حرج في الإنتاج',
      'هناك مشكلة في الخادم تؤثر على جميع المستخدمين'
    );

    expect(priority).toBe('عالية');
  });

  it('should suggest medium priority for normal tasks', async () => {
    const priority = await suggestTaskPriority(
      'تحديث التوثيق',
      'تحديث ملفات التوثيق'
    );

    expect(['عالية', 'متوسطة', 'منخفضة']).toContain(priority);
  });

  it('should summarize notes correctly', async () => {
    const summary = await summarizeNote('محتوى طويل جداً يحتاج إلى تلخيص');

    expect(summary).toBeTruthy();
    expect(typeof summary).toBe('string');
  });

  it('should generate task reports', async () => {
    const report = await generateTaskReport('بيانات المهام');

    expect(report).toBeTruthy();
    expect(typeof report).toBe('string');
  });

  it('should detect similar tasks', async () => {
    const similar = await detectSimilarTasks('مهمة جديدة', [
      'مهمة قديمة 1',
      'مهمة قديمة 2',
    ]);

    expect(Array.isArray(similar)).toBe(true);
  });

  it('should generate task suggestions', async () => {
    const suggestions = await generateTaskSuggestions([
      'مهمة 1',
      'مهمة 2',
      'مهمة 3',
    ]);

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Test that functions return sensible defaults on error
    const priority = await suggestTaskPriority('', '');
    expect(['عالية', 'متوسطة', 'منخفضة']).toContain(priority);
  });
});
