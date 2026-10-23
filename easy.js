// --- ease data, easy hint, demo videos (easy3) ---
const VIDEO_KEYS=['bench-press','squat'];
const VIDEOS=Object.fromEntries(VIDEO_KEYS.map(k=>[k,`videos/${k}.mp4`]));
const tipsOf=m=>{const u=(m.tips||'').split('\n').map(x=>x.trim()).filter(Boolean);return u.length?u:(m.lib&&TIPS[m.lib])||[]};
function easyIn(list){const out={};for(const s of list){const rt=s.rates||{};for(const k in rt)if(rt[k]>0&&rt[k]<=2){const x=s.sets.find(y=>y.mid===k);out[k]=x?mName(x):k}}return Object.values(out)}
function easyHTML(list){const e=easyIn(list);return e.length?`<div class="easyp">🪶 <b>קלים מדי:</b> ${e.map(esc).join(', ')}<br><small class="muted">דורגו 1–2 מתוך 5 · כדאי להעלות משקל</small></div>`:''}
function lastRate(id){const all=[...sessions].sort((a,b)=>a.start-b.start);if(session)all.push(session);for(let i=all.length-1;i>=0;i--){const r=(all[i].rates||{})[id];if(r>0&&(all[i]!==session))return r;if(r>0&&all[i]===session)continue}return 0}
function easyHint(id){const m=allM.find(x=>x.id===id);if(!m||m.timed)return;const r=lastRate(id);if(!r||r>2)return;const sh=$('#sheet');if(!sh||sh.querySelector('.easyhint'))return;
  const st=stepOf(m),w=m.weight||0;const sug=m.bw?'':` <small>הצעה: <bdi dir="ltr">${fmt(w+1)}</bdi> ק״ג (+1) או <bdi dir="ltr">${fmt(w+2)}</bdi> ק״ג (+2)</small>`;
  const h=sh.querySelector('h2');const html=`<div class="easyhint">💡 דירגת קל בפעם הקודמת — מומלץ להוסיף משקל${sug}</div>`;
  const row=h&&h.closest('.row');(row||h)?(row||h).insertAdjacentHTML('afterend',html):sh.insertAdjacentHTML('afterbegin',html)}
{const _ol=openLog;openLog=function(id){const r=_ol.apply(this,arguments);easyHint(id);return r}}
{const _oe=openEdit;openEdit=function(id){const r=_oe.apply(this,arguments);easyHint(id);return r}}
{const _sh=sessionHTML;sessionHTML=function(s){return _sh(s)+easyHTML([s])}}
{const _st=sessionText;sessionText=function(s){const e=easyIn([s]);return _st(s)+(e.length?`\n🪶 קלים מדי: ${e.join(', ')}\n`:'')}}
{const _pt=periodText;periodText=function(){const e=easyIn(periodData().list);return _pt()+(e.length?`\n🪶 קלים מדי: ${e.join(', ')}\n`:'')}}
{const _rr=renderReports;renderReports=function(){const r=_rr.apply(this,arguments);const el=$('#repView');if(el){el.querySelectorAll('.easyp').forEach(x=>x.remove());const h=easyHTML(periodData().list);const b=$('#pShare');if(h&&b)b.insertAdjacentHTML('beforebegin',h)}return r}}
// long-press demo video
function openDemo(m){const v=VIDEOS[m.lib],tp=tipsOf(m),img=m.photo||(m.lib&&(LIBRARY.find(e=>e.key===m.lib)||{}).img);
  const media=v?`<video id="demoV" src="${v}" autoplay loop muted playsinline webkit-playsinline preload="auto" poster="${img||''}" style="width:100%;border-radius:14px;background:#000"></video>`:img?`<img id="demoI" src="${img}" alt="" style="width:100%;border-radius:14px;display:block">`:'<div class="ph" style="height:140px;border-radius:14px">🏋️</div>';
  openSheet(`<h2>🎬 ${esc(m.name)}</h2>${media}<h3 class="sec">✅ דגשים לביצוע נכון</h3>${tp.length?`<ul class="tips">${tp.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p class="muted small" id="noTips">עדיין אין דגשים לתרגיל הזה</p>'}${v?'':'<p class="muted small">🎬 סרטון הדגמה — בקרוב</p>'}<button class="btn" id="dmTips">✍️ ${m.tips?'ערוך':'הוסף'} דגשים משלי</button><button class="btn" id="dmX">סגור</button>`);
  $('#dmX').onclick=closeSheet;$('#dmTips').onclick=()=>openForm(m);
  if(!v)return;const el=$('#demoV');el.muted=true;const p=el.play();if(p&&p.catch)p.catch(()=>{});
  if('caches' in window)caches.keys().then(ks=>{const k=ks.find(x=>/^gym-[0-9a-f]+$/.test(x));if(k)caches.open(k).then(c=>c.match(v).then(r=>r||fetch(v).then(res=>{if(res.ok)c.put(v,res)}))).catch(()=>{})})}
{let lpT=null,lpX=0,lpY=0,lpFired=false;const g=$('#grid');
  const clear=()=>{clearTimeout(lpT);lpT=null};
  g.addEventListener('pointerdown',e=>{const c=e.target.closest('.card');if(!c)return;lpFired=false;lpX=e.clientX;lpY=e.clientY;clear();lpT=setTimeout(()=>{lpT=null;const m=allM.find(x=>x.id===c.dataset.id);if(!m)return;lpFired=true;navigator.vibrate&&navigator.vibrate(30);openDemo(m)},550)});
  g.addEventListener('pointermove',e=>{if(lpT&&Math.hypot(e.clientX-lpX,e.clientY-lpY)>10)clear()});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>g.addEventListener(ev,clear));
  g.addEventListener('contextmenu',e=>{if(e.target.closest('.card'))e.preventDefault()});
  g.addEventListener('click',e=>{if(lpFired&&e.target.closest('.card')){lpFired=false;e.stopImmediatePropagation();e.preventDefault()}},true)}

// one-time migration: custom 'גב תחתון' -> library back-extension (history kept: same id)
async function migBackExt(){if(await metaGet('beMigrated'))return;let ch=0;for(const m of allM)if(!m.lib&&(m.name||'').trim()==='גב תחתון'){m.name='פשיטת גב (היפראקסטנשן)';m.lib='back-extension';if(m.photo!=='img/back-extension.webp'){m.photoOld=m.photo||null;m.photo='img/back-extension.webp'}await put(m);ch++}
  await metaPut('beMigrated',Date.now());return ch}
(async()=>{for(let i=0;i<60&&!allM.length;i++)await new Promise(r=>setTimeout(r,100));try{if(await migBackExt())load()}catch(e){}})();
