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
  assistant: "You are a practical Arabic personal assistant. Turn requests into clear drafts, tasks, tables, or follow-up plans.",
  style: "You are an Arabic personal style assistant. Give practical outfit, color, and occasion suggestions.",
  fitness: "You are an Arabic fitness planning assistant. Give simple sustainable plans.",
  food: "You are an Arabic food planning assistant. Suggest practical meals and options.",
  shows: "You are an Arabic movies and shows recommendation assistant. Give short relevant recommendations.",
  image: "You are an Arabic image assistant. Describe practical observations and improvements.",
};

function safeAgentId(value: unknown): PersonalAgentId {
  const allowed: PersonalAgentId[] = ["assistant", "style", "fitness", "food", "shows", "image"];
  return allowed.includes(value as PersonalAgentId) ? (value as PersonalAgentId) : "assistant";
}

function outputText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part: any) => part?.text || "").join("\n").trim() || "لم يصل رد واضح من Gemini.";
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
    const fullPrompt = `${systemPrompts[agentId]}\n\n${prompt}\n\nApp context:\n${JSON.stringify({ projectsCount: context.projects?.length || 0, tasksCount: context.tasks?.length || 0, notesCount: context.notes?.length || 0, sampleTasks: context.tasks?.slice?.(0, 8) || [] }, null, 2)}`;

    try {
      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 900 } }),
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        res.status(upstream.status).json({ ok: false, message: data?.error?.message || "Gemini request failed.", raw: data });
        return;
      }

      res.json({ ok: true, agentId, provider: "Gemini", model, text: outputText(data) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Unknown Gemini agent error." });
    }
  });
}
