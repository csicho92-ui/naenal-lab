export const NV_BASE = 'https://integrate.api.nvidia.com/v1';
export const GM_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';
// 화면에서 Gemini 모델은 "gemini:" 를 붙여 구분한다 (NVIDIA에도 google/gemma 같은 이름이 있어서)
export const GM_PREFIX = 'gemini:';

export function providers() {
  return { nvidia: !!process.env.NVIDIA_API_KEY, gemini: !!process.env.GEMINI_API_KEY };
}

export function checkAccess(req, res) {
  const p = providers();
  if (!p.nvidia && !p.gemini) {
    res.status(500).json({ error: 'no_key', message: 'Vercel 환경 변수에 NVIDIA_API_KEY나 GEMINI_API_KEY가 없어요.' });
    return false;
  }
  const need = process.env.APP_PASSCODE;
  let got = req.headers['x-passcode'] || '';
  try { got = decodeURIComponent(got); } catch (e) {}
  if (need && got.trim() !== need.trim()) {
    res.status(401).json({ error: 'bad_passcode', message: '암호가 맞지 않아요.' });
    return false;
  }
  return true;
}
