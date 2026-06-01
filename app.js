const ACTIVE_TAB_KEY='master_tracker_active_tab';function switchTab(name,persist=true){const panel=document.getElementById('tab-'+name),button=document.querySelector('.nav-tab[data-tab="'+name+'"]');if(!panel||!button)return;document.querySelectorAll('.tool-tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));panel.classList.add('active');button.classList.add('active');if(persist)localStorage.setItem(ACTIVE_TAB_KEY,name)}(function(){const saved=localStorage.getItem(ACTIVE_TAB_KEY);if(saved)switchTab(saved,false)})();

(function(){let tasks=JSON.parse(localStorage.getItem('today_tasks')||'[]');let selectedPriority='none';const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];const months=['January','February','March','April','May','June','July','August','September','October','November','December'];const now=new Date();document.getElementById('today-date').textContent=days[now.getDay()]+', '+months[now.getMonth()]+' '+now.getDate()+', '+now.getFullYear();window.todoSelectPriority=function(el){document.querySelectorAll('#tab-todo .p-tag').forEach(t=>t.classList.remove('active'));el.classList.add('active');selectedPriority=el.dataset.p};window.todoAddTask=function(){const input=document.getElementById('task-input');const text=input.value.trim();if(!text){input.focus();return}tasks.push({id:Date.now(),text,done:false,priority:selectedPriority});todoSave();todoRender();input.value='';input.focus()};window.todoToggleTask=function(id){const t=tasks.find(t=>t.id===id);if(t){t.done=!t.done;todoSave();todoRender()}};window.todoDeleteTask=function(id){const li=document.querySelector('#task-list [data-id="'+id+'"]');if(li){li.classList.add('removing');li.addEventListener('animationend',()=>{tasks=tasks.filter(t=>t.id!==id);todoSave();todoRender()},{once:true})}};function todoSave(){localStorage.setItem('today_tasks',JSON.stringify(tasks))}function escHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}function todoRender(){const list=document.getElementById('task-list');const total=tasks.length;const done=tasks.filter(t=>t.done).length;const left=total-done;const pct=total?Math.round((done/total)*100):0;document.getElementById('stat-total').textContent=total;document.getElementById('stat-done').textContent=done;document.getElementById('stat-left').textContent=left;document.getElementById('progress-pct').textContent=pct+'%';document.getElementById('progress-fill').style.width=pct+'%';if(!total){list.innerHTML='<li class="empty"><div class="empty-icon">✦</div><p>Nothing yet — your day awaits.</p></li>';return}const pOrder={high:0,med:1,low:2,none:3};const sorted=[...tasks].sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;return(pOrder[a.priority]??3)-(pOrder[b.priority]??3)});list.innerHTML=sorted.map(t=>`<li class="task-item ${t.done?'done':''}" data-id="${t.id}"><button class="check-btn" onclick="todoToggleTask(${t.id})"><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="#0f0f0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="p-dot ${t.priority}"></span><span class="task-text">${escHtml(t.text)}</span><button class="del-btn" onclick="todoDeleteTask(${t.id})"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button></li>`).join('')}document.getElementById('task-input').addEventListener('keydown',e=>{if(e.key==='Enter')todoAddTask()});todoRender()})();

(function(){const PROG_KEY='prog_rows',PROG_TITLE_KEY='prog_title',PROG_TIME_KEY='prog_saved_at';const WEEK_COLORS=['#c8ff00','#7c6fff','#ff6b8a','#00d4aa','#ff9f43','#54a0ff','#ff6348','#5f27cd','#01a3a4','#f368e0','#10ac84','#ee5a24'];const defaultRows=[{week:'Week 1',pct:50},{week:'Week 2',pct:20},{week:'Week 3',pct:65}];let rows=JSON.parse(localStorage.getItem(PROG_KEY)||'null')||defaultRows;let savedTitle=localStorage.getItem(PROG_TITLE_KEY)||'My Progress';const ctx=document.getElementById('prog-chart').getContext('2d');const gradient=ctx.createLinearGradient(0,0,0,280);gradient.addColorStop(0,'rgba(200,255,0,0.18)');gradient.addColorStop(1,'rgba(200,255,0,0)');const chart=new Chart(ctx,{type:'line',data:{labels:[],datasets:[{label:'Progress (%)',data:[],borderColor:'#c8ff00',backgroundColor:gradient,borderWidth:2.5,pointBackgroundColor:[],pointBorderColor:'#0a0a0f',pointBorderWidth:2,pointRadius:7,pointHoverRadius:10,fill:true,tension:.35,segment:{borderColor:function(c){return WEEK_COLORS[c.p0DataIndex%WEEK_COLORS.length]}}}]},options:{responsive:true,animation:{duration:500,easing:'easeInOutQuart'},plugins:{legend:{display:false},tooltip:{backgroundColor:'#16161f',borderColor:'#c8ff00',borderWidth:1,titleColor:'#c8ff00',bodyColor:'#f0f0f5',titleFont:{family:'Syne',size:13,weight:'700'},bodyFont:{family:'DM Mono',size:12},padding:12,callbacks:{label:c=>' '+c.parsed.y+'%'}}},scales:{x:{grid:{color:'#1e1e2a'},ticks:{color:function(c){return WEEK_COLORS[c.index%WEEK_COLORS.length]},font:{family:'DM Mono',size:11,weight:'bold'}},border:{color:'#2a2a38'}},y:{min:0,max:100,grid:{color:'#1e1e2a'},ticks:{color:'#6b6b80',font:{family:'DM Mono',size:11},callback:v=>v+'%'},border:{color:'#2a2a38'}}}}});document.getElementById('chartNameInput').value=savedTitle;document.getElementById('chartTitleDisplay').textContent=savedTitle;function escHtml(s){return String(s).replace(/"/g,'&quot;')}function progSave(){localStorage.setItem(PROG_KEY,JSON.stringify(rows));const now=new Date();localStorage.setItem(PROG_TIME_KEY,now.toISOString());showSavedTime()}function showSavedTime(){const raw=localStorage.getItem(PROG_TIME_KEY);const el=document.getElementById('progSavedAt');if(!raw){el.textContent='Not saved yet';return}const d=new Date(raw);const h=d.getHours(),m=d.getMinutes();const ampm=h>=12?'PM':'AM';const hh=h%12||12;el.textContent='Saved '+hh+':'+(m<10?'0':'')+m+' '+ampm+' — '+d.toLocaleDateString()}function renderRows(){const list=document.getElementById('rowList');list.innerHTML='';rows.forEach((r,i)=>{const c=WEEK_COLORS[i%WEEK_COLORS.length];const div=document.createElement('div');div.className='data-row';div.innerHTML=`<input type="text" value="${escHtml(r.week)}" placeholder="Week ${i+1}" style="border-left:3px solid ${c}" oninput="progUpdateWeek(${i},this.value)"/><input type="number" value="${r.pct}" min="0" max="100" placeholder="0–100" oninput="progUpdatePct(${i},this.value)"/><button class="del-btn" onclick="progDeleteRow(${i})" title="Remove">✕</button>`;list.appendChild(div)});updateChart();showSavedTime()}function updateChart(){chart.data.labels=rows.map(r=>r.week);chart.data.datasets[0].data=rows.map(r=>r.pct);chart.data.datasets[0].pointBackgroundColor=rows.map((_,i)=>WEEK_COLORS[i%WEEK_COLORS.length]);chart.update();const vals=rows.map(r=>r.pct).filter(v=>!isNaN(v));if(vals.length){document.getElementById('statPeak').textContent=Math.max(...vals)+'%';document.getElementById('statAvg').textContent=(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)+'%'}}window.progAddRow=function(){const n=rows.length+1;rows.push({week:'Week '+n,pct:0});progSave();renderRows();progShowToast('Week '+n+' added')};window.progDeleteRow=function(i){if(rows.length===1){progShowToast('Need at least one row');return}rows.splice(i,1);progSave();renderRows()};window.progUpdateWeek=function(i,v){rows[i].week=v;progSave();updateChart()};window.progUpdatePct=function(i,v){let n=parseFloat(v);if(isNaN(n))n=0;n=Math.min(100,Math.max(0,n));rows[i].pct=n;progSave();updateChart()};window.progClearAll=function(){if(!confirm('Clear all data?'))return;rows=[{week:'Week 1',pct:0}];progSave();renderRows();progShowToast('Cleared')};window.progUpdateChartTitle=function(v){const t=v||'My Progress';document.getElementById('chartTitleDisplay').textContent=t;localStorage.setItem(PROG_TITLE_KEY,t)};window.progDownloadChart=function(){const title=document.getElementById('chartNameInput').value||'progress-chart';const canvas=document.getElementById('prog-chart');const off=document.createElement('canvas');off.width=canvas.width;off.height=canvas.height;const octx=off.getContext('2d');octx.fillStyle='#16161f';octx.fillRect(0,0,off.width,off.height);octx.drawImage(canvas,0,0);const link=document.createElement('a');link.download=title.replace(/\s+/g,'-').toLowerCase()+'.png';link.href=off.toDataURL('image/png');link.click();progShowToast('Graph downloaded!')};window.progDownloadCSV=function(){const title=document.getElementById('chartNameInput').value||'progress';let csv='Week,Percentage\n';rows.forEach(r=>{csv+='"'+r.week+'",'+r.pct+'\n'});const blob=new Blob([csv],{type:'text/csv'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=title.replace(/\s+/g,'-').toLowerCase()+'.csv';link.click();progShowToast('CSV exported!')};let progToastTimer;function progShowToast(msg){const t=document.getElementById('prog-toast');t.textContent=msg;t.classList.add('show');clearTimeout(progToastTimer);progToastTimer=setTimeout(()=>t.classList.remove('show'),2200)}renderRows()})();

(function(){
  const PASSING_PERCENT_KEY = 'prog_passing_percent';
  const DEFAULT_PASSING_PERCENT = 70;
  const PASS_COLOR = '#27ae60';
  const FAIL_COLOR = '#ff4d6d';
  const PROG_KEY = 'prog_rows';
  let passingPercent = getPassingPercent();

  function getRows(){
    try{return JSON.parse(localStorage.getItem(PROG_KEY)||'[]')||[];}catch{return[];}
  }
  function getPassingPercent(){
    const saved = Number(localStorage.getItem(PASSING_PERCENT_KEY));
    return Number.isFinite(saved) ? Math.min(100,Math.max(0,saved)) : DEFAULT_PASSING_PERCENT;
  }
  function setPassingPercent(value){
    const next = Number(value);
    passingPercent = Number.isFinite(next) ? Math.min(100,Math.max(0,next)) : DEFAULT_PASSING_PERCENT;
    localStorage.setItem(PASSING_PERCENT_KEY,String(passingPercent));
    const input = document.getElementById('progPassInput');
    if(input)input.value = String(passingPercent);
    applyProgressStatus();
  }
  function getAverage(rows){
    const vals = rows.map(r=>Number(r.pct)).filter(Number.isFinite);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  }
  function makeFill(ctx,color){
    const gradient = ctx.createLinearGradient(0,0,0,280);
    const rgb = color === PASS_COLOR ? '39,174,96' : '255,77,109';
    gradient.addColorStop(0,'rgba('+rgb+',0.18)');
    gradient.addColorStop(1,'rgba('+rgb+',0)');
    return gradient;
  }
  function ensureStatus(){
    const titleBlock = document.querySelector('#tab-progress .chart-title-block');
    if(!titleBlock)return null;
    let el = document.getElementById('progPassStatus');
    if(!el){
      el = document.createElement('div');
      el.id = 'progPassStatus';
      el.className = 'chart-status';
      titleBlock.appendChild(el);
    }
    return el;
  }
  function applyProgressStatus(){
    const canvas = document.getElementById('prog-chart');
    const chart = window.Chart && Chart.getChart ? Chart.getChart(canvas) : null;
    if(!canvas || !chart)return;

    const rows = getRows();
    const avg = getAverage(rows);
    passingPercent = getPassingPercent();
    const passInput = document.getElementById('progPassInput');
    if(passInput && passInput.value !== String(passingPercent))passInput.value = String(passingPercent);
    const passed = avg != null && avg >= passingPercent;
    const color = passed ? PASS_COLOR : FAIL_COLOR;
    const label = avg == null ? 'Passing target: '+passingPercent+'%' : (passed ? 'Passing' : 'Below passing')+' - target '+passingPercent+'%';
    const ctx = canvas.getContext('2d');
    const dataset = chart.data.datasets[0];
    const points = rows.map(()=>color);

    dataset.borderColor = color;
    dataset.backgroundColor = makeFill(ctx,color);
    dataset.pointBackgroundColor = points;
    dataset.segment = {borderColor: color};
    chart.options.plugins.tooltip.borderColor = color;
    chart.options.plugins.tooltip.titleColor = color;
    chart.options.scales.x.ticks.color = color;

    const passData = chart.data.labels.map(()=>passingPercent);
    if(chart.data.datasets.length < 2){
      chart.data.datasets.push({
        label:'Passing %',
        data:passData,
        borderColor:'#8a8a9e',
        backgroundColor:'transparent',
        borderDash:[6,6],
        borderWidth:1.5,
        pointRadius:0,
        pointHoverRadius:0,
        fill:false,
        tension:0
      });
    }else{
      chart.data.datasets[1].data = passData;
    }

    const card = document.getElementById('chartCard');
    if(card){
      card.classList.toggle('pass',passed);
      card.classList.toggle('fail',!passed);
    }
    const status = ensureStatus();
    if(status){
      status.textContent = label;
      status.className = 'chart-status '+(passed?'pass':'fail');
    }
    document.querySelectorAll('#rowList .data-row input[type="text"]').forEach(input=>{
      input.style.borderLeft = '3px solid '+color;
    });
    chart.update();
  }
  const passInput = document.getElementById('progPassInput');
  if(passInput){
    passInput.value = String(passingPercent);
    passInput.addEventListener('input',ev=>setPassingPercent(ev.target.value));
    passInput.addEventListener('change',ev=>setPassingPercent(ev.target.value));
  }
  function wrapProgressHandler(name){
    const original = window[name];
    if(typeof original !== 'function')return;
    window[name] = function(){
      const result = original.apply(this,arguments);
      applyProgressStatus();
      return result;
    };
  }
  ['progAddRow','progDeleteRow','progUpdateWeek','progUpdatePct','progClearAll'].forEach(wrapProgressHandler);
  applyProgressStatus();
})();

(function() {
  const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const DAYS_LONG  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  let currentOffset = 0;
  let selectedDayIdx = null;

  function getMondayOf(offset) {
    const d = new Date(); d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff + (offset||0) * 7);
    return d.toISOString().slice(0,10);
  }
  function getWeekDates(mondayKey) {
    const base = new Date(mondayKey + 'T00:00:00');
    return Array.from({length:7}, (_,i) => { const d = new Date(base); d.setDate(d.getDate()+i); return d; });
  }
  function fmt(d)  { return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }
  function getWeekNum(d) {
    const dt = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const day = dt.getUTCDay()||7; dt.setUTCDate(dt.getUTCDate()+4-day);
    const ys  = new Date(Date.UTC(dt.getUTCFullYear(),0,1));
    return Math.ceil((((dt-ys)/86400000)+1)/7);
  }
  function load(key) { const raw=localStorage.getItem('wt2_'+key); return raw?JSON.parse(raw):{manualRating:null,days:{}}; }
  function save(key,data) { localStorage.setItem('wt2_'+key,JSON.stringify(data)); }
  function allKeys() { return Object.keys(localStorage).filter(k=>k.startsWith('wt2_')).map(k=>k.replace('wt2_','')).sort().reverse(); }
  function computeTaskAvg(data) { let s=0,c=0; Object.values(data.days).forEach(ts=>ts.forEach(t=>{s+=t.rating;c++;})); return c?+(s/c).toFixed(2):null; }
  function weekScore(data) { if(data.manualRating!=null)return+data.manualRating; return computeTaskAvg(data); }
  function tier(score) {
    if(score==null)return null;
    if(score>5)  return{label:'Overachiever',cls:'tier-over', color:'var(--green)'};
    if(score>=4) return{label:'Good',        cls:'tier-good', color:'var(--blue)'};
    if(score>=3) return{label:'Average',     cls:'tier-avg',  color:'var(--amber)'};
    return            {label:'Underachiever',cls:'tier-under',color:'var(--red)'};
  }
  function barClass(s) { if(s==null)return'bar-empty'; if(s>5)return'bar-over'; if(s>=4)return'bar-good'; if(s>=3)return'bar-avg'; return'bar-under'; }
  function ratingClass(r) { if(r>5)return'r-high'; if(r>=4)return'r-good'; if(r>=3)return'r-mid'; return'r-low'; }
  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function countAllTasks(data) { return Object.values(data.days).reduce((s,ts)=>s+ts.length,0); }
  function tierDesc(score) {
    if(score==null)return''; if(score>7)return'Beyond the scale!'; if(score>5)return'Pushing well above average.';
    if(score>=4)return'Performing solidly this week.'; if(score>=3)return'Meeting the baseline.'; return'Below baseline.';
  }
  function bestStreak(scores) { let st=0,b=0; scores.forEach(s=>{if(s>=3.5){st++;b=Math.max(b,st);}else st=0;}); return b; }
  function openingLine(ws,prev) {
    const diff=prev!=null?ws-prev:null;
    if(ws>7)return'Extraordinary performance this week.';
    if(ws>5)return'Strong week — overachiever territory'+(diff>0?', improving from last week.':'.');
    if(ws>=4)return'Good week overall.'+(diff!=null?(diff>=0?' Held ground or improved.':' Slight dip, but solid.'):'');
    if(ws>=3)return'Average week.'+(diff!=null?(diff>0?' Better than last week.':diff<0?' A step down.':' Consistent.'):'');
    return'Challenging week.'+(diff!=null&&diff>0?' Still improved on last week.':'');
  }
  function trendLine(trend) {
    if(trend>0.5)return'📈 Scores <strong>trending up</strong> over 3 weeks.';
    if(trend<-0.5)return'📉 Scores <strong>trending down</strong> the last 3 weeks.';
    return'➡️ Scores relatively <strong>stable</strong>.';
  }
  function tierAdvice(ws,t) {
    if(!t)return'';
    const a={'tier-over':'Exceeding expectations. Raise your baseline.','tier-good':'Good shape. Target weakest days.','tier-avg':'Average — commit to higher ratings.','tier-under':'Below average. Pinpoint what drags your score.'};
    return a[t.cls]||'';
  }

  window.trackerJumpToWeek = function(key) {
    const base=new Date(getMondayOf(0)+'T00:00:00'), target=new Date(key+'T00:00:00');
    currentOffset=Math.round((target-base)/(7*24*60*60*1000));
    selectedDayIdx=0; render();
    document.getElementById('tab-tracker').scrollTo({top:0,behavior:'smooth'});
  };

  function render() {
    const mondayKey=getMondayOf(currentOffset), data=load(mondayKey), dates=getWeekDates(mondayKey);
    const todayStr=new Date().toISOString().slice(0,10), isThis=currentOffset===0;
    if(selectedDayIdx===null){if(isThis){const dow=new Date().getDay();selectedDayIdx=dow===0?6:dow-1;}else selectedDayIdx=0;}
    const wn=getWeekNum(new Date(mondayKey+'T00:00:00'));
    document.getElementById('weekPill').textContent='Week '+wn;
    document.getElementById('weekTitle').textContent=isThis?'This Week':currentOffset<0?Math.abs(currentOffset)+' Week'+(Math.abs(currentOffset)>1?'s':'')+' Ago':currentOffset+' Week Ahead';
    document.getElementById('weekRange').textContent=fmt(dates[0])+'  –  '+fmt(dates[6]);
    const ws=weekScore(data),avg=computeTaskAvg(data),t=tier(ws);
    document.getElementById('sc-week').textContent=ws!=null?ws.toFixed(1):'—';
    document.getElementById('sc-week-sub').textContent=data.manualRating!=null?'★ Manual override':(ws!=null?'From task average':'No data yet');
    document.getElementById('sc-avg').textContent=avg!=null?avg.toFixed(2):'—';
    document.getElementById('sc-avg-sub').textContent=avg!=null?countAllTasks(data)+' task entries':'No tasks logged';
    const tierEl=document.getElementById('sc-tier'),tierSub=document.getElementById('sc-tier-sub');
    if(t){tierEl.innerHTML='<span class="tier-badge '+t.cls+'">'+t.label+'</span>';tierSub.textContent=tierDesc(ws);}
    else{tierEl.innerHTML='<span style="color:var(--text3);font-size:.85rem">—</span>';tierSub.textContent='Log tasks to see tier';}
    document.getElementById('manualInput').value=data.manualRating!=null?data.manualRating:'';
    const tabsEl=document.getElementById('dayTabs');tabsEl.innerHTML='';
    dates.forEach((d,i)=>{
      const ds=d.toISOString().slice(0,10);
      const tab=document.createElement('div');
      tab.className='day-tab'+(ds===todayStr?' today':'')+(i===selectedDayIdx?' active':'')+((data.days[ds]||[]).length?' has-data':'');
      tab.innerHTML='<div class="dtab-name">'+DAYS_SHORT[i]+'</div><div class="dtab-date">'+d.getDate()+'</div><div class="dtab-dot"></div>';
      tab.addEventListener('click',()=>{selectedDayIdx=i;render();});
      tabsEl.appendChild(tab);
    });
    const selDate=dates[selectedDayIdx],selDs=selDate.toISOString().slice(0,10);
    const dayTasks=data.days[selDs]||[];
    const dayAvg=dayTasks.length?(dayTasks.reduce((s,t)=>s+t.rating,0)/dayTasks.length).toFixed(1):null;
    const panel=document.getElementById('dayPanel');
    panel.innerHTML='<div class="panel-header"><div><div class="panel-dayname">'+DAYS_LONG[selectedDayIdx]+'</div><div class="panel-date">'+fmt(selDate)+(selDs===todayStr?' · Today':'')+'</div></div>'+(dayAvg?'<div class="day-avg-chip">Avg: '+dayAvg+'</div>':'')+'</div><div class="add-row"><input type="text" id="taskNameIn" placeholder="Task or activity…"/><input type="number" id="taskRatingIn" placeholder="7" step="0.1" min="0" title="Rating"/><button class="add-btn" id="addTaskBtn">+ Add</button></div><div class="task-list" id="taskListEl"></div>';
    const taskListEl=document.getElementById('taskListEl');
    if(!dayTasks.length){taskListEl.innerHTML='<div class="empty-day"><div class="emo">📝</div>No tasks for this day yet.</div>';}
    else{
      dayTasks.forEach((task,ti)=>{
        const item=document.createElement('div');item.className='task-item';
        item.innerHTML='<div class="task-item-name">'+escHtml(task.name)+'</div><input type="number" class="task-rating-edit" value="'+task.rating+'" step="0.1" min="0" data-ti="'+ti+'"/><button class="del-btn" data-ti="'+ti+'">×</button>';
        taskListEl.appendChild(item);
      });
      taskListEl.querySelectorAll('.task-rating-edit').forEach(inp=>{
        inp.addEventListener('change',()=>{
          const ti=+inp.dataset.ti,val=parseFloat(inp.value);if(isNaN(val))return;
          const d2=load(mondayKey);d2.days[selDs][ti].rating=val;save(mondayKey,d2);render();
        });
      });
      taskListEl.querySelectorAll('.del-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const ti=+btn.dataset.ti,d2=load(mondayKey);
          d2.days[selDs].splice(ti,1);if(!d2.days[selDs].length)delete d2.days[selDs];
          save(mondayKey,d2);render();
        });
      });
    }
    document.getElementById('addTaskBtn').addEventListener('click',addTask);
    document.getElementById('taskNameIn').addEventListener('keydown',e=>{if(e.key==='Enter')addTask();});
    function addTask(){
      const nameEl=document.getElementById('taskNameIn'),ratingEl=document.getElementById('taskRatingIn');
      const name=nameEl.value.trim(),rating=parseFloat(ratingEl.value);
      if(!name){nameEl.style.borderColor='var(--red)';setTimeout(()=>nameEl.style.borderColor='',900);return;}
      if(isNaN(rating)){ratingEl.style.borderColor='var(--red)';setTimeout(()=>ratingEl.style.borderColor='',900);return;}
      const d2=load(mondayKey);if(!d2.days[selDs])d2.days[selDs]=[];
      d2.days[selDs].push({name,rating});save(mondayKey,d2);
      nameEl.value='';ratingEl.value='';render();
    }
    renderChart(mondayKey);renderReport(mondayKey);renderWeeksList(mondayKey);
  }

  function renderChart(currentKey) {
    const area=document.getElementById('chartArea');
    const keys=allKeys();if(!keys.includes(currentKey))keys.unshift(currentKey);
    const sorted=[...new Set([...keys])].sort(),recent=sorted.slice(-12);
    if(recent.length<1){area.innerHTML='<div class="no-chart-msg">Log tasks over multiple weeks to see progress chart.</div>';return;}
    const MAX_Y=7,CHART_H=220;
    const entries=recent.map(k=>{const d=load(k),ws=weekScore(d),dates=getWeekDates(k);return{key:k,score:ws,label:'W'+getWeekNum(dates[0])+'\n'+(fmt(dates[0]).split(' ')[1]?.slice(0,3)||''),isCurrent:k===currentKey};});
    function yPct(v){return Math.min(v/MAX_Y,1.4)*100;}
    const zones=[{cls:'zone-over',top:0,bottom:28.6},{cls:'zone-good',top:28.6,bottom:42.8},{cls:'zone-avg',top:42.8,bottom:57.1},{cls:'zone-under',top:57.1,bottom:100}];
    const gridYs=[0,1,2,3,4,5,6,7];
    let barsHtml='';
    entries.forEach(e=>{
      const score=e.score,bc=barClass(score),heightPct=score!=null?yPct(score):2,label=score!=null?score.toFixed(1):'—';
      barsHtml+='<div class="chart-bar-wrap"><div class="chart-bar '+bc+'" style="height:'+heightPct+'%" data-val="'+label+'"></div></div>';
    });
    const gridHtml=gridYs.map(v=>'<div class="grid-line" style="bottom:'+yPct(v)+'%"></div>').join('');
    const zoneHtml=zones.map(z=>'<div class="zone-band '+z.cls+'" style="top:'+z.top+'%;height:'+(z.bottom-z.top)+'%"></div>').join('');
    const xLabelsHtml=entries.map(e=>'<div class="x-lbl'+(e.isCurrent?' current-week':'')+'">'+e.label.replace('\n','<br>')+'</div>').join('');
    const yLabelsHtml=gridYs.map(v=>'<div class="y-lbl" style="bottom:'+yPct(v)+'%">'+v+'</div>').join('');
    const n=entries.length;let svgPath='';
    if(n>1){
      const pts=entries.map((e,i)=>({x:(i/(n-1))*100,y:100-yPct(e.score??0)}));
      svgPath='<svg class="line-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="'+pts.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ')+'" fill="none" stroke="var(--accent)" stroke-width="0.8" vector-effect="non-scaling-stroke"/></svg>';
    }
    area.innerHTML='<div class="chart-wrap"><div class="y-labels">'+yLabelsHtml+'</div><div class="chart-canvas-row">'+zoneHtml+gridHtml+'<div class="chart-bars-row">'+barsHtml+'</div>'+svgPath+'</div><div class="x-labels-row">'+xLabelsHtml+'</div></div>';
  }

  function renderReport(currentKey) {
    const el=document.getElementById('reportContent');
    const data=load(currentKey),ws=weekScore(data),avg=computeTaskAvg(data),t=tier(ws);
    const keys=allKeys().sort(),cIdx=keys.indexOf(currentKey);
    const scores=keys.map(k=>weekScore(load(k))).filter(v=>v!=null);
    const prevKey=cIdx>0?keys[cIdx-1]:null,prevWs=prevKey?weekScore(load(prevKey)):null;
    let dayStats={};
    Object.entries(data.days).forEach(([ds,tasks])=>{
      if(tasks.length){const a=tasks.reduce((s,t)=>s+t.rating,0)/tasks.length;dayStats[ds]={avg:a,count:tasks.length};}
    });
    const dsa=Object.entries(dayStats);
    const bestDay=dsa.length?dsa.reduce((b,c)=>c[1].avg>b[1].avg?c:b,dsa[0]):null;
    const worstDay=dsa.length>1?dsa.reduce((b,c)=>c[1].avg<b[1].avg?c:b,dsa[0]):null;
    const bd=bestDay?{ds:bestDay[0],...bestDay[1]}:null,wd=worstDay?{ds:worstDay[0],...worstDay[1]}:null;
    let html='<div class="report-grid"><div class="report-stat"><div class="rs-lbl">This Week Score</div><div class="rs-val">'+(ws!=null?ws.toFixed(1):'—')+'<span style="font-size:.9rem;color:var(--text3)"> /7</span></div><div class="rs-sub">'+(t?t.label:'No data')+'</div></div><div class="report-stat"><div class="rs-lbl">vs Last Week</div><div class="rs-val" style="color:'+(prevWs!=null&&ws!=null?(ws>=prevWs?'var(--green)':'var(--red)'):'var(--text3)')+'"> '+(prevWs!=null&&ws!=null?(ws>=prevWs?'↑':'↓')+' '+Math.abs(ws-prevWs).toFixed(1):'—')+'</div><div class="rs-sub">'+(prevWs!=null?'Prev: '+prevWs.toFixed(1):'No previous data')+'</div></div><div class="report-stat"><div class="rs-lbl">Best Streak</div><div class="rs-val">'+bestStreak(scores)+'<span style="font-size:.9rem;color:var(--text3)"> wk</span></div><div class="rs-sub">Consecutive above-avg weeks</div></div><div class="report-stat"><div class="rs-lbl">All-Time Avg</div><div class="rs-val">'+(scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—')+'</div><div class="rs-sub">Over '+scores.length+' scored week'+(scores.length!==1?'s':'')+'</div></div></div><div class="report-text">';
    if(ws==null){html+='<p>No data for this week yet. Start adding tasks.</p>';}
    else{
      html+='<p>'+openingLine(ws,prevWs)+'</p>';
      if(bd){
        const bdWdn=DAYS_LONG[new Date(bd.ds+'T00:00:00').getDay()===0?6:new Date(bd.ds+'T00:00:00').getDay()-1];
        html+='<p><strong>Best day:</strong> <span class="hi">'+bdWdn+'</span> with avg '+bd.avg.toFixed(1)+' across '+bd.count+' task'+(bd.count!==1?'s':'')+'.';
        if(wd&&wd.ds!==bd.ds){const wdWdn=DAYS_LONG[new Date(wd.ds+'T00:00:00').getDay()===0?6:new Date(wd.ds+'T00:00:00').getDay()-1];html+=' Weakest: <span class="hi">'+wdWdn+'</span> ('+wd.avg.toFixed(1)+' avg).</p>';}else html+='</p>';
      }
      if(scores.length>=3){const r3=scores.slice(-3);html+='<p><strong>Trend:</strong> '+trendLine(r3[2]-r3[0])+'</p>';}
      html+='<p>'+tierAdvice(ws,t)+'</p>';
    }
    html+='</div>';el.innerHTML=html;
  }

  function renderWeeksList(currentKey) {
    const el=document.getElementById('weeksList'),keys=allKeys();
    const all=[...new Set([currentKey,...keys])].sort().reverse();
    if(!all.length){el.innerHTML='<p style="color:var(--text3);font-size:.85rem;font-style:italic">No weeks recorded yet.</p>';return;}
    el.innerHTML=all.map(k=>{
      const d=load(k),ws=weekScore(d),dates=getWeekDates(k),t=tier(ws),tasks=countAllTasks(d);
      const dayAvgs=Object.values(d.days).map(ts=>ts.length?ts.reduce((s,t)=>s+t.rating,0)/ts.length:0);
      const miniBars=dayAvgs.length?dayAvgs.map(a=>{const h=Math.max((a/7)*20,2);return'<div class="wm-bar" style="height:'+h+'px;background:'+(a>5?'var(--green)':a>=4?'var(--blue)':a>=3?'var(--amber)':'var(--red)')+'"></div>';}).join(''):'<span style="font-size:.65rem;color:var(--text3)">no data</span>';
      return'<div class="week-row'+(k===currentKey?' current':'')+'" onclick="trackerJumpToWeek(\''+k+'\')"><div class="wr-range">W'+getWeekNum(dates[0])+' · '+fmt(dates[0])+' – '+fmt(dates[6])+'</div><div class="wr-mini">'+miniBars+'</div><div class="wr-tasks">'+tasks+' task'+(tasks!==1?'s':'')+'</div><div class="wr-score">'+(ws!=null?ws.toFixed(1):'—')+(t?' <span class="tier-badge '+t.cls+'" style="font-size:.6rem">'+t.label+'</span>':'')+'</div></div>';
    }).join('');
  }

  document.getElementById('prevBtn').addEventListener('click',()=>{currentOffset--;selectedDayIdx=null;render();});
  document.getElementById('nextBtn').addEventListener('click',()=>{currentOffset++;selectedDayIdx=null;render();});
  document.getElementById('saveManualBtn').addEventListener('click',()=>{
    const val=parseFloat(document.getElementById('manualInput').value);if(isNaN(val))return;
    const k=getMondayOf(currentOffset),d=load(k);d.manualRating=val;save(k,d);render();
  });
  document.getElementById('clearManualBtn').addEventListener('click',()=>{
    const k=getMondayOf(currentOffset),d=load(k);d.manualRating=null;save(k,d);
    document.getElementById('manualInput').value='';render();
  });
  const trackerEl=document.getElementById('tab-tracker');
  const savedTheme=localStorage.getItem('wt2_theme')||'light';
  trackerEl.setAttribute('data-theme',savedTheme);
  document.getElementById('togLbl').textContent=savedTheme==='dark'?'Dark':'Light';
  document.getElementById('togBtn').addEventListener('click',()=>{
    const next=trackerEl.getAttribute('data-theme')==='light'?'dark':'light';
    trackerEl.setAttribute('data-theme',next);localStorage.setItem('wt2_theme',next);
    document.getElementById('togLbl').textContent=next==='dark'?'Dark':'Light';render();
  });
  render();
})();

(function() {
  let questions=[],apiKey='',schedulerTimer=null;
  const STORAGE_KEY='qranker_questions',KEY_STORAGE='qranker_api_key',LAST_RUN_KEY='qranker_last_run';
  function loadFromStorage(){try{const raw=localStorage.getItem(STORAGE_KEY);questions=raw?JSON.parse(raw):[];}catch{questions=[];}apiKey=localStorage.getItem(KEY_STORAGE)||'';if(apiKey){document.getElementById('api-key-input').value=apiKey;document.getElementById('key-status').textContent='Key saved ✓';document.getElementById('key-status').classList.add('ok');}}
  function saveToStorage(){localStorage.setItem(STORAGE_KEY,JSON.stringify(questions));}
  window.rankerSaveApiKey=function(){const val=document.getElementById('api-key-input').value.trim();if(!val){rankerShowToast('Enter a valid API key','error');return;}apiKey=val;localStorage.setItem(KEY_STORAGE,apiKey);const s=document.getElementById('key-status');s.textContent='Key saved ✓';s.classList.add('ok');rankerShowToast('API key saved','success');};
  window.rankerAddQuestion=function(){const inp=document.getElementById('question-input');const text=inp.value.trim();if(!text){rankerShowToast('Question cannot be empty','error');return;}questions.push({id:Date.now(),text,score:null,reason:null,rank:null,addedAt:new Date().toISOString()});inp.value='';saveToStorage();rankerRender();rankerShowToast('Question added','success');};
  window.rankerDeleteQuestion=function(id){questions=questions.filter(q=>q.id!==id);saveToStorage();rankerRender();};
  window.rankerClearAll=function(){if(questions.length===0)return;if(!confirm('Delete all questions and scores?'))return;questions=[];saveToStorage();rankerRender();rankerShowToast('All questions cleared','info');};
  window.rankerHandleKey=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();rankerAddQuestion();}};
  function checkAndMaybeRun(){const now=new Date(),lastRun=localStorage.getItem(LAST_RUN_KEY),todayStr=now.toDateString();if(now.getHours()>=11&&lastRun!==todayStr&&questions.length>0&&apiKey){rankerLog('Auto-triggering evaluation…','accent');setTimeout(rankerRunEvaluation,1500);}updateSchedulerUI();}
  function scheduleNext11am(){if(schedulerTimer)clearTimeout(schedulerTimer);const now=new Date(),next=new Date(now);next.setHours(11,0,0,0);if(now>=next)next.setDate(next.getDate()+1);const ms=next-now;schedulerTimer=setTimeout(()=>{rankerLog('⏰ Scheduled evaluation triggered.','accent');rankerRunEvaluation();scheduleNext11am();},ms);updateSchedulerUI(next);}
  function updateSchedulerUI(nextDate){document.getElementById('sched-dot').className='dot live';document.getElementById('sched-label').textContent='Scheduler active';const disp=document.getElementById('next-run-display');const ref=nextDate||new Date();if(!nextDate){if(ref.getHours()>=11)ref.setDate(ref.getDate()+1);ref.setHours(11,0,0,0);}disp.textContent='Next run: '+ref.toLocaleString('en-IN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
  window.rankerRunEvaluation=async function(){if(!apiKey){rankerShowToast('Set your Gemini API key first','error');return;}if(questions.length===0){rankerShowToast('Add at least one question','error');return;}const btn=document.getElementById('run-btn');btn.disabled=true;btn.classList.add('running');rankerLog('Starting evaluation with Gemini 2.5 Flash…','accent');const list=questions.map((q,i)=>(i+1)+'. [ID:'+q.id+'] '+q.text).join('\n');const prompt='You are an expert at evaluating the importance and depth of questions.\n\nBelow is a list of questions. Score each 1-10 (10=most important). Spread scores thoughtfully.\n\nQuestions:\n'+list+'\n\nRespond ONLY with a valid JSON array. No markdown.\nFormat:\n[{"id":<id>,"score":<1-10>,"reason":"<one concise sentence>"},...]';try{const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.3,responseMimeType:'application/json'}})});if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err?.error?.message||'HTTP '+res.status);}const data=await res.json();const rawText=data?.candidates?.[0]?.content?.parts?.[0]?.text||'';let parsed;try{parsed=JSON.parse(rawText.replace(/```json|```/g,'').trim());}catch{const m=rawText.match(/\[[\s\S]*\]/);if(m)try{parsed=JSON.parse(m[0]);}catch{}}if(!parsed)throw new Error('Could not parse response');const map={};parsed.forEach(s=>{map[String(s.id)]=s;});questions.forEach(q=>{const s=map[String(q.id)];if(s){q.score=s.score;q.reason=s.reason||null;}});questions.sort((a,b)=>(b.score??-1)-(a.score??-1));questions.forEach((q,i)=>{q.rank=q.score!==null?i+1:null;});saveToStorage();localStorage.setItem(LAST_RUN_KEY,new Date().toDateString());rankerLog('✓ Evaluation complete. '+questions.length+' questions scored.','ok');rankerShowToast('Questions ranked successfully','success');rankerRender();}catch(err){rankerLog('✗ Error: '+err.message,'err');rankerShowToast('Error: '+err.message,'error');}finally{btn.disabled=false;btn.classList.remove('running');}};
  function rankerRender(){const list=document.getElementById('questions-list');document.getElementById('q-count').innerHTML='<strong>'+questions.length+'</strong> question'+(questions.length!==1?'s':'');if(questions.length===0){list.innerHTML='<div class="empty-state"><div class="icon">✦</div><p>No questions yet.<br>Add your first question above.</p></div>';return;}function esc(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}list.innerHTML=questions.map(q=>{const has=q.score!==null,score=has?q.score:null;let cardClass='unranked',badgeClass='unranked',badgeText='—';if(has){badgeText=score;if(score>=7){cardClass='ranked-high';badgeClass='high';}else if(score>=4){cardClass='ranked-mid';badgeClass='mid';}else{cardClass='ranked-low';badgeClass='low';}}const rankStr=q.rank?'#'+q.rank+' · ':'';const added=new Date(q.addedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'});const reasonHtml=q.reason?'<div class="question-reason">'+esc(q.reason)+'</div>':'';return'<div class="question-card '+cardClass+'" data-id="'+q.id+'"><div class="score-badge '+badgeClass+'">'+badgeText+'</div><div class="question-body"><div class="question-rank">'+rankStr+'Added '+added+'</div><div class="question-text">'+esc(q.text)+'</div>'+reasonHtml+'<div class="question-meta">'+(has?'<span>Score: '+score+'/10</span>':'<span>Not yet evaluated</span>')+'</div></div><button class="btn-delete" onclick="rankerDeleteQuestion('+q.id+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';}).join('');}
  window.rankerRender=rankerRender;
  function rankerLog(msg,type){const el=document.getElementById('eval-log');const p=document.createElement('p');const ts=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});p.textContent='['+ts+'] '+msg;if(type)p.className=type;if(el.children.length===1&&el.children[0].textContent.startsWith('Waiting'))el.innerHTML='';el.appendChild(p);el.scrollTop=el.scrollHeight;}
  window.rankerLog=rankerLog;
  let rankerToastTimer;function rankerShowToast(msg,type){const t=document.getElementById('ranker-toast');t.textContent=msg;t.className='show'+(type?' '+type:'');clearTimeout(rankerToastTimer);rankerToastTimer=setTimeout(()=>{t.className='';},3000);}window.rankerShowToast=rankerShowToast;
  loadFromStorage();rankerRender();checkAndMaybeRun();scheduleNext11am();
})();

(function() {
  const STORE_KEY='streak_tracker_v2';
  function load(){try{return JSON.parse(localStorage.getItem(STORE_KEY))||[];}catch{return[];}}
  function save(data){localStorage.setItem(STORE_KEY,JSON.stringify(data));}
  function todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function formatDate(str){if(!str)return'—';const[y,m,d]=str.split('-');const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return d+' '+months[parseInt(m)-1]+' '+y;}
  function daysBetween(a,b){return Math.round((new Date(b)-new Date(a))/86400000);}
  function escHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function checkAndUpdateStreak(streak){
    if(streak.completed)return streak;const today=todayStr();if(!streak.lastLoggedDate)return streak;
    const diff=daysBetween(streak.lastLoggedDate,today);
    if(diff>1){for(let i=1;i<diff;i++){const md=new Date(streak.lastLoggedDate);md.setDate(md.getDate()+i);const ms=md.toISOString().split('T')[0];if(!streak.history.includes(ms)){streak.missedDays=streak.missedDays||[];streak.missedDays.push(ms);}}streak.currentStreak=0;streak.status='fresh';}
    return streak;
  }
  window.streakCreate=function(){
    const nameInput=document.getElementById('task-name'),daysInput=document.getElementById('task-days');
    const name=nameInput.value.trim(),days=parseInt(daysInput.value);
    if(!name){streakShowToast('Enter a task name.','error');return;}
    if(!days||days<1||days>365){streakShowToast('Choose between 1 and 365 days.','error');return;}
    const data=load();data.push({id:Date.now().toString(),name,targetDays:days,currentStreak:0,createdDate:todayStr(),lastLoggedDate:null,history:[],missedDays:[],completed:false,status:'fresh'});
    save(data);nameInput.value='';daysInput.value='';streakRender();streakShowToast('"'+name+'" streak created — '+days+' days to go!');
  };
  window.streakLogToday=function(id){
    const data=load(),idx=data.findIndex(s=>s.id===id);if(idx===-1)return;
    let s=data[idx];const today=todayStr();
    if(s.history.includes(today)){streakShowToast('Already logged today!','error');return;}
    s=checkAndUpdateStreak(s);s.history.push(today);s.lastLoggedDate=today;s.currentStreak+=1;
    if(s.currentStreak>=s.targetDays){s.completed=true;s.status='complete';streakShowToast('🎉 "'+s.name+'" completed!','success');}
    else{s.status='active';const left=s.targetDays-s.currentStreak;streakShowToast('Day '+s.currentStreak+' logged! '+left+' day'+(left!==1?'s':'')+' remaining.','success');}
    data[idx]=s;save(data);streakRender();
  };
  let deleteTargetId=null;
  window.streakDelete=function(id){const data=load(),s=data.find(x=>x.id===id);if(!s)return;deleteTargetId=id;document.getElementById('confirm-text').textContent='Delete "'+s.name+'"? All '+s.history.length+' day(s) of progress will be lost.';document.getElementById('confirm-overlay').classList.add('show');};
  window.streakCloseConfirm=function(){document.getElementById('confirm-overlay').classList.remove('show');deleteTargetId=null;};
  window.streakConfirmDelete=function(){if(!deleteTargetId)return;let data=load();data=data.filter(s=>s.id!==deleteTargetId);save(data);streakCloseConfirm();streakRender();streakShowToast('Streak deleted.');};
  function streakRender(){
    let data=load();const today=todayStr();data=data.map(s=>{if(!s.completed)s=checkAndUpdateStreak(s);return s;});save(data);
    const container=document.getElementById('streaks-container'),countEl=document.getElementById('streak-count');countEl.textContent=data.length;
    const emptyEl=document.getElementById('streak-empty-state');
    if(data.length===0){container.innerHTML='';container.appendChild(emptyEl);emptyEl.style.display='block';return;}
    emptyEl.style.display='none';
    container.innerHTML=data.map(s=>{
      const alreadyLogged=s.history.includes(today),pct=s.targetDays?Math.min(100,(s.currentStreak/s.targetDays)*100):0;
      let cardClass='streak-card';if(s.completed)cardClass+=' complete';else if(s.currentStreak>0)cardClass+=' active';else if(s.currentStreak===0&&s.history.length>0&&!alreadyLogged)cardClass+=' dead';
      let badgeClass='status-badge badge-fresh',badgeText='Not Started';
      if(s.completed){badgeClass='status-badge badge-complete';badgeText='Complete';}else if(alreadyLogged){badgeClass='status-badge badge-active';badgeText='Logged Today';}else if(s.currentStreak>0){badgeClass='status-badge badge-active';badgeText='Active';}else if(s.history.length>0&&s.currentStreak===0){badgeClass='status-badge badge-dead';badgeText='Reset';}
      const maxDots=60,showDots=Math.min(s.targetDays,maxDots);const histSet=new Set(s.history),missedSet=new Set(s.missedDays||[]);const dotDates=[];const start=new Date(s.createdDate);
      for(let i=0;i<showDots;i++){const d=new Date(start);d.setDate(d.getDate()+i);dotDates.push(d.toISOString().split('T')[0]);}
      let dotsHtml=dotDates.map((dateStr,i)=>{let cls='dot';if(s.completed&&histSet.has(dateStr))cls+=' done-ok';else if(histSet.has(dateStr))cls+=' done';else if(missedSet.has(dateStr)&&dateStr<today)cls+=' missed';else if(dateStr===today&&!alreadyLogged)cls+=' today-dot';return'<div class="'+cls+'" title="Day '+(i+1)+': '+formatDate(dateStr)+'"></div>';}).join('');
      if(s.targetDays>maxDots)dotsHtml+='<span style="font-size:0.55rem;color:var(--text-muted);align-self:center;margin-left:4px">+'+(s.targetDays-maxDots)+' more</span>';
      const logDisabled=alreadyLogged||s.completed;
      return'<div class="'+cardClass+'" id="card-'+s.id+'"><div class="card-inner"><div class="card-left"><div class="task-name">'+escHtml(s.name)+'</div><div class="streak-meta"><span class="'+badgeClass+'">'+badgeText+'</span><span>started '+formatDate(s.createdDate)+'</span><span>'+s.targetDays+' days</span></div></div><div class="card-center"><div class="streak-number">'+s.currentStreak+'</div><div class="streak-label">/ '+s.targetDays+' days</div></div><div class="card-right"><button class="btn-log" onclick="streakLogToday(\''+s.id+'\')" '+(logDisabled?'disabled':'')+'>'+(s.completed?'✓ Done':alreadyLogged?'✓ Logged':'Log Today')+'</button><button class="btn-delete" onclick="streakDelete(\''+s.id+'\')">Delete</button></div></div><div class="progress-wrap"><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div><div class="progress-dots">'+dotsHtml+'</div></div></div>';
    }).join('');
  }
  window.streakRender=streakRender;
  let streakToastTimer;function streakShowToast(msg,type){const t=document.getElementById('streak-toast');t.textContent=msg;t.className='show'+(type?' toast-'+type:'');clearTimeout(streakToastTimer);streakToastTimer=setTimeout(()=>{t.className='';},3000);}window.streakShowToast=streakShowToast;
  const d=new Date();const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('today-display').textContent=days[d.getDay()]+', '+d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')streakCloseConfirm();if(e.key==='Enter'){const act=document.activeElement;if(act&&(act.id==='task-name'||act.id==='task-days'))streakCreate();}});
  streakRender();
})();

(function(){
const LS_KEY='lb_v2';let S;
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const now=()=>Date.now();
const fmtDate=ts=>{const d=new Date(ts);const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return mo[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear()};
const fmtFull=ts=>{const d=new Date(ts);const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return mo[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
function save(){localStorage.setItem(LS_KEY,JSON.stringify(S,(_,v)=>{if(_==='_pendingDelTimer'||_==='_pendingDelProjTimer')return undefined;return v}))}
function load(){try{S=JSON.parse(localStorage.getItem(LS_KEY))}catch{S=null}if(!S||!S.projects)S={projects:[],log:[],activeId:null,tab:'active',open:{},addingTop:false,_pendingDel:null,_pendingDelProj:null};S.open=S.open||{};S.addingTop=false;S._pendingDel=null;S._pendingDelTimer=null;S._pendingDelProj=null;S._pendingDelProjTimer=null;}
function calcStatus(t){if(!t.children||!t.children.length)return t.done?'done':'ns';const ss=t.children.map(calcStatus);if(ss.every(s=>s==='done'))return'done';if(ss.some(s=>s==='done'||s==='ip'))return'ip';return'ns';}
function projStatus(p){if(!p.children||!p.children.length)return'ns';const ss=p.children.map(calcStatus);if(ss.every(s=>s==='done'))return'done';if(ss.some(s=>s==='done'||s==='ip'))return'ip';return'ns';}
function countLeaves(t){let d=0,a=0;(function walk(n){if(!n.children||!n.children.length){a++;if(n.done)d++}else n.children.forEach(walk)})(t);return{d,a}}
function projPct(p){let d=0,a=0;p.children.forEach(c=>{const r=countLeaves(c);d+=r.d;a+=r.a});return a?Math.round(d/a*100):0}
function taskPct(t){const r=countLeaves(t);return r.a?Math.round(r.d/r.a*100):0}
function addLog(action,entity,proj,extra){S.log.unshift({id:uid(),ts:now(),action,entity,proj:proj||'',extra:extra||''});if(S.log.length>500)S.log.length=500;}
function syncTaskTree(children,proj){children.forEach(t=>{if(t.children&&t.children.length)syncTaskTree(t.children,proj);const st=calcStatus(t);const prev=t._prevStatus||'ns';if(st==='done'&&prev!=='done'){t.done=true;t.completedAt=now();addLog('task_done',t.title,proj.title)}if(prev==='done'&&st!=='done'){t.done=false;t.completedAt=null;addLog('task_reopen',t.title,proj.title)}t._prevStatus=st;});}
function syncProjectState(p){const st=projStatus(p);const prev=p._lastStatus||'ns';if(st==='done'&&prev!=='done'){p.completedAt=now();addLog('proj_done',p.title)}if(prev==='done'&&st!=='done'){p.completedAt=null;addLog('proj_reopen',p.title)}p._lastStatus=st;}
function findTask(children,id){for(const t of children){if(t.id===id)return t;if(t.children){const r=findTask(t.children,id);if(r)return r}}return null;}
function findProj(id){return S.projects.find(p=>p.id===id)}
function activeProj(){return S.activeId?findProj(S.activeId):null}
function createProject(title){const p={id:uid(),title,children:[],createdAt:now(),completedAt:null,_lastStatus:'ns'};S.projects.push(p);addLog('proj_created',title);S.activeId=p.id;S.tab='active';save();render();}
function deleteProject(id){const p=findProj(id);if(!p)return;addLog('proj_deleted',p.title);S.projects=S.projects.filter(x=>x.id!==id);if(S.activeId===id)S.activeId=null;save();render();}
function createTask(projId,title){const p=findProj(projId);if(!p)return;const t={id:uid(),title,children:[],notes:'',links:[],createdAt:now(),completedAt:null,done:false,expanded:true,_prevStatus:'ns'};p.children.push(t);addLog('task_created',title,p.title);syncTaskTree(p.children,p);syncProjectState(p);save();render();}
function createSubtask(projId,parentId,title){const p=findProj(projId);if(!p)return;const parent=findTask(p.children,parentId);if(!parent)return;if(!parent.children)parent.children=[];const t={id:uid(),title,children:[],notes:'',links:[],createdAt:now(),completedAt:null,done:false,expanded:true,_prevStatus:'ns'};parent.children.push(t);parent.expanded=true;addLog('subtask_added',title,p.title,parent.title);syncTaskTree(p.children,p);syncProjectState(p);save();render();}
function toggleTask(projId,taskId){const p=findProj(projId);if(!p)return;const t=findTask(p.children,taskId);if(!t)return;if(t.children&&t.children.length)return;t.done=!t.done;t.completedAt=t.done?now():null;t._prevStatus=t.done?'done':'ns';syncTaskTree(p.children,p);syncProjectState(p);save();render();}
function deleteTask(projId,taskId){const p=findProj(projId);if(!p)return;const t=findTask(p.children,taskId);const tName=t?t.title:'';function rm(arr){return arr.filter(x=>{if(x.id===taskId)return false;x.children=rm(x.children||[]);return true})}p.children=rm(p.children);addLog('task_deleted',tName,p.title);delete S.open[taskId];syncTaskTree(p.children,p);syncProjectState(p);save();render();}
function addLink(projId,taskId,url,customName){const p=findProj(projId);if(!p)return;const t=findTask(p.children,taskId);if(!t)return;let type='link',label='';try{const u=new URL(url);const h=u.hostname.replace('www.','');if(h.includes('youtube.com')||h.includes('youtu.be'))type='yt';else if(h.includes('chatgpt.com')||h.includes('chat.openai.com'))type='gpt';else if(h.includes('claude.ai'))type='claude';label=u.hostname.replace('www.','')+u.pathname;if(label.length>40)label=label.slice(0,38)+'…';}catch{label=url.length>40?url.slice(0,38)+'…':url}if(customName&&customName.trim())label=customName.trim();t.links.push({id:uid(),url,type,label});addLog('link_added',t.title,p.title);save();render();}
function removeLink(projId,taskId,linkId){const p=findProj(projId);if(!p)return;const t=findTask(p.children,taskId);if(!t)return;t.links=t.links.filter(l=>l.id!==linkId);save();render();}
function updateNotes(projId,taskId,val){const p=findProj(projId);if(!p)return;const t=findTask(p.children,taskId);if(!t)return;t.notes=val;save();}
function h(tag,attrs){const el=document.createElement(tag);const ch=Array.from(arguments).slice(2);if(attrs)Object.entries(attrs).forEach(([k,v])=>{if(k==='className')el.className=v;else if(k==='style'&&typeof v==='object')Object.assign(el.style,v);else if(k.startsWith('on'))el.addEventListener(k.slice(2).toLowerCase(),v);else el.setAttribute(k,v);});ch.flat(9).forEach(c=>{if(c==null)return;el.appendChild(typeof c==='string'?document.createTextNode(c):c)});return el;}
function statusColor(s){return s==='done'?'var(--lb-green)':s==='ip'?'var(--lb-amber)':'#333'}
function logColor(action){if(action.includes('done')||action.includes('created'))return'var(--lb-green)';if(action.includes('delete'))return'var(--lb-red)';if(action.includes('reopen'))return'var(--lb-amber)';if(action.includes('link'))return'var(--lb-blue)';return'var(--lb-muted)';}
function logDesc(e){const b=s=>h('b',{},s);switch(e.action){case'proj_created':return[b(e.entity),' created'];case'proj_deleted':return[b(e.entity),' deleted'];case'proj_done':return[b(e.entity),' completed'];case'proj_reopen':return[b(e.entity),' reopened'];case'task_created':return['Task ',b(e.entity),' added to ',b(e.proj)];case'subtask_added':return['Subtask ',b(e.entity),' added under ',b(e.extra),' in ',b(e.proj)];case'task_done':return['Task ',b(e.entity),' completed in ',b(e.proj)];case'task_reopen':return['Task ',b(e.entity),' reopened in ',b(e.proj)];case'task_deleted':return['Task ',b(e.entity),' deleted from ',b(e.proj)];case'link_added':return['Link added to ',b(e.entity),' in ',b(e.proj)];default:return[e.action];}}
function renderTabs(){const el=document.getElementById('lb-tabs');el.innerHTML='';['active','done','log'].forEach(t=>{const label=t==='active'?'Active':t==='done'?'Done':'Log';el.appendChild(h('div',{className:'lb-tab'+(S.tab===t?' active':''),onClick:()=>{S.tab=t;save();render()}},label));});}
function renderSidebarContent(){const el=document.getElementById('lb-sidebar-content');el.innerHTML='';if(S.tab==='active'){const active=S.projects.filter(p=>projPct(p)<100);if(!active.length){el.appendChild(h('div',{className:'lb-sidebar-empty'},'No active projects'));return}active.forEach(p=>{const pct=projPct(p);const st=projStatus(p);const isArmed=S._pendingDelProj===p.id;const row=h('div',{className:'lb-proj-row'+(S.activeId===p.id?' selected':''),onClick:()=>{S.activeId=p.id;save();render()}},h('div',{className:'lb-proj-dot',style:{background:statusColor(st)}}),h('div',{className:'lb-proj-info'},h('div',{className:'lb-proj-title'},p.title),h('div',{className:'lb-proj-bar-wrap'},h('div',{className:'lb-proj-bar',style:{width:pct+'%',background:statusColor(st)}}))),h('div',{className:'lb-proj-pct'},pct+'%'),h('div',{className:'lb-proj-del'+(isArmed?' armed':''),onClick:ev=>{ev.stopPropagation();if(isArmed){clearTimeout(S._pendingDelProjTimer);S._pendingDelProj=null;deleteProject(p.id);return}S._pendingDelProj=p.id;save();render();S._pendingDelProjTimer=setTimeout(()=>{S._pendingDelProj=null;save();render()},3000);}},isArmed?'?':'✕'));el.appendChild(row);});}else if(S.tab==='done'){const done=S.projects.filter(p=>projPct(p)>=100);if(!done.length){el.appendChild(h('div',{className:'lb-sidebar-empty'},'No completed projects'));return}done.forEach(p=>{el.appendChild(h('div',{className:'lb-done-row',style:{cursor:'pointer'},onClick:()=>{S.activeId=p.id;S.tab='active';save();render()}},h('div',{className:'lb-done-title'},p.title),h('div',{className:'lb-done-ts'},p.completedAt?fmtFull(p.completedAt):'')));});}else{if(!S.log.length){el.appendChild(h('div',{className:'lb-sidebar-empty'},'No activity yet'));return}S.log.forEach(e=>{el.appendChild(h('div',{className:'lb-log-entry'},h('div',{className:'lb-log-dot',style:{background:logColor(e.action)}}),h('div',{className:'lb-log-body'},h('div',{className:'lb-log-desc'},...logDesc(e)),h('div',{className:'lb-log-ts'},fmtFull(e.ts)))));});}}
function renderSidebarFooter(){const el=document.getElementById('lb-sidebar-footer');el.innerHTML='';if(S._addingProject){const wrap=h('div',{className:'lb-add-proj-row'});const inp=h('input',{placeholder:'Project name…',onKeydown:ev=>{if(ev.key==='Enter'&&inp.value.trim()){S._addingProject=false;createProject(inp.value.trim())}if(ev.key==='Escape'){S._addingProject=false;render()}}});const btn=h('button',{onClick:()=>{if(inp.value.trim()){S._addingProject=false;createProject(inp.value.trim())}}},'Add');wrap.append(inp,btn);el.appendChild(wrap);requestAnimationFrame(()=>inp.focus());}else{el.appendChild(h('button',{className:'lb-new-proj-btn',onClick:()=>{S._addingProject=true;render()}},'+ New Project'));}}
function renderMain(){const el=document.getElementById('lb-main');el.innerHTML='';const p=activeProj();if(!p){el.appendChild(h('div',{className:'lb-empty-state'},h('div',{className:'icon'},'📋'),h('p',{},'Select or create a project')));return;}const pct=projPct(p);const st=projStatus(p);const stLabel=st==='done'?'Completed':st==='ip'?'In Progress':'Not Started';const header=h('div',{className:'lb-proj-header'},h('h1',{},p.title),h('div',{className:'meta'},'Created '+fmtDate(p.createdAt)),h('div',{className:'lb-header-bar-wrap'},h('div',{className:'lb-header-bar',style:{width:pct+'%',background:statusColor(st)}})),h('div',{className:'lb-header-row'},h('div',{className:'lb-header-pct',style:{color:statusColor(st)}},pct+'%'),h('div',{className:'lb-status-badge '+st},stLabel)));el.appendChild(header);if(S.addingTop){const wrap=h('div',{className:'lb-add-top-input'});const inp=h('input',{placeholder:'Task name…',onKeydown:ev=>{if(ev.key==='Enter'&&inp.value.trim()){S.addingTop=false;createTask(p.id,inp.value.trim())}if(ev.key==='Escape'){S.addingTop=false;render()}}});wrap.appendChild(inp);el.appendChild(wrap);requestAnimationFrame(()=>inp.focus());}else{el.appendChild(h('button',{className:'lb-add-task-btn',onClick:()=>{S.addingTop=true;save();render()}},'+ Add task'));}const tree=h('div',{});p.children.forEach(t=>tree.appendChild(renderTaskNode(t,p)));el.appendChild(tree);}
function renderTaskNode(t,proj){const st=calcStatus(t);const hasChildren=t.children&&t.children.length>0;const pct=hasChildren?taskPct(t):0;const open=S.open[t.id]||{};const isArmed=S._pendingDel===t.id;const toggle=h('div',{className:'lb-expand-toggle'+(hasChildren?(t.expanded?' expanded':''):' hidden'),onClick:ev=>{ev.stopPropagation();if(hasChildren){t.expanded=!t.expanded;save();render()}}},'▶');const line=h('div',{className:'lb-status-line',style:{background:statusColor(st)}});let checkContent='';if(st==='done')checkContent='✓';else if(st==='ip')checkContent='◑';const check=h('div',{className:'lb-task-check'+(st==='done'?' done':st==='ip'?' ip':'')+(hasChildren?' readonly':''),onClick:ev=>{ev.stopPropagation();toggleTask(proj.id,t.id)}},checkContent);const body=h('div',{className:'lb-task-body'},h('div',{className:'lb-task-title'+(t.done?' completed':'')},t.title),hasChildren?h('div',{className:'lb-task-sub-info'},h('div',{className:'lb-mini-bar-wrap'},h('div',{className:'lb-mini-bar',style:{width:pct+'%',background:statusColor(st)}})),h('div',{className:'lb-mini-pct'},pct+'%')):null);const ts=t.completedAt?h('div',{className:'lb-task-ts'},fmtFull(t.completedAt)):null;const notesBadge=t.notes?h('div',{className:'badge',style:{background:'var(--lb-amber)'}}):null;const linksBadge=t.links&&t.links.length?h('div',{className:'badge',style:{background:'var(--lb-blue)'}}):null;const actions=h('div',{className:'lb-task-actions'+(isArmed?' force-show':'')},h('button',{className:'lb-act-btn',title:'Notes',onClick:ev=>{ev.stopPropagation();S.open[t.id]={...open,notes:!open.notes,links:false,addChild:false};save();render()}},'📝',notesBadge),h('button',{className:'lb-act-btn',title:'Links',onClick:ev=>{ev.stopPropagation();S.open[t.id]={...open,links:!open.links,notes:false,addChild:false};save();render()}},'🔗',linksBadge),h('button',{className:'lb-act-btn',title:'Add subtask',onClick:ev=>{ev.stopPropagation();S.open[t.id]={...open,addChild:!open.addChild,notes:false,links:false};save();render()}},'+'),h('button',{className:'lb-act-btn'+(isArmed?' del-armed':''),title:'Delete',onClick:ev=>{ev.stopPropagation();if(isArmed){clearTimeout(S._pendingDelTimer);S._pendingDel=null;deleteTask(proj.id,t.id);return}S._pendingDel=t.id;render();S._pendingDelTimer=setTimeout(()=>{S._pendingDel=null;render()},3000);}},isArmed?'?':'✕'));const row=h('div',{className:'lb-task-row'},toggle,line,check,body,ts,actions);const node=h('div',{className:'lb-task-node'},row);if(open.notes){const panel=h('div',{className:'lb-notes-panel'});const autoGrow=el=>{el.style.height='auto';el.style.height=el.scrollHeight+'px'};const ta=h('textarea',{placeholder:'Add notes…',onInput:ev=>{updateNotes(proj.id,t.id,ev.target.value);autoGrow(ev.target)}});ta.value=t.notes||'';panel.appendChild(ta);node.appendChild(panel);requestAnimationFrame(()=>{autoGrow(ta);ta.focus()});}if(open.links){const panel=h('div',{className:'lb-links-panel'});const inputsWrap=h('div',{className:'lb-link-inputs'});const nameRow=h('div',{className:'lb-link-input-row'});const nameInp=h('input',{placeholder:'Link name (optional)…'});nameRow.append(nameInp);const urlRow=h('div',{className:'lb-link-input-row'});const urlInp=h('input',{placeholder:'Paste URL…',onKeydown:ev=>{if(ev.key==='Enter'&&urlInp.value.trim()){addLink(proj.id,t.id,urlInp.value.trim(),nameInp.value)}}});const addBtn=h('button',{onClick:()=>{if(urlInp.value.trim())addLink(proj.id,t.id,urlInp.value.trim(),nameInp.value)}},'Add');urlRow.append(urlInp,addBtn);inputsWrap.append(nameRow,urlRow);panel.appendChild(inputsWrap);(t.links||[]).forEach(l=>{panel.appendChild(h('div',{className:'lb-link-item'},h('span',{className:'lb-link-badge '+l.type},l.type==='yt'?'YT':l.type==='gpt'?'GPT':l.type==='claude'?'Claude':'Link'),h('a',{className:'lb-link-url',href:l.url,target:'_blank',rel:'noopener'},l.label),h('span',{className:'lb-link-del',onClick:()=>removeLink(proj.id,t.id,l.id)},'✕')));});node.appendChild(panel);requestAnimationFrame(()=>nameInp.focus());}if(open.addChild){const wrap=h('div',{className:'lb-add-child-wrap'});const inp=h('input',{placeholder:'Subtask name…',onKeydown:ev=>{if(ev.key==='Enter'&&inp.value.trim()){S.open[t.id]={...S.open[t.id],addChild:false};createSubtask(proj.id,t.id,inp.value.trim())}if(ev.key==='Escape'){S.open[t.id]={...S.open[t.id],addChild:false};render()}}});wrap.appendChild(inp);node.appendChild(wrap);requestAnimationFrame(()=>inp.focus());}if(hasChildren&&t.expanded){const childWrap=h('div',{className:'lb-task-children'});t.children.forEach(c=>childWrap.appendChild(renderTaskNode(c,proj)));node.appendChild(childWrap);}return node;}
function render(){renderTabs();renderSidebarContent();renderSidebarFooter();renderMain();}
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(S.addingTop){S.addingTop=false;save();render()}if(S._addingProject){S._addingProject=false;render()}}});
load();render();
})();
