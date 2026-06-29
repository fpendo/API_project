import { C, grad } from '../theme.js';
import { onVisible } from '../util.js';

export function initAnalytics(){
  const months=['M0','M3','M6','M9','M12','M18','M24'];
  const profitData={
    profit:{base:[100,101,102,103,104,106,108],agrios:[100,104,110,116,122,131,138],label:'Indexed profit / head',c:C.green},
    cost:{base:[100,100,101,101,102,103,104],agrios:[100,97,93,89,85,81,78],label:'Indexed operating cost',c:C.amber}
  };
  let profitChart;
  function mkProfit(mode){
    const el=document.getElementById('profitChart'); if(!el) return;
    const ctx=el.getContext('2d'); const d=profitData[mode];
    if(profitChart) profitChart.destroy();
    profitChart=new Chart(ctx,{type:'line',data:{labels:months,datasets:[
      {label:'Baseline',data:d.base,borderColor:'#5d7a67',borderDash:[6,5],backgroundColor:'transparent',tension:.35,pointRadius:2},
      {label:'With Gupworthy Farm',data:d.agrios,borderColor:d.c,backgroundColor:grad(ctx,'rgba(74,222,128,0.28)','rgba(74,222,128,0)'),fill:true,tension:.35,pointRadius:3},
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:12,usePointStyle:true}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y+' ('+d.label+')'}}},scales:{y:{grid:{color:'rgba(74,222,128,0.06)'}},x:{grid:{display:false}}}}});
  }
  const profitEl=document.getElementById('profitChart');
  onVisible(profitEl, ()=>mkProfit('profit'));
  const toggles=document.getElementById('profitToggles');
  if(toggles){
    toggles.addEventListener('click',e=>{
      const b=e.target.closest('.toggle'); if(!b) return;
      toggles.querySelectorAll('.toggle').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); mkProfit(b.dataset.mode);
    });
  }

  const savEl=document.getElementById('savingsChart');
  onVisible(savEl, ()=>{
    const ctx=savEl.getContext('2d');
    new Chart(ctx,{type:'bar',data:{labels:['Fertiliser','Vet & med','Feed/forage','Labour time','Waste/losses'],
      datasets:[{label:'Modelled cost reduction',data:[28,24,16,20,30],backgroundColor:[C.amber,C.violet,C.lime,C.sky,C.green],borderRadius:8,maxBarThickness:46}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'-'+c.parsed.y+'%'}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>v+'%'}},x:{grid:{display:false}}}}});
  });
}
