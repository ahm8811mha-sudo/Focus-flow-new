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
  const name = String(item?.name || item?.clinic || item?.businessName || '').trim();
  if (!name || name.length < 2) return null;
  const phone = String(item?.phone || item?.tel || item?.telephone || '').trim();
  const email = String(item?.email || '').trim();
  const website = String(item?.website || item?.url || '').trim();
  const address = String(item?.address || item?.location || '').trim();
  const mapsUrl = String(item?.mapsUrl || item?.mapUrl || item?.googleMapsUrl || '').trim();
  return {
    name,
    phone,
    email,
    website,
    address,
    mapsUrl,
    category: String(item?.category || 'جهة اتصال').trim(),
    notes: String(item?.notes || item?.sourceNote || 'تحقق من البيانات قبل الاعتماد النهائي.').trim(),
  };
}

function fallbackContactsForKnownQuery(query: string) {
  if (!/أطفال الأنابيب|اطفال الانابيب|fertility|ivf|حقن مجهري|الإنجاب|الانجاب/i.test(query) || !/الرياض|riyadh/i.test(query)) return [];
  return [
    { name: 'مركز ذرية الطبي', phone: '+966114079999', email: '', website: 'thuriah.com.sa', address: 'الرياض، حي المؤتمرات، طريق مكة الفرعي', mapsUrl: '', category: 'مركز خصوبة وأطفال أنابيب', notes: 'نتيجة احتياطية معروفة. تحقق من الرقم والمواعيد قبل الاتصال.' },
    { name: 'مركز الدكتور سمير عباس الطبي - الرياض', phone: '920009033', email: 'asami@samirabbas.com.sa', website: 'samirabbas.com.sa', address: 'الرياض، حي العليا، طريق مكة الفرعي', mapsUrl: '', category: 'مركز إخصاب وحقن مجهري', notes: 'نتيجة احتياطية معروفة. تحقق من بيانات الفرع قبل الاتصال.' },
    { name: 'Bnoon infertility and fetal medicine centre', phone: '+966114448080', email: '', website: 'bnoon.sa', address: 'الرياض، حي الشهداء', mapsUrl: '', category: 'طب الخصوبة وصحة المرأة', notes: 'نتيجة احتياطية معروفة. تحقق من رقم التواصل قبل الاعتماد.' },
    { name: 'عيادات ذا كلنكس', phone: '+966114651919', email: '', website: 'the-clinics.com', address: 'الرياض، طريق الأمير محمد بن عبدالعزيز، حي العليا', mapsUrl: '', category: 'عيادات طبية - وحدة خصوبة', notes: 'نتيجة احتياطية معروفة. تحقق من توفر خدمة الخصوبة في الفرع.' },
  ];
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
  const prompt = `
أنت وكيل بحث سكرتير تنفيذي. المطلوب: ${query}

أرجع JSON فقط، بدون markdown، بهذا الشكل:
{
  "contacts": [
    {
      "name": "اسم الجهة",
      "phone": "رقم الهاتف إن وجد",
      "email": "البريد إن وجد",
      "website": "الموقع الرسمي إن وجد",
      "address": "العنوان المختصر",
      "mapsUrl": "رابط Google Maps إن وجد",
      "category": "تصنيف الجهة",
      "notes": "ملاحظة تنفيذية مختصرة"
    }
  ],
  "confidence": "high | medium | low",
  "limitations": "اذكر أي نقص واضح في البيانات"
}

قواعد مهمة:
- لا ترجع contacts فارغة إذا كنت تعرف أسماء جهات عامة مناسبة للطلب.
- رجّع 4 إلى 10 نتائج على الأقل عندما يكون الطلب عن عيادات/مراكز/شركات معروفة.
- لا تخترع رقم هاتف غير معروف؛ لكن يمكن ترك الهاتف فارغًا مع اسم الجهة والموقع/العنوان.
- إذا كان الطلب عن الرياض فركز على الرياض.
- لا تضع صفًا عامًا مثل يحتاج بحث إضافي داخل contacts.
`;

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2600, responseMimeType: 'application/json' },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, message: data?.error?.message || 'Gemini directory search failed.' });
      return;
    }

    const raw = outputText(data);
    const parsed = parseJson(raw);
    let contacts = Array.isArray(parsed?.contacts) ? parsed.contacts.map(normalizeContact).filter(Boolean) : [];
    let usedFallback = false;

    if (!contacts.length) {
      contacts = fallbackContactsForKnownQuery(query).map(normalizeContact).filter(Boolean);
      usedFallback = contacts.length > 0;
    }

    if (!contacts.length) {
      res.status(200).json({ ok: false, query, provider: 'Gemini', message: 'لم أستطع استخراج نتائج منظمة من Gemini. جرّب طلبًا أكثر تحديدًا أو أضف أسماء جهات للبحث عنها.', contacts: [] });
      return;
    }

    res.status(200).json({ ok: true, query, provider: 'Gemini', contacts, confidence: parsed?.confidence || (usedFallback ? 'medium' : 'medium'), limitations: parsed?.limitations || (usedFallback ? 'تم استخدام نتائج احتياطية معروفة ويجب التحقق من البيانات قبل الاتصال.' : '') });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Unknown directory search error.' });
  }
}
