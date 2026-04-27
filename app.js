let trendChart,statusChart,bpChart,vitalDetailChart;
let activeVitalTab = "bp";

const statusClass=s=>!s?"status-unknown":"status-"+String(s).toLowerCase().replace(/\s+/g,"-");
const statusColor=s=>s==="High"?"#e84c4f":s==="Low"||s==="Overweight"?"#f4a340":s==="Good"||s==="Normal"?"#16a06b":"#87928f";
const cellColor=s=>s==="High"?"#ffd8d8":s==="Low"||s==="Overweight"?"#ffe3b8":s==="Good"||s==="Normal"?"#ccf4dc":"#eee";
const score=s=>s==="High"||s==="Overweight"?3:s==="Good"||s==="Normal"?2:s==="Low"?1:0;

function patientsForDoctor(){
  const doc = doctorSelect.value;
  let rows = READINGS;
  if(doc && doc !== "All") rows = READINGS.filter(d=>d.doctor===doc);
  return [...new Set(rows.map(d=>d.patientName))].sort();
}

function initFilters(){
  const doctors=["All",...[...new Set(READINGS.map(d=>d.doctor))].sort()];
  doctorSelect.innerHTML=doctors.map(x=>`<option>${x}</option>`).join("");
  refreshPatientOptions();
  refreshDateOptions();
}

function refreshPatientOptions(){
  const current = patientSelect.value;
  const p=patientsForDoctor();
  patientSelect.innerHTML=p.map(x=>`<option>${x}</option>`).join("");
  if(p.includes(current)) patientSelect.value=current;
}

function refreshDateOptions(){
  const dates=["Latest",...[...new Set(READINGS.map(d=>d.date))].sort()];
  const current = dateSelect.value;
  dateSelect.innerHTML=dates.map(x=>`<option>${x}</option>`).join("");
  if(dates.includes(current)) dateSelect.value=current;
}

function filteredRows(){
  const p=patientSelect.value;
  let rows=READINGS.filter(d=>d.patientName===p);
  if(doctorSelect.value!=="All") rows=rows.filter(d=>d.doctor===doctorSelect.value);
  if(dateSelect.value!=="Latest") rows=rows.filter(d=>d.date===dateSelect.value);
  return rows.sort((a,b)=>new Date(a.dateTime)-new Date(b.dateTime));
}
function latestRow(){const rows=filteredRows();return rows[rows.length-1]||{}}
function setCard(id,valueId,statusId,value,status){const card=document.getElementById(id);card.className="card status-card "+statusClass(status);document.getElementById(valueId).textContent=value??"--";document.getElementById(statusId).textContent=status??"Unknown"}
function updateCards(){
  const r=latestRow();
  const bp=r.systolic&&r.diastolic?`${Math.round(r.systolic)}/${Math.round(r.diastolic)}`:"--";
  const bpStatus=r.systolicStatus==="High"||r.diastolicStatus==="High"?"High":"Normal";
  setCard("glucoseCard","glucoseValue","glucoseStatus",r.glucose?Math.round(r.glucose):"--",r.glucoseStatus);
  setCard("pulseCard","pulseValue","pulseStatus",r.pulse?Math.round(r.pulse):"--",r.pulseStatus);
  setCard("bpCard","bpValue","bpStatus",bp,bpStatus);
  setCard("tempCard","tempValue","tempStatus",r.temperature?Number(r.temperature).toFixed(1)+"°F":"--",r.temperatureStatus);
  setCard("bmiCard","bmiValue","bmiStatus",r.bmi?Number(r.bmi).toFixed(1):"--",r.bmiStatus);
  lastUpdated.textContent=r.dateTime?`Latest: ${r.dateTime}`:"Live Monitor";
}
function makeTrend(){
  const rows=filteredRows(),vital=vitalTrendSelect.value,labels=rows.map(d=>d.dateTime.slice(5)),data=rows.map(d=>d[vital]);
  if(trendChart)trendChart.destroy();
  trendChart=new Chart(document.getElementById("trendChart"),{type:"line",data:{labels,datasets:[{label:vital,data,borderColor:"#16a06b",backgroundColor:"rgba(22,160,107,.12)",fill:true,tension:.35,pointRadius:1}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{maxTicksLimit:10}},y:{beginAtZero:false}},plugins:{legend:{display:false}}}});
}
function makeStatus(){
  const rows=filteredRows(),statuses=[];
  ["glucoseStatus","pulseStatus","temperatureStatus","bmiStatus","systolicStatus","diastolicStatus","spo2Status","respirationStatus"].forEach(k=>rows.forEach(r=>statuses.push(r[k]||"Unknown")));
  const counts={};statuses.forEach(s=>counts[s]=(counts[s]||0)+1);
  const labels=Object.keys(counts);
  if(statusChart)statusChart.destroy();
  statusChart=new Chart(document.getElementById("statusChart"),{type:"doughnut",data:{labels,datasets:[{data:labels.map(l=>counts[l]),backgroundColor:labels.map(statusColor),borderWidth:0}]},options:{cutout:"68%",plugins:{legend:{position:"bottom"}}}});
}
function updateSnapshot(){
  const doc = doctorSelect.value;
  let base = READINGS;
  if(doc !== "All") base = base.filter(d=>d.doctor===doc);
  const latestByPatient=[...new Set(base.map(d=>d.patientName))].map(p=>{const rows=base.filter(d=>d.patientName===p).sort((a,b)=>new Date(a.dateTime)-new Date(b.dateTime));return rows[rows.length-1]}).filter(Boolean);
  snapshotTable.innerHTML=`<thead><tr><th>Patient</th><th>Doctor</th><th>Glucose</th><th>Pulse</th><th>BP</th><th>Temp</th><th>BMI</th><th>Updated</th></tr></thead><tbody>`+latestByPatient.map(r=>{const bp=`${Math.round(r.systolic||0)}/${Math.round(r.diastolic||0)}`;return `<tr><td>${r.patientName}</td><td>${r.doctor}</td><td><span class="badge ${r.glucoseStatus}">${Math.round(r.glucose||0)} ${r.glucoseStatus}</span></td><td><span class="badge ${r.pulseStatus}">${Math.round(r.pulse||0)} ${r.pulseStatus}</span></td><td>${bp}</td><td><span class="badge ${r.temperatureStatus}">${Number(r.temperature||0).toFixed(1)}</span></td><td><span class="badge ${r.bmiStatus}">${Number(r.bmi||0).toFixed(1)} ${r.bmiStatus}</span></td><td>${r.dateTime}</td></tr>`}).join("")+`</tbody>`;
}
function updateProfile(){
  const p=patientSelect.value;
  const patientObj=PATIENTS.find(x=>x.PatientName===p)||{};
  const r=latestRow();
  const fields=[
    ["Patient Name",p],["Patient ID",r.patientId||patientObj.PatientID||"--"],["Doctor",r.doctor||patientObj.Doctor||"--"],
    ["Address",patientObj["Address"]||"--"],["Primary Phone #",patientObj["Primary Phone #"]||"--"],
    ["Next Of Kin Name & Phone #",patientObj["Next Of Kin Name & Phone #"]||"--"],["DOB",patientObj["DOB"]||"--"],
    ["Primary Diagnosis",patientObj["Primary Diagnosis"]||"--"],["Nearest Health Care Center",patientObj["Nearest Health Care Center"]||"--"],
    ["Insurance Provider",patientObj["Insurance Provider"]||"--"],["Latest Reading",r.dateTime||"--"]
  ];
  patientProfile.innerHTML=fields.map(([k,v])=>`<div><small>${k}</small><strong>${v||"--"}</strong></div>`).join("");
}
function makeBPChart(){
  const rows=filteredRows(),labels=rows.map(d=>d.dateTime.slice(5));
  if(bpChart)bpChart.destroy();
  bpChart=new Chart(document.getElementById("bpChart"),{type:"line",data:{labels,datasets:[{label:"Systolic",data:rows.map(d=>d.systolic),borderColor:"#e84c4f",tension:.35,pointRadius:1},{label:"Diastolic",data:rows.map(d=>d.diastolic),borderColor:"#0b1f70",tension:.35,pointRadius:1}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{maxTicksLimit:10}}}}});
}
function updateHistory(){
  const rows=filteredRows().slice(-48).reverse();
  historyTable.innerHTML=`<thead><tr><th>Date Time</th><th>Glucose</th><th>Pulse</th><th>BP</th><th>Temp</th><th>BMI</th><th>SpO2</th><th>Resp.</th></tr></thead><tbody>`+rows.map(r=>`<tr><td>${r.dateTime}</td><td>${Math.round(r.glucose||0)} <span class="badge ${r.glucoseStatus}">${r.glucoseStatus}</span></td><td>${Math.round(r.pulse||0)} <span class="badge ${r.pulseStatus}">${r.pulseStatus}</span></td><td>${Math.round(r.systolic||0)}/${Math.round(r.diastolic||0)}</td><td>${Number(r.temperature||0).toFixed(1)} <span class="badge ${r.temperatureStatus}">${r.temperatureStatus}</span></td><td>${Number(r.bmi||0).toFixed(1)} <span class="badge ${r.bmiStatus}">${r.bmiStatus}</span></td><td>${Math.round(r.spo2||0)}</td><td>${Math.round(r.respiration||0)}</td></tr>`).join("")+`</tbody>`;
}
function updateHeatmap(){
  const selectedDate=dateSelect.value==="Latest"?[...new Set(READINGS.map(d=>d.date))].sort().pop():dateSelect.value;
  const doc = doctorSelect.value;
  let base = READINGS;
  if(doc !== "All") base = base.filter(d=>d.doctor===doc);
  const patientNames=[...new Set(base.map(d=>d.patientName))].sort();
  let html=`<div class="heat-head">Patient</div>`+Array.from({length:24},(_,h)=>`<div class="heat-head">${String(h).padStart(2,"0")}</div>`).join("");
  patientNames.forEach(p=>{html+=`<div class="heat-name">${p}</div>`;for(let h=0;h<24;h++){const r=base.find(d=>d.patientName===p&&d.date===selectedDate&&d.hour===h),worst=r?Math.max(score(r.glucoseStatus),score(r.pulseStatus),score(r.temperatureStatus),score(r.bmiStatus),score(r.systolicStatus),score(r.diastolicStatus)):0,color=worst===3?"#e84c4f":worst===2?"#16a06b":worst===1?"#f4a340":"#87928f";html+=`<div class="heat-cell" style="background:${color}" title="${p} ${h}:00">${worst||"-"}</div>`}});heatmap.innerHTML=html;
}
function valueStatusForVital(row,vital){
  if(!row) return {value:"--",status:"Unknown",min:0,max:100,unit:""};
  const map={glucose:{value:row.glucose,status:row.glucoseStatus,min:50,max:250,unit:"mg/dL",label:"Glucose"},pulse:{value:row.pulse,status:row.pulseStatus,min:40,max:140,unit:"bpm",label:"Pulse"},temperature:{value:row.temperature,status:row.temperatureStatus,min:95,max:104,unit:"°F",label:"Temperature"},bmi:{value:row.bmi,status:row.bmiStatus,min:15,max:40,unit:"BMI",label:"Weight / BMI"},spo2:{value:row.spo2,status:row.spo2Status,min:85,max:100,unit:"%",label:"SpO2"},systolic:{value:row.systolic,status:row.systolicStatus,min:80,max:180,unit:"mmHg",label:"Systolic"},diastolic:{value:row.diastolic,status:row.diastolicStatus,min:50,max:120,unit:"mmHg",label:"Diastolic"}};
  return map[vital];
}
function pointerPct(value,min,max){if(value===undefined||value===null||isNaN(value))return 0;return Math.max(0,Math.min(100,((Number(value)-min)/(max-min))*100));}
function makeRangeRow(label,value,status,min,max,unit){const pct=pointerPct(value,min,max);return `<div class="range-row"><div class="range-label"><span>${label}</span><span>${value??"--"} ${unit} • ${status??"Unknown"}</span></div><div class="range-bar"><div class="range-pointer" style="left:${pct}%"></div></div><div class="range-ticks"><span>${min}</span><span>${Math.round((min+max)/2)}</span><span>${max}</span></div></div>`}
function renderVitalsDetail(){
  const rows=filteredRows(),latest=rows[rows.length-1]||{},patientName=patientSelect.value;
  const vitalLabels={bp:"Blood Pressure",pulse:"Pulse",bmi:"Weight / BMI",spo2:"SpO2",glucose:"Glucose",temperature:"Temperature"};
  vitalsPatientTitle.textContent=`Patient: ${patientName}`;
  detailPatientLabel.textContent=`PATIENT: ${String(patientName).toUpperCase()}`;
  trackerTitle.textContent=vitalLabels[activeVitalTab];
  let summary="",gauge="",chartDatasets=[],labels=rows.map(r=>r.dateTime.slice(5));
  if(activeVitalTab==="bp"){
    const s=valueStatusForVital(latest,"systolic"),d=valueStatusForVital(latest,"diastolic");
    summary=`<div class="summary-chip"><small>Latest BP</small><strong>${Math.round(s.value||0)}/${Math.round(d.value||0)}</strong></div><div class="summary-chip"><small>Systolic</small><strong>${s.status}</strong></div><div class="summary-chip"><small>Diastolic</small><strong>${d.status}</strong></div>`;
    gauge=makeRangeRow("Systolic",s.value,s.status,s.min,s.max,s.unit)+makeRangeRow("Diastolic",d.value,d.status,d.min,d.max,d.unit);
    chartDatasets=[{label:"Systolic",data:rows.map(r=>r.systolic),borderColor:"#e84c4f",tension:.35,pointRadius:1},{label:"Diastolic",data:rows.map(r=>r.diastolic),borderColor:"#0b1f70",tension:.35,pointRadius:1}];
  } else {
    const selected=valueStatusForVital(latest,activeVitalTab);
    summary=`<div class="summary-chip"><small>Latest ${selected.label}</small><strong>${selected.value??"--"} ${selected.unit}</strong></div><div class="summary-chip"><small>Status</small><strong>${selected.status}</strong></div><div class="summary-chip"><small>Last Updated</small><strong>${latest.dateTime||"--"}</strong></div>`;
    gauge=makeRangeRow(selected.label,selected.value,selected.status,selected.min,selected.max,selected.unit);
    chartDatasets=[{label:selected.label,data:rows.map(r=>r[activeVitalTab]),borderColor:"#0b1f70",backgroundColor:"rgba(11,31,112,.1)",fill:true,tension:.35,pointRadius:1}];
  }
  trackerSummary.innerHTML=summary;
  trackerGaugeArea.innerHTML=gauge;
  trackerChartTitle.textContent=`${vitalLabels[activeVitalTab]} Hourly Trend`;
  if(vitalDetailChart)vitalDetailChart.destroy();
  vitalDetailChart=new Chart(document.getElementById("vitalDetailChart"),{type:"line",data:{labels,datasets:chartDatasets},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{maxTicksLimit:10}},y:{beginAtZero:false}}}});
  renderDailyReadingGrid(rows);
}
function renderDailyReadingGrid(rows){
  const last14Dates=[...new Set(rows.map(r=>r.date))].slice(-14);
  let cells=[];
  last14Dates.forEach((date,idx)=>{
    const dayRows=rows.filter(r=>r.date===date);
    const r=dayRows[dayRows.length-1];
    if(!r)return;
    let s,val;
    if(activeVitalTab==="bp"){s=r.systolicStatus==="High"||r.diastolicStatus==="High"?"High":"Normal";val=`${Math.round(r.systolic||0)}/${Math.round(r.diastolic||0)}`;}
    else {s=r[activeVitalTab+"Status"]||"Unknown";val=activeVitalTab==="temperature"?`${Number(r[activeVitalTab]||0).toFixed(1)}°`:activeVitalTab==="bmi"?Number(r[activeVitalTab]||0).toFixed(1):Math.round(r[activeVitalTab]||0);}
    cells.push(`<div class="reading-cell" style="background:${cellColor(s)}">${val}<small>${idx+1}<br>${s}</small></div>`);
  });
  dailyReadingGrid.innerHTML=cells.join("");
}
function updateAll(){updateCards();makeTrend();makeStatus();updateSnapshot();updateProfile();makeBPChart();updateHistory();updateHeatmap();renderVitalsDetail();}
document.querySelectorAll(".nav").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".nav").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));btn.classList.add("active");document.getElementById(btn.dataset.page).classList.add("active");}));
document.querySelectorAll(".vital-tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".vital-tab").forEach(b=>b.classList.remove("active"));btn.classList.add("active");activeVitalTab=btn.dataset.vital;renderVitalsDetail();}));
doctorSelect.addEventListener("change",()=>{refreshPatientOptions();updateAll();});
patientSelect.addEventListener("change",updateAll);
dateSelect.addEventListener("change",updateAll);
vitalTrendSelect.addEventListener("change",updateAll);
initFilters();updateAll();