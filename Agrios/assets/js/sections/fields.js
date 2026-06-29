import { C } from '../theme.js';
import { fieldSeries, fieldRounds } from '../data.js';

const NS='http://www.w3.org/2000/svg';
// farm boundary corners (match coverage overlay): TL, TR, BR, BL
const TL=[70,90], TR=[930,60], BR=[945,930], BL=[90,945];
const QUAD = {A:'A (NW)', B:'B (NE)', C:'C (SW)', D:'D (SE)'};

// bilinear interpolation across the boundary quad
function pt(u,v){
  const top =[ TL[0]+(TR[0]-TL[0])*u, TL[1]+(TR[1]-TL[1])*u ];
  const bot =[ BL[0]+(BR[0]-BL[0])*u, BL[1]+(BR[1]-BL[1])*u ];
  return [ top[0]+(bot[0]-top[0])*v, top[1]+(bot[1]-top[1])*v ];
}
// row/col (0..3) -> cell id like A1
function cellId(r,c){
  const q = (r<2 ? (c<2?'A':'B') : (c<2?'C':'D'));
  const sr = r%2, sc = c%2;
  return q + (sr*2 + sc + 1);
}
const statusOf = (events)=> (events[0] && events[0][2]) || 'good';

export function initFields(){
  const overlay=document.getElementById('fieldOverlay');
  if(!overlay) return;

  // quadrant divide bands (mid lines u=0.5 and v=0.5)
  const band=(p1,p2)=>{ const l=document.createElementNS(NS,'line');
    l.setAttribute('x1',p1[0]);l.setAttribute('y1',p1[1]);l.setAttribute('x2',p2[0]);l.setAttribute('y2',p2[1]);
    l.setAttribute('class','quadband'); return l; };

  const cells=[];
  for(let r=0;r<4;r++){
    for(let c=0;c<4;c++){
      const id=cellId(r,c);
      const p0=pt(c/4,r/4), p1=pt((c+1)/4,r/4), p2=pt((c+1)/4,(r+1)/4), p3=pt(c/4,(r+1)/4);
      const poly=document.createElementNS(NS,'polygon');
      poly.setAttribute('points',`${p0} ${p1} ${p2} ${p3}`);
      poly.setAttribute('class','qcell');
      poly.dataset.id=id;
      const st=statusOf(fieldSeries[id].events);
      if(st!=='good') poly.style.stroke = st==='watch'? C.amber : C.red;
      overlay.appendChild(poly);
      cells.push(poly);
      const ctr=pt((c+0.5)/4,(r+0.5)/4);
      const tx=document.createElementNS(NS,'text');
      tx.setAttribute('x',ctr[0]);tx.setAttribute('y',ctr[1]+6);tx.setAttribute('class','qlabel');
      tx.textContent=id; overlay.appendChild(tx);
    }
  }
  // draw quadrant divides on top
  overlay.appendChild(band(pt(0.5,0),pt(0.5,1)));
  overlay.appendChild(band(pt(0,0.5),pt(1,0.5)));

  let chart;
  const acresLabel = '~31 acres';
  function render(id){
    const d=fieldSeries[id];
    const q=id[0];
    cells.forEach(c=>c.classList.toggle('active', c.dataset.id===id));
    document.getElementById('fieldTitle').textContent='Cell '+id;
    const last = d.events[0] ? d.events[0][0] : '—';
    document.getElementById('fieldSub').textContent=`Quadrant ${QUAD[q]} · ${acresLabel} · last tested ${last}`;
    const st=statusOf(d.events);
    const sEl=document.getElementById('fieldStatus'); sEl.textContent=st; sEl.className='badge2 '+st;

    const L=(arr)=>arr[arr.length-1];

    // Clear the old stat-box summary — everything goes in the table
    const sumEl = document.getElementById('fieldSummary');
    if(sumEl) sumEl.innerHTML = '';

    // Status badge helper based on standard AHDB grassland targets
    const badge=(s)=>`<span class="badge2 ${s}">${s}</span>`;
    function phStatus(v){ return v>=6.0&&v<=6.5?'good': v>=5.7?'watch':'act'; }
    function pStatus(v) { return v>=16&&v<=25?'good': v>=11?'watch':'act'; }
    function kStatus(v) { return v>=121&&v<=180?'good': v>=101?'watch':'act'; }
    function mgStatus(v){ return v>=51&&v<=100?'good': v>=26?'watch':'act'; }
    function omStatus(v){ return v>=5?'good': v>=3.5?'watch':'act'; }
    function sStatus(v) { return v>=10?'good': v>=7?'watch':'act'; }

    const ph=L(d.ph), p=L(d.p), k=L(d.k), mg=L(d.mg), om=L(d.om);

    document.getElementById('fieldExtra').innerHTML=`
      <tr class="tbl-head-row">
        <th>Analyte</th><th class="num">Latest result</th><th class="num">AHDB target / range</th><th class="num">Status</th>
      </tr>
      <tr><td>pH</td>
          <td class="num"><strong>${ph.toFixed(1)}</strong></td>
          <td class="num">Target 6.0–6.5</td>
          <td class="num">${badge(phStatus(ph))}</td></tr>
      <tr><td>Phosphorus (P)</td>
          <td class="num"><strong>${p} mg/L</strong></td>
          <td class="num">Index 2: 16–25 mg/L</td>
          <td class="num">${badge(pStatus(p))}</td></tr>
      <tr><td>Potassium (K)</td>
          <td class="num"><strong>${k} mg/L</strong></td>
          <td class="num">Index 2: 121–180 mg/L</td>
          <td class="num">${badge(kStatus(k))}</td></tr>
      <tr><td>Magnesium (Mg)</td>
          <td class="num"><strong>${mg} mg/L</strong></td>
          <td class="num">Index 2: 51–100 mg/L</td>
          <td class="num">${badge(mgStatus(mg))}</td></tr>
      <tr><td>Organic matter</td>
          <td class="num"><strong>${om.toFixed(1)}%</strong></td>
          <td class="num">Good &gt;5%</td>
          <td class="num">${badge(omStatus(om))}</td></tr>
      <tr><td>Sulphur (S)</td>
          <td class="num"><strong>${d.latest.S} mg/L</strong></td>
          <td class="num">Adequate &gt;10 mg/L</td>
          <td class="num">${badge(sStatus(d.latest.S))}</td></tr>
      <tr><td>CEC</td>
          <td class="num"><strong>${d.latest.CEC} meq/100g</strong></td>
          <td class="num">Medium: 12–18</td>
          <td class="num"><span class="badge2 good">info</span></td></tr>
      <tr><td>Soil texture</td>
          <td class="num"><strong>${d.latest.texture}</strong></td>
          <td class="num">—</td>
          <td class="num">—</td></tr>
      <tr><td>Soil moisture (live)</td>
          <td class="num"><strong>${d.latest.moist}</strong></td>
          <td class="num">Sensor reading</td>
          <td class="num">—</td></tr>`;

    document.getElementById('fieldEventsTitle').textContent='Cell '+id;
    document.getElementById('fieldEventTable').innerHTML=d.events.map(e=>`<tr><td>${e[0]}</td><td>${e[1]}</td><td class="num"><span class="badge2 ${e[2]}">${e[2]}</span></td><td class="num">${e[3]}</td></tr>`).join('');

    const ctx=document.getElementById('fieldNutrientChart').getContext('2d');
    if(chart) chart.destroy();
    chart=new Chart(ctx,{type:'line',data:{labels:fieldRounds,datasets:[
      {label:'pH',data:d.ph,borderColor:C.sky,tension:.35,pointRadius:2,yAxisID:'y1'},
      {label:'P mg/L',data:d.p,borderColor:C.amber,tension:.35,pointRadius:2},
      {label:'K mg/L',data:d.k,borderColor:C.lime,tension:.35,pointRadius:2},
      {label:'OM %',data:d.om,borderColor:C.violet,tension:.35,pointRadius:2,yAxisID:'y1'},
    ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{boxWidth:10,usePointStyle:true}}},
      scales:{y:{position:'left',grid:{color:'rgba(74,222,128,0.06)'},title:{display:true,text:'P / K'}},
              y1:{position:'right',grid:{display:false},title:{display:true,text:'pH / OM'}},
              x:{grid:{display:false}}}}});
  }

  cells.forEach(c=>{
    c.addEventListener('mouseenter',()=>render(c.dataset.id));
    c.addEventListener('click',()=>render(c.dataset.id));
  });
  render('A1');
}
