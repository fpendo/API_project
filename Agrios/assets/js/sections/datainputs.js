import { C } from '../theme.js';
import { onVisible } from '../util.js';

export function initDataInputs(){
  const el = document.getElementById('dataDoughnut');
  if(!el) return;
  onVisible(el, ()=>{
    const ctx = el.getContext('2d');
    new Chart(ctx,{
      type:'doughnut',
      data:{
        labels:['EID herd tracking','Weather station','Soil grid','Weigh & medicine','Forage analysis','Telegram capture'],
        datasets:[{data:[34,18,16,14,8,10],backgroundColor:[C.green,C.sky,C.amber,C.deep,C.violet,C.lime],borderColor:'#0a130d',borderWidth:3,hoverOffset:8}]
      },
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{boxWidth:12,usePointStyle:true,padding:12}}}}
    });
  });
}
