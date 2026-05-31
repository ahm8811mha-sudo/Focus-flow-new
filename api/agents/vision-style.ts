function parseJson(text: string): any {
  const cleaned = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
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

  const prompt = String(req.body?.prompt || 'حلل الصورة وابحث عن بدائل مشابهة').trim();
  const imageBase64 = String(req.body?.imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  const mimeType = String(req.body?.mimeType || 'image/jpeg');
  if (!imageBase64) {
    res.status(400).json({ ok: false, message: 'imageBase64 is required' });
    return;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const instruction = `أنت وكيل ستايل ومشتريات تنفيذي. حلل صورة اللبس وحدد القطع والألوان والأسلوب، ثم أنشئ إجراءات تنفيذية داخل التطبيق. لا تعط ردًا عامًا فقط. أرجع JSON فقط بهذا الشكل: {"summary":"ملخص التنفيذ","guidance":"رأي واضح","actions":[{"type":"csv_file|create_task|calendar_file|create_note","title":"","description":"","dueDate":"","dueTime":"","priority":"medium","payload":{}}]}.
القواعد:
- أنشئ جدول shopping يحتوي القطعة، اللون، الوصف، كلمات بحث، نطاق سعر تقريبي، أولوية.
- أنشئ مهام للبحث عن بدائل مشابهة ومقارنة الأسعار والعروض.
- لا تخترع روابط متاجر أو أسعار مؤكدة إذا لم تكن متأكدًا. اجعلها كلمات بحث ومهام متابعة.
- اذكر أن الأسعار تحتاج تحقق إذا كانت تقديرية.
طلب المستخدم: ${prompt}`;

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: instruction }, { inlineData: { mimeType, data: imageBase64 } }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 2200, responseMimeType: 'application/json' },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, message: data?.error?.message || 'Gemini vision request failed.' });
      return;
    }

    const raw = outputText(data);
    const plan = parseJson(raw) || { summary: 'تم تحليل الصورة', guidance: raw, actions: [] };
    res.status(200).json({ ok: true, provider: 'Gemini Vision', model, plan, text: `${plan.summary || ''}\n\n${plan.guidance || ''}`.trim() });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Unknown vision style error.' });
  }
}
