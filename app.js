'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>(Math.round(n*100)/100).toString();
const fdate=t=>new Date(t).toLocaleDateString('he-IL',{day:'numeric',month:'numeric',year:'2-digit'});
let db;
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('gym',2);r.onupgradeneeded=e=>{const d=r.result;if(e.oldVersion<1)d.createObjectStore('machines',{keyPath:'id'});if(e.oldVersion<2)d.createObjectStore('meta')};r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}
const tx=(m,f)=>new Promise((res,rej)=>{const t=db.transaction('machines',m);const s=t.objectStore('machines');const r=f(s);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)});
const all=()=>tx('readonly',s=>s.getAll());const put=m=>tx('readwrite',s=>s.put(m));const del=id=>tx('readwrite',s=>s.delete(id));
let machines=[],groups=[],filter='all';
const NONE='none';const DEF=['חזה','גב','כתפיים','יד קדמית','יד אחורית','רגליים','בטן'];
const metaGet=k=>new Promise(res=>{const r=db.transaction('meta').objectStore('meta').get(k);r.onsuccess=()=>res(r.result)});
const metaPut=(k,v)=>new Promise(res=>{const t=db.transaction('meta','readwrite');t.objectStore('meta').put(v,k);t.oncomplete=res});
const gName=id=>(groups.find(g=>g.id===id)||{name:'ללא קטגוריה'}).name;
const newId=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+''+Math.random();
async function loadGroups(){groups=await metaGet('groups');if(!groups){groups=DEF.map((n,i)=>({id:'g'+(i+1),name:n}));await metaPut('groups',groups)}}
const saveGroups=()=>metaPut('groups',groups);
async function load(){machines=(await all()).sort((a,b)=>a.created-b.created);for(const m of machines)if(!m.group||!groups.some(g=>g.id===m.group))m.group=NONE;render()}
const sgn=n=>(n>0?'+':n<0?'−':'')+fmt(Math.abs(n));
const fromStart=m=>{const s0=m.history[0]?m.history[0].w:m.weight,d=m.weight-s0;if(!d)return'';const pc=s0?` (${sgn(d/s0*100).replace(/(\.\d)\d+/,'$1')}%)`:'';return `<span style="color:${d>0?'#4ade80':'#f87171'}"><bdi dir="ltr">${sgn(d)}</bdi> ק״ג מההתחלה <bdi dir="ltr">${pc.trim()}</bdi></span>`};
const card=m=>`<button class="card" data-id="${m.id}">${m.photo?`<img src="${m.photo}" alt="">`:'<div class="ph">🏋️</div>'}
  <div class="ov"><div class="w">${fmt(m.weight)} <small>ק״ג</small></div><div class="n">${esc(m.name)}</div><div class="d">${fromStart(m)}</div><div class="d">עודכן: ${fdate(m.updated)}</div></div></button>`;
function render(){
  if(filter!=='all'&&filter!==NONE&&!groups.some(g=>g.id===filter))filter='all';
  const hasNone=machines.some(m=>m.group===NONE);if(filter===NONE&&!hasNone)filter='all';
  const tabs=[{id:'all',name:'הכל'},...groups,...(hasNone?[{id:NONE,name:'ללא קטגוריה'}]:[])];
  $('#chips').innerHTML=tabs.map(t=>{const n=t.id==='all'?machines.length:machines.filter(m=>m.group===t.id).length;return `<button class="chip${t.id===filter?' on':''}" data-g="${t.id}">${esc(t.name)} <small>${n}</small></button>`}).join('')+'<button class="chip" id="mgGroups">⚙️ קבוצות</button>';
  $('#empty').hidden=machines.length>0||view!=='machines';
  if(filter==='all'){$('#grid').innerHTML=[...groups,{id:NONE,name:'ללא קטגוריה'}].map(g=>{const ms=machines.filter(m=>m.group===g.id);return ms.length?`<h3 class="sec">${esc(g.name)}</h3>`+ms.map(card).join(''):''}).join('')}
  else{const ms=machines.filter(m=>m.group===filter);$('#grid').innerHTML=ms.length?ms.map(card).join(''):'<p class="sec-empty">אין עדיין מכשירים בקבוצה הזו</p>'}
}
$('#chips').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;if(c.id==='mgGroups')return openGroups();filter=c.dataset.g;render();scrollTo(0,0)});
$('#grid').addEventListener('click',e=>{const c=e.target.closest('.card');if(c)openEdit(c.dataset.id)});
// image compress
function compress(file,max=900,q=.75){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{let{width:w,height:h}=img;const k=Math.min(1,max/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',q))};img.onerror=rej;img.src=u})}
// sheet
function openSheet(html){$('#toast').hidden=true;$('#sheet').innerHTML=html;$('#sheet').hidden=false;$('#sheetBg').hidden=false;$('#sheet').scrollTop=0}
function closeSheet(){$('#sheet').hidden=true;$('#sheetBg').hidden=true;$('#sheet').innerHTML=''}
$('#sheetBg').onclick=closeSheet;
function photoPicker(cur){return `<label>תמונה</label><div class="row"><button type="button" class="btn" id="camBtn">📷 צלם</button><button type="button" class="btn" id="galBtn">🖼️ מהגלריה</button></div>
<input type="file" id="cam" accept="image/*" capture="environment" hidden><input type="file" id="gal" accept="image/*" hidden><img id="prev" class="prev" ${cur?`src="${cur}"`:'hidden'} alt="">`}
function wirePhoto(state){$('#camBtn').onclick=()=>$('#cam').click();$('#galBtn').onclick=()=>$('#gal').click();
  for(const id of ['#cam','#gal'])$(id).onchange=async e=>{const f=e.target.files[0];if(!f)return;state.photo=await compress(f);$('#prev').src=state.photo;$('#prev').hidden=false}}
// add / edit details
function openForm(m){const st={photo:m?m.photo:null};
  openSheet(`<h2>${m?'עריכת מכשיר':'מכשיר חדש'}</h2>${photoPicker(st.photo)}
  <label>שם המכשיר</label><input type="text" id="fName" value="${m?esc(m.name):''}" placeholder="למשל: לחיצת חזה">
  <label>אזור בגוף</label><select id="fG">${groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}<option value="${NONE}">ללא קטגוריה</option></select>
  ${m?'':'<label>משקל התחלתי (ק״ג)</label><input type="number" id="fW" inputmode="decimal" step="0.5" min="0" value="10">'}
  <button class="btn pri" id="fSave">שמור</button>${m?'<button class="btn danger" id="fDel">🗑️ מחק מכשיר</button>':''}<button class="btn" id="fCancel">ביטול</button>`);
  $('#fG').value=m?m.group:(filter!=='all'?filter:(groups[0]||{id:NONE}).id);wirePhoto(st);$('#fCancel').onclick=m?()=>openEdit(m.id):closeSheet;
  $('#fSave').onclick=async()=>{const name=$('#fName').value.trim();if(!name){$('#fName').focus();return alert('צריך שם למכשיר')}
    const group=$('#fG').value;if(m){m.name=name;m.photo=st.photo;m.group=group;await put(m);await load();openEdit(m.id);return}
    const w=parseFloat($('#fW').value);if(!(w>=0))return alert('משקל לא תקין');const now=Date.now();
    await put({id:newId(),name,group,photo:st.photo,weight:w,step:2.5,created:now,updated:now,history:[{t:now,w}]});closeSheet();load()};
  if(m)$('#fDel').onclick=async()=>{if(confirm(`למחוק את "${m.name}" כולל כל ההיסטוריה? אי אפשר לבטל.`)){await del(m.id);closeSheet();load()}}}

// weight edit
function chart(h){if(h.length<2)return'';const W=300,H=90,p=10,ws=h.map(x=>x.w),mn=Math.min(...ws),mx=Math.max(...ws),r=mx-mn||1;
  const pts=h.map((x,i)=>[W-p-(i*(W-2*p)/(h.length-1)),H-p-((x.w-mn)/r)*(H-2*p)]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="#22c55e" stroke-width="3" points="${pts.map(q=>q.join(',')).join(' ')}"/>${pts.map(q=>`<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="#22c55e"/>`).join('')}</svg>`}
function openEdit(id){const m=machines.find(x=>x.id===id);if(!m)return closeSheet();let v=m.weight,step=m.step||2.5;
  const hist=[...m.history].reverse();
  openSheet(`<div class="row between"><h2>${esc(m.name)} <small class="gtag">${esc(gName(m.group))}</small></h2><button class="link" id="eDet">✏️ עריכה</button></div>
  <div class="big" id="eV"></div><div class="delta" id="eD"></div>
  <div class="row"><button class="pm" id="eMinus">−</button><button class="pm" id="ePlus">+</button></div>
  <div class="steps">${[1,2.5,5].map(s=>`<button data-s="${s}">קפיצה ${s}</button>`).join('')}</div>
  <button class="btn pri" id="eSave" disabled>שמור</button><button class="btn" id="eCancel">סגור בלי לשמור</button>
  <h2 style="margin-top:20px">התקדמות</h2><div class="delta">${fromStart(m)}</div>${chart(m.history)}
  <ul class="hist">${hist.map((x,i)=>{const prev=hist[i+1];const d=prev?x.w-prev.w:0;return `<li><span>${fdate(x.t)}</span><span>${fmt(x.w)} ק״ג ${d?`<small style="color:${d>0?'#22c55e':'#f87171'}">(${d>0?'+':''}${fmt(d)})</small>`:''}</span></li>`}).join('')}</ul>`);
  const upd=()=>{$('#eV').innerHTML=`${fmt(v)} <small>ק״ג</small>`;const d=v-m.weight;$('#eD').textContent=d?`${d>0?'+':''}${fmt(d)} מהמשקל השמור — לחץ "שמור" כדי לעדכן`:'';$('#eSave').disabled=!d;
    document.querySelectorAll('.steps button').forEach(b=>b.classList.toggle('on',+b.dataset.s===step))};upd();
  document.querySelectorAll('.steps button').forEach(b=>b.onclick=()=>{step=+b.dataset.s;upd()});
  $('#ePlus').onclick=()=>{v=Math.round((v+step)*100)/100;upd()};$('#eMinus').onclick=()=>{v=Math.max(0,Math.round((v-step)*100)/100);upd()};
  $('#eCancel').onclick=closeSheet;$('#eDet').onclick=()=>openForm(m);
  $('#eSave').onclick=async()=>{const before=structuredClone(m);const now=Date.now();m.weight=v;m.step=step;m.updated=now;m.history.push({t:now,w:v});await put(m);closeSheet();await load();
    toast(`${m.name}: ${fmt(v)} ק״ג נשמר`,async()=>{await put(before);await load()})}}
let tt;function toast(msg,undo){$('#toastMsg').textContent=msg;$('#toast').hidden=false;clearTimeout(tt);
  $('#undoBtn').onclick=async()=>{$('#toast').hidden=true;await undo()};tt=setTimeout(()=>$('#toast').hidden=true,6000)}
// menu: backup
$('#menuBtn').onclick=()=>{openSheet(`<h2>גיבוי</h2><p style="opacity:.8;font-size:14px">הנתונים שמורים רק בטלפון הזה. מומלץ לייצא גיבוי מדי פעם.</p>
  <button class="btn" id="mExp">⬇️ ייצוא גיבוי (JSON)</button><button class="btn" id="mImp">⬆️ ייבוא גיבוי</button><button class="btn" id="mClose">סגור</button>`);
  $('#mClose').onclick=closeSheet;
  $('#mExp').onclick=()=>{const b=new Blob([JSON.stringify({app:'gym-weights',v:2,exported:Date.now(),groups,machines,body},null,1)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`gym-backup-${new Date().toISOString().slice(0,10)}.json`;a.click()};
  $('#mImp').onclick=()=>$('#importFile').click()};
$('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());const list=d.machines||d;if(!Array.isArray(list))throw 0;
  if(Array.isArray(d.body))for(const e of d.body){if(e&&e.id&&e.date&&!body.some(x=>x.id===e.id))body.push(e)}
  if(Array.isArray(d.groups))for(const g of d.groups){if(g&&g.id&&g.name&&!groups.some(x=>x.id===g.id))groups.push({id:g.id,name:g.name})}
  if(!confirm(`לייבא ${list.length} מכשירים? מכשירים קיימים עם אותו מזהה יוחלפו.`))return;
  for(const m of list){if(!m.id||!m.name||typeof m.weight!=='number')continue;m.history=m.history||[{t:m.updated||Date.now(),w:m.weight}];await put(m)}await saveGroups();await saveBody();closeSheet();renderBody();load();alert('הייבוא הושלם')}catch{alert('קובץ גיבוי לא תקין')}e.target.value=''};
function openGroups(){openSheet(`<h2>קבוצות שרירים</h2><ul class="hist">${groups.map(g=>`<li><span>${esc(g.name)} <small>(${machines.filter(m=>m.group===g.id).length})</small></span><span><button class="link" data-ren="${g.id}">✏️ שנה שם</button><button class="link" data-del="${g.id}" style="color:#f87171">🗑️ מחק</button></span></li>`).join('')}</ul>
  <label>קבוצה חדשה</label><div class="row"><input type="text" id="gNew" placeholder="למשל: ישבן"><button class="btn pri" id="gAdd" style="width:auto;margin:0">הוסף</button></div><button class="btn" id="gClose">סגור</button>`);
  $('#gClose').onclick=closeSheet;
  $('#gAdd').onclick=async()=>{const n=$('#gNew').value.trim();if(!n)return;if(groups.some(g=>g.name===n))return alert('קבוצה בשם הזה כבר קיימת');groups.push({id:newId(),name:n});await saveGroups();render();openGroups()};
  $('#sheet').querySelectorAll('[data-ren]').forEach(b=>b.onclick=async()=>{const g=groups.find(x=>x.id===b.dataset.ren);const n=(prompt('שם חדש לקבוצה:',g.name)||'').trim();if(!n||n===g.name)return;g.name=n;await saveGroups();render();openGroups()});
  $('#sheet').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const g=groups.find(x=>x.id===b.dataset.del);const ms=machines.filter(m=>m.group===g.id);
    if(!confirm(`למחוק את הקבוצה "${g.name}"?`+(ms.length?` ${ms.length} מכשירים יעברו ל"ללא קטגוריה".`:'')))return;
    for(const m of ms){m.group=NONE;await put(m)}groups=groups.filter(x=>x!==g);await saveGroups();await load();openGroups()})}
// ===== body tracking =====
let body=[],view='machines';
const saveBody=()=>metaPut('body',body);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const fd=s=>{const[y,m,d]=s.split('-');return `${+d}.${+m}.${y.slice(2)}`};
const sorted=()=>[...body].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.t-b.t);
const r1=n=>Math.round(n*10)/10;
function chg(d,unit,base){if(d==null)return'';d=r1(d);const col=d<0?'#4ade80':d>0?'#f87171':'#94a3b8';let t=`<bdi dir="ltr">${sgn(d)}${unit==='%'?'%':''}</bdi>${unit==='%'?'':unit}`;if(base)t+=` <bdi dir="ltr">(${sgn(r1(d/base*100))}%)</bdi>`;return `<span style="color:${col}">${t}</span>`}
function series(k){return sorted().filter(e=>e[k]!=null)}
function lineChart(pts,col){if(pts.length<2)return'<p class="sec-empty" style="font-size:13px">הגרף יופיע אחרי 2 רישומים</p>';const W=300,H=90,p=10,v=pts.map(x=>x.v),mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;
  const P=pts.map((x,i)=>[W-p-i*(W-2*p)/(pts.length-1),H-p-(x.v-mn)/r*(H-2*p)]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="${col}" stroke-width="3" points="${P.map(q=>q.join(',')).join(' ')}"/>${P.map(q=>`<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="${col}"/>`).join('')}</svg><div class="row between" style="font-size:12px;opacity:.7"><span>${fd(pts[0].d)}</span><span>${fd(pts[pts.length-1].d)}</span></div>`}
function statBox(k,unit,title,pctOfStart){const s=series(k);if(!s.length)return `<div class="stat"><div class="st">${title}</div><div class="sv">—</div></div>`;
  const cur=s[s.length-1][k],first=s[0][k],prev=s.length>1?s[s.length-2][k]:null;
  return `<div class="stat"><div class="st">${title}</div><div class="sv">${fmt(cur)}<small>${unit}</small></div>
  ${s.length>1?`<div class="sc">מההתחלה: ${chg(cur-first,unit,pctOfStart?first:0)}</div><div class="sc">מהקודם: ${chg(cur-prev,unit,0)}</div>`:'<div class="sc">רישום ראשון</div>'}</div>`}
function renderBody(){const el=$('#bodyView');const s=sorted().reverse();
  el.innerHTML=`<div class="stats">${statBox('w',' ק״ג','משקל גוף',true)}${statBox('f','%','אחוז שומן',false)}</div>
  <h3 class="sec">משקל גוף</h3>${lineChart(series('w').map(e=>({v:e.w,d:e.date})),'#60a5fa')}
  <h3 class="sec">אחוז שומן</h3>${lineChart(series('f').map(e=>({v:e.f,d:e.date})),'#f59e0b')}
  <h3 class="sec">היסטוריה</h3>${s.length?`<ul class="hist">${s.map(e=>`<li><span>${fd(e.date)}</span><span>${e.w!=null?fmt(e.w)+' ק״ג':''}${e.w!=null&&e.f!=null?' · ':''}${e.f!=null?fmt(e.f)+'%':''}</span><button class="link" data-be="${e.id}">✏️</button></li>`).join('')}</ul>`:'<p class="sec-empty">עוד אין רישומים. לחץ על ＋ כדי לרשום משקל ואחוז שומן.</p>'}`;
  el.querySelectorAll('[data-be]').forEach(b=>b.onclick=()=>openBody(body.find(x=>x.id===b.dataset.be)))}
function stepper(id,label,val,unit){return `<label>${label}</label><div class="row"><button class="pm sm" data-st="${id}" data-d="-0.1">−</button><input type="number" id="${id}" inputmode="decimal" step="0.1" min="0" value="${val??''}" placeholder="לא חובה" style="text-align:center"><button class="pm sm" data-st="${id}" data-d="0.1">+</button></div>`}
function openBody(e){const last=sorted().slice(-1)[0]||{};
  openSheet(`<h2>${e?'עריכת רישום':'רישום חדש'}</h2><label>תאריך</label><input type="date" id="bD" value="${e?e.date:today()}" max="${today()}">
  ${stepper('bW','משקל גוף (ק״ג)',e?e.w:last.w,'ק״ג')}${stepper('bF','אחוז שומן (%)',e?e.f:last.f,'%')}
  <button class="btn pri" id="bSave">שמור</button>${e?'<button class="btn danger" id="bDel">🗑️ מחק רישום</button>':''}<button class="btn" id="bCancel">ביטול</button>`);
  $('#sheet').querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{const i=$('#'+b.dataset.st);i.value=Math.max(0,r1((parseFloat(i.value)||0)+ +b.dataset.d)).toFixed(1)});
  $('#bCancel').onclick=closeSheet;
  $('#bSave').onclick=async()=>{const num=id=>{const v=$('#'+id).value.trim();return v===''?null:r1(parseFloat(v))};const w=num('bW'),f=num('bF'),date=$('#bD').value||today();
    if(w==null&&f==null)return alert('צריך למלא משקל או אחוז שומן');if((w!=null&&!(w>0&&w<500))||(f!=null&&!(f>0&&f<80)))return alert('ערך לא תקין');
    const before=structuredClone(body);if(e)Object.assign(e,{date,w,f});else body.push({id:newId(),date,w,f,t:Date.now()});
    await saveBody();closeSheet();renderBody();toast(e?'הרישום עודכן':'הרישום נשמר',async()=>{body=before;await saveBody();renderBody()})};
  if(e)$('#bDel').onclick=async()=>{if(!confirm(`למחוק את הרישום מ-${fd(e.date)}?`))return;const before=structuredClone(body);body=body.filter(x=>x!==e);await saveBody();closeSheet();renderBody();toast('הרישום נמחק',async()=>{body=before;await saveBody();renderBody()})}}
function setView(v){view=v;document.querySelectorAll('.vt').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  $('#chips').hidden=$('#grid').hidden=v!=='machines';$('#empty').hidden=v!=='machines'||machines.length>0;$('#bodyView').hidden=v!=='body';if(v==='body')renderBody();scrollTo(0,0)}
document.querySelectorAll('.vt').forEach(b=>b.onclick=()=>setView(b.dataset.v));
$('#addBtn').onclick=()=>view==='body'?openBody(null):openForm(null);
openDB().then(loadGroups).then(async()=>{body=(await metaGet('body'))||[]}).then(load).then(()=>setView('machines'));
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
