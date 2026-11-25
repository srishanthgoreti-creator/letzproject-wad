(() => {
  const KEY = "pillping-carecircle-v1";
  const $ = (id) => document.getElementById(id);
  const todayKey = () => new Date().toISOString().slice(0,10);
  const nowTime = () => new Date().toTimeString().slice(0,5);
  const uid = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const seed = {
    activePatient: "p1",
    patients: [
      {id:"p1",name:"John Davis",age:72,relation:"Father",caregiver:"Sarah Davis",phone:"",medicines:[
        {id:"m1",name:"Amlodipine",dose:"5 mg · 1 tablet",time:"Morning",clock:"08:00",food:"After food",stock:12,photo:""},
        {id:"m2",name:"Metformin",dose:"500 mg · 1 tablet",time:"Morning",clock:"09:00",food:"With food",stock:18,photo:""},
        {id:"m3",name:"Aspirin",dose:"75 mg · 1 tablet",time:"Afternoon",clock:"13:00",food:"After food",stock:4,photo:""},
        {id:"m4",name:"Vitamin D",dose:"1 capsule",time:"Night",clock:"20:00",food:"After food",stock:20,photo:""}
      ]},
      {id:"p2",name:"Mary Wilson",age:68,relation:"Mother",caregiver:"David Wilson",phone:"",medicines:[
        {id:"m5",name:"Losartan",dose:"50 mg · 1 tablet",time:"Morning",clock:"08:30",food:"As prescribed",stock:3,photo:""},
        {id:"m6",name:"Metformin",dose:"500 mg · 1 tablet",time:"Morning",clock:"09:15",food:"With food",stock:15,photo:""},
        {id:"m7",name:"Calcium",dose:"1 tablet",time:"Afternoon",clock:"14:00",food:"After food",stock:22,photo:""},
        {id:"m8",name:"Atorvastatin",dose:"10 mg · 1 tablet",time:"Night",clock:"21:00",food:"As prescribed",stock:10,photo:""}
      ]}
    ],
    logs: []
  };
  // Create a small fictional 14-day history for the hackathon demonstration.
  for (let day = 14; day >= 1; day--) {
    const d = new Date(); d.setDate(d.getDate() - day);
    const date = d.toISOString().slice(0, 10);
    seed.patients.forEach((p, pi) => p.medicines.forEach((m, mi) => {
      const taken = (day + mi + pi) % 5 !== 0;
      seed.logs.push({
        patientId: p.id, medId: m.id, medName: m.name, date,
        status: taken ? "taken" : "missed",
        timestamp: date + (taken ? "T08:05:00.000Z" : "T08:45:00.000Z")
      });
    }));
  }
  function load(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(seed)}catch{return structuredClone(seed)}}
  let db = load(), activeFilter = "all", reminderId = null, toastTimer, searchTerm = "";
  function save(){localStorage.setItem(KEY,JSON.stringify(db));}
  function patient(){return db.patients.find(p=>p.id===db.activePatient)||db.patients[0]}
  function logFor(date, medId){return db.logs.find(l=>l.date===date&&l.medId===medId)}
  function statusFor(med){
    const log=logFor(todayKey(),med.id);
    if(log?.status==="taken")return "taken";
    if(log?.status==="snoozed")return "pending";
    if(log?.status==="missed")return "missed";
    return "pending";
  }
  function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2800)}
  function safe(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function weekStats(p){
    let taken=0,total=0,days=[];
    for(let n=6;n>=0;n--){const d=new Date();d.setDate(d.getDate()-n);const key=d.toISOString().slice(0,10);let dayTaken=0;
      p.medicines.forEach(m=>{total++;if(logFor(key,m.id)?.status==="taken"){taken++;dayTaken++}});
      days.push({label:d.toLocaleDateString("en",{weekday:"short"}).slice(0,1),taken:dayTaken,total:p.medicines.length});
    }
    return {taken,total,pct:total?Math.round(taken/total*100):0,days};
  }
  function render(){
    const p=patient(), stats=weekStats(p);
    $("greetingName").textContent=p.name.split(" ")[0];$("sidePatientName").textContent=p.name;
    $("patientSelect").innerHTML=db.patients.map(x=>`<option value="${x.id}" ${x.id===p.id?"selected":""}>${safe(x.name)}</option>`).join("");
    const done=p.medicines.filter(m=>statusFor(m)==="taken").length;
    const pending=p.medicines.length-done;
    $("completedCount").textContent=done;$("pendingCount").textContent=pending;$("weeklyPercent").textContent=stats.pct+"%";$("ringPercent").textContent=stats.pct+"%";
    $("progressRing").style.background=`conic-gradient(#4b9b76 ${stats.pct*3.6}deg,#edf1ed 0deg)`;
    $("weekBars").innerHTML=stats.days.map(d=>`<div class="week-day"><div class="bar-track"><div class="bar-fill" style="height:${d.total?d.taken/d.total*100:0}%"></div></div>${d.label}</div>`).join("");
    const meds=p.medicines.filter(m=>(activeFilter==="all"||m.time===activeFilter)&&(!searchTerm||m.name.toLowerCase().includes(searchTerm)||m.dose.toLowerCase().includes(searchTerm))).sort((a,b)=>a.clock.localeCompare(b.clock));
    $("medicineList").innerHTML=meds.map(m=>{
      const status=statusFor(m), log=logFor(todayKey(),m.id);
      return `<article class="medicine-card"><div class="med-icon">💊</div><div class="med-info"><strong>${safe(m.name)}</strong><p>${safe(m.dose)}</p><div class="med-meta"><span class="time-chip">◷ ${safe(m.clock)} · ${safe(m.time)}</span><span class="food-chip">${safe(m.food)}</span><span class="dose-status status-${status}">${status==="taken"?"✓ Taken":status==="missed"?"Missed":"Pending"}</span></div></div><div class="med-actions">${status!=="taken"?`<button class="small-action" data-remind="${m.id}">Remind me</button>`:""}<button class="small-action delete" data-edit="${m.id}">Edit</button></div></article>`;
    }).join("");
    $("emptyState").classList.toggle("hidden",meds.length>0);
    const hour=new Date().getHours();
    $("todayEyebrow").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}).toUpperCase()+" · YOUR HEALTH SPACE";
    $("dailyNudge").textContent=hour<12?"A fresh morning. Start with your first scheduled reminder.":hour<18?"You're moving through the day. Check what's next on your schedule.":"Wind down gently. Review your evening medicines when it's time.";
    const history=db.logs.filter(l=>l.patientId===p.id).sort((a,b)=>(b.timestamp||"").localeCompare(a.timestamp||"")).slice(0,8);
    $("historyList").innerHTML=history.length?history.map(l=>`<div class="history-item"><span>${safe(l.medName)} · ${safe(l.date)}</span><span>${l.status==="taken"?"✓ Taken":l.status==="missed"?"Missed":"Snoozed"} ${l.timestamp?"· "+safe(l.timestamp.slice(11,16)):""}</span></div>`).join(""):`<div class="muted">No intake records yet. Confirm a demo dose to see it here.</div>`;
  }
  function openModal(m){
    $("medicineForm").reset();$("medicineId").value=m?.id||"";$("modalTitle").textContent=m?"Edit medicine":"Add a medicine";
    $("medName").value=m?.name||"";$("medDose").value=m?.dose||"";$("medTime").value=m?.time||"Morning";$("medClock").value=m?.clock||"08:00";$("medFood").value=m?.food||"After food";$("medStock").value=m?.stock??14;$("photoPreview").innerHTML=m?.photo?`<img src="${m.photo}" alt="Medicine bottle preview">`:"";$("medicineModal").classList.remove("hidden");
  }
  function closeModal(){$("medicineModal").classList.add("hidden")}
  function recordDose(medId,status){
    const p=patient(),m=p.medicines.find(x=>x.id===medId);if(!m)return;
    const date=todayKey(),existing=logFor(date,medId);
    if(existing){existing.status=status;existing.timestamp=new Date().toISOString();existing.patientId=p.id;existing.medName=m.name;}
    else db.logs.push({patientId:p.id,medId,medName:m.name,date,status,timestamp:new Date().toISOString()});
    if(status==="taken"&&m.stock>0)m.stock--;
    save();render();closeReminder();toast(status==="taken"?"Dose confirmation saved. Caregiver view updated.":status==="missed"?"Dose marked for caregiver review.":"Reminder snoozed.");
    try{new BroadcastChannel("pillping-updates").postMessage({type:"update"})}catch{}
  }
  function showReminder(medId){
    const m=patient().medicines.find(x=>x.id===medId);if(!m)return;reminderId=medId;
    $("reminderMedicine").textContent=m.name+" · "+m.dose;$("reminderInstruction").textContent=`${m.clock} · ${m.food}. Please follow the instructions from your healthcare professional.`;
    $("reminderPhoto").innerHTML=m.photo?`<img src="${m.photo}" alt="Medicine bottle" style="max-width:90px;max-height:75px;border-radius:9px">`:"";
    $("reminderOverlay").classList.remove("hidden");
    try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=660;g.gain.value=.04;o.start();o.stop(a.currentTime+.18)}catch{}
    if("Notification"in window&&Notification.permission==="granted")new Notification("PillPing medicine reminder",{body:`Time for ${m.name} · ${m.dose}`});
  }
  function closeReminder(){$("reminderOverlay").classList.add("hidden");reminderId=null}
  function checkDue(){
    const p=patient(),now=nowTime();
    p.medicines.forEach(m=>{
      const log=logFor(todayKey(),m.id);
      if(!log&&m.clock<=now)showReminder(m.id);
      if(log?.status==="snoozed"&&log.snoozeUntil&&Date.now()>=log.snoozeUntil)showReminder(m.id);
      if(!log&&m.clock<now&&minutesBetween(m.clock,now)>=30){db.logs.push({patientId:p.id,medId:m.id,medName:m.name,date:todayKey(),status:"missed",timestamp:new Date().toISOString()});save();render();}
    });
  }
  function minutesBetween(a,b){const [ah,am]=a.split(":").map(Number),[bh,bm]=b.split(":").map(Number);return (bh*60+bm)-(ah*60+am)}
  $("patientSelect").addEventListener("change",e=>{db.activePatient=e.target.value;save();render()});
  $("medicineSearch").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLowerCase();render()});
  function applyPreferences(){document.body.classList.toggle("dark-mode",localStorage.getItem("pillping-theme")==="dark");document.body.classList.toggle("focus-mode",localStorage.getItem("pillping-focus")==="on");}
  $("themeToggle").addEventListener("click",()=>{const dark=!document.body.classList.contains("dark-mode");localStorage.setItem("pillping-theme",dark?"dark":"light");applyPreferences();$("themeToggle").textContent=dark?"☀":"☾"});
  $("focusToggle").addEventListener("click",()=>{const on=!document.body.classList.contains("focus-mode");localStorage.setItem("pillping-focus",on?"on":"off");applyPreferences();toast(on?"Focus mode enabled.":"Full dashboard restored.")});
  applyPreferences();if(localStorage.getItem("pillping-theme")==="dark")$("themeToggle").textContent="☀";
  $("addMedicineBtn").addEventListener("click",()=>openModal());
  $("closeModal").addEventListener("click",closeModal);$("cancelModal").addEventListener("click",closeModal);
  $("medicineModal").addEventListener("click",e=>{if(e.target===$("medicineModal"))closeModal()});
  $("medicineForm").addEventListener("submit",async e=>{
    e.preventDefault();const p=patient(),id=$("medicineId").value||uid();let old=p.medicines.find(m=>m.id===id);
    let photo=old?.photo||"";const file=$("medPhoto").files[0];
    if(file){if(file.size>1.5*1024*1024){toast("Please choose an image smaller than 1.5 MB.");return}photo=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(file)})}
    const m={id,name:$("medName").value.trim(),dose:$("medDose").value.trim(),time:$("medTime").value,clock:$("medClock").value,food:$("medFood").value,stock:Number($("medStock").value),photo};
    if(old)Object.assign(old,m);else p.medicines.push(m);save();closeModal();render();toast("Medicine details saved.");
  });
  $("medicineList").addEventListener("click",e=>{
    const remind=e.target.closest("[data-remind]"),edit=e.target.closest("[data-edit]");
    if(remind)showReminder(remind.dataset.remind);
    if(edit){const m=patient().medicines.find(x=>x.id===edit.dataset.edit);openModal(m)}
  });
  document.querySelectorAll(".filter-tab").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;document.querySelectorAll(".filter-tab").forEach(x=>x.classList.toggle("active",x===b));render()}));
  $("speakReminder").addEventListener("click",()=>{
    if (!("speechSynthesis" in window)) { toast("Voice read-aloud is not supported in this browser."); return; }
    const m=patient().medicines.find(x=>x.id===reminderId); if(!m)return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(`It is time for ${m.name}. Dosage: ${m.dose}. ${m.food}.`);
    utterance.rate=0.85; window.speechSynthesis.speak(utterance);
  });
  $("confirmDose").addEventListener("click",()=>reminderId&&recordDose(reminderId,"taken"));
  $("alreadyDose").addEventListener("click",()=>reminderId&&recordDose(reminderId,"taken"));
  $("snoozeDose").addEventListener("click",()=>{
    if(!reminderId)return;const id=reminderId,p=patient(),m=p.medicines.find(x=>x.id===id),date=todayKey(),existing=logFor(date,id);
    if(existing){existing.status="snoozed";existing.snoozeUntil=Date.now()+15*60*1000;existing.timestamp=new Date().toISOString()}
    else db.logs.push({patientId:p.id,medId:id,medName:m.name,date,status:"snoozed",snoozeUntil:Date.now()+15*60*1000,timestamp:new Date().toISOString()});
    save();closeReminder();render();toast("Reminder snoozed for 15 minutes.");
  });
  $("jumpToday").addEventListener("click",()=>$("today").scrollIntoView({behavior:"smooth"}));
  $("notifyBtn").addEventListener("click",async()=>{if(!("Notification"in window)){toast("This browser does not support notifications.");return}const p=await Notification.requestPermission();toast(p==="granted"?"Browser notifications enabled.":"Notification permission not granted.")});
  $("sosBtn").addEventListener("click",()=>{const p=patient();const number=p.phone||prompt("Enter the emergency contact phone number (include country code):");if(number){p.phone=number;save();location.href="tel:"+number.replace(/[^\d+]/g,"")}else toast("No emergency contact entered.")});
  window.addEventListener("storage",e=>{if(e.key===KEY){db=load();render()}});
  try{const bc=new BroadcastChannel("pillping-updates");bc.onmessage=()=>{db=load();render()}}catch{}
  render();setInterval(checkDue,15000);
})();