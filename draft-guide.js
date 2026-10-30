/* 초안 지침 (2026-10-30 팀 지침) — v1·v2 실험실이 같이 쓴다.
   DRAFT_GUIDE는 받은 지침 원문 그대로. buildDraftPrompt가 재료와 원문 답을 붙이고,
   guideCheck가 출력이 지침을 지켰는지 코드로 확인한다. */
const DRAFT_GUIDE = `너는 '내 안의 날씨' 앱의 수필 작가다.
사용자가 질문에 답한 재료로, 짧은 산문집의 한 꼭지가 될 수필 초안을 쓴다.
목표는 사용자가 읽고 "내 이야기인데, 내가 쓴 것보다 낫다"고 느끼는 글이다.

사실의 경계
* 재료에 없는 새로운 사건이나 행동을 만들지 않는다. 나와 다른 사람(가족, 친구 등) 모두, 답에 나온 행동만 쓴다.
* 사용자가 말하지 않은 감정을 사실처럼 단정하지 않는다.
* 앞에서 쓴 사실과 어긋나게 쓰지 않는다.
* 장면을 자연스럽게 만드는 작은 세부, 재료에서 누구나 알 수 있는 의미는 써도 된다.

6원칙
1. 감정은 쓰지 않는다. 사용자가 답에서 감정을 말했어도 감정 단어(슬펐다, 슬픔, 기뻤다 등)를 쓰지 않는다. 감정을 보여 주려고 행동, 표정, 몸의 감각을 만들지도 않는다. 장면만으로 전해지게 둔다.
2. 요약하지 말고, 사용자가 말한 그 장면 하나만 쓴다. '언제'가 "대학 시절"처럼 넓은 기간이어도, "그 시절"로 묶거나 기간 전체의 의미로 넓히지 않는다. 답에 나온 그날의 한 장면으로만 쓴다.
3. 교훈, 깨달음, 의미 정리로 끝내지 않는다.
4. 꾸미지 말고 담백하게 쓴다. 과장된 비유를 쓰지 않는다.
5. 사람을 설명하지 말고, 답에 나온 그 사람의 말과 행동만 쓴다. 답에 누군가의 말이 있으면, 문장 속에 "~라며", "~라고 했다"로 끼워 넣지 말고 따옴표 대사로 따로 한 줄을 세운다. 대사는 답에 나온 말 그대로 쓴다. 답이 옮겨 말한 형태("밥 먹고 가라고 하셨어요")면 그 말만 대사로 바꾼다("밥 먹고 가라."). 말을 보태거나 새 대사를 만들지 않는다.
6. 큰 이야기로 시작하지 않는다. 시작은 재료 중 가장 선명한 것(사건, 사물, 감각, 누군가의 말) 어디에서든 할 수 있다.

날씨
* '마음의 날씨'는 사용자가 고른 그날 마음의 비유다. 실제 날씨도, 감정의 이름도 아니다.
* 글에 꼭 넣지 않아도 된다. 넣는다면 한 번만 쓰고, "○○ 같았던 그날" 같은 굳은 표현은 쓰지 않는다.

굳은 틀 피하기
* 재료를 받은 순서대로 옮기지 않는다. 목록처럼 나열하지 않는다.
* "~날이었다"로 시작해서, "~였는지도 모른다"로 짐작하고, 감각 묘사로 끝나는 식의 정해진 구성을 피한다.
* 장면이 어떤 순간이었는지, 의미나 짐작을 한두 문장 담는다. 짐작은 마음이 아니라 그 순간이나 사물이 무엇이었는지에 대해 쓴다. "~한 기분이었다", "~것 같은 마음이었다"처럼 마음을 정리하는 문장은 쓰지 않는다. 짐작으로 글을 끝내지 않는다.
* 문단은 장면이 바뀌거나 한숨 돌릴 곳에서 나눈다.

형식
* '-다'체 과거형, 1인칭. 제목 없이 본문만 출력한다.
* 보통 150~350자. 재료가 많으면 더 길어도 된다. 늘리려고 반복하지 않는다.

출력 전 확인
* 새로 만든 사건·행동, 단정한 감정, 문법 오류가 있나? → 고친다.
* 채워진 재료(사건, 사물, 감각)가 빠지지 않았나?`;

// materials: [{k:'사건', v:'버스를 놓쳤어요'}, ...]  qa: [{q,a}]  removed: [조각]
function buildDraftPrompt({ weather, materials, qa, removed = [], extra = '' }) {
  const mat = [`마음의 날씨: ${weather || '(없음)'}`, ...materials.map(m => `${m.k}: ${m.v}`)];
  if (extra) mat.push(`덧붙인 말: ${extra}`);
  return `${DRAFT_GUIDE}

[재료]
${mat.join('\n')}${removed.length ? `\n\n[사용자가 뺀 조각 — 쓰지 않는다]\n${removed.join('\n')}` : ''}

[질문과 답 원문 — 대사와 사실은 여기서만 가져온다]
${qa.map(x => `Q: ${x.q}\nA: ${x.a}`).join('\n')}

본문만 출력한다. 제목, 머리말, 설명, 따옴표로 감싼 전체 글, 마크다운은 쓰지 않는다.`;
}

// 모델이 붙이는 군더더기 걷어내기. 제목처럼 보이는 첫 줄도 떼고 알린다
function cleanDraft(text) {
  let t = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```[a-z]*\n?|```$/gm, '').trim();
  let strippedTitle = '';
  const lines = t.split('\n');
  if (lines.length > 1) {
    const first = lines[0].replace(/^#+\s*|\*\*/g, '').trim();
    if (first && first.length <= 30 && !/[.!?…"”]$/.test(first) && lines[1].trim() === '') {
      strippedTitle = first; t = lines.slice(2).join('\n').trim();
    }
  }
  t = t.replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n');
  return { body: t, strippedTitle };
}

const GUIDE_RX = {
  emotion: /슬프|슬펐|슬픔|기쁘|기뻤|기쁨|행복|외로|쓸쓸|서러|서럽|우울|불안|두려|무서|설레|그리워|그리웠|그리움|허전|공허|답답|억울|속상|화가 났|화났|미웠|부끄러|창피|안도|후회|아쉬|아쉽|벅차|뭉클|먹먹|울컥|애틋|씁쓸|섭섭|서운|막막|편안|평온|따뜻한 마음|좋았다|좋았던|싫었다|싫었던/,
  mindSum: /기분이었다|기분이 들었다|마음이었다|것 같은 마음|마음이 들었다|느낌이 들었다|느낌이었다/,
  reported: /라며|라고 했다|라고 하셨다|라고 말했다|라고 말씀|고 했다\.|고 하셨다\./,
  period: /그 시절|그 무렵|그때는 늘|그 시기/,
  lesson: /깨달|배웠|알게 되었|알게 됐|교훈|성장|소중함|의미였|의미가 있|덕분에|어른이 되|비로소/,
  guess: /모른다\.?$|모르겠다\.?$|것 같았다\.?$|듯했다\.?$|싶었다\.?$/,
  stiffOpen: /날이었다\.$/,
  metaphor: /처럼|같았다|마치|듯이/
};
const flat = s => String(s || '').replace(/[\s.,!?…"'“”‘’~·]/g, '');
function sentencesOf(body) { return body.split(/\n+/).flatMap(p => p.split(/(?<=[.!?…]["”]?)\s+/)).map(s => s.trim()).filter(Boolean) }
function quotesOf(body) { return [...body.matchAll(/["“]([^"”]+)["”]/g)].map(m => m[1].trim()) }

// 지침 점검: [{rule, ok, level:'ok'|'warn'|'bad', detail}]
function guideCheck(body, { answers = [], weather = '', mustHave = [], whenText = '' }) {
  const src = answers.join(' '), srcFlat = flat(src), sents = sentencesOf(body), out = [];
  const add = (rule, ok, detail = '', level) => out.push({ rule, ok, level: level || (ok ? 'ok' : 'bad'), detail });
  const len = body.length, lenNs = body.replace(/\s/g, '').length;
  add('길이 150~350자 (공백 포함)', len >= 150 && len <= 350, `${len}자 (공백 제외 ${lenNs}자)`, len >= 150 && len <= 350 ? 'ok' : (len > 350 && mustHave.length >= 5 ? 'warn' : 'bad'));
  const emo = sents.filter(s => GUIDE_RX.emotion.test(s));
  add('원칙 1 · 감정 단어 없음', !emo.length, emo.map(s => s.match(GUIDE_RX.emotion)[0]).join(', '));
  const mind = sents.filter(s => GUIDE_RX.mindSum.test(s));
  add('마음을 정리하는 문장 없음', !mind.length, mind.join(' / '));
  const per = sents.filter(s => GUIDE_RX.period.test(s));
  add('원칙 2 · "그 시절"로 묶지 않음', !per.length, per.join(' / '));
  const last = sents[sents.length - 1] || '';
  add('원칙 3 · 교훈·깨달음으로 끝내지 않음', !GUIDE_RX.lesson.test(last), GUIDE_RX.lesson.test(last) ? last : '');
  const meta = sents.filter(s => GUIDE_RX.metaphor.test(s));
  add('원칙 4 · 비유 (과장인지 사람이 확인)', !meta.length, meta.join(' / '), meta.length ? 'warn' : 'ok');
  const rep = sents.filter(s => GUIDE_RX.reported.test(s));
  add('원칙 5 · 대사를 "~라며/~라고 했다"로 끼워 넣지 않음', !rep.length, rep.join(' / '));
  const qs = quotesOf(body);
  const newQ = qs.filter(q => { const f = flat(q).replace(/(다|요|라|야|해|자|니|냐|게|지)$/, ''); return f.length >= 2 && !srcFlat.includes(f.slice(0, Math.max(2, f.length - 2))) });
  add('원칙 5 · 대사는 답에 나온 말', !newQ.length, qs.length ? (newQ.length ? '답에서 못 찾은 대사: ' + newQ.join(' / ') : qs.map(q => `"${q}"`).join(' ')) : '대사 없음');
  const quoteLine = qs.length ? body.split('\n').some(l => /^["“]/.test(l.trim())) : true;
  if (qs.length) add('원칙 5 · 대사는 따로 한 줄', quoteLine, quoteLine ? '' : '대사가 문장 속에 있음');
  if (/라고 (했|하셨|말)|라며|고 하셨어요|고 했어요/.test(src) && !qs.length)
    add('원칙 5 · 답에 옮긴 말이 있으면 대사로 세움', false, '답에 누군가의 말이 있는데 대사가 없음', 'warn');
  if (whenText) { const ws = String(whenText).split(/\s+/).map(w => w.replace(/[^가-힣A-Za-z0-9]/g, '')).filter(w => w.length >= 2); const f0 = flat(sents[0] || ''); const starts = ws.length > 0 && ws.every(w => f0.includes(w)); add('굳은 틀 · 재료 순서대로("언제"부터) 시작하지 않음', !starts, starts ? sents[0] : '', starts ? 'warn' : 'ok') }
  add('굳은 틀 · "~날이었다"로 시작하지 않음', !GUIDE_RX.stiffOpen.test(sents[0] || ''), sents[0] || '');
  add('굳은 틀 · 짐작으로 끝내지 않음', !GUIDE_RX.guess.test(last), GUIDE_RX.guess.test(last) ? last : '');
  if (weather) {
    const stiff = new RegExp(weather.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*같(았|은|던)').test(body);
    const inAnswers = src.includes(weather);
    const n = weather.length >= 2 ? body.split(weather).length - 1 : 0;
    add('날씨 · 한 번 이하, "○○ 같았던" 없음', !stiff && (inAnswers || weather.length < 2 || n <= 1), stiff ? '굳은 표현 있음' : inAnswers ? '답에도 나온 말이라 횟수는 세지 않음' : (n ? `${n}번` : '넣지 않음'));
  }
  const bodyFlat = flat(body);
  // 동사는 활용형이 달라지므로(놓쳤어요→놓친) 어미를 뗀 뒤 마지막 글자 하나를 더 떼서도 찾는다
  const verbEnd = /(었어요|았어요|였어요|했어요|어요|아요|었다|았다|였다|했다|다)$/;
  const stem = w => { const x = w.replace(/[^가-힣A-Za-z0-9]/g, ''); const verb = verbEnd.test(x); const st = x.replace(verbEnd, '').replace(/(이요|에서|으로|요|를|을|이|가|은|는|도|에|와|과|로|고|서)$/, ''); return { st, verb } };
  const hit = ({ st, verb }) => bodyFlat.includes(st) || (verb && st.length >= 2 && bodyFlat.includes(st.slice(0, -1)));
  const miss = mustHave.filter(v => { const ws = String(v).split(/\s+/).map(stem).filter(w => w.st.length >= 1 && !/^(안|못|좀|더|잘|그|이|저|나|내)$/.test(w.st)); if (!ws.length) return false; const need = ws.length <= 2 ? ws.length : Math.ceil(ws.length / 2); return ws.filter(hit).length < need });
  add('채워진 재료(사건·사물·감각)가 빠지지 않음', !miss.length, miss.length ? '빠진 것: ' + miss.join(' / ') : `${mustHave.length}개 모두 들어감`);
  const hasTitle = /^[^\n.!?…]{1,30}\n\n/.test(body);
  add('제목 없이 본문만', !hasTitle);
  add('1인칭 · -다체 과거형', !/요\.|니다\.|요$/.test(body) && /(었|았|였|했)다/.test(body), /요\.|니다\./.test(body) ? '존댓말 어미가 있음' : '');
  return out;
}
function guideHTML(checks, esc) {
  const bad = checks.filter(c => c.level === 'bad').length, warn = checks.filter(c => c.level === 'warn').length;
  return `<details class="guide" ${bad ? 'open' : ''}><summary>지침 점검 · ${bad ? `<b class="g-bad">어김 ${bad}</b>` : '<b class="g-ok">어김 없음</b>'}${warn ? ` · 확인 ${warn}` : ''}</summary>
  <ul class="guidelist">${checks.map(c => `<li class="g-${c.level}"><span>${c.level === 'ok' ? '✓' : c.level === 'warn' ? '?' : '✕'}</span> ${esc(c.rule)}${c.detail ? `<small>${esc(c.detail)}</small>` : ''}</li>`).join('')}</ul>
  <p class="note">코드로 찾는 대략적인 점검이에요. 새로 만든 사건, 단정한 감정, 문법은 사람이 읽고 확인해 주세요.</p></details>`;
}
const GUIDE_CSS = `.guide{margin:14px 0;border:1px solid var(--line);border-radius:6px;padding:10px 14px;background:var(--paper);max-width:40em}
.guide summary{cursor:pointer;font-size:13.5px}
.g-bad{color:var(--flag-fg)} .g-ok{color:var(--ok)}
.guidelist{list-style:none;padding:0;margin:10px 0 6px;display:grid;gap:4px;font-size:13px}
.guidelist li{display:grid;grid-template-columns:1.2em 1fr;gap:2px 6px}
.guidelist li span{font-weight:700} .guidelist li small{grid-column:2;color:var(--ink-2);word-break:break-all}
.guidelist .g-ok span{color:var(--ok)} .guidelist .g-warn span{color:var(--warn)} .guidelist .g-bad span{color:var(--flag-fg)} .guidelist .g-bad{color:var(--ink)}`;
(function(){try{const s=document.createElement('style');s.textContent=GUIDE_CSS;document.head.appendChild(s)}catch(e){}})();

// 사실 점검 (AI): 코드로 못 잡는 '새 사건·행동, 단정한 감정, 새 대사'를 문장별로 본다
function factCheckPrompt(body, qa) {
  return `너는 수필 초안의 사실 점검 담당이다. 초안의 각 문장을 사용자의 답과 대조해, 아래에 해당하는 문장만 고른다.
- 새 사건: 답에 없는 일이 일어남
- 새 행동: 나 또는 다른 사람이 답에 없는 행동을 함 (예: 답에 없는데 "수험표를 내려다봤다")
- 단정한 감정: 사용자가 말하지 않은 감정을 사실처럼 씀, 또는 감정 단어를 씀
- 새 대사: 답에 없는 말을 따옴표로 씀
- 어긋남: 앞 문장이나 답과 사실이 맞지 않음
장면을 자연스럽게 만드는 작은 세부(예: 정류장에 서 있었다)와 재료에서 누구나 알 수 있는 의미는 문제가 아니다. 확실한 것만 고른다.

[사용자 답]
${qa.map(x => `Q: ${x.q}\nA: ${x.a}`).join('\n')}

[초안]
${body}

설명 없이 JSON 하나만: {"issues":[{"sentence":"초안 문장 그대로","kind":"새 사건|새 행동|단정한 감정|새 대사|어긋남","why":"짧게"}]}`;
}
function factHTML(r, esc) {
  if (!r) return '';
  if (r.err) return `<p class="note">사실 점검을 못 했어요 (${esc(r.err)}).</p>`;
  if (!r.issues.length) return '<p class="note g-ok">사실 점검: 새로 만든 사건·행동, 단정한 감정, 새 대사를 찾지 못했어요.</p>';
  return `<ul class="guidelist">${r.issues.map(x => `<li class="g-bad"><span>✕</span> ${esc(x.kind)} · ${esc(x.sentence)}<small>${esc(x.why || '')}</small></li>`).join('')}</ul>`;
}
