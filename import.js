// ===== import: plan in memory -> confirm with summary -> apply atomically =====
const normName=s=>String(s||'').trim().replace(/\s+/g,' ');
function planImport(d){const list=Array.isArray(d)?d:d&&d.machines;if(!Array.isArray(list))throw new Error('bad');
  const libByName={};if(typeof LIBRARY!=='undefined')for(const e of LIBRARY)libByName[normName(e.name)]=e.key;
  // groups
  const G=structuredClone(groups),gMap={},newGroups=[];
  for(const g of (Array.isArray(d.groups)?d.groups:[])){if(!g||!g.id||!g.name)continue;
    const ex=G.find(x=>x.id===g.id)||G.find(x=>normName(x.name)===normName(g.name));
    if(ex)gMap[g.id]=ex.id;else{const n={id:g.id,name:String(g.name)};G.push(n);newGroups.push(n);gMap[g.id]=n.id}}
  const mapG=id=>id==null?id:(gMap[id]||(G.some(x=>x.id===id)?id:NONE));
  // machines
  const cur=new Map(machines.map(m=>[m.id,structuredClone(m)])),idMap={},touched=new Map();let added=0,merged=0,skipped=0;
  const lastT=h=>(h&&h.length)?Math.max(...h.map(x=>x.t||0)):0;
  for(const raw of list){if(!raw||!raw.id||!raw.name||typeof raw.weight!=='number'){skipped++;continue}
    const m=structuredClone(raw);m.history=Array.isArray(m.history)?m.history:[{t:m.updated||Date.now(),w:m.weight}];
    const lib=m.lib||libByName[normName(m.name)]||null;
    let ex=touched.get(idMap[m.id])||cur.get(m.id)||(lib&&[...cur.values()].find(x=>x.lib===lib||(!x.lib&&libByName[normName(x.name)]===lib)))||null;
    if(ex){const seen=new Set(ex.history.map(h=>h.t+'|'+h.w+'|'+(h.r??'')+'|'+(h.s??'')));const hist=[...ex.history,...m.history.filter(h=>!seen.has(h.t+'|'+h.w+'|'+(h.r??'')+'|'+(h.s??'')))].sort((a,b)=>a.t-b.t);
      const newer=lastT(m.history)>=lastT(ex.history)&&m.history.length;const base=newer?{...ex,...m}:{...m,...ex};
      const out={...base,id:ex.id,lib:ex.lib||lib||undefined,group:newer?mapG(m.group):ex.group,photo:m.photo||ex.photo,history:hist,created:ex.created||m.created};if(out.lib===undefined)delete out.lib;
      idMap[m.id]=ex.id;cur.set(ex.id,out);touched.set(ex.id,out);merged++}
    else{m.group=mapG(m.group);if(lib)m.lib=lib;idMap[m.id]=m.id;cur.set(m.id,m);touched.set(m.id,m);added++}}
  // sessions
  const ses=[];const have=new Set(sessions.map(s=>s.id));
  for(const s of (Array.isArray(d.sessions)?d.sessions:[])){if(!s||!s.id||!s.start||!Array.isArray(s.sets)||have.has(s.id))continue;have.add(s.id);
    const c=structuredClone(s);c.sets=c.sets.map(x=>({...x,mid:idMap[x.mid]||x.mid}));if(!c.end)c.end=c.start;delete c.plan;ses.push(c)}
  const bod=[];const hb=new Set(body.map(e=>e.id));
  for(const e of (Array.isArray(d.body)?d.body:[])){if(!e||!e.id||!e.date||hb.has(e.id))continue;if(e.w!=null&&!(e.w>0&&e.w<500))continue;if(e.f!=null&&!(e.f>0&&e.f<80))continue;hb.add(e.id);bod.push(structuredClone(e))}
  return {machines:[...touched.values()],groups:G,newGroups,sessions:ses,body:bod,added,merged,skipped}}
function applyImport(P){return new Promise((res,rej)=>{const t=db.transaction(['machines','meta'],'readwrite');const ms=t.objectStore('machines'),me=t.objectStore('meta');
  for(const m of P.machines)ms.put(m);me.put(P.groups,'groups');me.put([...sessions,...P.sessions],'sessions');me.put([...body,...P.body],'body');
  t.oncomplete=()=>{groups=P.groups;sessions=[...sessions,...P.sessions];body=[...body,...P.body];res()};t.onerror=t.onabort=()=>rej(t.error)})}
async function importBackup(f){let P;try{P=planImport(JSON.parse(await f.text()))}catch{alert('קובץ גיבוי לא תקין');return false}
  const sum=[`תרגילים: ${P.added} חדשים, ${P.merged} יעודכנו/ימוזגו${P.skipped?`, ${P.skipped} לא תקינים ידולגו`:''}`,`אימונים חדשים: ${P.sessions.length}`,`רישומי גוף חדשים: ${P.body.length}`,`קבוצות חדשות: ${P.newGroups.length}`].join('\n');
  if(!P.machines.length&&!P.sessions.length&&!P.body.length&&!P.newGroups.length){alert('אין בקובץ נתונים חדשים לייבוא');return false}
  if(!confirm('לייבא את הגיבוי?\n\n'+sum+'\n\nשום דבר לא יימחק.'))return false;
  try{await applyImport(P)}catch(e){alert('הייבוא נכשל – לא שונה דבר');return false}
  closeSheet();await load();renderBody();alert('הייבוא הושלם ✓\n'+sum);return true}
