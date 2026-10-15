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
// --- session bar ---
let barTimer;
function renderSessBar(){const b=$('#sessBar');clearInterval(barTimer);
  if(!session){b.innerHTML='<button class="btn pri start" id="startBtn">▶️ התחל אימון</button>';$('#startBtn').onclick=startSession;return}
  const upd=()=>{if(!session)return;b.innerHTML=`<div class="live"><span>🟢 אימון פעיל · <b>${durTxt(Date.now()-session.start)}</b> · ${session.sets.length} סטים</span><button class="btn danger" id="endBtn">⏹ סיים אימון</button></div><div class="hint">לחץ על מכשיר כדי לרשום סטים</div>`;$('#endBtn').onclick=endSession};
  upd();barTimer=setInterval(upd,20000)}
async function startSession(){session={id:newId(),start:Date.now(),sets:[]};await saveActive();renderSessBar();if(view!=='machines')setView('machines')}
async function endSession(){if(!session)return;
  if(!session.sets.length){if(confirm('לא נרשמו סטים. לבטל את האימון?')){session=null;await saveActive();stopRest();renderSessBar()}return}
  if(!confirm('לסיים את האימון?'))return;
  const s=session;s.end=Date.now();sessions.push(s);session=null;await saveSessions();await saveActive();stopRest();renderSessBar();showSessionReport(s.id)}
// --- logging sets ---
function openLog(id){const m=machines.find(x=>x.id===id);if(!m)return;
  const mine=session.sets.filter(x=>x.mid===id),last=mine[mine.length-1];let w=last?last.w:m.weight,r=last?last.r:10;const st=m.step||2.5;
  const prev=[...sessions].reverse().find(s=>s.sets.some(x=>x.mid===id));
  openSheet(`<div class="row between"><h2>${esc(m.name)}</h2><button class="link" id="lEdit">⚙️ משקל קבוע</button></div>
  <ol class="sets">${mine.map((x,i)=>`<li><span>סט ${i+1}</span><b>${fmt(x.w)} ק״ג × ${x.r}</b><button class="link" data-ds="${session.sets.indexOf(x)}" style="color:#f87171">✕</button></li>`).join('')||'<li class="muted">עוד לא נרשמו סטים במכשיר הזה</li>'}</ol>
  ${prev?`<div class="muted small">באימון הקודם (${fdate(prev.start)}): ${prev.sets.filter(x=>x.mid===id).map(x=>`${fmt(x.w)}×${x.r}`).join(', ')}</div>`:''}
  <h3 class="sec">סט ${mine.length+1}</h3>
  <label>משקל (ק״ג)</label><div class="row"><button class="pm" id="wM">−</button><div class="val" id="wV"></div><button class="pm" id="wP">+</button></div>
  <label>חזרות</label><div class="row"><button class="pm" id="rM">−</button><div class="val" id="rV"></div><button class="pm" id="rP">+</button></div>
  <button class="btn pri big" id="lDone">✔ בוצע</button><button class="btn" id="lClose">סגור</button>`);
  const upd=()=>{$('#wV').textContent=fmt(w);$('#rV').textContent=r};upd();
  $('#wP').onclick=()=>{w=Math.round((w+st)*100)/100;upd()};$('#wM').onclick=()=>{w=Math.max(0,Math.round((w-st)*100)/100);upd()};
  $('#rP').onclick=()=>{r++;upd()};$('#rM').onclick=()=>{r=Math.max(1,r-1);upd()};
  $('#lClose').onclick=closeSheet;$('#lEdit').onclick=()=>openEdit(id);
  $('#lDone').onclick=async()=>{const set={mid:id,name:m.name,gname:gName(m.group),w,r,t:Date.now()};session.sets.push(set);await saveActive();renderSessBar();openLog(id);startRest();
    toast(`סט נרשם: ${fmt(w)}×${r}`,async()=>{session.sets=session.sets.filter(x=>x!==set);await saveActive();renderSessBar();if(!$('#sheet').hidden)openLog(id)})};
  $('#sheet').querySelectorAll('[data-ds]').forEach(b=>b.onclick=async()=>{if(!confirm('למחוק את הסט?'))return;session.sets.splice(+b.dataset.ds,1);await saveActive();renderSessBar();openLog(id)})}
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
    else{$('#restT').textContent=mmss(left);$('#restL').textContent='⏱️ מנוחה · '+mmss(restDur())+' ✎'}};
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
  // firstMax = max of first session containing exercise
  for(const k in ex){const ss=list.filter(s=>s.sets.some(x=>x.mid===k));ex[k].firstMax=Math.max(...ss[0].sets.filter(x=>x.mid===k).map(x=>x.w));ex[k].lastMax=Math.max(...ss[ss.length-1].sets.filter(x=>x.mid===k).map(x=>x.w))}
  return{count:list.length,time:t,vol:v,sets:n,grp,ex}}
function prsOf(s){const out=[];const ids=[...new Set(s.sets.map(x=>x.mid))];
  for(const id of ids){const mx=Math.max(...s.sets.filter(x=>x.mid===id).map(x=>x.w));
    const before=sessions.filter(o=>o.id!==s.id&&o.start<s.start).flatMap(o=>o.sets.filter(x=>x.mid===id).map(x=>x.w));
    if(before.length&&mx>Math.max(...before))out.push({id,name:mName(s.sets.find(x=>x.mid===id)),w:mx,prev:Math.max(...before)})}
  return out}
function sessionText(s){const a=agg([s]),pr=prsOf(s);let t=`🏋️ אימון ${fdate(s.start)} ${hm(s.start)}\n⏱️ ${durTxt(s.end-s.start)} · ${a.sets} סטים · נפח ${nf(a.vol)} ק״ג\n`;
  const byG={};for(const x of s.sets)(byG[mGroup(x)]=byG[mGroup(x)]||[]).push(x);
  for(const g in byG){t+=`\n*${g}*\n`;const byM={};for(const x of byG[g])(byM[x.mid]=byM[x.mid]||[]).push(x);for(const k in byM)t+=`• ${mName(byM[k][0])}: ${byM[k].map(x=>`${fmt(x.w)}×${x.r}`).join(', ')}\n`}
  if(pr.length)t+=`\n🏆 שיאים: ${pr.map(p=>`${p.name} ${fmt(p.w)} ק״ג`).join(', ')}\n`;return t}
function sessionHTML(s){const a=agg([s]),pr=prsOf(s);const byG={};for(const x of s.sets)(byG[mGroup(x)]=byG[mGroup(x)]||[]).push(x);
  return `<div class="stats3"><div class="stat"><div class="st">משך</div><div class="sv2">${durTxt(s.end-s.start)}</div></div><div class="stat"><div class="st">סטים</div><div class="sv2">${a.sets}</div></div><div class="stat"><div class="st">נפח (ק״ג)</div><div class="sv2">${nf(a.vol)}</div></div></div>
  ${pr.length?`<div class="pr">🏆 שיאים אישיים: ${pr.map(p=>`<div><b>${esc(p.name)}</b> ${fmt(p.w)} ק״ג <small>(קודם ${fmt(p.prev)})</small></div>`).join('')}</div>`:''}
  ${Object.keys(byG).map(g=>{const byM={};for(const x of byG[g])(byM[x.mid]=byM[x.mid]||[]).push(x);return `<h3 class="sec">${esc(g)} <small class="muted">${nf(vol(byG[g]))} ק״ג</small></h3>`+Object.values(byM).map(xs=>`<div class="exr"><b>${esc(mName(xs[0]))}</b><div>${xs.map(x=>`<span class="pill">${fmt(x.w)}×${x.r}</span>`).join('')}</div><small class="muted">נפח ${nf(vol(xs))} ק״ג</small></div>`).join('')}).join('')}`}
function showSessionReport(id){const s=sessions.find(x=>x.id===id);if(!s)return;
  const heavy={};for(const x of s.sets)heavy[x.mid]=Math.max(heavy[x.mid]||0,x.w);
  const upd=Object.keys(heavy).map(k=>({m:machines.find(y=>y.id===k),w:heavy[k]})).filter(o=>o.m&&o.m.weight!==o.w);
  openSheet(`<h2>📋 דוח אימון · ${fdate(s.start)} ${hm(s.start)}</h2>${sessionHTML(s)}
  ${upd.length?`<button class="btn pri" id="srUpd">⬆️ עדכן משקל נוכחי לסט הכבד (${upd.length})</button>`:''}
  <button class="btn" id="srShare">📤 שתף</button><button class="btn danger" id="srDel">🗑️ מחק אימון</button><button class="btn" id="srX">סגור</button>`);
  $('#srX').onclick=closeSheet;$('#srShare').onclick=()=>share(sessionText(s));
  if(upd.length)$('#srUpd').onclick=async()=>{if(!confirm('לעדכן:\n'+upd.map(o=>`${o.m.name}: ${fmt(o.m.weight)} ← ${fmt(o.w)} ק״ג`).join('\n')))return;
    const before=upd.map(o=>structuredClone(o.m));const now=Date.now();for(const o of upd){o.m.weight=o.w;o.m.updated=now;o.m.history.push({t:now,w:o.w});await put(o.m)}await load();showSessionReport(id);
    toast(`עודכנו ${upd.length} מכשירים`,async()=>{for(const m of before)await put(m);await load();if(!$('#sheet').hidden)showSessionReport(id)})};
  $('#srDel').onclick=async()=>{if(!confirm(`למחוק את האימון מ-${fdate(s.start)}? אי אפשר לבטל.`))return;sessions=sessions.filter(x=>x!==s);await saveSessions();closeSheet();if(view==='reports')renderReports()}}
// --- share ---
async function share(text){if(navigator.share){try{await navigator.share({text});return}catch(e){if(e.name==='AbortError')return}}
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
  if(Object.keys(A.grp).length){t+='\n*נפח לפי אזור*\n';for(const g in A.grp)t+=`• ${g}: ${nf(A.grp[g])} ק״ג${pctTxt(A.grp[g],B.grp[g]||0)}\n`}
  if(Object.keys(A.ex).length){t+='\n*תרגילים*\n';for(const e of Object.values(A.ex))t+=`• ${e.name}: ${fmt(e.firstMax)}→${fmt(e.lastMax)} ק״ג, נפח ${nf(e.vol)}\n`}
  const bw=bodyChg(p,'w'),bf=bodyChg(p,'f');if(bw||bf)t+=`\n⚖️ ${bw?`משקל ${fmt(bw.a)}→${fmt(bw.b)} ק״ג`:''}${bw&&bf?' · ':''}${bf?`שומן ${fmt(bf.a)}→${fmt(bf.b)}%`:''}\n`;return t}
function renderReports(){const{p,A,B,list}=periodData();const el=$('#repView');
  const grps=[...new Set([...Object.keys(A.grp),...Object.keys(B.grp)])];
  const bw=bodyChg(p,'w'),bf=bodyChg(p,'f');
  el.innerHTML=`<div class="steps"><button data-rt="week" class="${rp.type==='week'?'on':''}">שבועי</button><button data-rt="month" class="${rp.type==='month'?'on':''}">חודשי</button></div>
  <div class="row between pnav"><button class="pm sm" id="pPrev">›</button><b>${pLabel(rp.type,p)}</b><button class="pm sm" id="pNext" ${rp.off>=0?'disabled':''}>‹</button></div>
  <div class="stats3"><div class="stat"><div class="st">אימונים</div><div class="sv2">${A.count}</div>${dTxt(A.count,B.count)}</div>
  <div class="stat"><div class="st">זמן</div><div class="sv2 sm">${durTxt(A.time)}</div>${dTxt(A.time,B.time,'t')}</div>
  <div class="stat"><div class="st">נפח (ק״ג)</div><div class="sv2 sm">${nf(A.vol)}</div>${dTxt(A.vol,B.vol)}</div></div>
  <div class="muted small" style="text-align:center">בהשוואה ל${rp.type==='week'?'שבוע':'חודש'} הקודם</div>
  ${grps.length?`<h3 class="sec">נפח לפי אזור</h3><ul class="hist">${grps.map(g=>`<li><span>${esc(g)}</span><span>${nf(A.grp[g]||0)} ${dTxt(A.grp[g]||0,B.grp[g]||0)}</span></li>`).join('')}</ul>`:''}
  ${Object.keys(A.ex).length?`<h3 class="sec">תרגילים</h3><ul class="hist">${Object.values(A.ex).map(e=>{const d=e.lastMax-e.firstMax;return `<li><span>${esc(e.name)}<br><small class="muted">${e.sets} סטים · נפח ${nf(e.vol)}</small></span><span><bdi dir="ltr">${fmt(e.firstMax)}→${fmt(e.lastMax)}</bdi> ק״ג ${d?`<small class="${d>0?'up2':'down2'}">(${d>0?'+':'−'}${fmt(Math.abs(d))})</small>`:''}</span></li>`}).join('')}</ul>`:''}
  ${bw||bf?`<h3 class="sec">הגוף שלי בתקופה</h3><ul class="hist">${bw?`<li><span>משקל</span><span><bdi dir="ltr">${fmt(bw.a)}→${fmt(bw.b)}</bdi> ק״ג ${chg(bw.b-bw.a,' ק״ג',0)}</span></li>`:''}${bf?`<li><span>אחוז שומן</span><span><bdi dir="ltr">${fmt(bf.a)}→${fmt(bf.b)}%</bdi> ${chg(bf.b-bf.a,'%',0)}</span></li>`:''}</ul>`:''}
  <button class="btn" id="pShare">📤 שתף דוח</button>
  <h3 class="sec">היסטוריית אימונים</h3>${sessions.length?`<ul class="hist">${[...sessions].sort((x,y)=>y.start-x.start).map(s=>`<li class="click" data-sid="${s.id}"><span>${fdate(s.start)} ${hm(s.start)}<br><small class="muted">${[...new Set(s.sets.map(mGroup))].join(', ')}</small></span><span>${durTxt(s.end-s.start)} · ${s.sets.length} סטים ›</span></li>`).join('')}</ul>`:'<p class="sec-empty">עוד אין אימונים. לחץ "התחל אימון" במסך המכשירים.</p>'}`;
  el.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{rp={type:b.dataset.rt,off:0};renderReports()});
  $('#pPrev').onclick=()=>{rp.off--;renderReports()};$('#pNext').onclick=()=>{if(rp.off<0){rp.off++;renderReports()}};
  $('#pShare').onclick=()=>share(periodText());el.querySelectorAll('[data-sid]').forEach(li=>li.onclick=()=>showSessionReport(li.dataset.sid))}
