'use strict';
// ===== workout journal =====
let sessions=[],session=null,rp={type:'week',off:0};
const saveSessions=()=>metaPut('sessions',sessions);
const saveActive=()=>metaPut('active',session);
const durTxt=ms=>{const m=Math.max(0,Math.round(ms/60000)),h=Math.floor(m/60);return h?`${h} ש׳ ${m%60} ד׳`:`${m} ד׳`};
const hm=t=>new Date(t).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
const vol=sets=>sets.reduce((a,x)=>a+x.w*x.r,0);
const nf=n=>Math.round(n).toLocaleString('he-IL');
const pctTxt=(a,b)=>b?` (${a>=b?'+':'−'}${Math.abs(Math.round((a-b)/b*100))}%)`:'';
const mName=x=>{const m=machines.find(y=>y.id===x.mid);return m?m.name:x.name};
const mGroup=x=>{const m=machines.find(y=>y.id===x.mid);return m?gName(m.group):(x.gname||'ללא קטגוריה')};
const isBW=mid=>{const m=machines.find(y=>y.id===mid);return !!(m&&m.bw)};
const bwTxt=(w,r)=>w>0?`<bdi dir="ltr">${r}×+${fmt(w)}</bdi> ק״ג`:`${r} חזרות`;
const isTimed=mid=>{const m=machines.find(y=>y.id===mid);return !!(m&&m.timed)};
const setTxt=x=>isTimed(x.mid)?`⏱ ${mmss(x.s||0)}`:isBW(x.mid)?bwTxt(x.w,x.r):`${fmt(x.w)}×${x.r}`;
const best=xs=>xs.reduce((a,x)=>!a||x.w>a.w||(x.w===a.w&&x.r>a.r)?x:a,null);
const better=(a,b)=>a.w>b.w||(a.w===b.w&&a.r>b.r);
// --- session bar ---
let barTimer;
function renderSessBar(){const b=$('#sessBar');clearInterval(barTimer);if(typeof view!='undefined'&&groups.length)render();
  if(!session){b.innerHTML='<button class="btn pri start" id="startBtn">▶️ התחל אימון</button>';$('#startBtn').onclick=startSession;return}
  const upd=()=>{if(!session)return;b.innerHTML=`<div class="live"><span>🟢 אימון פעיל · <b>${durTxt(Date.now()-session.start)}</b> · ${session.sets.length} סטים</span><button class="btn danger" id="endBtn">⏹ סיים אימון</button></div><div class="hint">לחץ על תרגיל כדי לרשום סטים</div>`;$('#endBtn').onclick=endSession};
  upd();barTimer=setInterval(upd,20000)}
const STALE=3*3600*1000;
async function checkStale(){if(!session||session._staleAsked||Date.now()-session.start<STALE)return;session._staleAsked=true;await saveActive();
  const last=session.sets.length?Math.max(...session.sets.map(x=>x.t)):null;
  if(!last){if(confirm(`האימון פתוח כבר ${durTxt(Date.now()-session.start)} בלי סטים. לבטל אותו?`)){session=null;await saveActive();stopRest();renderSessBar()}return}
  if(confirm(`האימון פתוח כבר ${durTxt(Date.now()-session.start)}. נראה ששכחת לסיים אותו.\nלסיים אותו בזמן הסט האחרון (${hm(last)})?`))await endSession(last+60000,false)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkStale()});
async function startSession(o){session={id:newId(),start:Date.now(),sets:[]};if(o&&Array.isArray(o.areas)&&o.areas.length){session.areas=o.areas.map(a=>({...a,done:null}));session.plan=o.areas.flatMap(a=>a.mids);session.area=o.areas.map(a=>a.name).join(' · ');filter='all'}else if(o&&Array.isArray(o.plan)){session.plan=o.plan;session.area=o.area;filter='all'}await saveActive();renderSessBar();if(view!=='machines')setView('machines');render();scrollTo(0,0)}
async function endSession(endAt,ask=true){if(!session)return;
  if(!session.sets.length){if(confirm('לא נרשמו סטים. לבטל את האימון?')){session=null;await saveActive();stopRest();renderSessBar()}return}
  if(ask&&!confirm('לסיים את האימון?'))return;
  const s=session;s.end=typeof endAt==='number'?endAt:Date.now();sessions.push(s);session=null;await saveSessions();await saveActive();stopRest();renderSessBar();showSessionReport(s.id);if(typeof checkMotivation=='function')checkMotivation('report')}
// --- difficulty rating (asked once per exercise, when closing it) ---
const RATE_TXT=['','קל מאוד','קל','בינוני','קשה','קשה מאוד'];
function finishExercise(id){if(!session||!session.sets.some(x=>x.mid===id)||(session.rates||{})[id]||(session.rateSkip||[]).includes(id))return closeSheet();openRate(id)}
function openRate(id,again){const m=machines.find(x=>x.id===id);if(!m||!session)return closeSheet();const cur=(session.rates||{})[id]||0;
  openSheet(`<h2>איך היה ${esc(m.name)}?</h2><p class="muted small">דרג את הקושי של התרגיל (פעם אחת לתרגיל)</p><div class="rates">${[1,2,3,4,5].map(n=>`<button class="rateb r${n}${cur===n?' on':''}" data-rate="${n}"><b>${n}</b><small>${RATE_TXT[n]}</small></button>`).join('')}</div><button class="btn" id="rtSkip">${again?'סגור':'דלג'}</button>`);
  $('#sheet').querySelectorAll('[data-rate]').forEach(b=>b.onclick=async()=>{session.rates=session.rates||{};session.rates[id]=+b.dataset.rate;await saveActive();closeSheet();toast(`קושי ${b.dataset.rate}/5 נשמר · ${m.name}`)});
  $('#rtSkip').onclick=async()=>{if(!again){session.rateSkip=[...(session.rateSkip||[]),id];await saveActive()}closeSheet()}}
// rest between sets (stored as set.rest in seconds; computed from timestamps for older workouts)
const REST_MAX=900;
function rests(s){const xs=[...s.sets].sort((a,b)=>a.t-b.t);return xs.map((x,i)=>{if(!i)return null;if(x.rest!=null)return x.rest;const st=x.t-(x.s?x.s*1000:0);return Math.max(0,Math.round((st-xs[i-1].t)/1000))})}
function restStats(s){const r=rests(s).filter(v=>v!=null&&v<=REST_MAX);return r.length?{avg:Math.round(r.reduce((a,b)=>a+b,0)/r.length),n:r.length,tot:r.reduce((a,b)=>a+b,0)}:null}
function restMap(s){const xs=[...s.sets].sort((a,b)=>a.t-b.t),r=rests(s),M=new Map();xs.forEach((x,i)=>M.set(x,r[i]));return M}
// completion per area: sets in area / 9
function completion(s){const C={};for(const x of s.sets){const g=mGroup(x);C[g]=(C[g]||0)+1}
  for(const a of (s.areas||[]))if(!(a.name in C)&&machines.some(m=>m.group===a.g))C[a.name]=0;
  return Object.entries(C).map(([g,n])=>({g,n,p:Math.min(100,Math.round(n/9*100))}))}
// --- logging sets ---
// keep the card's current weight in sync with the heaviest set logged for it in the active workout
async function syncCard(mid){const m=machines.find(x=>x.id===mid);if(!m||m.timed||!session)return;session.base=session.base||{};
  const mine=session.sets.filter(x=>x.mid===mid);const tag='s:'+session.id;
  if(!session.base[mid])session.base[mid]={weight:m.weight,reps:m.reps??null,updated:m.updated};
  m.history=(m.history||[]).filter(h=>h.sid!==tag);
  if(!mine.length){const b=session.base[mid];m.weight=b.weight;if(m.bw)m.reps=b.reps;m.updated=b.updated;delete session.base[mid]}
  else{let h=mine[0];for(const x of mine)if(better(x,h))h=x;m.weight=h.w;if(m.bw)m.reps=h.r;m.updated=h.t;m.history.push(m.bw?{t:h.t,w:h.w,r:h.r,sid:tag}:{t:h.t,w:h.w,sid:tag})}
  await put(m);await saveActive();if(typeof render==='function')render()}
function openLog(id){const m=machines.find(x=>x.id===id);if(!m)return;if(m.timed)return openTimed(m);
  const mine=session.sets.filter(x=>x.mid===id),last=mine[mine.length-1];let w=last?last.w:m.weight,r=last?last.r:(m.bw&&m.reps?m.reps:10);const st=m.step||2.5;
  const prev=[...sessions].reverse().find(s=>s.sets.some(x=>x.mid===id));
  openSheet(`<div class="row between"><h2>${esc(m.name)}</h2><button class="link" id="lEdit">⚙️ משקל קבוע</button></div>
  <ol class="sets">${mine.map((x,i)=>`<li><span>סט ${i+1}</span><b>${isBW(id)?bwTxt(x.w,x.r):`${fmt(x.w)} ק״ג × ${x.r}`}</b><button class="link" data-ds="${session.sets.indexOf(x)}" style="color:#f87171">✕</button></li>`).join('')||'<li class="muted">עוד לא נרשמו סטים בתרגיל הזה</li>'}</ol>
  ${prev?`<div class="muted small">באימון הקודם (${fdate(prev.start)}): ${prev.sets.filter(x=>x.mid===id).map(setTxt).join(', ')}</div>`:''}
  <h3 class="sec">סט ${mine.length+1}</h3>
  <label>${m.bw?'משקל נוסף (ק״ג) · 0 = משקל גוף':'משקל (ק״ג)'}</label><div class="row"><button class="pm" id="wM">−</button><div class="val" id="wV"></div><button class="pm" id="wP">+</button></div>
  <label>חזרות</label><div class="row"><button class="pm" id="rM">−</button><div class="val" id="rV"></div><button class="pm" id="rP">+</button></div>
  ${mine.length?`<div class="muted small">קושי: ${(session.rates||{})[id]?`<b>${session.rates[id]}/5 · ${RATE_TXT[session.rates[id]]}</b>`:"עוד לא דורג"} <button class="link" id="lRate">✎ דרג</button></div>`:""}<button class="btn pri big" id="lDone">✔ בוצע</button><button class="btn" id="lClose">סגור</button>`);
  const upd=()=>{$('#wV').textContent=fmt(w);$('#rV').textContent=r};upd();
  $('#wP').onclick=()=>{w=Math.round((w+st)*100)/100;upd()};$('#wM').onclick=()=>{w=Math.max(0,Math.round((w-st)*100)/100);upd()};
  $('#rP').onclick=()=>{r++;upd()};$('#rM').onclick=()=>{r=Math.max(1,r-1);upd()};
  $('#lClose').onclick=()=>finishExercise(id);if($('#lRate'))$('#lRate').onclick=()=>openRate(id,true);$('#lEdit').onclick=()=>openEdit(id);
  $('#lDone').onclick=async()=>{const now=Date.now(),pv=session.sets.length?session.sets[session.sets.length-1]:null;const set={mid:id,name:m.name,gname:gName(m.group),w,r,t:now};if(pv)set.rest=Math.max(0,Math.round((now-pv.t)/1000));session.sets.push(set);await saveActive();await syncCard(id);renderSessBar();openLog(id);startRest();
    toast(`סט נרשם: ${fmt(w)}×${r}`,async()=>{session.sets=session.sets.filter(x=>x!==set);await saveActive();await syncCard(id);renderSessBar();if(!$('#sheet').hidden)openLog(id)})};
  $('#sheet').querySelectorAll('[data-ds]').forEach(b=>b.onclick=async()=>{if(!confirm('למחוק את הסט?'))return;session.sets.splice(+b.dataset.ds,1);await saveActive();await syncCard(id);renderSessBar();openLog(id)})}
// --- rest timer (end-timestamp based) ---
let restTick,restDone=false;
const restDur=()=>+(localStorage.getItem('restDur')||90);
const mmss=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function startRest(sec){sec=sec||restDur();localStorage.setItem('restEnd',Date.now()+sec*1000);restDone=false;renderRest()}
function stopRest(){localStorage.removeItem('restEnd');clearInterval(restTick);$('#restBar').hidden=true;document.body.classList.remove('flash')}
function adjRest(d){const e=+localStorage.getItem('restEnd');if(!e)return;localStorage.setItem('restEnd',Math.max(Date.now(),e+d*1000));restDone=false;renderRest()}
function beep(){try{const A=window.AudioContext||window.webkitAudioContext;const c=new A();[0,.35,.7].forEach(t=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.4,c.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t+.3);o.start(c.currentTime+t);o.stop(c.currentTime+t+.3)})}catch(e){}}
function renderRest(){const e=+localStorage.getItem('restEnd');const bar=$('#restBar');clearInterval(restTick);if(!e||!session){bar.hidden=true;return}bar.hidden=false;
  const tick=()=>{const left=Math.ceil((e-Date.now())/1000);
    if(left<=0){$('#restT').textContent='0:00';$('#restL').textContent='⏰ זמן לסט הבא!';if(!restDone){restDone=true;window.__restAlerts=(window.__restAlerts||0)+1;navigator.vibrate&&navigator.vibrate([300,150,300,150,300]);beep();document.body.classList.add('flash');setTimeout(()=>document.body.classList.remove('flash'),3000)}}
    else{$('#restT').textContent=mmss(left);$('#restL').textContent='מנוחה '+mmss(restDur())+' ✎'}};
  tick();restTick=setInterval(tick,250)}
function restPresets(){const cur=restDur();openSheet(`<h2>זמן מנוחה</h2><div class="steps">${[60,90,120,180].map(s=>`<button data-rs="${s}" class="${s===cur?'on':''}">${mmss(s)}</button>`).join('')}</div>
  <label>מותאם אישית (שניות)</label><div class="row"><input type="number" id="rsC" inputmode="numeric" min="5" max="900" value="${cur}"><button class="btn pri" id="rsOk" style="width:auto;margin:0">שמור</button></div><button class="btn" id="rsX">סגור</button>`);
  const set=s=>{localStorage.setItem('restDur',s);closeSheet();if(localStorage.getItem('restEnd'))startRest(s)};
  $('#sheet').querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>set(+b.dataset.rs));$('#rsOk').onclick=()=>{const v=parseInt($('#rsC').value);if(v>=5&&v<=900)set(v);else alert('בין 5 ל-900 שניות')};$('#rsX').onclick=closeSheet}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderRest()});
// --- analytics ---
function agg(list){const ex={},grp={};let v=0,t=0,n=0;
  for(const s of list){t+=(s.end||Date.now())-s.start;
    for(const x of s.sets){n++;const vv=x.w*x.r;v+=vv;const g=mGroup(x);grp[g]=(grp[g]||0)+vv;
      const e=ex[x.mid]||(ex[x.mid]={name:mName(x),group:g,vol:0,sets:0,reps:0,firstMax:null,lastMax:null,max:0,_s:null});
      e.vol+=vv;e.sets++;e.reps+=x.r;e.max=Math.max(e.max,x.w);
      if(e._s!==s.id){e._s=s.id;if(e.firstMax==null)e.firstMax=x.w;e.lastMax=x.w}else{e.lastMax=Math.max(e.lastMax,x.w);if(e.firstSid===undefined)0}
    }
    for(const k in ex)if(ex[k]._s===s.id&&ex[k]._first===undefined)ex[k]._first=s.id;
  }
  for(const k in ex){const v=list.map(s=>(s.rates||{})[k]).filter(x=>x>0);if(v.length)ex[k].rate=Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10}
  // firstMax = max of first session containing exercise
  for(const k in ex){const ss=list.filter(s=>s.sets.some(x=>x.mid===k));const ssP=ss.filter(s=>s.sets.some(x=>x.mid===k&&x.w>0));const mx=s=>Math.max(...s.sets.filter(x=>x.mid===k).map(x=>x.w));ex[k].firstMax=ssP.length?mx(ssP[0]):0;ex[k].lastMax=ssP.length?mx(ssP[ssP.length-1]):0;
    if(isTimed(k)&&ss.length){const bs=s=>Math.max(...s.sets.filter(x=>x.mid===k).map(x=>x.s||0));ex[k].timed=true;ex[k].fb=bs(ss[0]);ex[k].lb=bs(ss[ss.length-1]);ex[k].secs=list.reduce((a,s)=>a+s.sets.filter(x=>x.mid===k).reduce((b,x)=>b+(x.s||0),0),0)}
    else if(isBW(k)&&ss.length){const bs=s=>best(s.sets.filter(x=>x.mid===k));ex[k].bw=true;ex[k].fb=bs(ss[0]);ex[k].lb=bs(ss[ss.length-1])}}
  return{count:list.length,time:t,vol:v,sets:n,grp,ex}}
function prsOf(s){const out=[];const ids=[...new Set(s.sets.map(x=>x.mid))];
  for(const id of ids){if(isTimed(id)){const b=Math.max(...s.sets.filter(x=>x.mid===id).map(x=>x.s||0)),prev=sessions.filter(o=>o.id!==s.id&&o.start<s.start).flatMap(o=>o.sets.filter(x=>x.mid===id).map(x=>x.s||0));if(prev.length&&b>Math.max(...prev))out.push({id,name:mName(s.sets.find(x=>x.mid===id)),w:0,prev:0,txt:'⏱ '+mmss(b),ptxt:mmss(Math.max(...prev))});continue}
    if(isBW(id)){const b=best(s.sets.filter(x=>x.mid===id)),pb=best(sessions.filter(o=>o.id!==s.id&&o.start<s.start).flatMap(o=>o.sets.filter(x=>x.mid===id)));if(pb&&better(b,pb))out.push({id,name:mName(b),w:b.w,prev:pb.w,txt:bwTxt(b.w,b.r),ptxt:bwTxt(pb.w,pb.r)});continue}
    const mx=Math.max(...s.sets.filter(x=>x.mid===id).map(x=>x.w));
    const before=sessions.filter(o=>o.id!==s.id&&o.start<s.start).flatMap(o=>o.sets.filter(x=>x.mid===id&&x.w>0).map(x=>x.w));
    if(before.length&&mx>Math.max(...before))out.push({id,name:mName(s.sets.find(x=>x.mid===id)),w:mx,prev:Math.max(...before)})}
  return out}
function sessionText(s){const a=agg([s]),pr=prsOf(s),rs=restStats(s),cp=completion(s),rt=s.rates||{};let t=`🏋️ אימון ${fdate(s.start)} ${hm(s.start)}\n⏱️ ${durTxt(s.end-s.start)} · ${a.sets} סטים${a.vol?` · נפח ${nf(a.vol)} ק״ג`:''}${rs?` · ⏸️ מנוחה ממוצעת ${mmss(rs.avg)}`:''}\n`;if(cp.length)t+=`🎯 השלמה: ${cp.map(c=>`${c.g} ${c.p}%`).join(', ')}\n`;
  const byG={};for(const x of s.sets)(byG[mGroup(x)]=byG[mGroup(x)]||[]).push(x);
  for(const g in byG){t+=`\n*${g}*\n`;const byM={};for(const x of byG[g])(byM[x.mid]=byM[x.mid]||[]).push(x);for(const k in byM)t+=`• ${mName(byM[k][0])}: ${byM[k].map(setTxt).join(', ')}${rt[k]?` · קושי ${rt[k]}/5`:''}\n`}
  if(pr.length)t+=`\n🏆 שיאים: ${pr.map(p=>`${p.name} ${p.txt||fmt(p.w)+' ק״ג'}`).join(', ')}\n`;return t}
function sessionHTML(s){const a=agg([s]),pr=prsOf(s),rs=restStats(s),cp=completion(s),RM=restMap(s),rt=s.rates||{};const byG={};for(const x of s.sets)(byG[mGroup(x)]=byG[mGroup(x)]||[]).push(x);
  return `<div class="stats3"><div class="stat"><div class="st">משך</div><div class="sv2">${durTxt(s.end-s.start)}</div></div><div class="stat"><div class="st">סטים</div><div class="sv2">${a.sets}</div></div>${a.vol?`<div class="stat"><div class="st">נפח (ק״ג)</div><div class="sv2">${nf(a.vol)}</div></div>`:''}${rs?`<div class="stat"><div class="st">מנוחה ממוצעת</div><div class="sv2">${mmss(rs.avg)}</div></div>`:''}</div>
  ${cp.length?`<h3 class="sec">🎯 השלמה לפי אזור <small class="muted">(יעד 9 סטים)</small></h3><div class="cpl">${cp.map(c=>`<div class="cp"><span>${esc(c.g)}</span><div class="cpb"><i style="width:${c.p}%" class="${c.p>=100?'full':c.p>=50?'mid':'low'}"></i></div><b>${c.p}%</b><small>${c.n}/9</small></div>`).join('')}</div>`:''}
  ${pr.length?`<div class="pr">🏆 שיאים אישיים: ${pr.map(p=>`<div><b>${esc(p.name)}</b> ${p.txt||fmt(p.w)+' ק״ג'} <small>(קודם ${p.ptxt||fmt(p.prev)})</small></div>`).join('')}</div>`:''}
  ${Object.keys(byG).map(g=>{const byM={};for(const x of byG[g])(byM[x.mid]=byM[x.mid]||[]).push(x);return `<h3 class="sec">${esc(g)} ${vol(byG[g])?`<small class="muted">${nf(vol(byG[g]))} ק״ג</small>`:''}</h3>`+Object.values(byM).map(xs=>`<div class="exr"><b>${esc(mName(xs[0]))}${rt[xs[0].mid]?` <span class="rtag r${rt[xs[0].mid]}">קושי ${rt[xs[0].mid]}/5</span>`:''}</b><div>${xs.map(x=>{const v=RM.get(x);return `<span class="pill">${setTxt(x)}${v!=null&&v<=REST_MAX?`<small class="rst">⏸ ${mmss(v)}</small>`:''}</span>`}).join('')}</div><small class="muted">${isTimed(xs[0].mid)?`סה״כ ${mmss(xs.reduce((a,x)=>a+(x.s||0),0))}`:isBW(xs[0].mid)?`סה״כ ${xs.reduce((a,x)=>a+x.r,0)} חזרות`:vol(xs)?`נפח ${nf(vol(xs))} ק״ג`:`${xs.length} סטים`}</small></div>`).join('')}).join('')}`}
const dtl=t=>{const d=new Date(t);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
function editTimes(s){openSheet(`<h2>🕒 עריכת זמני האימון</h2><label>התחלה</label><input type="datetime-local" id="tsA" value="${dtl(s.start)}"><label>סיום</label><input type="datetime-local" id="tsB" value="${dtl(s.end)}">
  <div class="delta" id="tsD"></div><button class="btn pri" id="tsOk">שמור</button><button class="btn" id="tsX">ביטול</button>`);
  const rd=()=>{const a=new Date($('#tsA').value).getTime(),b=new Date($('#tsB').value).getTime();$('#tsD').textContent=a&&b&&b>a?'משך: '+durTxt(b-a):'הסיום חייב להיות אחרי ההתחלה';$('#tsOk').disabled=!(a&&b&&b>a&&b-a<24*3600e3);if(b-a>=24*3600e3)$('#tsD').textContent='משך מקסימלי 24 שעות';return[a,b]};
  $('#tsA').oninput=$('#tsB').oninput=rd;rd();$('#tsX').onclick=()=>showSessionReport(s.id);
  $('#tsOk').onclick=async()=>{const[a,b]=rd();if(!(b>a))return;const before={start:s.start,end:s.end};s.start=a;s.end=b;await saveSessions();showSessionReport(s.id);if(view==='reports')renderReports();
    toast('זמני האימון עודכנו',async()=>{Object.assign(s,before);await saveSessions();if(view==='reports')renderReports()})}}
function showSessionReport(id){const s=sessions.find(x=>x.id===id);if(!s)return;
  const heavy={};for(const x of s.sets){const h=heavy[x.mid];if(!h||better(x,h))heavy[x.mid]=x}
  const upd=Object.keys(heavy).map(k=>({m:machines.find(y=>y.id===k),w:heavy[k].w,r:heavy[k].r})).filter(o=>o.m&&!o.m.timed&&(o.m.weight!==o.w||(o.m.bw&&o.m.reps!==o.r)));
  openSheet(`<h2>📋 דוח אימון · ${fdate(s.start)} ${hm(s.start)}</h2>${sessionHTML(s)}
  ${upd.length?`<button class="btn pri" id="srUpd">⬆️ עדכן משקל נוכחי לסט הכבד (${upd.length})</button>`:''}
  <button class="btn" id="srShare">📤 שתף</button><button class="btn" id="srTime">🕒 עריכת זמני האימון</button><button class="btn danger" id="srDel">🗑️ מחק אימון</button><button class="btn" id="srX">סגור</button>`);
  $('#srX').onclick=closeSheet;$('#srShare').onclick=()=>share(sessionText(s));$('#srTime').onclick=()=>editTimes(s);
  if(upd.length)$('#srUpd').onclick=async()=>{if(!confirm(('לעדכן:\n'+upd.map(o=>o.m.bw?`${o.m.name}: ${o.m.reps==null?'—':bwTxt(o.m.weight,o.m.reps)} ← ${bwTxt(o.w,o.r)}`:`${o.m.name}: ${fmt(o.m.weight)} ← ${fmt(o.w)} ק״ג`).join('\n')).replace(/<[^>]+>/g,'')))return;
    const before=upd.map(o=>structuredClone(o.m));const now=Date.now();for(const o of upd){o.m.weight=o.w;o.m.updated=now;if(o.m.bw){o.m.reps=o.r;o.m.history.push({t:now,w:o.w,r:o.r})}else o.m.history.push({t:now,w:o.w});await put(o.m)}await load();showSessionReport(id);
    toast(`עודכנו ${upd.length} תרגילים`,async()=>{for(const m of before)await put(m);await load();if(!$('#sheet').hidden)showSessionReport(id)})};
  $('#srDel').onclick=async()=>{if(!confirm(`למחוק את האימון מ-${fdate(s.start)}? אי אפשר לבטל.`))return;sessions=sessions.filter(x=>x!==s);await saveSessions();closeSheet();if(view==='reports')renderReports()}}
// --- share ---
async function share(text){text=text.replace(/<[^>]+>/g,'');if(navigator.share){try{await navigator.share({text});return}catch(e){if(e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(text);toast('הדוח הועתק — אפשר להדביק בווטסאפ',null)}catch{openSheet(`<h2>העתק את הדוח</h2><textarea class="ta" readonly>${esc(text)}</textarea><button class="btn" onclick="closeSheet()">סגור</button>`);$('.ta').select()}}
// --- period reports ---
function period(type,off){const n=new Date();let a,b;
  if(type==='week'){a=new Date(n.getFullYear(),n.getMonth(),n.getDate()-n.getDay()+7*off);b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+7)}
  else{a=new Date(n.getFullYear(),n.getMonth()+off,1);b=new Date(n.getFullYear(),n.getMonth()+off+1,1)}return{a:+a,b:+b}}
const ymd=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const inP=p=>sessions.filter(s=>s.start>=p.a&&s.start<p.b).sort((x,y)=>x.start-y.start);
function pLabel(type,p){return type==='week'?`${fdate(p.a)} – ${fdate(p.b-864e5)}`:new Date(p.a).toLocaleDateString('he-IL',{month:'long',year:'numeric'})}
function bodyChg(p,k){const xs=body.filter(e=>e[k]!=null&&e.date>=ymd(p.a)&&e.date<ymd(p.b)).sort((x,y)=>x.date<y.date?-1:1);return xs.length>=2?{a:xs[0][k],b:xs[xs.length-1][k]}:null}
function dTxt(a,b,u=''){const d=a-b;if(!b&&!a)return'';const c=d>0?'up':d<0?'down':'';return `<small class="${c}">${u==='t'?`${d>0?'+':d<0?'−':'±'}${durTxt(Math.abs(d))}`:`<bdi dir="ltr">${d>0?'+':d<0?'−':'±'}${nf(Math.abs(d))}</bdi>`}${u==='t'?'':pctTxt(a,b)}</small>`}
function periodData(){const p=period(rp.type,rp.off),q=period(rp.type,rp.off-1);return{p,q,A:agg(inP(p)),B:agg(inP(q)),list:inP(p)}}
function periodText(){const{p,A,B}=periodData();const nm=rp.type==='week'?'שבועי':'חודשי';
  let t=`📊 דוח ${nm} · ${pLabel(rp.type,p)}\n🏋️ ${A.count} אימונים (קודם ${B.count})\n⏱️ ${durTxt(A.time)}\n💪 נפח ${nf(A.vol)} ק״ג${pctTxt(A.vol,B.vol)}\n`;
  if(Object.values(A.grp).some(v=>v)){t+='\n*נפח לפי אזור*\n';for(const g in A.grp)if(A.grp[g])t+=`• ${g}: ${nf(A.grp[g])} ק״ג${pctTxt(A.grp[g],B.grp[g]||0)}\n`}
  if(Object.keys(A.ex).length){t+='\n*תרגילים*\n';for(const e of Object.values(A.ex))t+=e.timed?`• ${e.name}: ${mmss(e.fb)} → ${mmss(e.lb)} (סה״כ ${mmss(e.secs)})\n`:e.bw?`• ${e.name}: ${bwTxt(e.fb.w,e.fb.r)} → ${bwTxt(e.lb.w,e.lb.r)}\n`:`• ${e.name}: ${fmt(e.firstMax)}→${fmt(e.lastMax)} ק״ג${e.vol?`, נפח ${nf(e.vol)}`:''}\n`}
  const bw=bodyChg(p,'w'),bf=bodyChg(p,'f');if(bw||bf)t+=`\n⚖️ ${bw?`משקל ${fmt(bw.a)}→${fmt(bw.b)} ק״ג`:''}${bw&&bf?' · ':''}${bf?`שומן ${fmt(bf.a)}→${fmt(bf.b)}%`:''}\n`;return t}
function exLi(e){const d=e.lastMax-e.firstMax;
  const right=e.timed?`⏱ ${mmss(e.fb)} → ${mmss(e.lb)}`:e.bw?`${bwTxt(e.fb.w,e.fb.r)} → ${bwTxt(e.lb.w,e.lb.r)}`:`<bdi dir="ltr">${fmt(e.firstMax)}→${fmt(e.lastMax)}</bdi> ק״ג ${d?`<small class="${d>0?'up2':'down2'}">(${d>0?'+':'−'}${fmt(Math.abs(d))})</small>`:''}`;
  return `<li><span>${esc(e.name)}<br><small class="muted">${e.sets} סטים${e.timed?` · סה״כ ${mmss(e.secs)}`:e.bw?` · ${e.reps} חזרות`:e.vol?` · נפח ${nf(e.vol)}`:''}${e.rate?` · קושי ממוצע ${e.rate}/5`:''}</small></span><span>${right}</span></li>`}
function renderReports(){const{p,A,B,list}=periodData();const el=$('#repView');
  const grps=[...new Set([...Object.keys(A.grp),...Object.keys(B.grp)])].filter(g=>(A.grp[g]||0)||(B.grp[g]||0));
  const bw=bodyChg(p,'w'),bf=bodyChg(p,'f');
  el.innerHTML=`<div class="steps"><button data-rt="week" class="${rp.type==='week'?'on':''}">שבועי</button><button data-rt="month" class="${rp.type==='month'?'on':''}">חודשי</button></div>
  <div class="row between pnav"><button class="pm sm" id="pPrev">›</button><b>${pLabel(rp.type,p)}</b><button class="pm sm" id="pNext" ${rp.off>=0?'disabled':''}>‹</button></div>
  <div class="stats3"><div class="stat"><div class="st">אימונים</div><div class="sv2">${A.count}</div>${dTxt(A.count,B.count)}</div>
  <div class="stat"><div class="st">זמן</div><div class="sv2 sm">${durTxt(A.time)}</div>${dTxt(A.time,B.time,'t')}</div>
  <div class="stat"><div class="st">נפח (ק״ג)</div><div class="sv2 sm">${nf(A.vol)}</div>${dTxt(A.vol,B.vol)}</div></div>
  <div class="muted small" style="text-align:center">בהשוואה ל${rp.type==='week'?'שבוע':'חודש'} הקודם</div>
  ${grps.length?`<h3 class="sec">נפח לפי אזור</h3><ul class="hist">${grps.map(g=>`<li><span>${esc(g)}</span><span>${nf(A.grp[g]||0)} ${dTxt(A.grp[g]||0,B.grp[g]||0)}</span></li>`).join('')}</ul>`:''}
  ${Object.keys(A.ex).length?`<h3 class="sec">תרגילים</h3><ul class="hist">${Object.values(A.ex).map(exLi).join('')}</ul>`:''}
  ${bw||bf?`<h3 class="sec">הגוף שלי בתקופה</h3><ul class="hist">${bw?`<li><span>משקל</span><span><bdi dir="ltr">${fmt(bw.a)}→${fmt(bw.b)}</bdi> ק״ג ${chg(bw.b-bw.a,' ק״ג',0)}</span></li>`:''}${bf?`<li><span>אחוז שומן</span><span><bdi dir="ltr">${fmt(bf.a)}→${fmt(bf.b)}%</bdi> ${chg(bf.b-bf.a,'%',0)}</span></li>`:''}</ul>`:''}
  <button class="btn" id="pShare">📤 שתף דוח</button>
  <h3 class="sec">היסטוריית אימונים</h3>${sessions.length?`<ul class="hist">${[...sessions].sort((x,y)=>y.start-x.start).map(s=>`<li class="click" data-sid="${s.id}"><span>${fdate(s.start)} ${hm(s.start)}<br><small class="muted">${[...new Set(s.sets.map(mGroup))].join(', ')}</small></span><span>${durTxt(s.end-s.start)} · ${s.sets.length} סטים ›</span></li>`).join('')}</ul>`:'<p class="sec-empty">עוד אין אימונים. לחץ "התחל אימון" במסך התרגילים.</p>'}`;
  el.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{rp={type:b.dataset.rt,off:0};renderReports()});
  $('#pPrev').onclick=()=>{rp.off--;renderReports()};$('#pNext').onclick=()=>{if(rp.off<0){rp.off++;renderReports()}};
  $('#pShare').onclick=()=>share(periodText());el.querySelectorAll('[data-sid]').forEach(li=>li.onclick=()=>showSessionReport(li.dataset.sid))}
