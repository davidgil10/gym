// ===== motivation: complete week (all areas) / complete month (every week of the month complete) =====
// A Sun–Sat week belongs to the month that contains its Wednesday (4 of its 7 days), so every week belongs to exactly one month.
const MOT_W=['🔥 שבוע מושלם! אימנת את כל אזורי הגוף – ככה בונים גוף חזק ומאוזן.','💪 כל הכבוד! אף אזור לא נשאר מאחור השבוע.','🏆 וי על כל האזורים השבוע – אתה בדרך הנכונה!','⭐ שבוע מלא! העקביות שלך משתלמת.','🚀 סגרת את כל אזורי הגוף השבוע. מכאן רק למעלה!','👏 משמעת של אלוף – כל האזורים אומנו השבוע.','🎯 פגעת במטרה: גוף שלם, שבוע שלם.','💥 אין עליך! אימון מלא לכל הגוף השבוע.','🥇 עוד שבוע של עבודה מלאה. ככה נראית התמדה.','🌟 כל השרירים קיבלו את שלהם השבוע – גאווה!','🔝 שבוע בלי פשרות. כל אזור, כל שבוע.','⚡ כל הגוף עבד השבוע. תמשיך בדיוק ככה!','🦾 החלטת, עשית, השלמת. שבוע מלא!','🏅 שבוע מאוזן ומושלם – הגוף שלך מודה לך.','🎉 יש! כל אזורי הגוף סומנו השבוע. מגיע לך כפיים.'];
const MOT_M=['🏆 חודש מושלם! כל שבוע בחודש היה שבוע מלא. זו כבר דרך חיים.','👑 אלוף החודש: כל השבועות מלאים, כל האזורים מאומנים.','🔥 חודש שלם בלי לפספס אזור אחד. מרשים ביותר!','💎 עקביות של יהלום – כל שבועות החודש הושלמו.','🚀 חודש מלא! זה בדיוק מה שמביא תוצאות.','🥇 סגרת חודש מושלם. הגוף שלך מרגיש את זה, וגם אנחנו.','🌟 כל שבוע, כל אזור, כל החודש. פשוט כל הכבוד!','💪 חודש של משמעת מלאה – תהיה גאה בעצמך.','🎯 חודש שלם על המטרה. ממשיכים ככה גם בחודש הבא!','⚡ ארבעה שבועות של עבודה מלאה (ויותר). אין עליך!','🏅 מדליית החודש שלך: כל השבועות מלאים.','🎉 חודש מושלם! זמן לחגוג – ואז להמשיך.'];
const wkStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return +d};
const addDays=(t,n)=>{const d=new Date(t);d.setDate(d.getDate()+n);return +d};
const motAreas=()=>groups.filter(g=>machines.some(m=>m.group===g.id));
function trainedIn(a,b){const S=new Set();for(const s of [...sessions,...(session?[session]:[])])for(const x of s.sets||[]){const t=x.t||s.start;if(t>=a&&t<b){const m=machines.find(y=>y.id===x.mid);if(m&&m.group!==NONE)S.add(m.group)}}return S}
function weekStatus(a){a=wkStart(a);const b=addDays(a,7),A=motAreas(),S=trainedIn(a,b),done=A.filter(g=>S.has(g.id));
  return {a,b,key:ymd(a),done:done.length,total:A.length,missing:A.filter(g=>!S.has(g.id)).map(g=>g.name),complete:A.length>0&&done.length===A.length}}
const weekMonth=a=>{const w=new Date(addDays(a,3));return {y:w.getFullYear(),m:w.getMonth()}};
function monthWeeks(y,m){let s=wkStart(+new Date(y,m,1));if(new Date(addDays(s,3)).getMonth()!==m)s=addDays(s,7);const W=[];while(new Date(addDays(s,3)).getMonth()===m){W.push(s);s=addDays(s,7)}return W}
function monthStatus(y,m){const W=monthWeeks(y,m).map(weekStatus),full=W.filter(w=>w.complete).length;
  return {key:`${y}-${String(m+1).padStart(2,'0')}`,weeks:W,full,total:W.length,complete:W.length>0&&full===W.length,ended:Date.now()>=W[W.length-1].b}}
const pickMsg=(L,last)=>{const c=L.filter(x=>x!==last);return c[Math.floor(Math.random()*c.length)]};
async function checkMotivation(where){if(!motAreas().length)return[];const st=(await metaGet('motivation'))||{w:{},m:{}};const out=[];
  const ws=weekStatus(Date.now());if(ws.complete&&!st.w[ws.key]){const msg=pickMsg(MOT_W,st.lastW);st.w[ws.key]=msg;st.lastW=msg;out.push({type:'w',msg})}
  const cur=weekMonth(wkStart(Date.now())),prev=cur.m?{y:cur.y,m:cur.m-1}:{y:cur.y-1,m:11};
  for(const mm of [prev,cur]){const ms=monthStatus(mm.y,mm.m);if(ms.complete&&!st.m[ms.key]){const msg=pickMsg(MOT_M,st.lastM);st.m[ms.key]=msg;st.lastM=msg;out.push({type:'m',msg,label:new Date(mm.y,mm.m,1).toLocaleDateString('he-IL',{month:'long'})})}}
  if(!out.length)return out;await metaPut('motivation',st);showMotivation(out,where);return out}
const motHTML=o=>`<div class="mot ${o.type}"><div class="motT">${o.type==='w'?'🎉 שבוע מלא!':`👑 חודש מושלם${o.label?' · '+esc(o.label):''}!`}</div><div class="motM">${esc(o.msg)}</div></div>`;
function showMotivation(out,where){const bar=$('#motBar');bar.innerHTML=out.map(motHTML).join('')+'<button class="motX" id="motX" aria-label="סגור">✕</button>';bar.hidden=false;$('#motX').onclick=()=>{bar.hidden=true};
  if(where==='report'&&!$('#sheet').hidden){const h=$('#sheet h2');if(h)h.insertAdjacentHTML('afterend',out.map(motHTML).join(''))}
  try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch{}}
// progress line + stored sentence inside weekly / monthly report
async function motReport(){const el=$('#repView');if(!el||el.hidden||!motAreas().length)return;const p=period(rp.type,rp.off);const st=(await metaGet('motivation'))||{w:{},m:{}};let h;
  if(rp.type==='week'){const w=weekStatus(p.a);h=`<div class="motp ${w.complete?'ok':''}"><b>אזורים שאומנו: <bdi dir="ltr">${w.done}/${w.total}</bdi></b>${w.complete?` 🎉 שבוע מלא!`:w.missing.length&&w.missing.length<=4?` <small>חסר: ${w.missing.map(esc).join(', ')}</small>`:''}${w.complete&&st.w[w.key]?`<div class="motM">${esc(st.w[w.key])}</div>`:''}</div>`}
  else{const d=new Date(p.a),ms=monthStatus(d.getFullYear(),d.getMonth());h=`<div class="motp ${ms.complete?'ok':''}"><b>שבועות מלאים: <bdi dir="ltr">${ms.full}/${ms.total}</bdi></b>${ms.complete?' 👑 חודש מושלם!':''}<div class="wkdots">${ms.weeks.map(w=>`<i class="${w.complete?'on':w.a>Date.now()?'fut':''}" title="${fdate(w.a)}"></i>`).join('')}</div>${ms.complete&&st.m[ms.key]?`<div class="motM">${esc(st.m[ms.key])}</div>`:''}</div>`}
  el.querySelectorAll('.motp').forEach(x=>x.remove());const anchor=el.querySelector('.stats3,h3.sec');anchor?anchor.insertAdjacentHTML('beforebegin',h):el.insertAdjacentHTML('beforeend',h)}
const _renderReports=renderReports;renderReports=function(){_renderReports();motReport()};
