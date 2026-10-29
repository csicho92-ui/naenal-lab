import { NV_BASE, GM_BASE, GM_PREFIX, providers, checkAccess } from './_shared.js';

async function list(base, key) {
  const r = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || j?.detail || `모델 목록 ${r.status}`);
  return (j.data || []).map(m => String(m.id).replace(/^models\//, ''));
}

export default async function handler(req, res) {
  if (!checkAccess(req, res)) return;
  const p = providers();
  const out = { models: [], errors: [], providers: p };
  if (p.gemini) {
    try { out.models.push(...(await list(GM_BASE, process.env.GEMINI_API_KEY)).filter(id => /^gemini/i.test(id)).map(id => GM_PREFIX + id)); }
    catch (e) { out.errors.push('Gemini: ' + e.message); }
  }
  if (p.nvidia) {
    try { out.models.push(...(await list(NV_BASE, process.env.NVIDIA_API_KEY))); }
    catch (e) { out.errors.push('NVIDIA: ' + e.message); }
  }
  out.models.sort();
  out.defaults = { extract: process.env.DEFAULT_EXTRACT_MODEL || '', draft: process.env.DEFAULT_DRAFT_MODEL || '' };
  res.status(out.models.length ? 200 : 502).json(out.models.length ? out : { error: 'upstream', message: out.errors.join(' / ') });
}
