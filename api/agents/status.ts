export default function handler(_req: any, res: any) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const configured = Boolean(process.env.GEMINI_API_KEY);

  res.status(200).json({
    ok: true,
    geminiConfigured: configured,
    openaiConfigured: configured,
    provider: 'Gemini',
    model,
    runtime: 'vercel-serverless',
  });
}
