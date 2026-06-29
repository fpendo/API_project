import { grad } from '../theme.js';
import { onVisible } from '../util.js';

export function initRoadmap(){
  const el=document.getElementById('roadmapChart');
  if(!el) return;
  onVisible(el, ()=>{
    const ctx=el.getContext('2d');
    new Chart(ctx,{type:'bar',data:{labels:['P1 Knowledge','P2 Network','P3 Voice','P4 Machines','P5 Optimise'],
      datasets:[{label:'Capability index',data:[25,45,65,82,100],backgroundColor:grad(ctx,'rgba(74,222,128,0.9)','rgba(56,189,248,0.5)'),borderRadius:8,maxBarThickness:60}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,max:100,grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>v+'%'}},y:{grid:{display:false}}}}});
  });
}
