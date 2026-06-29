import { C } from '../theme.js';
import { onVisible } from '../util.js';
import { testing } from '../data.js';

const ICONS = {
  soil:'<path stroke-linecap="round" stroke-linejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  forage:'<path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 17l-5.5 2.8 1-6.3L3 8.9 9 8z"/>',
  dna:'<path stroke-linecap="round" stroke-linejoin="round" d="M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12M7 21c0-2 10-2 10 0M7 3c0-2 10-2 10 0M8 7h8M9 17h6"/>',
  water:'<path stroke-linecap="round" stroke-linejoin="round" d="M12 2a8 8 0 018 8c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 018-8z"/>',
  health:'<path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
};
const svg = (k)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[k]||ICONS.soil}</svg>`;
const statusColor = (s)=> s==='good'?C.green : s==='watch'?C.amber : C.red;

export function initTesting(){
  const tabsEl=document.getElementById('testTabs');
  const activeEl=document.getElementById('testActive');
  if(!tabsEl||!activeEl) return;
  const keys=Object.keys(testing);

  tabsEl.innerHTML = keys.map((k,i)=>{
    const t=testing[k];
    return `<button class="test-tab${i===0?' active':''}" data-k="${k}">
      <span class="tn">${t.samples}</span>
      <span class="ti">${svg(t.icon)}</span>
      <span class="tt">${t.label}</span>
      <span class="tc">${t.tagline}</span>
    </button>`;
  }).join('');

  const render=(k)=>{
    const t=testing[k];
    activeEl.innerHTML = `
      <div class="panel">
        <div class="grid-2" style="align-items:start">
          <div>
            <h3 style="font-size:22px">${t.label} testing</h3>
            <p style="color:var(--text-2);font-size:14.5px;margin:8px 0 14px">${t.intro}</p>
            <table class="tbl">
              <thead><tr><th>What &amp; how often</th><th>Cadence</th><th class="num">Lab TAT</th></tr></thead>
              <tbody>${t.cadenceRows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('')}</tbody>
            </table>
            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:14px">
              <div><div class="cow-meta">Volume</div><div style="font-family:'Space Grotesk';font-weight:700;font-size:18px;color:var(--green)">${t.samples}</div></div>
            </div>
          </div>

          <div class="lab-report">
            <div class="lr-head">
              <div><div class="t">Sample report</div><div class="m">${t.report.lab}</div></div>
              <div style="text-align:right"><div class="m">${t.report.sample}</div><div class="m">${t.report.date}</div></div>
            </div>
            <table class="tbl">
              <thead><tr><th>Analyte</th><th class="num">Result</th><th class="num">Reference</th><th class="num">Status</th></tr></thead>
              <tbody>${t.report.rows.map(r=>`<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num"><span class="badge2 ${r[3]}">${r[3]}</span></td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>

        <h3 style="font-size:17px;margin:22px 0 12px">Full panel — latest example results</h3>
        <div class="analyte-grid">
          ${t.analytes.map(a=>`
            <div class="analyte">
              <div class="top"><span class="nm">${a.nm}</span><span class="badge2 ${a.status}">${a.status}</span></div>
              <div class="val">${a.val}<span style="font-size:13px;color:var(--muted);font-weight:500"> ${a.unit}</span></div>
              <div class="rng">${a.rng}</div>
              <div class="meter"><i style="width:${a.pct}%;background:${statusColor(a.status)}"></i></div>
            </div>`).join('')}
        </div>
      </div>`;
  };

  tabsEl.addEventListener('click',e=>{
    const b=e.target.closest('.test-tab'); if(!b) return;
    tabsEl.querySelectorAll('.test-tab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); render(b.dataset.k);
  });
  render(keys[0]);

  // ingestion pipeline hover
  const pipe=document.getElementById('ingestPipeline'), detail=document.getElementById('ingestDetail');
  if(pipe&&detail){
    const steps=[...pipe.querySelectorAll('.pipe-step')];
    const show=(s)=>{ steps.forEach(x=>x.classList.remove('active')); s.classList.add('active'); detail.textContent=s.getAttribute('data-detail'); };
    steps.forEach(s=>{ s.addEventListener('mouseenter',()=>show(s)); s.addEventListener('click',()=>show(s)); });
    detail.textContent=steps[0].getAttribute('data-detail');
  }

  // cost chart
  const costEl=document.getElementById('testingCostChart');
  onVisible(costEl, ()=>{
    const ctx=costEl.getContext('2d');
    new Chart(ctx,{type:'bar',data:{
      labels:['Soil (~10 composites)','Forage (~7 samples)','Water (~10 samples)','Animal health (~50 tests)'],
      datasets:[{label:'Annual recurring cost (£)',data:[700,280,350,900],backgroundColor:[C.amber,C.lime,C.sky,C.red],borderRadius:8,maxBarThickness:56}]
    },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'~£'+c.parsed.y.toLocaleString()+'/yr'}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>'£'+Number(v).toLocaleString()}},x:{grid:{display:false}}}}});
  });
}
