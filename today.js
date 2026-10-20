// ===== "מה לאמן היום" – recommendation card =====
let todayPick=null;
const dayStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const daysAgo=t=>Math.round((dayStart(Date.now())-dayStart(t))/864e5);
const agoTxt=d=>d==null?'עוד לא אומן':d===0?'היום':d===1?'אתמול':`לפני ${d} ימים`;
const agoCls=d=>d==null||d>10?'red':d>=5?'orange':'green';
function lastDoneMap(){const L={};const all=[...sessions,...(session?[session]:[])];
  for(const s of all)for(const x of s.sets||[]){const t=x.t||s.start;if(!(L[x.mid]>=t))L[x.mid]=t}return L}
function areaStats(){const L=lastDoneMap();
  return groups.map((g,i)=>{const ms=machines.filter(m=>m.group===g.id);if(!ms.length)return null;
    const ts=ms.map(m=>L[m.id]).filter(Boolean);const last=ts.length?Math.max(...ts):null;
    return {g,i,ms,last,days:last==null?null:daysAgo(last)}}).filter(Boolean)
   .sort((a,b)=>(b.days==null?1e9:b.days)-(a.days==null?1e9:a.days)||a.i-b.i)}
function pickExercises(a){const L=lastDoneMap();const done=a.ms.filter(m=>L[m.id]).sort((x,y)=>L[x.id]-L[y.id]),never=a.ms.filter(m=>!L[m.id]);
  return [...done,...never].slice(0,4)}
function renderToday(){const el=$('#today');if(!el)return;
  if(view!=='machines'||session){el.hidden=true;return}el.hidden=false;
  const A=areaStats();
  if(!A.length){el.innerHTML='<div class="tdh"><b>🎯 מה לאמן היום</b></div><p class="tdm">הוסף תרגילים כדי לקבל המלצה 💪</p>';return}
  let cur=A.find(a=>a.g.id===todayPick)||A[0];const ex=pickExercises(cur);const open=localStorage.todayOpen!=='0';
  const none=!sessions.length;
  el.innerHTML=`<div class="tdh"><button class="tdt" id="tdTog" aria-expanded="${open}"><b>🎯 מה לאמן היום:</b> <span>${esc(cur.g.name)}</span> <small class="tdb ${agoCls(cur.days)}">${agoTxt(cur.days)}</small> <span class="tdc">${open?'▴':'▾'}</span></button></div>
  ${open?`${none?'<p class="tdm">עוד אין אימונים רשומים – הנה הצעה להתחלה 🙂</p>':''}
  <div class="tda">${A.map(a=>`<button class="tdp ${agoCls(a.days)}${a===cur?' on':''}" data-ta="${a.g.id}"><span>${esc(a.g.name)}</span><small>${a.days==null?'עוד לא':a.days===0?'היום':a.days+' ימים'}</small></button>`).join('')}</div>
  <ol class="tdx">${ex.map(m=>{const t=lastDoneMap()[m.id];return `<li><span>${esc(m.name)}</span><small>${t?agoTxt(daysAgo(t)):'חדש'}</small></li>`}).join('')}</ol>
  <button class="btn pri" id="tdGo">▶️ התחל אימון ${esc(cur.g.name)}</button>`:''}`;
  $('#tdTog').onclick=()=>{localStorage.todayOpen=open?'0':'1';renderToday()};
  el.querySelectorAll('[data-ta]').forEach(b=>b.onclick=()=>{todayPick=b.dataset.ta;renderToday()});
  if(open)$('#tdGo').onclick=()=>startSession({plan:ex.map(m=>m.id),area:cur.g.name})}
function planHTML(){if(!session||!session.plan||!session.plan.length)return'';const ms=session.plan.map(id=>machines.find(m=>m.id===id)).filter(Boolean);if(!ms.length)return'';
  return `<h3 class="sec plan-h">📋 התוכנית להיום${session.area?' · '+esc(session.area):''}</h3>`+ms.map(card).join('')}
function markPlan(){if(!session||!session.plan)return;const done=new Set(session.sets.map(x=>x.mid));
  document.querySelectorAll('#grid .card').forEach(c=>{const id=c.dataset.id;if(session.plan.includes(id)){c.classList.add('plan');c.classList.toggle('pdone',done.has(id))}})}
