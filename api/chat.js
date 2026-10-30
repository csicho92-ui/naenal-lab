import { NV_BASE, GM_BASE, GM_PREFIX, checkAccess } from './_shared.js';

// Gemini 모델마다 지원하는 생각 단계가 달라서, 거절되면 한 단계씩 올려 다시 보낸다
const LEVELS = ['minimal', 'low', 'medium', 'high'];
async function post(base, key, body, accept, timeoutMs) {
  for (;;) {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: accept },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (r.ok || !body.reasoning_effort) return r;
    const txt = await r.text();
    const i = LEVELS.indexOf(body.reasoning_effort);
    if (/thinking level|reasoning_effort|reasoning effort/i.test(txt) && i >= 0 && i < LEVELS.length - 1) {
      body = { ...body, reasoning_effort: LEVELS[i + 1] };
      continue;
    }
    return new Response(txt, { status: r.status, headers: { 'Content-Type': 'application/json' } });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!checkAccess(req, res)) return;

  const { model, prompt, role = 'extract', max_tokens = 800, temperature = 0.2, effort } = req.body || {};
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
    // 실험실에서 고른 생각 단계를 쓰고, 없으면 초안은 high(10/30 비교: 비유를 실제 날씨로 쓰지 않음), 판독은 minimal
    body.reasoning_effort = ['minimal', 'low', 'medium', 'high'].includes(effort) ? effort : (role === 'draft' ? 'high' : 'minimal');
    body.max_tokens = role === 'draft' ? 6000 : 2000;
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
  if (role === 'draft') return streamDraft(res, isGemini ? GM_BASE : NV_BASE, key, body, model, t0);
  try {
    const r = await post(isGemini ? GM_BASE : NV_BASE, key, body, 'application/json', 110000);
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

// 초안은 길어서 다 쓸 때까지 기다리면 시간이 넘친다. 쓰는 대로 받아 그대로 흘려보낸다.
// 본문은 글자 그대로, 맨 끝에 "\u0000" 다음 JSON 한 줄(사용량, 끝난 이유)을 붙인다.
async function streamDraft(res, base, key, body, model, t0) {
  let r;
  try {
    r = await post(base, key, { ...body, stream: true, stream_options: { include_usage: true } }, 'text/event-stream', 280000);
  } catch (e) {
    return res.status(504).json({ error: e?.name === 'TimeoutError' ? 'timeout' : 'upstream', message: String(e.message || e) });
  }
  if (!r.ok) {
    const j0 = await r.json().catch(() => ({}));
    const j = Array.isArray(j0) ? j0[0] || {} : j0;
    return res.status(r.status === 429 ? 429 : 502).json({
      error: r.status === 429 ? 'rate_limited' : (r.status === 404 ? 'model_unavailable' : 'upstream'),
      message: j?.detail || j?.error?.message || `응답 ${r.status}`,
    });
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
  const dec = new TextDecoder();
  let buf = '', usage = null, finish = null, chars = 0, err = null;
  try {
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let j; try { j = JSON.parse(data); } catch { continue; }
        if (j.usage) usage = j.usage;
        const c = j.choices?.[0];
        if (c?.finish_reason) finish = c.finish_reason;
        const d = c?.delta?.content;
        if (d) { chars += d.length; res.write(d.replace(/\u0000/g, '')); }
      }
    }
  } catch (e) { err = e?.name === 'TimeoutError' ? 'timeout' : String(e.message || e); }
  res.end('\u0000' + JSON.stringify({ usage, finish, model, ms: Date.now() - t0, error: err || (chars ? null : 'empty') }));
}
