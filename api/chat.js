import { NV_BASE, GM_BASE, GM_PREFIX, checkAccess } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!checkAccess(req, res)) return;

  const { model, prompt, role = 'extract', max_tokens = 800, temperature = 0.2 } = req.body || {};
  if (!model || !prompt) return res.status(400).json({ error: 'bad_request', message: 'model과 prompt가 필요해요.' });
  if (String(prompt).length > 20000) return res.status(400).json({ error: 'too_long', message: '프롬프트가 너무 길어요.' });

  const isGemini = model.startsWith(GM_PREFIX);
  const key = isGemini ? process.env.GEMINI_API_KEY : process.env.NVIDIA_API_KEY;
  if (!key) return res.status(400).json({ error: 'no_key', message: `${isGemini ? 'GEMINI' : 'NVIDIA'}_API_KEY가 없어요.` });

  const body = {
    model: isGemini ? model.slice(GM_PREFIX.length) : model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    stream: false,
  };
  if (isGemini) {
    // Gemini 3 계열은 생각을 끌 수 없어 가장 낮게 둔다. 생각 토큰을 감안해 한도를 넉넉히
    body.reasoning_effort = role === 'draft' ? 'low' : 'minimal';
    body.max_tokens = role === 'draft' ? 8000 : 2000;
  } else if (/deepseek-v4/i.test(model)) {
    // NVIDIA에서 DeepSeek V4는 생각 모드 옵션이 없으면 응답이 멈춘다고 보고됨
    body.chat_template_kwargs = { enable_thinking: true, thinking: true };
    body.max_tokens = 8000;
  } else {
    // Qwen 3 계열은 기본이 생각 모드라 판독이 느리고 답이 비어 올 수 있어 끈다
    if (/qwen3/i.test(model) && !/thinking/i.test(model)) body.chat_template_kwargs = { enable_thinking: false };
    body.max_tokens = Math.min(Number(max_tokens) || 800, 4000);
  }

  const t0 = Date.now();
  try {
    const r = await fetch(`${isGemini ? GM_BASE : NV_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110000),
    });
    const j0 = await r.json().catch(() => ({}));
    const j = Array.isArray(j0) ? j0[0] || {} : j0;
    if (!r.ok) {
      const message = j?.detail || j?.error?.message || `응답 ${r.status}`;
      return res.status(r.status === 429 ? 429 : 502).json({
        error: r.status === 429 ? 'rate_limited' : (r.status === 404 ? 'model_unavailable' : 'upstream'),
        message,
      });
    }
    const choice = j.choices?.[0] || {};
    const msg = choice.message || {};
    const text = msg.content || '';
    if (!text.trim()) {
      return res.status(502).json({
        error: 'empty',
        message: `모델이 빈 답을 보냈어요 (finish_reason: ${choice.finish_reason || '?'})` +
          (msg.reasoning_content ? ` · 생각만 ${String(msg.reasoning_content).length}자 쓰고 끝남` : ''),
      });
    }
    res.status(200).json({ text, finish: choice.finish_reason || null, usage: j.usage || null, model, ms: Date.now() - t0 });
  } catch (e) {
    const timeout = e?.name === 'TimeoutError';
    res.status(504).json({ error: timeout ? 'timeout' : 'upstream', message: String(e.message || e) });
  }
}
