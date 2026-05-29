import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { projects, projectTeamRoles, projectSteps, projectRequirements } from "../drizzle/schema";
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
      console.log(`Team Role LLM attempt ${attempt}/${maxRetries}...`);
      
      const response = await invokeLLM({
        messages,
      });
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Team Role LLM attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

export const aiTeamRoleGeneratorRouter = router({
  generateTeamRoles: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
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
        // Get existing project steps and requirements
        const steps = await db
          .select()
          .from(projectSteps)
          .where(eq(projectSteps.projectId, input.projectId));

        const requirements = await db
          .select()
          .from(projectRequirements)
          .where(eq(projectRequirements.projectId, input.projectId));

        // Create prompt for LLM to generate team roles
        const projectInfo = {
          name: project[0].name,
          description: project[0].description,
          stepsCount: steps.length,
          requirementsCount: requirements.length,
          steps: steps.map((s) => ({
            name: s.stepName,
            duration: s.duration,
            description: s.description,
          })),
          requirements: requirements.map((r) => ({
            name: r.requirementName,
            type: r.type,
            description: r.description,
          })),
        };

        const prompt = `أنت خبير في إدارة المشاريع والموارد البشرية. قم بتحليل المشروع التالي واقترح الأدوار والمسؤوليات المثلى لتنفيذه.

معلومات المشروع:
${JSON.stringify(projectInfo, null, 2)}

قدم استجابة JSON بالهيكل التالي فقط (بدون نصوص إضافية):
{
  "teamRoles": [
    {
      "roleName": "اسم الدور بالعربية",
      "roleType": "manager|developer|designer|qa|devops|analyst|consultant|other",
      "roleDescription": "وصف الدور",
      "numberOfPeople": رقم,
      "estimatedDuration": رقم (أيام),
      "requiredSkills": ["مهارة 1", "مهارة 2", "مهارة 3"],
      "responsibilities": ["مسؤولية 1", "مسؤولية 2", "مسؤولية 3"],
      "estimatedCost": "التكلفة المتوقعة للشخص الواحد",
      "priority": "عالية|متوسطة|منخفضة"
    }
  ],
  "teamStructure": {
    "totalPeople": رقم,
    "totalCost": "التكلفة الإجمالية",
    "estimatedDuration": رقم (أيام),
    "recommendations": ["توصية 1", "توصية 2"]
  },
  "risks": [
    {
      "risk": "وصف المخاطرة",
      "mitigation": "كيفية التعامل معها"
    }
  ]
}`;

        const response = await invokeLLMWithRetry([
          {
            role: "system",
            content: "أنت خبير في إدارة المشاريع والموارد البشرية. قدم استجابة JSON صحيحة فقط بدون نصوص إضافية أو شرح.",
          },
          {
            role: "user",
            content: prompt,
          },
        ]);

        // Parse the LLM response
        const content = response.choices[0].message.content;
        let generatedTeamPlan;
        
        try {
          // Try to parse as JSON
          if (typeof content === "string") {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              generatedTeamPlan = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("No JSON found in response");
            }
          } else {
            generatedTeamPlan = content;
          }
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          throw new Error(`فشل تحليل استجابة الذكاء الاصطناعي: ${parseError instanceof Error ? parseError.message : "خطأ في التحليل"}`);
        }

        // Insert generated team roles into database
        const insertedRoles = [];
        if (generatedTeamPlan.teamRoles && Array.isArray(generatedTeamPlan.teamRoles)) {
          for (const role of generatedTeamPlan.teamRoles) {
            const roleId = nanoid();
            await db.insert(projectTeamRoles).values({
              id: roleId,
              projectId: input.projectId,
              roleName: role.roleName,
              roleDescription: role.roleDescription,
              roleType: role.roleType || "other",
              numberOfPeople: role.numberOfPeople || 1,
              estimatedDuration: role.estimatedDuration || 30,
              requiredSkills: JSON.stringify(role.requiredSkills || []),
              responsibilities: JSON.stringify(role.responsibilities || []),
              estimatedCost: role.estimatedCost || "0",
              totalCost: role.estimatedCost ? `${(parseInt(role.estimatedCost) * (role.numberOfPeople || 1)).toString()}` : "0",
              priority: role.priority || "متوسطة",
            });
            insertedRoles.push(roleId);
          }
        }

        return {
          success: true,
          rolesCount: insertedRoles.length,
          teamStructure: generatedTeamPlan.teamStructure,
          risks: generatedTeamPlan.risks,
        };
      } catch (error) {
        console.error("Team role generation error:", error);
        throw new Error(
          `فشل توليد أدوار الفريق: ${error instanceof Error ? error.message : "خطأ غير معروف"}`
        );
      }
    }),

  // Get team roles for a project
  getTeamRoles: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const roles = await db
        .select()
        .from(projectTeamRoles)
        .where(eq(projectTeamRoles.projectId, input.projectId));

      return roles.map((role) => ({
        ...role,
        requiredSkills: typeof role.requiredSkills === "string" ? JSON.parse(role.requiredSkills) : role.requiredSkills,
        responsibilities: typeof role.responsibilities === "string" ? JSON.parse(role.responsibilities) : role.responsibilities,
      }));
    }),

  // Delete a team role
  deleteTeamRole: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(projectTeamRoles).where(eq(projectTeamRoles.id, input.roleId));

      return { success: true };
    }),
});
