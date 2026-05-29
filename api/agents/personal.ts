type PersonalAgentId = 'assistant' | 'style' | 'fitness' | 'food' | 'shows' | 'image';

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
  assistant: 'You are an Arabic personal executive assistant. Convert requests into executable app actions: tasks, notes, calendar events, message drafts, and tables. Return Arabic.',
  style: 'You are an Arabic personal style assistant. Use image input only for practical outfit and color suggestions. Do not identify people. Return Arabic.',
  fitness: 'You are an Arabic fitness planning assistant. Give simple sustainable activity plans. Return Arabic.',
  food: 'You are an Arabic food planning assistant. Suggest practical meals and lists. Return Arabic.',
  shows: 'You are an Arabic movies and shows recommendation assistant. Return Arabic.',
  image: 'You are an Arabic image analysis assistant. Describe practical observations and improvements. Do not identify people. Return Arabic.',
};

const actionSchemaInstruction = `Return strict JSON only, no markdown. Schema:
{
  "summary":"short Arabic decision summary",
  "guidance":"brief Arabic guidance",
  "actions":[
    {"type":"create_task|create_note|calendar_file|message_draft|csv_file|checklist|open_service","title":"Arabic title","description":"Arabic details","dueDate":"YYYY-MM-DD or empty","dueTime":"HH:mm or empty","priority":"low|medium|high|urgent","payload":{}}
  ]
}
Prefer 2 to 5 actions. Use message_draft for email/messages, csv_file for Excel/Sheets, calendar_file for scheduling.`;

function safeAgentId(value: unknown): PersonalAgentId {
  const allowed: PersonalAgentId[] = ['assistant', 'style', 'fitness', 'food', 'shows', 'image'];
  return allowed.includes(value as PersonalAgentId) ? (value as PersonalAgentId) : 'assistant';
}

function outputText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') parts.push(content.text);
      if (typeof content?.text?.value === 'string') parts.push(content.text.value);
    }
  }
  return parts.join('\n').trim() || '{}';
}

function parsePlan(text: string) {
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ ok: false, message: 'OPENAI_API_KEY is missing in Vercel Environment Variables.' });
    return;
  }

  const body = (req.body || {}) as AgentRequest;
  const agentId = safeAgentId(body.agentId);
  const prompt = String(body.prompt || '').trim() || 'قرر أفضل إجراء الآن.';
  const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
  const context = body.context || {};

  const content: any[] = [{
    type: 'input_text',
    text: `${prompt}\n\nApp context:\n${JSON.stringify({
      projectsCount: context.projects?.length || 0,
      tasksCount: context.tasks?.length || 0,
      notesCount: context.notes?.length || 0,
      sampleTasks: context.tasks?.slice?.(0, 12) || [],
      sampleProjects: context.projects?.slice?.(0, 6) || [],
    }, null, 2)}`,
  }];

  if (imageDataUrl.startsWith('data:image/')) content.push({ type: 'input_image', image_url: imageDataUrl });

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: [
          { role: 'system', content: [{ type: 'input_text', text: `${systemPrompts[agentId]}\n${actionSchemaInstruction}` }] },
          { role: 'user', content },
        ],
        temperature: 0.25,
        max_output_tokens: 1200,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, message: data?.error?.message || 'OpenAI request failed.' });
      return;
    }

    const text = outputText(data);
    const plan = parsePlan(text) || {
      summary: 'تم توليد رد، لكن لم يصل كخطة منظمة.',
      guidance: text,
      actions: [{ type: 'create_note', title: 'نتيجة الوكيل', description: text, dueDate: '', dueTime: '', priority: 'medium', payload: {} }],
    };

    res.status(200).json({ ok: true, agentId, text, plan });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Unknown OpenAI agent error.' });
  }
}
