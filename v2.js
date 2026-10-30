/* 내 안의 날씨 실험실 v2 — 「전체 유저 플로우 설계(0~7단계)」 기준
   0 온보딩 · 1 날씨 · 2 장면 좁히기 · 3 꼬리질문(답변 유형 분기) · 4 재료 확인 · 5 초안+출처 · 6 퇴고(갬) · 7 저장+날씨 기록 */

/* ---------- 문서에서 옮긴 값 ---------- */
const WEATHERS=['비','흐림','갠 뒤 추움','안개','바람','맑음','해 나는데 비'];
const ICON={
 '맑음':'<circle cx="20" cy="20" r="7"/><path d="M20 5v4M20 31v4M5 20h4M31 20h4M9 9l3 3M28 28l3 3M9 31l3-3M28 12l3-3"/>',
 '흐림':'<path d="M11 28h18a6 6 0 0 0 0-12 9 9 0 0 0-17 2 5 5 0 0 0-1 10z"/>',
 '비':'<path d="M11 22h18a6 6 0 0 0 0-12 9 9 0 0 0-17 2 5 5 0 0 0-1 10z"/><path d="M14 27l-2 5M20 27l-2 5M26 27l-2 5"/>',
 '바람':'<path d="M6 15h20a4 4 0 1 0-4-4M6 21h26a4 4 0 1 1-4 4M6 27h12"/>',
 '안개':'<path d="M7 14h26M10 20h22M7 26h26M12 32h16"/>',
 '갠 뒤 추움':'<circle cx="15" cy="15" r="5"/><path d="M15 5v2M5 15h2M8 8l1.5 1.5"/><path d="M26 22v12M21 25l10 6M21 31l10-6"/>',
 '해 나는데 비':'<circle cx="27" cy="12" r="5"/><path d="M27 3v2M36 12h-2M33 6l-1.5 1.5"/><path d="M8 26h14a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0-1 8z"/><path d="M11 30l-1.5 4M17 30l-1.5 4"/>',
 '직접':'<path d="M9 31l3-9 15-15 6 6-15 15-9 3zM24 10l6 6"/>'
};
// 3단계 슬롯 (감정 슬롯은 없다). 때·장소는 장면, 나머지 다섯이 '재료'
const SLOTS={time:'때',place:'장소',object:'사물',action:'행동',speech:'타인의 말',sense:'감각',change:'변화',other:'그 밖의 말'};
const MATERIAL=['object','action','speech','sense','change'];
const ASK_ORDER=['place','action','object','sense','speech','change'];
const TYPES=['충분','단답','감정어만','범위 과대','교훈·평가','사람만 등장','감각 없음','회피'];
// 답변 유형별 분기 표의 '던질 질문'과 슬롯별 기본 문안 (모델이 규칙을 어기면 이걸 쓴다)
const TEMPLATE={
  place:['그 무렵에 가장 자주 있던 자리가 어디였어요?','그때 어디에 있었어요?'],
  action:['거기서 주로 뭘 하셨어요?','그때 뭘 하고 있었어요?'],
  object:['그 자리에 뭐가 있었어요?','손에 뭘 들고 있었어요?'],
  sense:['거기서 무슨 소리가 났어요?','그때 무슨 냄새가 났어요?'],
  speech:['그때 누가 뭐라고 했어요?','그 사람이 정확히 뭐라고 했어요?'],
  change:['그 전과 후에 달라진 행동이 있나요?','그 뒤로 하게 된 일이 있어요?']
};
const Q_SCENE='그 날씨가 가장 선명했던 날이 언제였어요? 하루만 떠올려보세요.';
const Q_DETOUR='그 무렵에 가장 자주 있던 자리가 어디였어요?';
const Q_PLACE='그날 어디에 있었어요?';
const Q_EVADE='그날 계절은 기억나세요?';
const LIMIT={material:3,questions:8,evade:2,ms:7*60*1000};

// 6단계 갬: 원리 카드 6종과 부록 작가 구절 (팀 번역)
const CARDS=[
 {t:'감정에 이름을 붙이는 대신, 그때 한 일을 적어보세요',bad:'아버지가 돌아가신 날, 나는 무척 슬펐다.',good:'장례식장 자판기 앞에서 커피를 세 번 뽑았다. 세 잔 다 마시지 않았다.',q:[
  ['나방이 몸을 바로 세우도록 도와주려고 연필을 내밀었다. 그 순간, 저 서툰 몸부림이 죽음이 다가오는 모습이라는 생각이 들었다. 나는 연필을 다시 내려놓았다.','버지니아 울프, 「나방의 죽음」'],
  ['"잘못한 거예요. 이제 당신이 제일 먼저 저를 경멸하겠죠." 탁자 위에 수박이 있었다. 구로프는 한 조각을 잘라 서두르지 않고 먹기 시작했다. 적어도 반 시간 동안 아무도 말하지 않았다.','안톤 체호프, 「개를 데리고 다니는 여인」'],
  ['책상 위에 석회암 세 조각을 올려두고 있었다. 그런데 그것들을 날마다 닦아줘야 한다는 걸 알고 덜컥 겁이 났다. 내 마음속 가구는 아직 먼지 한 번 털지 못했는데. 나는 넌더리가 나서 그것들을 창밖으로 던져버렸다.','헨리 데이비드 소로, 『월든』']]},
 {t:'요약하지 말고, 한 장면만 남겨보세요',bad:'대학 시절은 외롭고 힘든 나날의 연속이었다.',good:'2학년 가을, 삼각김밥을 들고 공대 비상계단에 올라가 먹곤 했다.',q:[
  ['그는 문을 밀어 열고 방으로 들어갔다. 얇은 커튼을 통과한 노란 햇살 한 줄기가 비스듬히 탁자 위에 떨어졌고, 그 위에는 반쯤 열린 성냥갑이 잉크병 옆에 놓여 있었다. 아래 거리에서는 얼룩고양이 한 마리가 낙엽을 쫓고 있었다.','조지 오웰, 「나는 왜 쓰는가」'],
  ['숲에서 일하던 날이면 나는 보통 버터 바른 빵을 점심으로 싸 갔다. 정오가 되면 직접 쳐낸 푸른 소나무 가지들 사이에 앉아, 빵을 쌌던 신문지를 읽었다. 손에 송진이 두껍게 묻어 있어서, 빵에서 솔 냄새가 났다.','헨리 데이비드 소로, 『월든』']]},
 {t:'교훈으로 끝내지 말고, 그대로 두세요',bad:'그 일로 나는 비로소 어른이 되었다.',good:'그 뒤로 나는 누가 울면 가만히 옆에 앉아 있게 되었다.',q:[
  ['"윌리엄 삼촌은 왜 죽어야 했어요? 늙지도 않았잖아요." 할머니는 뜨개 코를 셋씩 세기 시작했다. "그냥 그렇게 됐단다." 뜨개질에 정신이 팔린 목소리였다.','캐서린 맨스필드, 「만에서」'],
  ['이미 거뭇하게 썩어 가는 고양이 묘표에 비하면, 헥토르의 것은 아직 하얗게 빛나고 있다. 그러나 머지않아 둘 다 같은 색으로 낡아, 똑같이 사람 눈에 띄지 않게 될 것이다.','나쓰메 소세키, 『유리문 안에서』'],
  ['독일이 러시아에 선전포고했다. 오후에는 수영 교실.','프란츠 카프카, 1914년 8월 2일 일기']]},
 {t:'꾸미지 말고, 그냥 말해보세요',bad:'추억은 빛바랜 사진처럼 마음 한켠에 자리 잡았다.',good:'이제는 그 사람 목소리가 잘 기억나지 않는다. 그런데 비슷한 웃음소리가 들리면 아직도 고개를 돌린다.',q:[
  ['고배로 공원 너머 숲에 있을 때, 물가 가까이에 수선화 몇 송이가 보였다. 그런데 걸어갈수록 더, 또 더 많아지더니, 마침내 나뭇가지 아래로 호숫가를 따라 기다란 띠가 보였다. 시골 국도만 한 너비였다.','도로시 워즈워스, 『그래스미어 일기』'],
  ['최근 몇 년 동안 나는 덜 그림처럼, 더 정확하게 쓰려고 애썼다. (…) 좋은 산문은 유리창과 같다.','조지 오웰, 「나는 왜 쓰는가」']]},
 {t:'사람을 설명하지 말고, 그 사람이 한 말을 적어보세요',bad:'할머니는 무뚝뚝하지만 속정이 깊은 분이셨다.',good:'할머니는 갈 때마다 "뭐 하러 왔냐"고 하셨다. 그러고는 냉장고에서 배를 꺼내셨다.',q:[
  ['그는 전차 손잡이에 매달린 채 주머니에서 손수건에 싼 것을 꺼내 보였다. 내가 "뭔가" 하고 물었다. 그는 "밤만주야" 하고 대답했다. 아까 그가 우리 집에 있을 때 내놓았던 과자였다.','나쓰메 소세키, 『유리문 안에서』'],
  ['1845년 3월 말, 나는 도끼 한 자루를 빌려 월든 호숫가 숲으로 내려갔다. (…) 도끼 주인은 손에서 그것을 놓으며, 자기가 눈동자처럼 아끼는 물건이라고 했다. 나는 받았을 때보다 더 날카롭게 해서 돌려주었다.','헨리 데이비드 소로, 『월든』'],
  ['로라는 아이처럼 크게 흐느꼈다. "모자, 죄송해요." 그녀가 말했다.','캐서린 맨스필드, 「가든파티」']]},
 {t:'큰 이야기 말고, 작은 장면에서 시작해보세요',bad:'아버지와의 관계에 대해 쓰고 싶다.',good:'아버지가 내 자전거 안장을 높여주던 날.',q:[
  ['내가 아는 어머니는 늘 커다란 안경을 쓰고 바느질을 하고 있었다. (…) 여름이면 어머니는 늘 무늬 없는 감색 홑옷을 입고, 폭이 좁은 검은 공단 띠를 매고 있었다.','나쓰메 소세키, 『유리문 안에서』'],
  ['벽난로 위의 저 그릇은 바람 부는 날 만토바에서 산 것이다. (…) 바닥으로 눈을 내리면 카펫에 갈색 얼룩이 있다. 커밍스 씨가 "그 사람은 악마야!" 하면서, 찻주전자에 물을 부으려던 주전자를 내려놓는 바람에 생긴 자국이다.','버지니아 울프, 「거리 헤매기」']]}
];
// 규칙으로 먼저 거르는 사전 (구현 메모: 규칙으로 싸게, 애매한 건 LLM)
const RX={
  evade:/모르겠|기억(이)? ?안|기억(이)? 잘|글쎄|생각(이)? ?안|몰라요|모름|^\s*(음+|흠+|잘)\s*[.?!…]*\s*$/,
  period:/시절|무렵|내내|그때쯤|때요$|때요[.!]?$|때였|늘|항상|자주|매일|매번|학년 때|살 때|어릴 때/,
  emotion:/슬펐|슬프|힘들|외로|우울|행복|기뻤|기쁘|서러|속상|억울|무서|두려|불안|설레|그리웠|그립|쓸쓸|허전|답답|짜증|화났|미웠|좋았|싫었/,
  lesson:/성장|깨달|배웠|알게 되|교훈|덕분에|소중함|의미가|어른이 되|느꼈다|생각한다|중요하/
};

/* ---------- 상태 ---------- */
let fatal='', showSettings=false, S;
const CFG={pass:'',extract:'',draft:'',models:[]};
try{Object.assign(CFG,JSON.parse(localStorage.getItem('naenal-cfg')||'{}'))}catch(e){}
CFG.models=[];
function saveCfg(){try{localStorage.setItem('naenal-cfg',JSON.stringify({pass:CFG.pass,extract:CFG.extract,draft:CFG.draft,bad:CFG.bad||[]}))}catch(e){}}
const USAGE=[];
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const K={wip:'naenal-v2-wip',shelf:'naenal-v2-shelf',runs:'naenal-v2-runs',onboard:'naenal-v2-onboarded'};
function emptySlots(){const o={};for(const k in SLOTS)o[k]=[];return o}
function fresh(){
  S={phase:'start',weather:'',wxCustom:false,stage:2,msgs:[],qa:[],slots:emptySlots(),solid:{},asked:{},
     q3:0,detour:false,evadeStreak:0,evadeAngle:false,cur:null,t0:null,activeMs:0,lastTick:null,waitMs:0,
     cards:[],extra:'',extraOpen:false,draft:null,drafts:[],regenUsed:false,autoRegen:false,rev:null,title:'',
     rule:'아직 시작 전',events:[],busy:false,endReason:'',savedId:null};
}
fresh();

/* ---------- 모델 고르기 (v1과 같음) ---------- */
const NOT_CHAT=/image|imagen|veo|live|native-audio|audio|tts|computer-use|robotics|aqa|embed|rerank|reward|guard|safety|shield|vision|-vl|vlm|clip|parse|ocr|whisper|asr|riva|retriev|cosmos|detect|segment|sdxl|flux|diffusion|kosmos|paligemma|deplot|fuyu|neva|vila|nvclip|grounding|pii|content-safety|topic-control|jailbreak|calibration|starcoder|codestral|codegemma|coder|code-|math|bge|e5-|arctic-embed|nemoretriever|usdcode|reason-rm|-rm\b/i;
const EXTRACT_PREF=[/^gemini:gemini-3\.5-flash-lite/i,/^gemini:.*flash-lite/i,/qwen3/i,/llama-3\.3-70b-instruct/i,/qwen/i];
const DRAFT_PREF=[/^gemini:gemini-3\.5-flash$/i,/^gemini:gemini-3\.\d-flash$/i,/^gemini:.*flash(?!-lite)/i,/deepseek-v4-flash/i,/qwen3/i,/llama-3\.3-70b-instruct/i];
function pickModel(prefs,skip=new Set()){for(const re of prefs){const m=CFG.models.find(x=>re.test(x)&&!skip.has(x)&&!/thinking|reason|r1|deepseek-v4|preview/i.test(x));if(m)return m}for(const re of prefs){const m=CFG.models.find(x=>re.test(x)&&!skip.has(x));if(m)return m}return CFG.models.find(m=>!skip.has(m)&&/instruct|chat|gemini/i.test(m))||''}
async function loadModels(){
  try{
    const r=await fetch('/api/models',{headers:{'x-passcode':encodeURIComponent(CFG.pass)}});
    const j=await r.json();
    if(!r.ok){fatal=j.message||'모델 목록을 불러오지 못했어요.';showSettings=true;return render()}
    fatal='';
    const all=j.models||[];
    CFG.models=all.filter(m=>!NOT_CHAT.test(m)&&!(CFG.bad||[]).includes(m));
    const ok=m=>m&&CFG.models.includes(m);
    if(!ok(CFG.extract))CFG.extract=pickModel(EXTRACT_PREF);
    if(!ok(CFG.draft))CFG.draft=pickModel(DRAFT_PREF)||CFG.extract;
    ev(`모델 연결: 판독 ${CFG.extract} / 초안 ${CFG.draft}`);
    saveCfg();
  }catch(e){fatal='서버에 연결하지 못했어요. Vercel 배포 주소에서 열었는지 확인해 주세요.'}
  render();
}

/* ---------- LLM 호출 ---------- */
function codeOf(j,status){const m=j.message||'';return /not found for account|not found|404/i.test(m)?'model_unavailable':(j.error||('http_'+status))}
async function callLLM(prompt,role,model,max_tokens){
  const t=performance.now();
  try{
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','x-passcode':encodeURIComponent(CFG.pass)},
      body:JSON.stringify({model,prompt,role,max_tokens,temperature:0})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw {code:codeOf(j,r.status),message:j.message||''};
    USAGE.push({role,model,in:j.usage?.prompt_tokens||0,out:j.usage?.completion_tokens||0,ms:j.ms||0});
    return j.text||'';
  }finally{S.waitMs+=performance.now()-t}
}
// 초안은 서버가 스트리밍으로 보낸다
async function streamLLM(prompt,model){
  const t=performance.now();
  const ctl=new AbortController();let first=false;const timer=setTimeout(()=>{if(!first)ctl.abort()},90000);
  try{
    let r;
    try{r=await fetch('/api/chat',{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','x-passcode':encodeURIComponent(CFG.pass)},body:JSON.stringify({model,prompt,role:'draft',temperature:0.3})})}
    catch(e){throw {code:'no_response',message:`${model}이(가) 90초 동안 응답하지 않았어요.`}}
    if(!r.ok){const j=await r.json().catch(()=>({}));throw {code:codeOf(j,r.status),message:j.message||''}}
    const rd=r.body.getReader(),dec=new TextDecoder();let all='';
    for(;;){let x;try{x=await rd.read()}catch(e){throw {code:'no_response',message:'응답이 끊겼어요.'}}if(x.done)break;if(x.value&&x.value.length)first=true;all+=dec.decode(x.value,{stream:true})}
    all+=dec.decode();
    const k=all.indexOf('\u0000');const text=k<0?all:all.slice(0,k);let meta={};try{meta=JSON.parse(all.slice(k+1))}catch(e){}
    USAGE.push({role:'draft',model,in:meta.usage?.prompt_tokens||0,out:meta.usage?.completion_tokens||0,ms:meta.ms||0});
    if(meta.error&&!text.trim())throw {code:meta.error==='timeout'?'timeout':'empty',message:meta.error};
    return text;
  }finally{clearTimeout(timer);S.waitMs+=performance.now()-t}
}
function parseJSON(text){
  let t=String(text).replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f)t=f[1];
  const a=t.indexOf('{'),b=t.lastIndexOf('}');
  if(a<0||b<a)throw {code:'invalid_json',message:t.slice(0,200)};
  try{return JSON.parse(t.slice(a,b+1))}catch(e){throw {code:'invalid_json',message:t.slice(0,200)}}
}
// 판독·퇴고 검사용. 쓸 수 없는 모델이면 교체, 한도 초과면 다른 모델로, 그 밖엔 1회 재시도
async function askJSON(label,prompt,role='extract'){
  const key=role==='draft'?'draft':'extract';
  const tried=new Set();let model=CFG[key];
  for(let i=0;i<5;i++){
    try{return parseJSON(await callLLM(prompt,role,model,1500))}
    catch(e){
      if(['bad_passcode','no_key'].includes(e.code)){fatal=e.message;showSettings=true;render();throw e}
      if(e.code==='model_unavailable'){CFG.bad=[...new Set([...(CFG.bad||[]),model])];CFG.models=CFG.models.filter(m=>m!==model);}
      if(e.code==='model_unavailable'||e.code==='rate_limited'){
        tried.add(model);const alt=pickModel(role==='draft'?DRAFT_PREF:EXTRACT_PREF,tried);
        if(alt){ev(`${label}: "${model}" ${e.code==='rate_limited'?'한도 초과':'사용 불가'} → "${alt}"`,'fail');if(e.code==='model_unavailable'){CFG[key]=alt;saveCfg()}model=alt;continue}
      }
      ev(`${label} 실패 (${e.code}) ${String(e.message||'').slice(0,160)}`,'fail');
      if(i>=1)return null;
    }
  }
  return null;
}
function trimTail(s){
  let t=s.replace(/[.!?…~]+$/,'').trim();
  if(/이요$/.test(t))t=t.slice(0,-2);
  else if(/요$/.test(t)&&!/(어|아|해|여|워|와|에|예|지|죠|세|게|네|래|대|데|군|나|까|봐)요$/.test(t))t=t.slice(0,-1);
  return t.trim()||s;
}
function keep(v,src){
  if(typeof v!=='string')return null;const s=v.trim();if(!s)return null;
  if(src.includes(s))return s;
  const sq=x=>x.replace(/\s+/g,'');if(sq(src).includes(sq(s)))return s;
  ev(`"${s}" 버림: 원문에 그대로 없음`,'drop');return null;
}
// 받침 유무로 조사 고르기 (기획안 5.4)
function josa(w,pair){const c=String(w).trim().slice(-1).charCodeAt(0);const has=c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0;const [a,b]=pair.split('/');return w+(has?a:b)}

/* ---------- 2·3단계: 답 하나 읽기 ---------- */
function transcript(){return S.qa.map(x=>`AI: ${x.q}\nU: ${x.a}`).join('\n')}
function slotStatus(){return Object.keys(SLOTS).filter(k=>k!=='other').map(k=>`- ${SLOTS[k]}(${k}): ${S.slots[k].length?'채움 ← '+S.slots[k].join(' / '):'비어 있음'}`).join('\n')}
async function readAnswer(ans){
  const p=`너는 '내 안의 날씨' 앱의 질문 담당이다. 사용자가 기억 속 한 장면을 이야기하면, 답에서 재료를 찾고 비어 있는 재료 하나만 묻는다. 감정은 묻지 않는다.

[재료 슬롯]
time 때: 하루 단위로 좁혀진 시점 (예: 2학년 가을)
place 장소: 어디였는지 (예: 공대 비상계단)
object 사물: 그 자리에 있던 물건 (예: 삼각김밥, 자판기 커피)
action 행동: 화자의 몸짓·한 일, 그리고 그 행동의 이유를 말한 절 (예: 커피를 세 번 뽑았다, 학식을 혼자 먹기 싫어서 → 행동)
speech 타인의 말: 다른 사람이 실제로 한 말 그대로 (예: "뭐 하러 왔냐"). 말을 옮긴 것만. 소리·응원 소리·분위기는 감각이다.
sense 감각: 소리·냄새·온도·촉감·빛 (예: 손이 시렸다, 아무 소리도 안 났어요)
change 변화: 그 뒤 달라진 '행동' (예: 옆에 가만히 앉게 됐다). 깨달음·교훈·마음가짐은 아니다.
other 그 밖의 말: 위 어디에도 안 맞을 때만. 사용자가 스스로 꺼낸 짧은 소감 (예: 그게 좋았어요)
감정 슬롯은 없다.

[답변 유형 — 하나만]
충분: 구체적인 재료가 들어 있음
단답: 짧고 구체성이 없음 (예: 추웠어요, 밥 먹었어요)
감정어만: 감정만 말함 (예: 너무 슬펐어요)
범위 과대: 기간·반복 (예: 대학 시절 내내요)
교훈·평가: 의미·깨달음 (예: 그 일로 성장했어요)
사람만 등장: 사람은 나오는데 그 사람이 한 말이 없음 (예: 할머니가 반겨주셨어요)
감각 없음: 장면은 있는데 감각이 없음 (예: 비상계단에서 밥 먹었어요)
회피: 기억 안 남·모르겠음

[다음 질문 규칙 — 유형별]
단답 → 방금 답을 구체적으로 묻기 (추웠어요 → 어디가 제일 추웠어요? / 밥 먹었어요 → 뭘 드셨어요?)
감정어만 → 그때 한 일 묻기 (그 말 듣고 뭘 하셨어요?)
범위 과대 → 그 무렵에 가장 자주 있던 자리가 어디였어요?
교훈·평가 → 그 전과 후에 달라진 행동이 있나요?
사람만 등장 → (사람)이 정확히 뭐라고 했어요?
감각 없음 → 거기서 무슨 소리가 났어요?
충분 → 아직 빈 슬롯 하나를 이 순서로: 장소 → 행동 → 사물 → 감각 → 타인의 말. 변화는 교훈·평가일 때만.
금지: 답을 넣어 묻기("손이 시리셨나요?"), 감정 묻기("어떤 감정이었나요?"), 질문 두 개 붙이기, 칭찬·평가("좋은 표현이네요"), 모범 답안, 앞에서 한 질문 반복.
문체: 짧은 해요체 한 문장. 장면은 "거기", "그때"로 가리킨다.

[예시 대화]
AI: 그 날씨가 가장 선명했던 날이 언제였어요? 하루만 떠올려보세요.
U: 대학교 2학년 때요. → 범위 과대
AI: 그 무렵에 가장 자주 있던 자리가 어디였어요?
U: 공대 건물 비상계단이요. → 장소
AI: 거기서 주로 뭘 하셨어요?
U: 밥 먹었어요. → 단답
AI: 뭘 드셨어요?
U: 삼각김밥이요. 학식을 혼자 먹기 싫어서. → 사물, 행동
AI: 거기 혼자 있을 때 무슨 소리가 났어요?
U: 아무 소리도 안 났어요. 그게 좋았어요. → 감각, 그 밖의 말

[지금까지]
날씨: ${S.weather}
${transcript()||'(없음)'}

[지금 슬롯]
${slotStatus()}

[방금 질문]
${S.cur?.q||''}
[방금 답]
"""${ans}"""

슬롯 값은 반드시 방금 답 안에 글자 그대로 있는 연속된 조각만. 고치거나 요약하지 않는다. 같은 조각이 두 슬롯에 들어가도 된다.
설명 없이 JSON 하나만:
{"type":"유형","slots":{"time":[],"place":[],"object":[],"action":[],"speech":[],"sense":[],"change":[],"other":[]},"person":"답에 나온 사람 또는 null","next_slot":"place|action|object|sense|speech|change","question":"다음 질문 한 문장"}`;
  const r=await askJSON('답 읽기',p);
  if(!r)return null;
  const out={type:TYPES.includes(r.type)?r.type:'충분',slots:emptySlots(),person:typeof r.person==='string'&&r.person!=='null'?r.person:null,next:r.next_slot,question:String(r.question||'').trim(),raw:r};
  for(const k in SLOTS)out.slots[k]=(Array.isArray(r.slots?.[k])?r.slots[k]:[]).map(v=>keep(v,ans)).filter(Boolean).map(trimTail);
  // 2단계 첫 답은 '언제'에 대한 답이라, 모델이 때를 못 뽑았으면 답 자체를 때로 둔다 (넓어도 인정)
  if(S.stage===2&&S.qa.length===0&&!out.slots.time.length&&!out.slots.place.length&&!RX.evade.test(ans)&&!RX.emotion.test(ans)&&ans.length<=30)out.slots.time=[trimTail(ans)];
  // 규칙 판정이 우선 (구현 메모: 규칙으로 싸게 거르고 애매한 건 LLM)
  if(RX.evade.test(ans)&&ans.length<25)out.type='회피';
  else if(S.stage===2&&RX.period.test(ans)&&!out.slots.place.length)out.type='범위 과대';
  ev(`답 읽기 ← "${ans}"\n유형: ${out.type}${out.type!==r.type?` (모델은 ${r.type})`:''}\n${Object.entries(out.slots).filter(([k,v])=>v.length).map(([k,v])=>SLOTS[k]+': '+v.join(' / ')).join('\n')||'재료 없음'}\n모델 제안: ${out.question}`);
  return out;
}
function absorb(r){
  if(r.type==='단답'){S.thin=S.thin||[];for(const k of MATERIAL)S.thin.push(...r.slots[k])}
  for(const k in r.slots)for(const v of r.slots[k])if(!S.slots[k].includes(v))S.slots[k].push(v);
  // 단답은 재료로 세지 않는다 (예시 대화에서 "밥 먹었어요"는 단답)
  if(r.type!=='단답'&&r.type!=='회피')for(const k of MATERIAL)if(r.slots[k].length)S.solid[k]=true;
}
function materialCount(){return MATERIAL.filter(k=>S.solid[k]).length}
function filledCount(){return ['time','place',...MATERIAL].filter(k=>S.slots[k].length).length}
function activeMs(){return S.activeMs}
function goodQuestion(q){
  if(!q||q.length>60)return false;
  if((q.match(/\?/g)||[]).length!==1)return false;
  if(/감정|기분|느끼|느꼈|느낌|마음이|감각|재료|좋은 표현|잘 쓰|훌륭|다른 .*(은|는) 뭐가/.test(q))return false;
  if(S.qa.some(x=>x.q===q))return false;
  return true;
}
function templateFor(slot,r){
  if(slot==='speech'&&r?.person)return josa(r.person,'이/가')+' 정확히 뭐라고 했어요?';
  const list=TEMPLATE[slot]||TEMPLATE.action;const used=S.qa.map(x=>x.q);
  return list.find(q=>!used.includes(q))||list[0];
}
function ask(q,why){S.cur={q};S.msgs.push({role:'ai',text:q});S.rule=why;save();go('chat')}

/* 2단계: 하루 하나로 좁히기 */
async function onAnswer(text){
  tick();
  S.msgs.push({role:'me',text});S.busy=true;render();
  const r=await readAnswer(text);
  S.busy=false;S.lastTick=Date.now(); // 모델을 기다린 시간은 7분에 넣지 않는다
  if(!r){S.msgs.pop();S.retryText=text;S.sendErr=true;S.rule='답을 읽지 못함: 횟수에 넣지 않고 같은 질문 유지';return render()}
  S.qa.push({q:S.cur.q,a:text,type:r.type,stage:S.stage});
  absorb(r);
  if(r.type==='회피')S.evadeStreak++;else S.evadeStreak=0;
  if(S.stage===2)return next2(r);
  S.q3++;return next3(r);
}
function next2(r){
  const placed=S.slots.place.length>0;
  if(r.type==='범위 과대'&&!S.detour&&!placed){S.detour=true;return ask(Q_DETOUR,'2단계: 기간 표현 → 하루를 다시 요구하지 않고 장소로 우회 (1회)')}
  if(!placed&&S.qa.filter(x=>x.stage===2).length<2&&r.type!=='회피'){return ask(Q_PLACE,'2단계: 때는 나왔고 장소가 비어 장소를 물음')}
  S.stage=3;S.rule='2단계 끝 → 3단계 꼬리질문';
  return next3(r,true);
}
/* 3단계: 비어 있는 재료만 묻기 */
function next3(r,first){
  const m=materialCount();
  const end=why=>{S.endReason=why;S.rule='종료: '+why;save();toCards()};
  if(m>=LIMIT.material)return end(`재료 슬롯 ${m}개 채워짐`);
  if(S.q3>=LIMIT.questions)return end(`질문 ${LIMIT.questions}개 도달`);
  if(S.evadeStreak>=LIMIT.evade){S.msgs.push({role:'ai',text:'여기까지만 적어도 괜찮아요.'});return end('회피 답변 2회 연속')}
  if(activeMs()>LIMIT.ms)return end('7분 초과');
  // 회피 1회: 각도를 바꿔 한 번만
  if(r.type==='회피'&&!S.evadeAngle){S.evadeAngle=true;return ask(Q_EVADE,'회피 1회 → 더 쉬운 쪽으로 각도 바꾸기 (1회만)')}
  const emptyNext=ASK_ORDER.find(k=>k!=='change'&&!S.slots[k].length)||'sense';
  // 3단계 첫 질문은 문서 예시처럼 빈 슬롯 순서대로 기본 문안
  if(first){const slot=emptyNext;return ask(templateFor(slot,r),`3단계 시작 → 빈 슬롯 '${SLOTS[slot]}' 기본 문안`)}
  if(goodQuestion(r.question))return ask(r.question,`유형 "${r.type}" → 모델이 만든 질문 (${SLOTS[r.next]||'?'})`);
  const byType={'교훈·평가':'change','사람만 등장':'speech','감각 없음':'sense','감정어만':'action'};
  const slot=byType[r.type]||(r.next&&TEMPLATE[r.next]&&!S.slots[r.next].length?r.next:emptyNext);
  return ask(templateFor(slot,r),`유형 "${r.type}" → '${SLOTS[slot]}' 기본 문안${r.question?' (모델 질문이 규칙 위반: '+r.question+')':''}`);
}
function finishNow(){S.endReason='사용자가 "이제 됐어요"';S.rule='종료: 이제 됐어요';toCards()}

/* ---------- 4단계: 재료 확인 ---------- */
function toCards(){
  const seen=new Set();S.cards=[];let id=1;
  for(const k of ['time','place','object','action','speech','sense','change','other'])for(const v of S.slots[k]){
    if(seen.has(v))continue;
    // 다른 카드에 통째로 들어 있는 짧은 조각은 뺀다 (같은 말이 두 번 보이지 않게)
    seen.add(v);const thin=(S.thin||[]).includes(v)&&filledCount()>3;S.cards.push({id:'c'+(id++),slot:k,text:v,off:thin,thin});
  }
  S.cards=S.cards.filter(c=>!S.cards.some(o=>o!==c&&o.text.length>c.text.length&&o.text.includes(c.text)&&o.slot===c.slot));
  if(filledCount()<=2){S.phase='thin';save();return render()}
  S.phase='cards';save();render();
}

/* ---------- 5단계: 초안 + 출처 ---------- */
const DRAFT_LABEL={time:'언제',place:'어디',object:'사물',action:'사건',speech:'누군가의 말',sense:'감각',change:'그 후',other:'그 밖의 말'};
function draftPromptV2(){
  const materials=S.cards.filter(c=>!c.off).map(c=>({k:DRAFT_LABEL[c.slot],v:c.text}));
  return buildDraftPrompt({weather:S.weather,materials,qa:S.qa,removed:S.cards.filter(c=>c.off).map(c=>c.text),extra:S.extra});
}
function toSentences(body){const out=[];body.split(/\n\s*\n/).forEach((para,p)=>{para.replace(/\n/g,' ').split(/(?<=[.!?…]["”]?)\s+/).map(x=>x.trim()).filter(Boolean).forEach(text=>out.push({text,p}))});return out}
function mustHaveV2(){return S.cards.filter(c=>!c.off&&['object','action','sense'].includes(c.slot)).map(c=>c.text)}
function checksFor(body){return guideCheck(body,{answers:S.qa.map(x=>x.a).concat(S.extra?[S.extra]:[]),weather:S.weather,whenText:(S.cards.find(c=>c.slot==='time')||{}).text||'',mustHave:mustHaveV2()})}
async function makeDraft(kind){
  S.phase='drafting';S.busy=true;render();
  const tried=new Set();let model=CFG.draft,out=null,err=null;
  for(let i=0;i<4&&!out;i++){
    try{
      const t=performance.now();
      const c=cleanDraft(await streamLLM(draftPromptV2(),model));
      if(!c.body)throw {code:'empty',message:'본문이 비어 있어요'};
      if(c.strippedTitle)ev(`지침과 달리 제목을 붙여서 뗐어요: "${c.strippedTitle}"`,'drop');
      const u=USAGE[USAGE.length-1]||{};
      out={sentences:toSentences(c.body),model,at:new Date().toISOString(),ms:Math.round(performance.now()-t),tin:u.in,tout:u.out,kind,strippedTitle:c.strippedTitle};
      out.checks=checksFor(c.body);
    }catch(e){
      err=e;
      if(e.code==='model_unavailable'||e.code==='rate_limited'||e.code==='no_response'){tried.add(model);const alt=pickModel(DRAFT_PREF,tried);if(alt){ev(`초안: "${model}" ${e.code} → "${alt}"`,'fail');model=alt;continue}}
      ev(`초안 실패 (${e.code}) ${String(e.message||'').slice(0,160)}`,'fail');break;
    }
  }
  S.busy=false;
  if(!out){S.draftErr=err?`${err.code} ${String(err.message||'').slice(0,100)}`:'초안을 만들지 못했어요';S.phase='cards';return render()}
  const bad=out.checks.filter(c=>c.level==='bad');
  ev(`초안 (${out.model}) ${draftText(out).length}자 · 지침 어김 ${bad.length}${bad.length?': '+bad.map(c=>c.rule).join(', '):''}`);
  S.draftErr=null;S.draft=out;S.drafts.unshift(out);S.rev=null;S.phase='draft';save();render();
}
async function factCheck(){
  S.busy=true;render();
  const r=await askJSON('사실 점검',factCheckPrompt(draftText(),S.qa));
  S.draft.fact=r?{issues:(Array.isArray(r.issues)?r.issues:[]).filter(x=>x&&x.sentence)}:{err:'응답 없음'};
  S.busy=false;ev(`사실 점검: ${S.draft.fact.err||S.draft.fact.issues.length+'개'}`);save();render();
}
function draftText(d=S.draft){const ps=[];for(const x of d.sentences)(ps[x.p||0]=ps[x.p||0]||[]).push(x.text);return ps.filter(Boolean).map(p=>p.join(' ')).join('\n\n')}

/* 출처 표시: 사용자 원문에서 온 어절에 밑줄 */
const GLUE=new Set(['나는','나도','나','내가','내','그','그때','그때는','그날','그날은','거기','거기서','거기서는','거기에','그리고','그런데','그래서','그곳','그곳에서','이었다','였다','했다','있었다','없었다','있다','없다','것','것이다','수','또','다시']);
function srcText(){return [...S.qa.map(x=>x.a),S.extra].join(' ')}
function fromUser(word,flat){
  const w=word.replace(/[^가-힣A-Za-z0-9]/g,'');if(!w)return null;
  if(GLUE.has(w)||w.length===1)return 'glue';
  const cands=[w];if(w.length>=3)cands.push(w.slice(0,-1));if(w.length>=4)cands.push(w.slice(0,-2));
  if(/다$/.test(w)){const st=w.slice(0,-1);cands.push(st+'어요',st+'요',st+'어');}
  if(/(았|었|였)다$/.test(w)){const st=w.slice(0,-1);cands.push(st+'고',st+'는데',w.replace(/었다$/,'어').replace(/았다$/,'아').replace(/였다$/,'여'));}
  return cands.some(c=>c.length>=2&&flat.includes(c))?'mine':'new';
}
function markup(text){
  const flat=srcText().replace(/\s/g,'');let words=0,mine=0,news=[];
  const html=text.split(/(\s+)/).map(tok=>{if(!tok.trim())return tok;const k=fromUser(tok,flat);if(k===null||k==='glue')return esc(tok);words++;if(k==='mine'){mine++;return `<u>${esc(tok)}</u>`}news.push(tok.replace(/[^가-힣A-Za-z0-9]/g,''));return `<span class="w-new">${esc(tok)}</span>`}).join('');
  return {html,words,mine,news};
}

/* ---------- 6단계: 퇴고 + 갬 ---------- */
const sentenceTexts=()=>S.draft.sentences.map(s=>s.text);
function ruleFlags(){const f=[];sentenceTexts().forEach((t,i)=>{if(RX.lesson.test(t))f.push({i,card:3});else if(RX.emotion.test(t)&&!srcText().includes(t.match(RX.emotion)[0].slice(0,1)))f.push({i,card:1})});return f}
async function checkDraft(){
  S.busy=true;render();
  const p=`너는 '내 안의 날씨' 앱의 퇴고 카드 '갬' 담당이다. 초안 문장 중 아래 원리에 걸리는 문장을 최대 2개 고른다. 고친 문장은 제안하지 않는다. 걸리는 문장이 없으면 빈 배열.
1 감정에 이름을 붙임 (예: 나는 무척 슬펐다)
2 요약함 (예: 대학 시절은 외롭고 힘든 나날의 연속이었다)
3 교훈으로 끝냄 (예: 그 일로 나는 비로소 어른이 되었다)
4 꾸밈·비유 (예: 추억은 빛바랜 사진처럼)
5 사람을 설명함 (예: 할머니는 무뚝뚝하지만 속정이 깊은 분이셨다)
6 큰 이야기 (예: 아버지와의 관계에 대해 쓰고 싶다)
투박한 문장, 감정이 깃든 사물·행동 문장은 건드리지 않는다. 때·장소만 알리는 짧은 문장(예: 2학년 가을이었다)도 고르지 않는다. 확실할 때만 고르고, 애매하면 빈 배열.
사용자가 직접 한 말(아래 원문에 있는 표현, 예: '싫어서', '좋았어요')을 옮긴 문장은 원리에 걸려도 고르지 않는다. 카드는 AI가 보탠 말이나 사용자가 나중에 고친 문장을 위한 것이다.

[사용자 원문]
${S.qa.map(x=>x.a).join(' / ')}

[초안 문장]
${sentenceTexts().map((t,i)=>`${i}: ${t}`).join('\n')}

설명 없이 JSON 하나만: {"flags":[{"i":문장번호,"card":1~6}]}`;
  const r=await askJSON('갬 살피기',p);
  const llm=(Array.isArray(r?.flags)?r.flags:[]).map(f=>({i:+f.i,card:+f.card})).filter(f=>Number.isInteger(f.i)&&f.i>=0&&f.i<S.draft.sentences.length&&f.card>=1&&f.card<=6);
  const all=[...llm];for(const f of ruleFlags())if(!all.some(x=>x.i===f.i))all.push(f);
  const flags=all.slice(0,2).map(f=>({...f,quote:Math.floor(Math.random()*CARDS[f.card-1].q.length),state:'open'}));
  S.rev={flags,log:S.rev?.log||[]};S.busy=false;S.phase='revise';
  ev(`갬: ${flags.length?flags.map(f=>`${f.i+1}번 문장 → 카드 ${f.card}`).join(', '):'걸리는 문장 없음'}`);save();render();
}

/* ---------- 7단계: 저장 + 날씨 기록 ---------- */
function finalText(){return draftText()}
function saveEssay(){
  const title=(S.title||'').trim()||(S.cards[0]?.text||'').split(/\s+/).slice(0,3).join(' ');
  const shelf=store.get(K.shelf,[]);
  const item={id:'e'+Date.now(),title,weather:S.weather,date:new Date().toISOString(),text:finalText(),cards:S.cards.length};
  shelf.unshift(item);store.set(K.shelf,shelf);S.savedId=item.id;
  const runs=store.get(K.runs,[]);runs.unshift(runRecord(title));store.set(K.runs,runs.slice(0,40));
  store.del(K.wip);S.phase='shelf';ev(`저장: "${title}"`);render();
}
function runRecord(title){
  const d=S.draft;const m=markup(finalText());const sum=(f)=>USAGE.filter(f).reduce((a,x)=>({in:a.in+x.in,out:a.out+x.out}),{in:0,out:0});
  return {at:new Date().toISOString(),title,weather:S.weather,qa:S.qa,endReason:S.endReason,q2:S.qa.filter(x=>x.stage===2).length,q3:S.q3,
    activeMin:+(S.activeMs/60000).toFixed(1),cards:S.cards.map(c=>({slot:SLOTS[c.slot],text:c.text,off:c.off})),extra:S.extra,
    draft:d?{model:d.model,first:draftText(S.drafts[S.drafts.length-1]),final:finalText(),sentences:d.sentences.length,checks:checksFor(finalText()).filter(c=>c.level!=='ok'),fact:d.fact||null}:null,
    chars:finalText().length,newRatio:m.words?Math.round(m.news.length/m.words*100):0,news:m.news,
    gam:(S.rev?.flags||[]).map(f=>({sentence:f.i+1,card:CARDS[f.card-1].t,choice:f.state})),
    tokens:{read:sum(x=>x.role!=='draft'),draft:sum(x=>x.role==='draft')},models:{read:CFG.extract,draft:d?.model}};
}
function recordText(r){return `## ${r.title} (v2 플로우 문서 + 초안 지침 10/30)
- 날씨 ${r.weather} · 질문 2단계 ${r.q2} + 3단계 ${r.q3} · 종료: ${r.endReason} · 쓴 시간(대기 제외) ${r.activeMin}분
- 초안 ${r.chars}자(공백 포함), ${r.draft?.sentences}문장 · 답에서 찾지 못한 말 ${r.newRatio}%${r.news.length?' ('+r.news.join(', ')+')':''}
- 지침 점검: ${(r.draft?.checks||[]).map(c=>(c.level==='bad'?'✕ ':'? ')+c.rule+(c.detail?' — '+c.detail:'')).join(' / ')||'어김 없음'}${r.draft?.fact?.issues?' · 사실 점검: '+(r.draft.fact.issues.map(x=>x.kind+' "'+x.sentence+'"').join(' / ')||'문제 없음'):''}
- 갬: ${r.gam.length?r.gam.map(g=>`${g.sentence}번 문장 "${g.card}" → ${g.choice}`).join(' / '):'없음'}
- 모델 판독 ${r.models.read} / 초안 ${r.models.draft} · 토큰 판독 ${r.tokens.read.in}/${r.tokens.read.out}, 초안 ${r.tokens.draft.in}/${r.tokens.draft.out}

### 대화
${r.qa.map(x=>`- AI ${x.q}\n  U ${x.a}  ← ${x.type}`).join('\n')}

### 재료 카드
${r.cards.map(c=>`[${c.slot}] ${c.text}${c.off?' (뺌)':''}`).join(' · ')}${r.extra?`\n덧붙임: ${r.extra}`:''}

### 첫 초안
${r.draft?.first||''}

### 최종 글
${r.draft?.final||''}
`}

/* ---------- 이어 쓰기 (자동 저장) ---------- */
function save(){if(S.phase==='shelf')return;const {events,busy,...rest}=S;store.set(K.wip,rest)}
function tick(){const now=Date.now();if(S.lastTick&&now-S.lastTick<5*60*1000)S.activeMs+=now-S.lastTick;S.lastTick=now}
function resumeWip(){const w=store.get(K.wip,null);if(!w)return;fresh();Object.assign(S,w);S.events=[];S.busy=false;S.lastTick=Date.now();ev('이어서 쓰기');if(S.phase==='drafting')S.phase='cards';render()}

/* ---------- 화면 ---------- */
const $=s=>document.querySelector(s);
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function ev(t,cls=''){S.events.unshift({t,cls,at:new Date().toLocaleTimeString('ko-KR',{hour12:false})});renderLog()}
function go(p){S.phase=p;render();const i=$('#ans');if(i)i.focus()}
function wxIcon(w,size=40){return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">${ICON[w]||ICON['직접']}</svg>`}
function stepBar(n){const names=['온보딩','날씨','장면','꼬리질문','재료','초안','퇴고','저장'];return `<ol class="steps">${names.map((x,i)=>`<li class="${i<n?'done':i===n?'now':''}">${i} ${x}</li>`).join('')}</ol>`}

function render(){
  const m=$('#main');let h='';
  if(fatal)h+=`<div class="banner">${esc(fatal)}</div>`;
  h+=settingsHTML();
  const P=S.phase;
  if(P==='start'){
    const wip=store.get(K.wip,null);
    if(wip&&wip.phase&&wip.phase!=='start'&&wip.phase!=='weather'){
      h+=`${stepBar(1)}<p class="bigq">이어서 쓸까요?</p><p class="note">${esc(wip.weather||'')} · 질문 ${(wip.qa||[]).length}개까지 답했어요.</p><div class="row"><button class="primary" id="b-resume">이어서 쓰기</button><button class="quiet" id="b-new">새로 쓰기</button></div>`;
    }else if(!store.get(K.onboard,false)){S.phase='onboard';return render()}
    else{S.phase='weather';return render()}
  }
  if(P==='onboard'){
    h+=`${stepBar(0)}<div class="onboard"><p class="eyebrow">누군가는 이렇게 썼습니다</p>
      <div class="chat demo"><div class="b me">추웠어요</div><div class="b ai">어디가 제일 추웠어요?</div><div class="b me">손이요. 장갑을 안 가져가서.</div></div>
      <p class="bigq" style="font-size:20px">짧게 답해도 괜찮아요. 제가 계속 물어볼게요.</p>
      <div class="row"><button class="primary" id="b-onboard">시작하기</button></div></div>`;
  }
  if(P==='weather'){
    h+=`${stepBar(1)}<p class="bigq">기억하고 싶은 날의 날씨는 어땠나요?</p>
    <div class="weathers">${WEATHERS.map(w=>`<button class="wx" data-wx="${w}">${wxIcon(w)}${w}</button>`).join('')}<button class="wx" id="b-wxown">${wxIcon('직접')}직접 쓰기</button></div>
    <div class="row" id="wxownRow" ${S.wxOwn?'':'hidden'}><input type="text" id="wxc" placeholder="한 단어도 괜찮아요" style="flex:1;min-width:0"><button id="b-wxc">이 날씨로</button></div>`;
    h+=shelfMini();
  }
  if(P==='chat'){
    h+=`${stepBar(S.stage)}<div class="chips">${S.weather?`<span class="chip"><b>날씨</b>${esc(S.weather)}</span>`:''}${['time','place','object','action','speech','sense','change'].filter(k=>S.slots[k].length).map(k=>`<span class="chip"><b>${SLOTS[k]}</b>${esc(S.slots[k][0])}</span>`).join('')}</div>
    <div class="chat">${S.msgs.map(x=>`<div class="b ${x.role==='ai'?'ai':'me'}">${esc(x.text)}</div>`).join('')}${S.busy?'<div class="b ai typing">…</div>':''}</div>
    ${S.sendErr?'<p class="banner">답을 읽지 못했어요. 연결 문제라 횟수에는 넣지 않았어요. 다시 보내 주세요.</p>':''}
    <textarea id="ans" rows="2" maxlength="500" placeholder="짧게 답해도 괜찮아요" ${S.busy?'disabled':''}>${esc(S.retryText||'')}</textarea>
    <div class="row"><button class="primary" id="b-next" ${S.busy?'disabled':''}>보내기</button>${S.stage===3?`<button class="quiet" id="b-done" ${S.busy?'disabled':''}>이제 됐어요</button>`:''}</div>`;
  }
  if(P==='thin'){
    h+=`${stepBar(4)}<p class="bigq">다음에 이어 쓸 수 있어요.</p><p class="note">재료가 ${filledCount()}개뿐이라 초안 대신 재료 카드만 남겨 둘게요.</p>
    <div class="cards">${S.cards.map(c=>`<span class="card"><small>${SLOTS[c.slot]}</small>${esc(c.text)}</span>`).join('')}</div>
    <div class="row"><button class="primary" id="b-morechat">조금 더 이야기하기</button><button class="quiet" id="b-new">새로 쓰기</button></div>`;
  }
  if(P==='cards'||P==='drafting'){
    h+=`${stepBar(4)}<p class="bigq">이것만 가지고 쓸게요. 빠진 게 있나요?</p>
    <div class="cards">${S.cards.map(c=>`<button class="card pick ${c.off?'off':''}" data-card="${c.id}" title="${c.off?'다시 넣기':'탭해서 빼기'}"><small>${SLOTS[c.slot]}</small>${esc(c.text)}</button>`).join('')}</div>
    ${S.cards.some(c=>c.thin&&c.off)?'<p class="note">뒤에서 더 자세히 답한 짧은 답은 빼 두었어요. 탭하면 다시 넣어요.</p>':''}
    ${S.extraOpen?`<input type="text" id="extra" value="${esc(S.extra)}" placeholder="더 적고 싶은 것">`:`<button class="quiet" id="b-extra">+ 더 적고 싶은 게 있어요</button>`}
    ${S.draftErr?`<p class="banner" style="margin-top:14px">초안을 만들지 못했어요 (${esc(S.draftErr)}).</p>`:''}
    <div class="row" style="margin-top:18px"><button class="primary" id="b-draft" ${S.busy?'disabled':''}>${S.busy?'엮는 중…':'이대로 쓰기'}</button></div>
    <p class="note">${esc(S.endReason?'꼬리질문 종료: '+S.endReason:'')}</p>`;
  }
  if(P==='draft'||P==='revise'){
    const flags=P==='revise'?S.rev.flags:[];
    const m=markup(draftText());
    h+=`${stepBar(P==='draft'?5:6)}<div class="eyebrow">${P==='draft'?'초안 · 밑줄은 내가 한 말, 노랑은 AI가 보탠 말':'퇴고 · 갬'}</div>
    <article class="draft" style="margin-top:12px">${(()=>{const ps=[];S.draft.sentences.forEach((s,i)=>{
      const f=flags.find(x=>x.i===i);
      const html=f&&f.state==='editing'?`<textarea class="edit" id="edit-${i}" rows="2">${esc(s.text)}</textarea>`:`<span class="sent ${f&&f.state==='open'?'flagged':''}">${markup(s.text).html}</span> `;
      (ps[s.p||0]=ps[s.p||0]||[]).push(html)});return ps.filter(Boolean).map(p=>`<p>${p.join('')}</p>`).join('')})()}</article>
    ${P==='draft'?(S.draft.checks?guideHTML(checksFor(draftText()),esc):'')+(S.draft.fact?factHTML(S.draft.fact,esc):`<div class="row"><button id="b-fact" ${S.busy?'disabled':''}>${S.busy?'점검 중…':'사실 점검 (AI)'}</button></div>`):''}
    ${flags.map(f=>gamCard(f)).join('')}
    <div class="stats">
      <div class="stat"><span>글자 수 (공백 포함)</span><strong>${draftText().length}</strong></div>
      <div class="stat"><span>문장</span><strong>${S.draft.sentences.length}</strong></div>
      <div class="stat"><span>답에서 찾지 못한 말</span><strong>${m.words?Math.round(m.news.length/m.words*100):0}%</strong></div>
      <div class="stat"><span>쓴 시간(대기 제외)</span><strong>${(S.activeMs/60000).toFixed(1)}분</strong></div>
    </div>
    ${m.news.length?`<p class="note">답에서 찾지 못한 말: ${m.news.map(esc).join(', ')}</p>`:''}
    <details class="hist"><summary>원래 답 보기</summary><ol class="qa">${S.qa.map(x=>`<li><span class="q">${esc(x.q)}</span>${esc(x.a)}</li>`).join('')}</ol></details>
    <div class="row" style="margin-top:18px">${P==='draft'?`<button class="primary" id="b-check" ${S.busy?'disabled':''}>${S.busy?'살피는 중…':'퇴고하기'}</button><button id="b-tosave">바로 저장</button>${S.regenUsed?`<button class="quiet" id="b-backcards">재료 카드 고치기</button>`:`<button class="quiet" id="b-regen" ${S.busy?'disabled':''}>다시 써 보기 (1회)</button>`}`:`<button id="b-recheck" ${S.busy?'disabled':''}>다시 살펴보기</button><button class="primary" id="b-tosave">저장하러 가기</button>`}</div>`;
  }
  if(P==='save'){
    const ph=(S.cards[0]?.text||'').split(/\s+/).slice(0,3).join(' ');
    h+=`${stepBar(7)}<p class="bigq">제목을 붙여볼까요? <span class="note">(비워도 괜찮아요)</span></p>
    <input type="text" id="title" value="${esc(S.title)}" placeholder="${esc(ph)}">
    <p class="wxline">${wxIcon(S.weather,22)} ${esc(S.weather)} · ${new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})}</p>
    <article class="draft">${finalText().split(/\n\s*\n/).map(p=>`<p>${esc(p)}</p>`).join('')}</article>
    <div class="row"><button class="primary" id="b-save">저장</button><button class="quiet" id="b-back">퇴고로 돌아가기</button></div>`;
  }
  if(P==='shelf'){
    h+=`${stepBar(8)}${shelfHTML()}<div class="row"><button class="primary" id="b-copy">실험 기록 복사</button><button id="b-new">새 글 쓰기</button></div><textarea id="copyfallback" rows="6" hidden></textarea>`;
  }
  m.innerHTML=h;bind();renderLog();
}
function gamCard(f){
  const c=CARDS[f.card-1],q=c.q[f.quote];const s=S.draft.sentences[f.i].text;
  if(f.state==='kept')return `<p class="note gamdone">${f.i+1}번 문장은 그대로 두었어요.</p>`;
  if(f.state==='edited')return `<p class="note gamdone">${f.i+1}번 문장을 직접 고쳤어요.</p>`;
  return `<section class="gam"><div class="gamtag">갬</div><p class="gamq">“${esc(s)}”</p><h3 class="gamt">${esc(c.t)}</h3>
  <p class="pair"><s>${esc(c.bad)}</s><br>→ ${esc(c.good)}</p>
  <details><summary>작가는 이렇게 썼어요</summary><blockquote>${esc(q[0])}<cite>— ${esc(q[1])}</cite></blockquote></details>
  <div class="row">${f.state==='editing'?`<button class="primary" data-gam-save="${f.i}">고친 문장 넣기</button>`:`<button class="primary" data-gam-edit="${f.i}">직접 고치기</button>`}<button data-gam-keep="${f.i}">그냥 두기</button></div></section>`;
}
function monthMap(list){const m={};for(const e of list){const d=new Date(e.date);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;(m[k]=m[k]||[]).push(e)}return m}
function shelfHTML(){
  const list=store.get(K.shelf,[]);const mm=monthMap(list);const today=new Date();
  const ago=list.find(e=>{const d=new Date(e.date);return d.getFullYear()<today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()});
  return `<h2 class="shelf-h">내 안의 날씨</h2>
  <div class="wxmap">${Object.keys(mm).sort().reverse().map(k=>`<div class="wxrow"><span>${+k.slice(5)}월</span><span class="wxicons">${mm[k].map(e=>`<span title="${esc(e.title)}">${wxIcon(e.weather,24)}</span>`).join('')}</span></div>`).join('')||'<p class="note">아직 쌓인 날씨가 없어요.</p>'}</div>
  ${ago?`<div class="ago"><p class="eyebrow">${today.getFullYear()-new Date(ago.date).getFullYear()}년 전 오늘, 당신은 이렇게 썼습니다</p><p class="draft">${esc(ago.text.split(/(?<=다\.)\s/)[0])}</p></div>`:''}
  <div class="shelf">${list.map(e=>`<details class="book" ${e.id===S.savedId?'open':''}><summary>${wxIcon(e.weather,18)} <b>${esc(e.title)}</b> <span class="note">${new Date(e.date).toLocaleDateString('ko-KR')}</span></summary><div class="draft">${e.text.split(/\n\s*\n/).map(p=>`<p>${esc(p)}</p>`).join('')}</div></details>`).join('')}</div>`;
}
function shelfMini(){const n=store.get(K.shelf,[]).length;return n?`<p class="note" style="margin-top:20px">책꽂이에 ${n}편이 있어요. <button class="quiet" id="b-shelf">날씨 기록 보기</button></p>`:''}
function settingsHTML(){
  const ready=CFG.extract&&CFG.models.length&&!fatal;
  if(ready&&!showSettings)return '';
  return `<section class="settings" id="settingsPanel"><div class="settings-head"><h2>설정</h2>${ready?'<button class="quiet" id="b-close-settings">닫기</button>':''}</div>
  <div style="display:grid;gap:10px;margin-top:8px">
    <div class="row" style="margin:0"><input type="text" id="pass" placeholder="팀 암호" value="${esc(CFG.pass)}" autocomplete="off" style="flex:1;min-width:0"><button id="b-pass">연결하고 모델 불러오기</button></div>
    <label class="note">판독·질문 모델<input type="text" id="mExtract" list="modelList" value="${esc(CFG.extract)}"></label>
    <label class="note">초안 모델<input type="text" id="mDraft" list="modelList" value="${esc(CFG.draft)}"></label>
    <datalist id="modelList">${CFG.models.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>
    <div class="row" style="margin:0"><button class="quiet" id="b-reonboard">온보딩 다시 보기</button><a class="quiet" href="/v1.html">이전 실험실(v1) 열기</a></div>
  </div></section>`;
}
async function copyText(t,btn){try{await navigator.clipboard.writeText(t);btn.textContent='복사했어요'}catch(e){const ta=$('#copyfallback');if(ta){ta.hidden=false;ta.value=t;ta.select()}btn.textContent='아래 칸에서 직접 복사하세요'}}
function bind(){
  const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};
  on('b-onboard',()=>{store.set(K.onboard,true);go('weather')});
  on('b-reonboard',()=>{store.del(K.onboard);showSettings=false;fresh();render()});
  on('b-resume',resumeWip);
  on('b-new',()=>{store.del(K.wip);fresh();USAGE.length=0;S.phase='weather';render()});
  document.querySelectorAll('[data-wx]').forEach(b=>b.onclick=()=>startWx(b.dataset.wx,false));
  on('b-wxown',()=>{S.wxOwn=true;render();$('#wxc')?.focus()});
  on('b-wxc',()=>{const v=$('#wxc').value.trim();if(v)startWx(v,true)});
  const ans=$('#ans');if(ans)ans.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#b-next').click()}};
  on('b-next',()=>{const v=($('#ans').value||'').trim();S.sendErr=false;S.retryText='';if(!v||fatal||!CFG.extract||S.busy)return;onAnswer(v)});
  on('b-done',finishNow);
  on('b-morechat',()=>{S.phase='chat';S.stage=3;S.endReason='';ask(templateFor(ASK_ORDER.find(k=>!S.slots[k].length)||'sense'),'재료가 적어 이어서 묻기')});
  document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{const c=S.cards.find(x=>x.id===b.dataset.card);c.off=!c.off;save();render()});
  on('b-extra',()=>{S.extraOpen=true;render();$('#extra')?.focus()});
  const ex=$('#extra');if(ex)ex.oninput=()=>{S.extra=ex.value;save()};
  on('b-draft',()=>{S.tDraft=S.activeMs;makeDraft('첫 초안')});
  on('b-regen',()=>{S.regenUsed=true;makeDraft('다시 쓰기')});
  on('b-backcards',()=>{S.phase='cards';render()});
  on('b-fact',factCheck);
  on('b-check',checkDraft);on('b-recheck',checkDraft);
  document.querySelectorAll('[data-gam-edit]').forEach(b=>b.onclick=()=>{S.rev.flags.find(f=>f.i==b.dataset.gamEdit).state='editing';render();$('#edit-'+b.dataset.gamEdit)?.focus()});
  document.querySelectorAll('[data-gam-save]').forEach(b=>b.onclick=()=>{const i=+b.dataset.gamSave;const v=$('#edit-'+i).value.trim();const f=S.rev.flags.find(x=>x.i===i);const before=S.draft.sentences[i].text;if(v){S.draft.sentences[i].text=v}f.state='edited';S.rev.log.push({i,before,after:v});ev(`갬: ${i+1}번 문장 직접 고침`);save();render()});
  document.querySelectorAll('[data-gam-keep]').forEach(b=>b.onclick=()=>{S.rev.flags.find(f=>f.i==b.dataset.gamKeep).state='kept';ev(`갬: ${+b.dataset.gamKeep+1}번 문장 그냥 두기`);save();render()});
  on('b-tosave',()=>{S.phase='save';save();render()});
  on('b-back',()=>{S.phase=S.rev?'revise':'draft';render()});
  const ti=$('#title');if(ti)ti.oninput=()=>{S.title=ti.value};
  on('b-save',saveEssay);
  on('b-shelf',()=>{S.phase='shelf';render()});
  on('b-copy',e=>copyText(store.get(K.runs,[]).slice(0,1).map(recordText).join('\n'),e.currentTarget));
  on('b-pass',()=>{CFG.pass=$('#pass').value;saveCfg();loadModels()});
  on('b-close-settings',()=>{showSettings=false;render()});
  const me=$('#mExtract'),md=$('#mDraft');
  if(me)me.onchange=()=>{CFG.extract=me.value.trim();saveCfg();renderLog()};
  if(md)md.onchange=()=>{CFG.draft=md.value.trim();saveCfg();renderLog()};
}
function startWx(w,custom){S.weather=w;S.wxCustom=custom;S.stage=2;S.t0=Date.now();S.lastTick=Date.now();ev(`날씨: ${w}`);ask(Q_SCENE,'2단계 시작: 하루 하나 떠올리기')}
function renderModelbar(){
  const el=$('#modelbar');if(!el)return;const on=!!CFG.models.length&&!fatal;
  const b=(l,m)=>`<button class="mb ${on&&m?'':'off'}" data-open-settings><i class="dot"></i><span>${l}</span><code>${esc(m||'연결 전')}</code></button>`;
  el.innerHTML=b('판독',CFG.extract)+b('초안',CFG.draft)+`<button class="setbtn ${showSettings?'on':''}" id="b-settings"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M4.7 15.3l1.6-1.6M13.7 6.3l1.6-1.6"/></svg>설정</button>`;
  const open=()=>{showSettings=!showSettings;render()};
  el.querySelectorAll('[data-open-settings]').forEach(x=>x.onclick=()=>{showSettings=true;render()});$('#b-settings').onclick=open;
}
function renderLog(){
  renderModelbar();const el=$('#log');if(!el)return;
  const st=k=>S.slots[k].length?`<span class="st st-FILLED">${k!=='time'&&k!=='place'&&k!=='other'&&!S.solid[k]?'단답':'채움'}</span>`:'<span class="st st-EMPTY">빈칸</span>';
  const sum=f=>USAGE.filter(f).reduce((a,x)=>[a[0]+x.in,a[1]+x.out],[0,0]);const rd=sum(x=>x.role!=='draft'),dr=sum(x=>x.role==='draft');
  el.innerHTML=`<h4>슬롯 (재료 ${materialCount()}/${LIMIT.material})</h4><table class="slots"><tbody>${Object.keys(SLOTS).map(k=>`<tr><td>${SLOTS[k]}</td><td>${st(k)}</td><td>${esc(S.slots[k].join(' · '))}</td></tr>`).join('')}</tbody></table>
  <h4>종료 조건</h4><div class="rule">재료 ${materialCount()}/3 · 3단계 질문 ${S.q3}/8 · 회피 연속 ${S.evadeStreak}/2 · 쓴 시간 ${(S.activeMs/60000).toFixed(1)}/7분</div>
  <h4>방금 적용된 규칙</h4><div class="rule">${esc(S.rule)}</div>
  <h4>토큰</h4><div class="rule">판독 ${USAGE.filter(x=>x.role!=='draft').length}회 ${rd[0]}/${rd[1]} · 초안 ${USAGE.filter(x=>x.role==='draft').length}회 ${dr[0]}/${dr[1]}</div>
  <h4>판독 기록</h4><div class="events">${S.events.map(e=>`<div class="${e.cls}">${e.at}  ${esc(e.t)}</div>`).join('')||'<div>아직 없음</div>'}</div>`;
}
setInterval(()=>{if(S.phase==='chat'&&!S.busy){tick();const r=document.querySelector('.rule');if(r)renderLog()}},15000);
render();loadModels();
