export const NV_BASE = 'https://integrate.api.nvidia.com/v1';

export function checkAccess(req, res) {
  if (!process.env.NVIDIA_API_KEY) {
    res.status(500).json({ error: 'no_key', message: 'Vercel 환경 변수에 NVIDIA_API_KEY가 없어요.' });
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
