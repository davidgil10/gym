// ===== "מה לאמן היום" – recommendation card =====
// Area recency counts sets on archived exercises too (history stays linked); suggested exercises come only from active (main-page) ones.
let todayPick=null;
const dayStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const daysAgo=t=>Math.round((dayStart(Date.now())-dayStart(t))/864e5);
const agoTxt=d=>d==null?'עוד לא אומן':d===0?'היום':d===1?'אתמול':`לפני ${d} ימים`;
const agoCls=d=>d==null||d>10?'red':d>=5?'orange':'green';
function lastDoneMap(){const L={};const all=[...sessions,...(session?[session]:[])];
  for(const s of all)for(const x of s.sets||[]){const t=x.t||s.start;if(!(L[x.mid]>=t))L[x.mid]=t}return L}
function areaStats(){const L=lastDoneMap();
  return groups.map((g,i)=>{const ms=machines.filter(m=>m.group===g.id);if(!ms.length)return null;
    const ts=allM.filter(m=>m.group===g.id).map(m=>L[m.id]).filter(Boolean);const last=ts.length?Math.max(...ts):null;
    return {g,i,ms,last,days:last==null?null:daysAgo(last)}}).filter(Boolean)
   .sort((a,b)=>(b.days==null?1e9:b.days)-(a.days==null?1e9:a.days)||a.i-b.i)}
function pickExercises(a,n=3){const L=lastDoneMap();const done=a.ms.filter(m=>L[m.id]).sort((x,y)=>L[x.id]-L[y.id]),never=a.ms.filter(m=>!L[m.id]);
  return [...done,...never].slice(0,n)}
// deferrals ("דחה למחר") – kept until the date changes
function deferred(){try{const d=JSON.parse(localStorage.todayDefer||'null');return d&&d.d===today()?d.g:[]}catch{return[]}}
function setDeferred(g){localStorage.todayDefer=JSON.stringify({d:today(),g})}
function todayAreas(){const A=areaStats(),D=deferred();return {list:A.filter(a=>!D.includes(a.g.id)).slice(0,3),def:A.filter(a=>D.includes(a.g.id)),all:A}}
function renderToday(){const el=$('#today');if(!el)return;
  if(view!=='machines'||session){el.hidden=true;return}el.hidden=false;
  const {list,def,all}=todayAreas();
  if(!all.length){el.innerHTML='<div class="tdh"><b>🎯 מה לאמן היום</b></div><p class="tdm">הוסף תרגילים כדי לקבל המלצה 💪</p>';return}
  const small=innerWidth<=360||innerHeight<=640;const open=localStorage.todayOpen!=null?localStorage.todayOpen!=='0':!small;
  const L=lastDoneMap();
  el.innerHTML=`<div class="tdh"><button class="tdt" id="tdTog" aria-expanded="${open}"><b>🎯 מה לאמן היום:</b> <span>${list.length?list.map(a=>esc(a.g.name)).join(' · '):'הכול נדחה למחר'}</span>${list[0]?` <small class="tdb ${agoCls(list[0].days)}">${agoTxt(list[0].days)}</small>`:''} <span class="tdc">${open?'▴':'▾'}</span></button></div>
  ${open?`${!sessions.length?'<p class="tdm">עוד אין אימונים רשומים – הנה הצעה להתחלה 🙂</p>':''}
  ${list.map((a,i)=>`<div class="tdr ${agoCls(a.days)}" data-ta="${a.g.id}"><div class="tdrh"><span class="tdn">${i+1}. ${esc(a.g.name)}</span><small class="tdb ${agoCls(a.days)}">${agoTxt(a.days)}</small><button class="tdDef" data-def="${a.g.id}">דחה למחר ⏭</button></div>
    <div class="tdx">${pickExercises(a).map(m=>`<span class="tde" data-ago="${L[m.id]?agoTxt(daysAgo(L[m.id])):'חדש'}">${esc(m.name)}</span>`).join('')}</div></div>`).join('')}
  ${!list.length?'<p class="tdm">כל האזורים נדחו למחר 😴</p>':''}
  ${def.length?`<p class="tdm small">נדחו למחר: ${def.map(a=>esc(a.g.name)).join(', ')} · <button class="link" id="tdUndef">בטל דחייה</button></p>`:''}
  ${list.length?`<button class="btn pri" id="tdGo">▶️ התחל אימון · ${list.length===1?esc(list[0].g.name):list.length+' אזורים'}</button>`:''}`:''}`;
  $('#tdTog').onclick=()=>{localStorage.todayOpen=open?'0':'1';renderToday()};
  el.querySelectorAll('[data-def]').forEach(b=>b.onclick=()=>{const g=b.dataset.def,nm=(all.find(a=>a.g.id===g)||{g:{name:''}}).g.name;setDeferred([...deferred(),g]);renderToday();
    toast(`${nm} נדחה למחר`,()=>{setDeferred(deferred().filter(x=>x!==g));renderToday()})});
  const u=$('#tdUndef');if(u)u.onclick=()=>{setDeferred([]);renderToday()};
  const go=$('#tdGo');if(go)go.onclick=()=>startSession({areas:list.map(a=>({g:a.g.id,name:a.g.name,mids:pickExercises(a).map(m=>m.id)}))})}
// ---- plan during a workout (areas one after another) ----
const SET_GOAL=9;
function planAreas(){if(!session)return null;if(session.areas&&session.areas.length)return session.areas;
  if(session.plan&&session.plan.length){session.areas=[{g:null,name:session.area||'התוכנית',mids:session.plan.slice(),done:null}];return session.areas}return null}
const areaSets=(a,sets)=>sets.filter(x=>{const m=allM.find(y=>y.id===x.mid);return a.g?(m?m.group===a.g:false)||a.mids.includes(x.mid):a.mids.includes(x.mid)}).length;
const pctOf=n=>Math.min(100,Math.round(n/SET_GOAL*100));
function curArea(){const A=planAreas();return A?A.find(a=>!a.done)||null:null}
function planHTML(){const A=planAreas();if(!A)return'';const cur=curArea();let h='';
  for(const [i,a] of A.entries()){const n=areaSets(a,session.sets);
    if(a.done)h+=`<div class="pdline">✓ ${esc(a.name)} הסתיים · <bdi dir="ltr">${n}/${SET_GOAL}</bdi> סטים (${pctOf(n)}%)</div>`;
    else if(a===cur){const ms=a.mids.map(id=>machines.find(m=>m.id===id)).filter(Boolean);
      h+=`<div class="plan-hd"><h3 class="sec plan-h">📋 ${A.length>1?`אזור <bdi dir="ltr">${i+1}/${A.length}</bdi>: `:'התוכנית להיום · '}${esc(a.name)} <small><bdi dir="ltr">${n}/${SET_GOAL}</bdi></small></h3><button class="btn areaEnd" id="areaEnd">🏁 סיים אזור</button></div>`+ms.map(card).join('')}
    else h+=`<div class="pdline next">⏭ בהמשך: ${esc(a.name)}</div>`}
  if(!cur)h+=`<div class="plan-hd"><h3 class="sec plan-h">✅ כל האזורים הושלמו</h3><button class="btn danger areaEnd" id="planEnd">⏹ סיים אימון</button></div>`;
  return `<div class="planbox">${h}</div>`}
function markPlan(){const A=planAreas();if(!A)return;const cur=curArea(),done=new Set(session.sets.map(x=>x.mid));
  document.querySelectorAll('#grid .card').forEach(c=>{const id=c.dataset.id;if(cur&&cur.mids.includes(id)){c.classList.add('plan');c.classList.toggle('pdone',done.has(id))}});
  const e=$('#areaEnd');if(e)e.onclick=ev=>{ev.stopPropagation();endArea()};const p=$('#planEnd');if(p)p.onclick=ev=>{ev.stopPropagation();endSession()}}
async function endArea(){const a=curArea();if(!a)return;a.done=Date.now();await saveActive();render();scrollTo(0,0);const n=areaSets(a,session.sets);
  toast(`${a.name}: ${n}/${SET_GOAL} סטים (${pctOf(n)}%)`,async()=>{a.done=null;await saveActive();render()})}

// main list order: most neglected area first, most recently trained last
function groupsByNeglect(){const A=areaStats(),ord=new Map(A.map((a,i)=>[a.g.id,i]));return groups.slice().sort((x,y)=>(ord.has(x.id)?ord.get(x.id):1e6)-(ord.has(y.id)?ord.get(y.id):1e6))}
