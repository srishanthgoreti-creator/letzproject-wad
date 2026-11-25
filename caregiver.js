(() => {
  const KEY="pillping-carecircle-v1", $=id=>document.getElementById(id);
  const seedPatients=[
    {id:"p1",name:"John Davis",age:72,relation:"Father",caregiver:"Sarah Davis",medicines:[{id:"m1",name:"Amlodipine",dose:"5 mg · 1 tablet",time:"Morning",clock:"08:00",food:"After food",stock:12},{id:"m2",name:"Metformin",dose:"500 mg · 1 tablet",time:"Morning",clock:"09:00",food:"With food",stock:18},{id:"m3",name:"Aspirin",dose:"75 mg · 1 tablet",time:"Afternoon",clock:"13:00",food:"After food",stock:4},{id:"m4",name:"Vitamin D",dose:"1 capsule",time:"Night",clock:"20:00",food:"After food",stock:20}]},
    {id:"p2",name:"Mary Wilson",age:68,relation:"Mother",caregiver:"David Wilson",medicines:[{id:"m5",name:"Losartan",dose:"50 mg · 1 tablet",time:"Morning",clock:"08:30",food:"As prescribed",stock:3},{id:"m6",name:"Metformin",dose:"500 mg · 1 tablet",time:"Morning",clock:"09:15",food:"With food",stock:15},{id:"m7",name:"Calcium",dose:"1 tablet",time:"Afternoon",clock:"14:00",food:"After food",stock:22},{id:"m8",name:"Atorvastatin",dose:"10 mg · 1 tablet",time:"Night",clock:"21:00",food:"As prescribed",stock:10}]}
  ];
  function db(){try{return JSON.parse(localStorage.getItem(KEY))||{patients:seedPatients,logs:[]}}catch{return{patients:seedPatients,logs:[]}}}
  function today(){return new Date().toISOString().slice(0,10)}
  function safe(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function status(p,m){const l=data.logs.find(x=>x.patientId===p.id&&x.medId===m.id&&x.date===today());return l?.status==="taken"?"taken":l?.status==="missed"?"missed":"pending"}
  function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
  let data=db();
  function applyPreferences(){document.body.classList.toggle("dark-mode",localStorage.getItem("pillping-theme")==="dark");document.body.classList.toggle("focus-mode",localStorage.getItem("pillping-focus")==="on");}
  $("themeToggle").addEventListener("click",()=>{const dark=!document.body.classList.contains("dark-mode");localStorage.setItem("pillping-theme",dark?"dark":"light");applyPreferences();$("themeToggle").textContent=dark?"☀":"☾"});
  $("focusToggle").addEventListener("click",()=>{const on=!document.body.classList.contains("focus-mode");localStorage.setItem("pillping-focus",on?"on":"off");applyPreferences();toast(on?"Focus mode enabled.":"Full dashboard restored.")});
  applyPreferences();if(localStorage.getItem("pillping-theme")==="dark")$("themeToggle").textContent="☀";
  function render(){
    data=db();const meds=data.patients.flatMap(p=>p.medicines.map(m=>({p,m,s:status(p,m)})));
    const done=meds.filter(x=>x.s==="taken").length,pending=meds.filter(x=>x.s==="pending").length;
    const low=meds.filter(x=>x.m.stock<5).length,missed=meds.filter(x=>x.s==="missed").length;
    $("careCompleted").textContent=done;$("carePending").textContent=pending;$("careAlerts").textContent=low+missed;
    $("patientCards").innerHTML=data.patients.map(p=>{
      const pm=meds.filter(x=>x.p.id===p.id),taken=pm.filter(x=>x.s==="taken").length,pct=pm.length?Math.round(taken/pm.length*100):0;
      return `<article class="patient-card"><div class="patient-card-top"><strong>${safe(p.name)}</strong><span class="tiny-badge">${p.age} YEARS</span></div><p>${safe(p.relation)} · Caregiver: ${safe(p.caregiver)}</p><div class="mini-progress"><span style="width:${pct}%"></span></div><div class="patient-card-foot"><span>${taken}/${pm.length} doses confirmed today</span><strong>${pct}%</strong></div></article>`;
    }).join("");
    const alerts=[];
    meds.filter(x=>x.m.stock<5).forEach(x=>alerts.push({title:`Refill reminder: ${x.m.name}`,desc:`${x.p.name} has ${x.m.stock} doses remaining.`}));
    meds.filter(x=>x.s==="missed").forEach(x=>alerts.push({title:`Unconfirmed dose: ${x.m.name}`,desc:`${x.p.name} · scheduled at ${x.m.clock}.`}));
    $("alertList").innerHTML=alerts.length?alerts.map(a=>`<div class="alert-item"><span class="alert-icon">!</span><div><strong>${safe(a.title)}</strong><p>${safe(a.desc)}</p></div></div>`).join(""):`<div class="muted">No alerts right now. Keep checking in.</div>`;
    const logs=data.logs.slice().sort((a,b)=>(b.timestamp||"").localeCompare(a.timestamp||"")).slice(0,6);
    $("activityList").innerHTML=logs.length?logs.map(l=>`<div class="activity-item"><span class="alert-icon">${l.status==="taken"?"✓":"◷"}</span><div><strong>${safe(l.medName)} · ${l.status==="taken"?"Confirmed":"Needs review"}</strong><p>${safe(data.patients.find(p=>p.id===l.patientId)?.name||"Patient")} · ${safe(l.date)} ${l.timestamp?"at "+safe(l.timestamp.slice(11,16)):""}</p></div></div>`).join(""):`<div class="muted">Dose confirmations will appear here.</div>`;
    $("doseTable").innerHTML=meds.map(x=>`<tr><td>${safe(x.p.name)}</td><td>${safe(x.m.name)}</td><td>${safe(x.m.clock)} · ${safe(x.m.time)}</td><td><span class="dose-status status-${x.s}">${x.s==="taken"?"✓ Taken":x.s==="missed"?"Missed":"Pending"}</span></td><td class="${x.m.stock<5?"stock-low":""}">${x.m.stock} doses</td></tr>`).join("");
  }
  $("refreshCaregiver").addEventListener("click",()=>{render();toast("Dashboard refreshed.")});
  $("careExport").addEventListener("click",()=>{
    const rows=[["Patient","Medicine","Date","Scheduled time","Status","Remaining doses"]];
    data.patients.forEach(p=>p.medicines.forEach(m=>rows.push([p.name,m.name,today(),m.clock,status(p,m),m.stock])));
    const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pillping-dose-report.csv";a.click();URL.revokeObjectURL(url);toast("CSV report exported.");
  });
  window.addEventListener("storage",e=>{if(e.key===KEY)render()});
  try{const bc=new BroadcastChannel("pillping-updates");bc.onmessage=render}catch{}
  render();setInterval(render,5000);
})();