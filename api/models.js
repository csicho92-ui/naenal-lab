import { NV_BASE, checkAccess } from './_shared.js';

export default async function handler(req, res) {
  if (!checkAccess(req, res)) return;
  try {
    const r = await fetch(`${NV_BASE}/models`, {
      headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
    });
    const j = await r.json();
    const ids = (j.data || []).map(m => m.id).sort();
    res.status(200).json({
      models: ids,
      defaults: {
        extract: process.env.DEFAULT_EXTRACT_MODEL || '',
        draft: process.env.DEFAULT_DRAFT_MODEL || '',
      },
    });
  } catch (e) {
    res.status(502).json({ error: 'upstream', message: String(e.message || e) });
  }
}
