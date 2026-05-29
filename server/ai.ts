import { invokeLLM } from './_core/llm';

/**
 * Helper to extract string content from LLM response
 */
function extractContent(content: string | unknown): string {
  if (typeof content === 'string') return content;
  return '';
}

/**
 * Analyze task and suggest optimal priority
 */
export async function suggestTaskPriority(taskTitle: string, taskDescription: string): Promise<'عالية' | 'متوسطة' | 'منخفضة'> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'أنت مساعد ذكي متخصص في إدارة المهام. حلل المهام واقترح الأولوية المناسبة. أجب بكلمة واحدة فقط: عالية أو متوسطة أو منخفضة',
        },
        {
          role: 'user',
          content: `المهمة: ${taskTitle}\nالوصف: ${taskDescription}\n\nما هي الأولوية المناسبة؟`,
        },
      ],
    });

    const priority = extractContent(response.choices[0]?.message.content).toLowerCase();
    if (priority.includes('عالية')) return 'عالية';
    if (priority.includes('متوسطة')) return 'متوسطة';
    return 'منخفضة';
  } catch (error) {
    console.error('Error suggesting priority:', error);
    return 'متوسطة';
  }
}

/**
 * Summarize note content using AI
 */
export async function summarizeNote(content: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'أنت محرر ذكي متخصص في تلخيص النصوص. قم بتلخيص المحتوى بشكل موجز وواضح باللغة العربية.',
        },
        {
          role: 'user',
          content: `الرجاء تلخيص المحتوى التالي:\n\n${content}`,
        },
      ],
    });

    const summary = extractContent(response.choices[0]?.message.content);
    return summary || content;
  } catch (error) {
    console.error('Error summarizing note:', error);
    return content;
  }
}

/**
 * Generate analytical report for tasks
 */
export async function generateTaskReport(tasksData: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'أنت محلل بيانات ذكي. قم بتحليل بيانات المهام وتقديم رؤى واقتراحات قيمة.',
        },
        {
          role: 'user',
          content: `حلل بيانات المهام التالية وقدم تقرير تحليلي:\n\n${tasksData}`,
        },
      ],
    });

    return extractContent(response.choices[0]?.message.content);
  } catch (error) {
    console.error('Error generating report:', error);
    return '';
  }
}

/**
 * Detect duplicate or similar tasks
 */
export async function detectSimilarTasks(taskTitle: string, existingTasks: string[]): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'أنت نظام ذكي لكشف المهام المتشابهة. قارن المهمة الجديدة مع المهام الموجودة وحدد المتشابهة.',
        },
        {
          role: 'user',
          content: `المهمة الجديدة: ${taskTitle}\n\nالمهام الموجودة:\n${existingTasks.join('\n')}\n\nحدد أرقام المهام المتشابهة (أو اترك فارغاً إن لم توجد)`,
        },
      ],
    });

    const result = extractContent(response.choices[0]?.message.content);
    return result.split('\n').filter((line: string) => line.trim());
  } catch (error) {
    console.error('Error detecting similar tasks:', error);
    return [];
  }
}

/**
 * Generate smart task suggestions based on user patterns
 */
export async function generateTaskSuggestions(recentTasks: string[]): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'أنت مساعد ذكي في إدارة المهام. بناءً على المهام السابقة، اقترح مهام جديدة قد تكون مفيدة.',
        },
        {
          role: 'user',
          content: `المهام الأخيرة:\n${recentTasks.join('\n')}\n\nاقترح 3-5 مهام جديدة قد تكون مفيدة`,
        },
      ],
    });

    const suggestions = extractContent(response.choices[0]?.message.content);
    return suggestions.split('\n').filter((line: string) => line.trim());
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}
