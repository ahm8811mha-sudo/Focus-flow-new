import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { projects, projectSteps, projectRequirements } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";

// Retry logic for LLM calls
async function invokeLLMWithRetry(
  messages: any[],
  maxRetries: number = 3
): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`LLM attempt ${attempt}/${maxRetries}...`);
      
      const response = await invokeLLM({
        messages,
      });
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`LLM attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// Generate default steps based on project type
function generateDefaultSteps(projectType: string): Array<{name: string; description: string; duration: number}> {
  const defaults: Record<string, Array<{name: string; description: string; duration: number}>> = {
    "موقع تجاري": [
      { name: "التخطيط والتصميم", description: "تخطيط الموقع وتصميم الواجهة", duration: 7 },
      { name: "تطوير Backend", description: "بناء الخادم وقاعدة البيانات", duration: 14 },
      { name: "تطوير Frontend", description: "بناء الواجهة الأمامية", duration: 14 },
      { name: "الاختبار والتطوير", description: "اختبار شامل وإصلاح الأخطاء", duration: 7 },
      { name: "النشر والإطلاق", description: "نشر الموقع على الإنترنت", duration: 3 },
    ],
    "تطبيق جوال": [
      { name: "التخطيط والتصميم", description: "تصميم واجهة التطبيق", duration: 7 },
      { name: "التطوير", description: "برمجة التطبيق", duration: 21 },
      { name: "الاختبار", description: "اختبار التطبيق على أجهزة مختلفة", duration: 7 },
      { name: "النشر", description: "نشر التطبيق على متاجر التطبيقات", duration: 3 },
    ],
    "سجل تجاري": [
      { name: "تجهيز المستندات", description: "جمع وتحضير جميع المستندات المطلوبة", duration: 3 },
      { name: "التقديم للجهات الحكومية", description: "تقديم الطلب والمستندات", duration: 5 },
      { name: "المراجعة والموافقة", description: "انتظار مراجعة الطلب والموافقة عليه", duration: 7 },
      { name: "الاستخراج والتسليم", description: "استخراج السجل التجاري", duration: 2 },
    ],
    "عام": [
      { name: "التخطيط", description: "تخطيط المشروع والأهداف", duration: 5 },
      { name: "التنفيذ", description: "تنفيذ المشروع", duration: 15 },
      { name: "المراجعة والتحسين", description: "مراجعة النتائج والتحسينات", duration: 5 },
      { name: "الإطلاق", description: "إطلاق المشروع", duration: 3 },
    ],
  };

  return defaults[projectType] || defaults["عام"];
}

// Generate default requirements based on project type
function generateDefaultRequirements(projectType: string): Array<{name: string; type: string; quantity: string; cost: number}> {
  const defaults: Record<string, Array<{name: string; type: string; quantity: string; cost: number}>> = {
    "موقع تجاري": [
      { name: "استضافة الموقع", type: "budget", quantity: "سنة", cost: 1200 },
      { name: "نطاق الموقع (Domain)", type: "budget", quantity: "سنة", cost: 300 },
      { name: "شهادة أمان SSL", type: "budget", quantity: "سنة", cost: 600 },
      { name: "فريق التطوير", type: "personnel", quantity: "3 أشخاص", cost: 15000 },
    ],
    "تطبيق جوال": [
      { name: "أدوات التطوير", type: "equipment", quantity: "1", cost: 5000 },
      { name: "خدمات الاستضافة", type: "budget", quantity: "سنة", cost: 2000 },
      { name: "فريق التطوير", type: "personnel", quantity: "4 أشخاص", cost: 20000 },
    ],
    "سجل تجاري": [
      { name: "الرسوم الحكومية", type: "budget", quantity: "1", cost: 500 },
      { name: "الصور الشخصية", type: "material", quantity: "4", cost: 50 },
      { name: "الهوية الوطنية", type: "material", quantity: "1", cost: 0 },
    ],
    "عام": [
      { name: "التخطيط والاستشارة", type: "personnel", quantity: "1", cost: 5000 },
      { name: "الموارد والمواد", type: "material", quantity: "متعدد", cost: 3000 },
      { name: "الأدوات والمعدات", type: "equipment", quantity: "متعدد", cost: 2000 },
    ],
  };

  return defaults[projectType] || defaults["عام"];
}

export const aiProjectGeneratorRouter = router({
  generateWithAI: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        projectDescription: z.string(),
        projectType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);

      if (!project.length) throw new Error("Project not found");

      try {
        // Create a simplified prompt
        const prompt = `أنت مدير مشاريع خبير. اقرأ وصف المشروع التالي وقدم قائمة بالخطوات والاحتياجات.

وصف المشروع: ${input.projectDescription}
نوع المشروع: ${input.projectType || "عام"}

قدم الإجابة بصيغة نصية بسيطة (بدون JSON):

الخطوات:
1. [اسم الخطوة] - [وصف] - [عدد الأيام]
2. [اسم الخطوة] - [وصف] - [عدد الأيام]

الاحتياجات:
1. [اسم الاحتياج] - [النوع: مادي/مالي/أفراد] - [الكمية] - [التكلفة]
2. [اسم الاحتياج] - [النوع: مادي/مالي/أفراد] - [الكمية] - [التكلفة]`;

        const response = await invokeLLMWithRetry([
          {
            role: "system",
            content: "أنت مدير مشاريع خبير. قدم إجابة واضحة وبسيطة.",
          },
          {
            role: "user",
            content: prompt,
          },
        ]);

        const content = response.choices[0].message.content;
        console.log("LLM Response:", content);

        // Parse steps from response
        let steps = generateDefaultSteps(input.projectType || "عام");
        try {
          const stepsMatch = content.match(/الخطوات:([\s\S]*?)(?:الاحتياجات:|$)/);
          if (stepsMatch) {
            const stepsText = stepsMatch[1];
            const stepLines = stepsText.split("\n").filter((line: string) => line.trim());
            const parsedSteps = [];
            
            for (const line of stepLines) {
              const match = line.match(/\d+\.\s*\[?([^\-\]]+)\]?\s*-\s*([^\-]+)\s*-\s*(\d+)/);
              if (match) {
                parsedSteps.push({
                  name: match[1].trim(),
                  description: match[2].trim(),
                  duration: Math.max(1, parseInt(match[3]) || 1),
                });
              }
            }
            if (parsedSteps.length > 0) {
              steps = parsedSteps;
            }
          }
        } catch (e) {
          console.error("Error parsing steps, using defaults:", e);
        }

        // Parse requirements from response
        let requirements = generateDefaultRequirements(input.projectType || "عام");
        try {
          const reqMatch = content.match(/الاحتياجات:([\s\S]*?)$/);
          if (reqMatch) {
            const reqText = reqMatch[1];
            const reqLines = reqText.split("\n").filter((line: string) => line.trim());
            const parsedReqs = [];
            
            for (const line of reqLines) {
              const match = line.match(/\d+\.\s*\[?([^\-\]]+)\]?\s*-\s*([^\-]+)\s*-\s*([^\-]+)\s*-\s*(\d+)/);
              if (match) {
                parsedReqs.push({
                  name: match[1].trim(),
                  type: match[2].trim().toLowerCase().includes("مادي") ? "material" : 
                        match[2].trim().toLowerCase().includes("مالي") ? "budget" :
                        match[2].trim().toLowerCase().includes("أفراد") ? "personnel" : "resource",
                  quantity: match[3].trim(),
                  cost: Math.max(0, parseInt(match[4]) || 0),
                });
              }
            }
            if (parsedReqs.length > 0) {
              requirements = parsedReqs;
            }
          }
        } catch (e) {
          console.error("Error parsing requirements, using defaults:", e);
        }

        // Insert steps
        const insertedSteps = [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const stepId = nanoid();
          const startDate = new Date().toISOString().split("T")[0];
          
          await db.insert(projectSteps).values({
            id: stepId,
            projectId: input.projectId,
            stepName: step.name || `خطوة ${i + 1}`,
            description: step.description || "",
            duration: Math.max(1, step.duration || 1),
            startDate: startDate,
            order: i,
          });
          insertedSteps.push(stepId);
        }

        // Insert requirements
        const insertedRequirements = [];
        for (const req of requirements) {
          const reqId = nanoid();
          const costValue = Math.max(0, req.cost || 0);
          
          await db.insert(projectRequirements).values({
            id: reqId,
            projectId: input.projectId,
            requirementName: req.name || "احتياج",
            type: req.type as any,
            quantity: req.quantity || "1",
            unit: "وحدة",
            estimatedCost: costValue as any,
            status: "pending" as any,
            priority: "متوسطة" as any,
            description: "",
          });
          insertedRequirements.push(reqId);
        }

        const totalCost = requirements.reduce((sum, r) => sum + (r.cost || 0), 0);
        const totalDays = steps.reduce((sum, s) => sum + (s.duration || 1), 0);

        return {
          success: true,
          stepsCount: insertedSteps.length,
          requirementsCount: insertedRequirements.length,
          generatedPlan: {
            timeline: {
              totalDays,
              startDate: new Date().toISOString().split("T")[0],
              endDate: new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            },
            budget: {
              total: totalCost,
              materials: Math.floor(totalCost * 0.3),
              labor: Math.floor(totalCost * 0.5),
              government: Math.floor(totalCost * 0.1),
              contingency: Math.floor(totalCost * 0.1),
            },
            risks: [
              { risk: "تأخير في الجدول الزمني", mitigation: "إضافة وقت احتياطي بنسبة 20%" },
              { risk: "تجاوز الميزانية", mitigation: "مراقبة النفقات أسبوعياً" },
            ],
          },
        };
      } catch (error) {
        console.error("AI generation error:", error);
        
        // Fallback: generate default plan
        const defaultSteps = generateDefaultSteps(input.projectType || "عام");
        const defaultReqs = generateDefaultRequirements(input.projectType || "عام");
        
        const insertedSteps = [];
        for (let i = 0; i < defaultSteps.length; i++) {
          const step = defaultSteps[i];
          const stepId = nanoid();
          const startDate = new Date().toISOString().split("T")[0];
          
          await db.insert(projectSteps).values({
            id: stepId,
            projectId: input.projectId,
            stepName: step.name,
            description: step.description,
            duration: step.duration,
            startDate: startDate,
            order: i,
          });
          insertedSteps.push(stepId);
        }

        const insertedRequirements = [];
        for (const req of defaultReqs) {
          const reqId = nanoid();
          
          await db.insert(projectRequirements).values({
            id: reqId,
            projectId: input.projectId,
            requirementName: req.name,
            type: req.type as any,
            quantity: req.quantity,
            unit: "وحدة",
            estimatedCost: req.cost as any,
            status: "pending" as any,
            priority: "متوسطة" as any,
            description: "",
          });
          insertedRequirements.push(reqId);
        }

        const totalCost = defaultReqs.reduce((sum, r) => sum + r.cost, 0);
        const totalDays = defaultSteps.reduce((sum, s) => sum + s.duration, 0);

        return {
          success: true,
          stepsCount: insertedSteps.length,
          requirementsCount: insertedRequirements.length,
          isDefault: true,
          generatedPlan: {
            timeline: {
              totalDays,
              startDate: new Date().toISOString().split("T")[0],
              endDate: new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            },
            budget: {
              total: totalCost,
              materials: Math.floor(totalCost * 0.3),
              labor: Math.floor(totalCost * 0.5),
              government: Math.floor(totalCost * 0.1),
              contingency: Math.floor(totalCost * 0.1),
            },
            risks: [],
          },
        };
      }
    }),
});
