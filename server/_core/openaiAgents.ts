import type { Express, Request, Response } from "express";

type PersonalAgentId = "assistant" | "style" | "fitness" | "food" | "shows" | "image";

type AgentRequest = {
  agentId?: PersonalAgentId;
  prompt?: string;
  imageDataUrl?: string;
  context?: {
    projects?: unknown[];
    tasks?: unknown[];
    notes?: unknown[];
  };
};

const systemPrompts: Record<PersonalAgentId, string> = {
  assistant: "You are a practical Arabic personal assistant. Turn requests into clear drafts, tasks, tables, or follow-up plans. Do not claim that an external action was completed unless the app actually completed it.",
  style: "You are an Arabic personal style assistant. Use any provided image only to give practical outfit, color, and occasion suggestions. Do not identify people.",
  fitness: "You are an Arabic fitness planning assistant. Give simple sustainable plans. Do not provide diagnosis.",
  food: "You are an Arabic food planning assistant. Suggest practical meals and options. Do not provide medical treatment.",
  shows: "You are an Arabic movies and shows recommendation assistant. Give short relevant recommendations.",
  image: "You are an Arabic image analysis assistant. Describe practical observations and improvements. Do not identify people.",
};

function safeAgentId(value: unknown): PersonalAgentId {
  const allowed: PersonalAgentId[] = ["assistant", "style", "fitness", "food", "shows", "image"];
  return allowed.includes(value as PersonalAgentId) ? (value as PersonalAgentId) : "assistant";
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") parts.push(content.text);
      if (typeof content?.text?.value === "string") parts.push(content.text.value);
    }
  }
  return parts.join("\n").trim() || "لم يصل رد واضح من OpenAI.";
}

export function registerOpenAIAgentRoutes(app: Express) {
  app.get("/api/agents/status", (_req: Request, res: Response) => {
    res.json({ ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || "gpt-4o-mini" });
  });

  app.post("/api/agents/personal", async (req: Request<{}, {}, AgentRequest>, res: Response) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ ok: false, message: "OPENAI_API_KEY is missing. Add it in Vercel Environment Variables and redeploy." });
      return;
    }

    const agentId = safeAgentId(req.body.agentId);
    const prompt = String(req.body.prompt || "").trim() || "اعطني أفضل اقتراح عملي الآن.";
    const imageDataUrl = typeof req.body.imageDataUrl === "string" ? req.body.imageDataUrl : "";
    const context = req.body.context || {};

    const content: any[] = [
      {
        type: "input_text",
        text: `${prompt}\n\nApp context:\n${JSON.stringify(
          {
            projectsCount: context.projects?.length || 0,
            tasksCount: context.tasks?.length || 0,
            notesCount: context.notes?.length || 0,
            sampleTasks: context.tasks?.slice?.(0, 8) || [],
          },
          null,
          2
        )}`,
      },
    ];

    if (imageDataUrl.startsWith("data:image/")) content.push({ type: "input_image", image_url: imageDataUrl });

    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          input: [
            { role: "system", content: [{ type: "input_text", text: systemPrompts[agentId] }] },
            { role: "user", content },
          ],
          temperature: 0.4,
          max_output_tokens: 900,
        }),
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        res.status(upstream.status).json({ ok: false, message: data?.error?.message || "OpenAI request failed.", raw: data });
        return;
      }

      res.json({ ok: true, agentId, text: outputText(data) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Unknown OpenAI agent error." });
    }
  });
}
