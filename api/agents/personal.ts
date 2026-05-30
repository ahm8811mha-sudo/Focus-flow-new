type PersonalAgentId = 'assistant' | 'style' | 'fitness' | 'food' | 'shows' | 'image';

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
  assistant: 'You are an Arabic personal executive assistant. Convert requests into executable app actions: tasks, notes, calendar events, message drafts, and tables. Return Arabic.',
  style: 'You are an Arabic personal style assistant. Give practical outfit and color suggestions. Return Arabic.',
  fitness: 'You are an Arabic fitness planning assistant. Give simple sustainable activity plans. Return Arabic.',
  food: 'You are an Arabic food planning assistant. Suggest practical meals and lists. Return Arabic.',
  shows: 'You are an Arabic movies and shows recommendation assistant. Return Arabic.',
  image: 'You are an Arabic image assistant. Describe practical observations and improvements. Return Arabic.',
};

const actionSchemaInstruction = `Return strict JSON only, no markdown. Schema:
{
  "summary":"short Arabic decision summary",
  "guidance":"brief Arabic guidance",
  "actions":[
    {"type":"create_task|create_note|calendar_file|message_draft|csv_file|checklist|open_service","title":"Arabic title","description":"Arabic details","dueDate":"YYYY-MM-DD or empty","dueTime":"HH:mm or empty","priority":"low|medium|high|urgent","payload":{}}
  ]
}`;

function safeAgentId(value: unknown): PersonalAgentId {
  const allowed: PersonalAgentId[] = ['assistant', 'style', 'fitness', 'food', 'shows', 'image'];
  return allowed.includes(value as PersonalAgentId) ? (value as PersonalAgentId) : 'assistant';
}

function parsePlan(text: string) {
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

function outputText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part: any) => part?.text || '').join('\n').trim() || '{}';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ ok: false, message: 'GEMINI_API_KEY is missing in Vercel Environment Variables.' });
    return;
  }

  const body = (req.body || {}) as AgentRequest;
  const agentId = safeAgentId(body.agentId);
  const prompt = String(body.prompt || '').trim() || 'قرر أفضل إجراء الآن.';
  const context = body.context || {};
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const fullPrompt = `${systemPrompts[agentId]}\n${actionSchemaInstruction}\n\nUser request:\n${prompt}\n\nApp context:\n${JSON.stringify({
    projectsCount: context.projects?.length || 0,
    tasksCount: context.tasks?.length || 0,
    notesCount: context.notes?.length || 0,
    sampleTasks: context.tasks?.slice?.(0, 12) || [],
    sampleProjects: context.projects?.slice?.(0, 6) || [],
  }, null, 2)}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 1200, responseMimeType: 'application/json' },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, message: data?.error?.message || 'Gemini request failed.' });
      return;
    }

    const text = outputText(data);
    const plan = parsePlan(text) || {
      summary: 'تم توليد رد، لكن لم يصل كخطة منظمة.',
      guidance: text,
      actions: [{ type: 'create_note', title: 'نتيجة الوكيل', description: text, dueDate: '', dueTime: '', priority: 'medium', payload: {} }],
    };

    res.status(200).json({ ok: true, agentId, provider: 'Gemini', model, text, plan });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Unknown Gemini agent error.' });
  }
}
