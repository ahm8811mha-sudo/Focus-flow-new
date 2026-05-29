export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    runtime: 'vercel-serverless',
  });
}
