import { C, grad } from '../theme.js';
import { onVisible } from '../util.js';

export function initMarket(){
  buildCharts();
  buildSources();
}

/* ===== Data ===== */
const WEEKS = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'];

const carcassData = {
  R4L: [498,504,508,514,518,522,516,510,512,519,524,528,530],
  U4L: [519,526,530,537,541,545,539,532,534,542,547,551,554],
  O4L: [478,483,487,492,496,499,493,487,489,496,500,504,506],
};

const storeData = [1080,1120,1090,1150,1180,1220,1200,1160,1140,1170,1190,1210];

const marginData = {
  labels:['520 kg target','560 kg target','600 kg target'],
  // margin per head at current price
  base:[68,112,142],
  // margin at 490p/kg floor
  floor:[-28,8,36],
};

// Bull EBV index vs price scatter
const bullScatter = [
  {x:112,y:3200},{x:118,y:3600},{x:125,y:4100},{x:108,y:2900},{x:132,y:5200},
  {x:119,y:3400},{x:140,y:6800},{x:122,y:3900},{x:115,y:3100},{x:128,y:4600},
  {x:105,y:2600},{x:134,y:5500},{x:120,y:3700},{x:130,y:4900},{x:110,y:2800},
  {x:138,y:6200},{x:117,y:3300},{x:126,y:4300},{x:123,y:4000},{x:135,y:5700},
  {x:114,y:3000},{x:129,y:4700},{x:107,y:2700},{x:133,y:5300},{x:121,y:3800},
  {x:116,y:3200},{x:127,y:4400},{x:136,y:5900},{x:113,y:2950},{x:124,y:4150},
  // 3 outliers
  {x:141,y:3800},{x:109,y:5100},{x:137,y:7800},
].map((p,i) => ({ ...p, outlier: i >= 30 }));

/* ===== Charts ===== */
function buildCharts(){
  const carcassEl = document.getElementById('carcassPriceChart');
  onVisible(carcassEl, () => {
    const ctx = carcassEl.getContext('2d');
    // Floor line plugin
    const floorPlugin = {
      id:'floorLine',
      afterDraw(chart){
        const {ctx:c, chartArea:{left,right,top,bottom}, scales:{y}} = chart;
        const fy = y.getPixelForValue(490);
        c.save();
        c.strokeStyle = 'rgba(239,68,68,0.55)';
        c.lineWidth = 1.5;
        c.setLineDash([6,4]);
        c.beginPath(); c.moveTo(left,fy); c.lineTo(right,fy); c.stroke();
        c.fillStyle = 'rgba(239,68,68,0.75)';
        c.font = '10px Outfit,sans-serif';
        c.fillText('Alert floor 490p', right - 100, fy - 5);
        c.restore();
      }
    };
    new Chart(ctx, {
      type:'line',
      plugins:[floorPlugin],
      data:{
        labels:WEEKS,
        datasets:[
          {label:'R4L (p/kg DW)', data:carcassData.R4L, borderColor:C.green, backgroundColor:grad(ctx,'rgba(74,222,128,0.2)','rgba(74,222,128,0)'), fill:true, tension:.4, pointRadius:3, borderWidth:2},
          {label:'U4L',           data:carcassData.U4L, borderColor:C.sky,   backgroundColor:'transparent', tension:.4, pointRadius:2, borderDash:[4,3], borderWidth:1.5},
          {label:'O4L',           data:carcassData.O4L, borderColor:C.amber, backgroundColor:'transparent', tension:.4, pointRadius:2, borderDash:[4,3], borderWidth:1.5},
        ]
      },
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{boxWidth:10,usePointStyle:true,font:{size:11}}}},
        scales:{
          y:{min:460,grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>v+'p',font:{size:10}}},
          x:{grid:{display:false},ticks:{font:{size:10}}}
        }
      }
    });
  });

  const bullEl = document.getElementById('bullSaleChart');
  onVisible(bullEl, () => {
    const ctx = bullEl.getContext('2d');
    const normal   = bullScatter.filter(p => !p.outlier);
    const outliers = bullScatter.filter(p =>  p.outlier);
    // Simple regression line
    const n = normal.length;
    const sx=normal.reduce((s,p)=>s+p.x,0), sy=normal.reduce((s,p)=>s+p.y,0);
    const sxy=normal.reduce((s,p)=>s+p.x*p.y,0), sxx=normal.reduce((s,p)=>s+p.x*p.x,0);
    const slope=(n*sxy - sx*sy)/(n*sxx - sx*sx), intercept=(sy - slope*sx)/n;
    const xMin=100, xMax=145;
    const regLine=[{x:xMin,y:slope*xMin+intercept},{x:xMax,y:slope*xMax+intercept}];
    new Chart(ctx, {
      type:'scatter',
      data:{datasets:[
        {label:'Bull lots',      data:normal,   backgroundColor:'rgba(74,222,128,0.55)', pointRadius:5},
        {label:'Outliers',       data:outliers, backgroundColor:'rgba(239,68,68,0.7)',   pointRadius:6},
        {label:'Regression',     data:regLine,  type:'line', borderColor:C.sky, borderDash:[5,3], borderWidth:1.5, pointRadius:0, fill:false},
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{boxWidth:10,usePointStyle:true,font:{size:11}}}},
        scales:{
          x:{title:{display:true,text:'Terminal index',font:{size:10}},min:100,max:146,grid:{color:'rgba(74,222,128,0.06)'},ticks:{font:{size:10}}},
          y:{title:{display:true,text:'Hammer price (£)',font:{size:10}},grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>'£'+v.toLocaleString(),font:{size:10}}}
        }
      }
    });
  });

  const storeEl = document.getElementById('storePriceChart');
  onVisible(storeEl, () => {
    const ctx = storeEl.getContext('2d');
    const months=['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
    new Chart(ctx, {
      type:'bar',
      data:{labels:months, datasets:[
        {label:'Avg price/head (£)', data:storeData, backgroundColor:'rgba(245,158,11,0.6)', borderColor:C.amber, borderWidth:1.5, borderRadius:4}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{boxWidth:10,usePointStyle:true,font:{size:11}}}},
        scales:{
          y:{grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>'£'+v,font:{size:10}}},
          x:{grid:{display:false},ticks:{font:{size:10}}}
        }
      }
    });
  });

  const marginEl = document.getElementById('marginChart');
  onVisible(marginEl, () => {
    const ctx = marginEl.getContext('2d');
    new Chart(ctx, {
      type:'bar',
      data:{
        labels: marginData.labels,
        datasets:[
          {label:'At 528p/kg (current)', data:marginData.base,  backgroundColor:['rgba(74,222,128,0.65)','rgba(74,222,128,0.65)','rgba(74,222,128,0.65)'], borderRadius:5},
          {label:'At 490p/kg (floor)',   data:marginData.floor, backgroundColor:['rgba(239,68,68,0.55)','rgba(239,68,68,0.55)','rgba(239,68,68,0.55)'], borderRadius:5},
        ]
      },
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{boxWidth:10,usePointStyle:true,font:{size:11}}}},
        scales:{
          y:{grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>'£'+v,font:{size:10}}},
          x:{grid:{display:false},ticks:{font:{size:10}}}
        }
      }
    });
  });
}

/* ===== Market data source cards ===== */
const sources = [
  {
    name:'AHDB Beef & Lamb',
    type:'API / weekly CSV',
    color:'#4ade80',
    desc:'GB average deadweight prices by grade (R, U, O) updated weekly. Pulled automatically; vaults each week\'s figures as a timestamped note.',
    items:['R, U, O, P grade p/kg DW','GB cattle slaughter numbers','Seasonal variance trends','Import/export price influence'],
  },
  {
    name:'Processor kill sheets',
    type:'Email PDF → parsed',
    color:'#38bdf8',
    desc:'ABP, Dunbia and Dawn Meats kill sheets forwarded to a dedicated inbox. Parser extracts EID, kill-out %, grade, price and lodges against each animal\'s record.',
    items:['Kill-out percentage (KO%)','EUROP classification','Price paid per animal','Weight at slaughter vs. liveweight ADG'],
  },
  {
    name:'Breed society sale results',
    type:'Web scrape + manual',
    color:'#a78bfa',
    desc:'South Devon Herd Book and Hereford Cattle Society publish online sale results. The LLM extracts lot number, EBV index and hammer price, updating the regression database.',
    items:['Terminal and maternal EBV indices','Hammer price per lot','Vendor and buyer data','Sale average vs. reserve benchmarks'],
  },
  {
    name:'Auction house results',
    type:'Web scrape',
    color:'#f59e0b',
    desc:'Kivells Exeter and other regional auction houses post weekly store and breeding cattle results online. Parsed and indexed by age, sex and weight category.',
    items:['Store heifer prices (15–18 mo)','Store steer prices','Breeding cow & calf unit prices','Cull cow deadweight equivalents'],
  },
  {
    name:'Bull sale catalogues',
    type:'PDF / web → LLM parse',
    color:'#22d3ee',
    desc:'Pre-sale breed society catalogues contain EBV, genomic and physical data for each lot. The LLM models expected ROI per bull before the sale, ranking lots by value.',
    items:['Full EBV suite per bull','Sire / dam pedigree','Genomic verification status','Conformation and locomotion scores'],
  },
  {
    name:'BPS / ELM payments',
    type:'DEFRA portal / email',
    color:'#fb923c',
    desc:'Basic Payment Scheme and Sustainable Farming Incentive notifications are parsed and logged. Payment dates and amounts are tracked against budget forecasts.',
    items:['SFI agreement income per action','BPS legacy payment schedule','Mid-tier countryside stewardship','Capital grant receipts'],
  },
];

function buildSources(){
  const container = document.getElementById('mktSources');
  if(!container) return;
  container.innerHTML = sources.map(s => `
    <div class="mkt-source-card" style="border-left:3px solid ${s.color}20">
      <div class="mkt-source-head">
        <span class="mkt-source-dot" style="background:${s.color}"></span>
        <div class="mkt-source-title">
          <h4>${s.name}</h4>
          <span class="mkt-source-type">${s.type}</span>
        </div>
      </div>
      <p class="mkt-source-desc">${s.desc}</p>
      <ul class="mkt-source-items">
        ${s.items.map(i=>`<li>${i}</li>`).join('')}
      </ul>
    </div>`).join('');
}
