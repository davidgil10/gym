'use strict';
// ===== timed exercises + stopwatch =====
let swTick=null,wakeLock=null;
const swGet=()=>{try{return JSON.parse(localStorage.getItem('swRun'))}catch{return null}};
const parseTime=t=>{t=String(t||'').trim();if(!t)return null;if(t.includes(':')){const[a,b]=t.split(':').map(Number);return a>=0&&b>=0&&b<60?a*60+b:null}const n=Number(t);return n>=0?Math.round(n):null};
async function wakeOn(){try{if('wakeLock' in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}}catch(e){}}
function wakeOff(){try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&swGet())wakeOn()});
async function recordTime(m,d){if(!(d>=1))return;const before=structuredClone(m),sBefore=session?structuredClone(session.sets):null,now=Date.now();
  m.secs=d;m.updated=now;m.history.push({t:now,s:d});await put(m);
  if(session){session.sets.push({mid:m.id,name:m.name,gname:gName(m.group),w:0,r:0,s:d,t:now});await saveActive();renderSessBar()}
  await load();openTimed(machines.find(x=>x.id===m.id));if(session)startRest();
  toast(`${m.name}: ${mmss(d)} נשמר`,async()=>{await put(before);if(sBefore&&session){session.sets=sBefore;await saveActive();renderSessBar()}await load();if(!$('#sheet').hidden&&$('#tV'))openTimed(machines.find(x=>x.id===m.id))})}
function openTimed(m){if(!m)return;clearInterval(swTick);const hist=[...m.history].reverse(),mine=session?session.sets.filter(x=>x.mid===m.id):[];
  openSheet(`<div class="row between"><h2>${esc(m.name)} <small class="gtag">${esc(gName(m.group))}</small></h2><button class="link" id="eDet">✏️ עריכה</button></div>
  <div class="big timer" id="tV">0:00</div><div class="delta" id="tInfo">${m.secs!=null?`אחרון ${mmss(m.secs)} · שיא ${mmss(tBest(m))}`:'עוד לא נמדד זמן'}</div>
  <button class="btn pri huge" id="tGo"></button>
  <label class="chk"><input type="checkbox" id="tCD" ${localStorage.getItem('cd321')==='1'?'checked':''}> ספירה לאחור 3-2-1</label>
  <button class="btn" id="tMan">✍️ הזנת זמן ידנית</button>
  ${session?`<h3 class="sec">סטים באימון הנוכחי</h3><ol class="sets">${mine.map((x,i)=>`<li><span>סט ${i+1}</span><b>⏱ ${mmss(x.s)}</b><button class="link" data-ds="${session.sets.indexOf(x)}" style="color:#f87171">✕</button></li>`).join('')||'<li class="muted">עצירת הסטופר תירשם כסט</li>'}</ol>`:''}
  <button class="btn" id="tClose">סגור</button>
  <h2 style="margin-top:20px">התקדמות</h2><div class="delta">${fromStartT(m)}</div>${chart(m.history.map(h=>({t:h.t,w:h.s})))}
  <ul class="hist">${hist.map((x,i)=>{const p=hist[i+1],d=p?x.s-p.s:0;return `<li><span>${fdate(x.t)}</span><span><bdi dir="ltr">${mmss(x.s)}</bdi> ${d?`<small style="color:${d>0?'#22c55e':'#f87171'}">(${d>0?'+':'−'}${mmss(Math.abs(d))})</small>`:''}</span></li>`}).join('')}</ul>`);
  $('#tCD').onchange=e=>localStorage.setItem('cd321',e.target.checked?'1':'0');
  $('#tClose').onclick=closeSheet;$('#eDet').onclick=()=>{if(swGet())return alert('קודם עצור את הסטופר');openForm(m)};
  $('#tMan').onclick=()=>{const d=parseTime(prompt('זמן (דק:שנ, למשל 1:30):','')); if(d==null||d<1)return;recordTime(m,d)};
  if(session)$('#sheet').querySelectorAll('[data-ds]').forEach(b=>b.onclick=async()=>{if(!confirm('למחוק את הסט?'))return;session.sets.splice(+b.dataset.ds,1);await saveActive();renderSessBar();openTimed(m)});
  const paint=()=>{const r=swGet(),el=$('#tV');if(!el)return clearInterval(swTick);const go=$('#tGo');
    if(r&&r.mid===m.id){const ms=Date.now()-r.start;if(ms<0){el.textContent=Math.ceil(-ms/1000);el.classList.add('cd')}else{el.textContent=mmss(Math.floor(ms/1000));el.classList.remove('cd')}go.textContent='⏹ עצור ושמור';go.classList.add('stop')}
    else{el.classList.remove('cd');if(!r)el.textContent=mmss(0);go.textContent=r?'סטופר פועל בתרגיל אחר':'▶ התחל';go.classList.remove('stop');go.disabled=!!r}};
  $('#tGo').onclick=async()=>{const r=swGet();
    if(r&&r.mid===m.id){const d=Math.floor((Date.now()-r.start)/1000);localStorage.removeItem('swRun');wakeOff();clearInterval(swTick);navigator.vibrate&&navigator.vibrate(80);if(d<1){paint();return}await recordTime(m,d);return}
    if(r)return;const cd=$('#tCD').checked?3000:0;localStorage.setItem('swRun',JSON.stringify({mid:m.id,start:Date.now()+cd}));wakeOn();navigator.vibrate&&navigator.vibrate(40);paint();swTick=setInterval(paint,200)};
  paint();if(swGet())swTick=setInterval(paint,200)}
function resumeTimer(){const r=swGet();if(!r)return;const m=machines.find(x=>x.id===r.mid);if(!m){localStorage.removeItem('swRun');return}if(view!=='machines')setView('machines');openTimed(m);wakeOn()}
