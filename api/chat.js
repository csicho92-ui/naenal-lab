import { NV_BASE, checkAccess } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!checkAccess(req, res)) return;

  const { model, prompt, max_tokens = 800, temperature = 0.2 } = req.body || {};
  if (!model || !prompt) return res.status(400).json({ error: 'bad_request', message: 'model과 prompt가 필요해요.' });
  if (String(prompt).length > 20000) return res.status(400).json({ error: 'too_long', message: '프롬프트가 너무 길어요.' });

  const t0 = Date.now();
  try {
    const r = await fetch(`${NV_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: /deepseek-v4/i.test(model) ? 8000 : Math.min(Number(max_tokens) || 800, 4000),
        temperature,
        stream: false,
        // NVIDIA에서 DeepSeek V4는 생각 모드 옵션이 없으면 응답이 멈춘다고 보고됨
        ...(/deepseek-v4/i.test(model) ? { chat_template_kwargs: { enable_thinking: true, thinking: true } } : {}),
      }),
      signal: AbortSignal.timeout(110000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status === 429 ? 429 : 502).json({
        error: r.status === 429 ? 'rate_limited' : 'upstream',
        message: j?.detail || j?.error?.message || `NVIDIA 응답 ${r.status}`,
      });
    }
    const msg = j.choices?.[0]?.message || {};
    res.status(200).json({
      text: msg.content || '',
      usage: j.usage || null,
      model: j.model || model,
      ms: Date.now() - t0,
    });
  } catch (e) {
    const timeout = e?.name === 'TimeoutError';
    res.status(504).json({ error: timeout ? 'timeout' : 'upstream', message: String(e.message || e) });
  }
}
