import type { Express, Request, Response } from "express";

type PersonalAgentId = "assistant" | "style" | "fitness" | "food" | "shows" | "image";

type AgentRequest = {
  agentId?: PersonalAgentId;
  prompt?: string;
  context?: {
    projects?: unknown[];
    tasks?: unknown[];
    notes?: unknown[];
  };
};

const systemPrompts: Record<PersonalAgentId, string> = {
  assistant: "You are an Arabic executive secretary and strategic partner. You coordinate, research, organize, schedule, draft, and follow up on behalf of the user.",
  style: "You are an Arabic shopping and style analyst. You analyze images, infer style requirements, compare alternatives, prices, quality, and practical purchasing steps.",
  fitness: "You are an Arabic fitness planning assistant. Give simple sustainable plans and practical follow-up actions.",
  food: "You are an Arabic food planning assistant. Suggest practical meals and shopping/prep actions.",
  shows: "You are an Arabic movies and shows recommendation assistant. Give short relevant recommendations.",
  image: "You are an Arabic image assistant. Describe practical observations and improvements.",
};

const executiveProtocol = `
Core operating protocol:
1. Strategic consultation: Before execution, analyze the request. If critical information is missing, the objective is ambiguous, or there is a material risk, ask ONE concise alignment question and do not create actions yet.
2. Delegated execution: If the objective is clear, handle the operational details yourself. Do not burden the user with methodology. Produce concrete results.
3. Outcome focus: Optimize for the final useful result, not procedural commentary.
4. Proactive insight: Mention important risks or better alternatives briefly.
5. Concise reporting: Keep the response professional, direct, and actionable.

Action rules:
- Do not create generic filler actions such as "review execution" or "follow up" unless tied to a specific result, person, time, or table.
- If you create a table, include real columns and rows. Never create an empty table.
- If the request is only a question such as why/how/where/what happened, answer conversationally and do not create actions.
- If execution is appropriate, return a JSON object with this shape:
{
  "summary": "short Arabic executive summary",
  "guidance": "short Arabic note or risk/opportunity if needed",
  "actions": [
    {
      "type": "create_task | calendar_file | csv_file | message_draft | create_note",
      "title": "specific action title",
      "description": "specific useful details",
      "dueDate": "YYYY-MM-DD or empty",
      "dueTime": "HH:mm or empty",
      "priority": "low | medium | high | urgent",
      "payload": {}
    }
  ]
}
- If consultation is needed, return JSON with summary/guidance and an empty actions array.
- Reply in Arabic unless the user asks otherwise.
`;

function safeAgentId(value: unknown): PersonalAgentId {
  const allowed: PersonalAgentId[] = ["assistant", "style", "fitness", "food", "shows", "image"];
  return allowed.includes(value as PersonalAgentId) ? (value as PersonalAgentId) : "assistant";
}

function outputText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part: any) => part?.text || "").join("\n").trim() || "لم يصل رد واضح من Gemini.";
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      summary: String(parsed.summary || parsed.guidance || "تمت مراجعة الطلب."),
      guidance: String(parsed.guidance || parsed.summary || ""),
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };
  } catch {
    return null;
  }
}

export function registerOpenAIAgentRoutes(app: Express) {
  app.get("/api/agents/status", (_req: Request, res: Response) => {
    const configured = Boolean(process.env.GEMINI_API_KEY);
    res.json({ ok: true, geminiConfigured: configured, openaiConfigured: configured, provider: "Gemini", model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
  });

  app.post("/api/agents/personal", async (req: Request<{}, {}, AgentRequest>, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ ok: false, message: "GEMINI_API_KEY is missing. Add it in Vercel Environment Variables and redeploy." });
      return;
    }

    const agentId = safeAgentId(req.body.agentId);
    const prompt = String(req.body.prompt || "").trim() || "اعطني أفضل اقتراح عملي الآن.";
    const context = req.body.context || {};
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const fullPrompt = `${systemPrompts[agentId]}\n\n${executiveProtocol}\n\nUser request:\n${prompt}\n\nApp context:\n${JSON.stringify({ projectsCount: context.projects?.length || 0, tasksCount: context.tasks?.length || 0, notesCount: context.notes?.length || 0, sampleTasks: context.tasks?.slice?.(0, 8) || [] }, null, 2)}`;

    try {
      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }], generationConfig: { temperature: 0.25, maxOutputTokens: 1400 } }),
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        res.status(upstream.status).json({ ok: false, message: data?.error?.message || "Gemini request failed.", raw: data });
        return;
      }

      const text = outputText(data);
      const plan = extractJson(text);
      res.json({ ok: true, agentId, provider: "Gemini", model, text, plan });
    } catch (error) {
      res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Unknown Gemini agent error." });
    }
  });
}
