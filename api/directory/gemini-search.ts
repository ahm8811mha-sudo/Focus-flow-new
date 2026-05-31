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

function normalizeContact(item: any) {
  const name = String(item?.name || '').trim();
  if (!name) return null;
  return {
    name,
    phone: String(item?.phone || '').trim(),
    email: String(item?.email || '').trim(),
    website: String(item?.website || '').trim(),
    address: String(item?.address || '').trim(),
    mapsUrl: String(item?.mapsUrl || item?.mapUrl || '').trim(),
    category: String(item?.category || '').trim(),
    notes: String(item?.notes || 'تحقق من الرقم قبل الاتصال لأن المصدر Gemini.').trim(),
  };
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

  const query = String(req.body?.query || '').trim();
  if (!query) {
    res.status(400).json({ ok: false, message: 'query is required' });
    return;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = `أنت وكيل بحث سكرتير تنفيذي. المطلوب: ${query}\nأرجع JSON فقط بالشكل التالي: {"contacts":[{"name":"","phone":"","email":"","website":"","address":"","mapsUrl":"","category":"","notes":""}]}\nالقواعد: لا تخترع رقم هاتف إذا لم تكن متأكدًا. إذا لم تعرف الهاتف اتركه فارغًا. أعط 5 إلى 12 نتيجة عندما يمكن. ركز على السعودية والرياض إذا كان الطلب متعلقًا بالرياض.`;

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2200, responseMimeType: 'application/json' },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, message: data?.error?.message || 'Gemini directory search failed.' });
      return;
    }

    const raw = outputText(data);
    const parsed = parseJson(raw);
    const contacts = Array.isArray(parsed?.contacts) ? parsed.contacts.map(normalizeContact).filter(Boolean) : [];
    res.status(200).json({ ok: true, query, provider: 'Gemini', contacts });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Unknown directory search error.' });
  }
}
