import { C } from '../theme.js';
import { cows, cuts } from '../data.js';

let weightChart, ebvChart, calfChart;

/* Centroids for each cut — used to place injury markers. */
const CENTRES = {
  neck:[180,132], chuck:[237,127], rib:[305,127], loin:[377,124], rump:[442,126],
  round:[497,150], brisket:[193,189], plate:[288,191], flank:[405,190],
  head:[102,132], foreshank:[193,250], hindshank:[497,250],
};

function butcherSVG(){
  return `
  <svg viewBox="0 0 600 320" class="cowsvg" aria-label="Butcher's-chart cow body map">
    <!-- far-side legs (decorative) -->
    <path d="M160 205 L178 207 L176 286 L160 286 Z" fill="#33433a"/>
    <path d="M462 205 L480 203 L482 284 L466 284 Z" fill="#33433a"/>
    <!-- tail -->
    <path d="M518 112 C548 140 542 196 520 232" fill="none" stroke="#4a5a50" stroke-width="4"/>
    <circle cx="520" cy="236" r="6" fill="#4a5a50"/>

    <g class="cuts">
      <path class="cut" data-cut="head" fill="#586b60" d="M150 108 L150 162 L126 168 C100 172 76 156 68 128 C64 110 82 96 106 95 L150 108 Z"/>
      <polygon class="cut" data-cut="neck"    fill="#6b8f71" points="150,108 205,92 205,162 150,162"/>
      <polygon class="cut" data-cut="chuck"   fill="#c98a5b" points="205,92 270,88 270,162 205,162"/>
      <polygon class="cut" data-cut="rib"     fill="#b5654f" points="270,88 340,90 340,162 270,162"/>
      <polygon class="cut" data-cut="loin"    fill="#a64b53" points="340,90 415,84 415,162 340,162"/>
      <polygon class="cut" data-cut="rump"    fill="#8e6a9e" points="415,84 470,92 470,162 415,162"/>
      <polygon class="cut" data-cut="round"   fill="#5f7da6" points="470,92 520,108 520,198 470,206"/>
      <polygon class="cut" data-cut="brisket" fill="#c2a35a" points="150,162 235,162 235,213 150,200"/>
      <polygon class="cut" data-cut="plate"   fill="#b08968" points="235,162 340,162 340,216 235,213"/>
      <polygon class="cut" data-cut="flank"   fill="#7a9b6e" points="340,162 470,162 470,206 340,216"/>
      <path class="cut" data-cut="foreshank"  fill="#7d6f57" d="M180 210 L206 213 L204 290 L185 290 Z"/>
      <path class="cut" data-cut="hindshank"  fill="#6f7d57" d="M483 205 L508 200 L509 290 L489 290 Z"/>
    </g>

    <!-- hooves -->
    <rect x="183" y="289" width="23" height="9" rx="2" fill="#243029"/>
    <rect x="487" y="289" width="23" height="9" rx="2" fill="#243029"/>

    <!-- head detail -->
    <path d="M108 96 L100 78 L120 90 Z" fill="#586b60"/>
    <circle cx="98" cy="124" r="3.4" fill="#10231a"/>
    <path d="M70 132 q-8 4 -2 12" fill="none" stroke="#10231a" stroke-width="2" stroke-linecap="round"/>

    <g class="cut-labels" font-family="Outfit">
      <text class="cutlabel" x="180" y="135">Neck</text>
      <text class="cutlabel" x="237" y="130">Chuck</text>
      <text class="cutlabel" x="305" y="130">Rib</text>
      <text class="cutlabel" x="377" y="128">Loin</text>
      <text class="cutlabel" x="442" y="130">Rump</text>
      <text class="cutlabel" x="497" y="153">Round</text>
      <text class="cutlabel" x="193" y="191">Brisket</text>
      <text class="cutlabel" x="288" y="194">Plate</text>
      <text class="cutlabel" x="405" y="193">Flank</text>
      <text class="cutlabel" x="100" y="135">Head</text>
    </g>

    <g id="cowMarkers"></g>
  </svg>`;
}

export function initCattle(){
  const list=document.getElementById('cowList');
  if(!list) return;
  list.innerHTML = cows.map((c,i)=>`
    <button class="cow-item${i===0?' active':''}" data-i="${i}">
      <span class="av2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 10c0-3 3-4 5-4M20 10c0-3-3-4-5-4M5 10c-1 4 2 9 7 9s8-5 7-9M9 6V4M15 6V4M9.5 13h.01M14.5 13h.01"/></svg></span>
      <span class="grow"><span class="cow-id">${c.id}</span><br><span class="cow-meta">${c.breed} · ${c.weightNow}</span></span>
      <span class="tag ${c.vaxUpToDate?'ok':'warn'}">${c.vaxUpToDate?'Vax OK':'Vax due'}</span>
    </button>`).join('');
  list.querySelectorAll('.cow-item').forEach(btn=>{
    btn.addEventListener('click',()=>{
      list.querySelectorAll('.cow-item').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      renderCow(cows[+btn.dataset.i]);
    });
  });
  renderCow(cows[0]);
}

function renderCow(c){
  const detail=document.getElementById('cowDetail');
  detail.innerHTML = `
    <div class="cow-head">
      <div>
        <div class="id">${c.id}</div>
        <div class="sub">${c.tag} · ${c.breed} · ${c.sex} · ${c.age}</div>
        <div class="sub">${c.loc}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">
        <span class="tag ${c.vaxUpToDate?'ok':'warn'}">${c.vaxUpToDate?'Vaccinations up to date':'Vaccinations due'}</span>
        <span class="tag">${c.dna.profile.split('—')[0].trim()}</span>
      </div>
    </div>

    <div class="kv">
      <div class="k"><div class="v">${c.weightNow}</div><div class="l">Current weight</div></div>
      <div class="k"><div class="v">${c.adg}</div><div class="l">Avg daily gain</div></div>
      <div class="k"><div class="v">${c.bcs}</div><div class="l">Body condition</div></div>
      <div class="k"><div class="v">${c.calvesCount}</div><div class="l">Calves produced</div></div>
    </div>

    <div class="cow-subtabs" id="cowSubtabs">
      <button class="toggle active" data-p="overview">Overview</button>
      <button class="toggle" data-p="health">Health</button>
      <button class="toggle" data-p="genetics">Genetics &amp; DNA</button>
      <button class="toggle" data-p="calves">Calves</button>
    </div>

    <div class="cow-pane active" data-p="overview">
      <div class="butcher-wrap">
        <div class="butcher" id="butcher">${butcherSVG()}</div>
        <div>
          <div class="cut-info" id="cutInfo">
            <div class="cn">Hover a cut</div>
            <div class="ck">Butcher's-chart body map</div>
            <div class="cs">Move over any section of the animal to see the cut and any injury or ailment recorded there for ${c.id}.</div>
          </div>
          <div class="cut-legend">
            <span><span class="badge2">no finding</span></span>
            <span><span class="badge2 watch">ailment</span></span>
            <span><span class="badge2 act">injury</span></span>
          </div>
        </div>
      </div>
      <div class="grid-2" style="align-items:start;margin-top:16px">
        <div>
          <h3 style="font-size:16px;margin-bottom:8px">Injury &amp; ailment history</h3>
          <div class="ail-list" id="ailList"></div>
        </div>
        <div class="card" style="padding:16px">
          <h3 style="font-size:16px;margin-bottom:6px">Weight trend</h3>
          <div class="chart-wrap" style="height:200px"><canvas id="cowWeightChart"></canvas></div>
        </div>
      </div>
    </div>

    <div class="cow-pane" data-p="health">
      <div class="grid-2" style="align-items:start">
        <div class="card" style="padding:16px">
          <h3 style="font-size:16px;margin-bottom:6px">Vaccination schedule</h3>
          <table class="tbl">
            <thead><tr><th>Vaccine</th><th class="num">Last</th><th class="num">Next due</th><th class="num">Status</th></tr></thead>
            <tbody>${c.vaccinations.map(v=>`<tr><td>${v[0]}</td><td class="num">${v[1]}</td><td class="num">${v[2]}</td><td class="num"><span class="badge2 ${v[3]==='ok'?'good':'act'}">${v[3]==='ok'?'ok':'due'}</span></td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="card" style="padding:16px">
          <h3 style="font-size:16px;margin-bottom:6px">Current medicines &amp; dosage</h3>
          <table class="tbl">
            <thead><tr><th>Medicine</th><th>Dose</th><th class="num">Status</th></tr></thead>
            <tbody>${c.meds.map(m=>`<tr><td>${m[0]}</td><td>${m[1]}</td><td class="num">${m[2]}</td></tr>`).join('')}</tbody>
          </table>
          <h3 style="font-size:16px;margin:14px 0 6px">Active findings</h3>
          <div class="ail-list" id="ailList2"></div>
        </div>
      </div>
    </div>

    <div class="cow-pane" data-p="genetics">
      <div class="gene-grid">
        <div>
          <div class="card" style="padding:16px;margin-bottom:14px">
            <h3 style="font-size:16px;margin-bottom:8px">Genomic profile</h3>
            <table class="tbl">
              <tbody>
                <tr><td>Test level</td><td class="num">${c.dna.profile}</td></tr>
                <tr><td>Sire</td><td class="num">${c.dna.sire}</td></tr>
                <tr><td>Dam</td><td class="num">${c.dna.dam}</td></tr>
                <tr><td>Parentage</td><td class="num">${c.dna.parentage}</td></tr>
              </tbody>
            </table>
            <h3 style="font-size:15px;margin:14px 0 8px">Breed composition</h3>
            ${c.dna.composition.map(b=>`<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-2)"><span>${b[0]}</span><b style="font-family:'Space Grotesk'">${b[1]}%</b></div><div class="bar-line"><i style="width:${b[1]}%"></i></div></div>`).join('')}
          </div>
          <div class="card" style="padding:16px">
            <h3 style="font-size:15px;margin-bottom:8px">Genetic conditions &amp; markers</h3>
            <div class="marker-list">
              ${c.dna.conditions.map(x=>`<div class="marker-row"><span class="mn">${x[0]}</span><span class="badge2 ${x[1]==='Free'?'good':'watch'}">${x[1]}</span></div>`).join('')}
              ${c.dna.markers.map(x=>`<div class="marker-row"><span class="mn">${x[0]}</span><b style="font-family:'Space Grotesk';font-size:12.5px">${x[1]}</b></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="card" style="padding:16px">
          <h3 style="font-size:16px;margin-bottom:6px">Genomic EBVs <span class="cow-meta">(breed percentile)</span></h3>
          <div class="chart-wrap" style="height:300px"><canvas id="ebvChart"></canvas></div>
          <p class="note" style="margin-top:6px">Higher percentile = better vs. the breed. Drives mate plans, replacement ranking and culling flags.</p>
        </div>
      </div>
    </div>

    <div class="cow-pane" data-p="calves">
      ${c.calves.length ? `
      <div class="calf-grid" id="calfGrid">
        ${c.calves.map((cf,i)=>`
          <button class="calf-card${i===0?' active':''}" data-i="${i}">
            <div class="cid">${cf.id}</div>
            <div class="cmini">${cf.sex} · born ${cf.born}</div>
            <div class="crow"><span>Birth wt</span><b>${cf.birthWeight} kg</b></div>
            <div class="crow"><span>Current</span><b>${cf.currentWeight} kg</b></div>
            <div class="crow"><span>ADG</span><b>${cf.adg}</b></div>
          </button>`).join('')}
      </div>
      <div class="grid-2" style="align-items:start">
        <div class="card" style="padding:16px">
          <h3 style="font-size:16px;margin-bottom:6px" id="calfTitle">${c.calves[0].id} — birth &amp; rearing</h3>
          <table class="tbl"><tbody id="calfDetail"></tbody></table>
        </div>
        <div class="card" style="padding:16px">
          <h3 style="font-size:16px;margin-bottom:6px">Growth curve</h3>
          <div class="chart-wrap" style="height:230px"><canvas id="calfChart"></canvas></div>
        </div>
      </div>` : `<div class="callout">This animal is a stock sire — no calving records. Progeny are tracked against their dams. Average progeny birth weight: <strong>${c.calving.calfWeight}</strong>.</div>`}
    </div>`;

  wireSubtabs();
  renderAilments(c);
  wireButcher(c);
  buildWeightChart(c);
  buildEbvChart(c);
  if(c.calves.length) wireCalves(c);
}

function wireSubtabs(){
  const tabs=document.getElementById('cowSubtabs');
  const panes=[...document.querySelectorAll('#cowDetail .cow-pane')];
  tabs.addEventListener('click',e=>{
    const b=e.target.closest('.toggle'); if(!b) return;
    tabs.querySelectorAll('.toggle').forEach(x=>x.classList.remove('active'));
    panes.forEach(p=>p.classList.remove('active'));
    b.classList.add('active');
    document.querySelector(`#cowDetail .cow-pane[data-p="${b.dataset.p}"]`).classList.add('active');
  });
}

function ailHTML(a){
  return `<div class="ail"><span class="dotc ${a.sev}"></span><span><div>${a.text}</div><div class="when">${(cuts[a.cut]?cuts[a.cut].name:a.cut)} · ${a.when}</div></span></div>`;
}
function renderAilments(c){
  const html = c.ailments.length ? c.ailments.map(ailHTML).join('') : '<div class="ail"><span class="dotc"></span><span>No injuries or ailments on record.</span></div>';
  const a=document.getElementById('ailList'); if(a) a.innerHTML=html;
  const b=document.getElementById('ailList2'); if(b) b.innerHTML=html;
}

function wireButcher(c){
  const wrap=document.getElementById('butcher');
  const info=document.getElementById('cutInfo');
  if(!wrap||!info) return;
  const markers=wrap.querySelector('#cowMarkers');
  const byCut={}; c.ailments.forEach(a=>byCut[a.cut]=a);

  // highlight injured cuts + drop markers
  wrap.querySelectorAll('.cut').forEach(el=>{
    const id=el.dataset.cut, a=byCut[id];
    el.classList.remove('injury-warning','injury-high','sel');
    if(a) el.classList.add(a.sev==='high'?'injury-high':'injury-warning');
  });
  markers.innerHTML = c.ailments.map(a=>{
    const ctr=CENTRES[a.cut]; if(!ctr) return '';
    return `<circle class="marker ${a.sev==='high'?'high':''}" cx="${ctr[0]}" cy="${ctr[1]-10}" r="6"/>`;
  }).join('');

  const show=(id)=>{
    const meta=cuts[id]||{name:id,note:''};
    const a=byCut[id];
    wrap.querySelectorAll('.cut').forEach(x=>x.classList.toggle('sel',x.dataset.cut===id));
    info.innerHTML = `
      <div class="cn">${meta.name}</div>
      <div class="ck">${meta.note}</div>
      <div class="cs">${ a ? `<span class="badge2 ${a.sev==='high'?'act':'watch'}">${a.sev==='high'?'injury':'ailment'}</span> ${a.text} <span style="color:var(--muted)">(${a.when})</span>` : '<span class="badge2 good">no finding</span> No injury or ailment recorded on this cut.' }</div>`;
  };
  wrap.querySelectorAll('.cut').forEach(el=>{
    el.addEventListener('mouseenter',()=>show(el.dataset.cut));
    el.addEventListener('click',()=>show(el.dataset.cut));
  });
}

function buildWeightChart(c){
  const el=document.getElementById('cowWeightChart'); if(!el) return;
  const ctx=el.getContext('2d');
  if(weightChart) weightChart.destroy();
  weightChart=new Chart(ctx,{type:'line',data:{labels:['M-5','M-4','M-3','M-2','M-1','Now'],datasets:[
    {label:'Weight (kg)',data:c.weightSeries,borderColor:C.green,backgroundColor:'rgba(74,222,128,.14)',fill:true,tension:.35,pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(74,222,128,0.06)'}},x:{grid:{display:false}}}}});
}

function buildEbvChart(c){
  const el=document.getElementById('ebvChart'); if(!el) return;
  const ctx=el.getContext('2d');
  if(ebvChart) ebvChart.destroy();
  const labels=Object.keys(c.dna.ebv), data=labels.map(k=>c.dna.ebv[k]);
  ebvChart=new Chart(ctx,{type:'radar',data:{labels,datasets:[
    {label:c.id,data,borderColor:C.green,backgroundColor:'rgba(74,222,128,0.18)',pointBackgroundColor:C.green}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:100,grid:{color:'rgba(74,222,128,0.1)'},angleLines:{color:'rgba(74,222,128,0.1)'},pointLabels:{color:'#c8e6d4',font:{size:11}},ticks:{display:false}}}}});
}

function wireCalves(c){
  const grid=document.getElementById('calfGrid'); if(!grid) return;
  const render=(cf)=>{
    document.getElementById('calfTitle').textContent=`${cf.id} — birth & rearing`;
    document.getElementById('calfDetail').innerHTML=`
      <tr><td>Sex</td><td class="num">${cf.sex}</td></tr>
      <tr><td>Date of birth</td><td class="num">${cf.born}</td></tr>
      <tr><td>Gestation length</td><td class="num">${cf.gestation}</td></tr>
      <tr><td>Calving ease</td><td class="num"><span class="badge2 ${cf.birthEase==='Unassisted'?'good':'watch'}">${cf.birthEase}</span></td></tr>
      <tr><td>Birth weight</td><td class="num">${cf.birthWeight} kg</td></tr>
      <tr><td>Weaning weight</td><td class="num">${cf.weaningWeight}</td></tr>
      <tr><td>Current weight</td><td class="num">${cf.currentWeight} kg</td></tr>
      <tr><td>Avg daily gain</td><td class="num">${cf.adg}</td></tr>`;
    const el=document.getElementById('calfChart'); const ctx=el.getContext('2d');
    if(calfChart) calfChart.destroy();
    calfChart=new Chart(ctx,{type:'line',data:{labels:['Birth','+2m','+4m','+6m','+9m','Now'],datasets:[
      {label:cf.id+' weight (kg)',data:cf.growth,borderColor:C.sky,backgroundColor:'rgba(56,189,248,.14)',fill:true,tension:.35,pointRadius:3}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(74,222,128,0.06)'}},x:{grid:{display:false}}}}});
  };
  grid.querySelectorAll('.calf-card').forEach(btn=>{
    btn.addEventListener('click',()=>{
      grid.querySelectorAll('.calf-card').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active'); render(c.calves[+btn.dataset.i]);
    });
  });
  render(c.calves[0]);
}
