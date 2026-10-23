// --- ease data, easy hint, demo videos (easy3) ---
const VIDEOS={'bench-press':'videos/bench-press.mp4','squat':'videos/squat.mp4'};
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
function openDemo(m){const v=VIDEOS[m.lib];if(!v){toast('🎬 סרטון הדגמה — בקרוב');return}
  openSheet(`<h2>🎬 ${esc(m.name)}</h2><video id="demoV" src="${v}" autoplay loop muted playsinline webkit-playsinline preload="auto" style="width:100%;border-radius:14px;background:#000"></video><p class="muted small">הדגמת ביצוע נכון</p><button class="btn" id="dmX">סגור</button>`);
  const el=$('#demoV');el.muted=true;const p=el.play();if(p&&p.catch)p.catch(()=>{});$('#dmX').onclick=closeSheet;
  if('caches' in window)caches.keys().then(ks=>{const k=ks.find(x=>/^gym-[0-9a-f]+$/.test(x));if(k)caches.open(k).then(c=>c.match(v).then(r=>r||fetch(v).then(res=>{if(res.ok)c.put(v,res)}))).catch(()=>{})})}
{let lpT=null,lpX=0,lpY=0,lpFired=false;const g=$('#grid');
  const clear=()=>{clearTimeout(lpT);lpT=null};
  g.addEventListener('pointerdown',e=>{const c=e.target.closest('.card');if(!c)return;lpFired=false;lpX=e.clientX;lpY=e.clientY;clear();lpT=setTimeout(()=>{lpT=null;const m=allM.find(x=>x.id===c.dataset.id);if(!m)return;lpFired=true;navigator.vibrate&&navigator.vibrate(30);openDemo(m)},550)});
  g.addEventListener('pointermove',e=>{if(lpT&&Math.hypot(e.clientX-lpX,e.clientY-lpY)>10)clear()});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>g.addEventListener(ev,clear));
  g.addEventListener('contextmenu',e=>{if(e.target.closest('.card'))e.preventDefault()});
  g.addEventListener('click',e=>{if(lpFired&&e.target.closest('.card')){lpFired=false;e.stopImmediatePropagation();e.preventDefault()}},true)}
