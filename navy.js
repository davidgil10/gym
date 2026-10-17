'use strict';
// ===== US Navy body-fat calculator =====
function navyBF(sex,h,neck,waist,hip){const L=Math.log10;
  if(sex==='f')return 495/(1.29579-0.35004*L(waist+hip-neck)+0.22100*L(h))-450;
  return 495/(1.0324-0.19077*L(waist-neck)+0.15456*L(h))-450}
function navyCat(sex,bf){const t=sex==='f'?[[14,'שומן חיוני'],[21,'ספורטאית'],[25,'כושר טוב'],[32,'ממוצע'],[999,'גבוה']]:[[6,'שומן חיוני'],[14,'ספורטאי'],[18,'כושר טוב'],[25,'ממוצע'],[999,'גבוה']];return t.find(x=>bf<x[0])[1]}
const navyMeasTxt=m=>`${m.sex==='f'?'אישה':'גבר'} · גובה ${fmt(m.h)} · צוואר ${fmt(m.neck)} · מותן ${fmt(m.waist)}${m.sex==='f'?` · ירכיים ${fmt(m.hip)}`:''} ס״מ`;
function openNavy(){const sex0=localStorage.getItem('navySex')||'m',h0=localStorage.getItem('navyH')||'';const last=sorted().filter(e=>e.m).slice(-1)[0];const lw=sorted().filter(e=>e.w!=null).slice(-1)[0];
  openSheet(`<h2>🧮 מחשבון אחוז שומן</h2>
  <div class="steps" id="nSex"><button data-x="m">גבר</button><button data-x="f">אישה</button></div>
  <label>גובה (ס״מ)</label><input type="number" id="nH" inputmode="decimal" step="0.5" value="${h0}">
  <label>היקף צוואר (ס״מ)</label><input type="number" id="nN" inputmode="decimal" step="0.5" value="${last?last.m.neck:''}">
  <label>היקף מותן בגובה הטבור (ס״מ)</label><input type="number" id="nW" inputmode="decimal" step="0.5" value="${last?last.m.waist:''}">
  <div id="nHipW"><label>היקף ירכיים במקום הרחב ביותר (ס״מ)</label><input type="number" id="nP" inputmode="decimal" step="0.5" value="${last&&last.m.hip?last.m.hip:''}"></div>
  <div class="navyres" id="nRes">מלא את המידות</div>
  <label>משקל נוכחי (ק״ג, לא חובה)</label><input type="number" id="nKg" inputmode="decimal" step="0.1" value="${lw?lw.w:''}" placeholder="לא חובה">
  <button class="btn pri" id="nSave" disabled>💾 שמור ביומן</button><button class="btn" id="nX">סגור</button>
  <details class="guide"><summary>📏 איך מודדים?</summary><ul>
   <li>מודדים בבוקר, לפני אוכל, עם סרט מדידה רך. הסרט צמוד לעור אבל לא לוחץ.</li>
   <li><b>צוואר:</b> מתחת לגרוגרת (תפוח אדם), סרט מעט משופע כלפי מטה לכיוון קדימה.</li>
   <li><b>מותן:</b> בגובה הטבור, בסוף נשיפה רגילה, בלי להכניס בטן.</li>
   <li><b>ירכיים (נשים):</b> בנקודה הרחבה ביותר של הישבן.</li>
   <li>מודדים 2–3 פעמים ולוקחים ממוצע. התוצאה היא הערכה (סטייה של כ־3%±).</li></ul></details>`);
  let sex=sex0;const num=id=>parseFloat(($('#'+id).value||'').replace(',','.'));
  const calc=()=>{$('#nSex').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.x===sex));$('#nHipW').hidden=sex!=='f';
    const h=num('nH'),n=num('nN'),w=num('nW'),p=num('nP');let err='';
    if(!(h>=120&&h<=230))err='גובה בין 120 ל־230 ס״מ';else if(!(n>=20&&n<=70))err='היקף צוואר בין 20 ל־70 ס״מ';else if(!(w>=40&&w<=200))err='היקף מותן בין 40 ל־200 ס״מ';
    else if(sex==='f'&&!(p>=50&&p<=200))err='היקף ירכיים בין 50 ל־200 ס״מ';else if(sex==='m'&&w<=n)err='המותן חייב להיות גדול מהצוואר';else if(sex==='f'&&w+p<=n)err='מידות לא הגיוניות';
    let bf=null;if(!err){bf=Math.round(navyBF(sex,h,n,w,p)*10)/10;if(!(bf>=2&&bf<=70)){err='התוצאה לא הגיונית — בדוק את המידות';bf=null}}
    $('#nRes').innerHTML=err?`<span class="muted">${(h||n||w)?err:'מלא את המידות'}</span>`:`<div class="bf">${fmt(bf)}%</div><div>${navyCat(sex,bf)}</div>`;
    $('#nSave').disabled=bf==null;return bf==null?null:{bf,m:{sex,h,neck:n,waist:w,...(sex==='f'?{hip:p}:{})}}};
  $('#nSex').querySelectorAll('button').forEach(b=>b.onclick=()=>{sex=b.dataset.x;localStorage.setItem('navySex',sex);calc()});
  ['nH','nN','nW','nP'].forEach(id=>$('#'+id).oninput=calc);calc();
  $('#nX').onclick=closeSheet;
  $('#nSave').onclick=async()=>{const r=calc();if(!r)return;localStorage.setItem('navyH',r.m.h);const kg=num('nKg');const w=kg>0&&kg<500?Math.round(kg*10)/10:null;
    const dup=body.find(x=>x.date===today());if(dup&&!confirm(`כבר יש רישום היום (${[dup.w!=null?fmt(dup.w)+' ק״ג':'',dup.f!=null?fmt(dup.f)+'%':''].filter(Boolean).join(' · ')}).\nלהחליף אותו?`))return;
    const before=structuredClone(body);if(dup)Object.assign(dup,{w:w!=null?w:dup.w,f:r.bf,m:r.m,t:Date.now()});else body.push({id:newId(),date:today(),w,f:r.bf,m:r.m,t:Date.now()});await saveBody();closeSheet();renderBody();
    toast(`נשמר ביומן: ${fmt(r.bf)}% שומן`,async()=>{body=before;await saveBody();renderBody()})}}
