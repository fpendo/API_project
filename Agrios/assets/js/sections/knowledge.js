import { C, grad } from '../theme.js';
import { onVisible } from '../util.js';
import { swarmStages, swarmAgents, domains, vaultCategories } from '../data.js';

const tick = '<span class="tk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>';

export function initKnowledge(){
  buildFlow();
  buildDomains();
  buildCharts();
  buildVaultAccordion();
  onVisible(document.getElementById('vaultGraph'), buildVaultGraph, 0.1);
}

/* ===== Research-swarm flow ===== */
function renderStageDetail(s){
  const detail = document.getElementById('flowDetail');
  if(!detail) return;
  detail.innerHTML = `
    <span class="badge">${s.badge}</span>
    <h4>${s.title}</h4>
    <p>${s.body}</p>
    <ul>${s.points.map(p=>`<li>${tick}<span>${p[0]}</span></li>`).join('')}</ul>`;
}

function renderAgentDetail(a){
  const detail = document.getElementById('flowDetail');
  if(!detail) return;
  detail.innerHTML = `
    <span class="badge" style="color:${a.color};border-color:${a.color}55;background:${a.color}1a">Research specialist</span>
    <h4 style="color:${a.color}">${a.name} agent</h4>
    <p>${a.desc}</p>
    <ul><li>${tick}<span>Runs its own <b>search → read → extract</b> loop</span></li>
        <li>${tick}<span>Returns <b>source-cited</b> structured claims</span></li>
        <li>${tick}<span>Generates follow-up questions to <b>go deeper</b></span></li></ul>`;
}

function buildFlow(){
  const list = document.getElementById('flowStages');
  const agentsWrap = document.getElementById('flowAgents');
  if(!list) return;

  list.innerHTML = swarmStages.map((s,i)=>`
    <button class="flow-node${i===0?' active':''}" data-i="${i}">
      <span class="step ${s.kind}">${s.n}</span>
      <span><span class="ttl">${s.title}</span><span class="mini">${s.mini}</span></span>
    </button>`).join('');

  const nodes = [...list.querySelectorAll('.flow-node')];
  const activate = (node)=>{
    nodes.forEach(n=>n.classList.remove('active'));
    agentsWrap.querySelectorAll('.ag').forEach(a=>a.classList.remove('active'));
    node.classList.add('active');
    renderStageDetail(swarmStages[+node.dataset.i]);
  };
  nodes.forEach(n=>{
    n.addEventListener('mouseenter',()=>activate(n));
    n.addEventListener('click',()=>activate(n));
    n.addEventListener('focus',()=>activate(n));
  });

  agentsWrap.innerHTML = swarmAgents.map((a,i)=>`<button class="ag" data-i="${i}">${a.name}</button>`).join('');
  agentsWrap.querySelectorAll('.ag').forEach(btn=>{
    const act=()=>{
      nodes.forEach(n=>n.classList.remove('active'));
      agentsWrap.querySelectorAll('.ag').forEach(a=>a.classList.remove('active'));
      btn.classList.add('active');
      renderAgentDetail(swarmAgents[+btn.dataset.i]);
    };
    btn.addEventListener('mouseenter',act);
    btn.addEventListener('click',act);
  });

  renderStageDetail(swarmStages[0]);
}

/* ===== Domain tabs ===== */
function buildDomains(){
  const tabs=document.getElementById('domainTabs'), panels=document.getElementById('domainPanels');
  if(!tabs) return;
  domains.forEach((d,i)=>{
    const b=document.createElement('button'); b.className='toggle'+(i===0?' active':''); b.textContent=d.key; b.dataset.i=i;
    tabs.appendChild(b);
    const p=document.createElement('div'); p.className='domain-content'+(i===0?' active':''); p.dataset.i=i;
    p.innerHTML=`<p style="color:var(--text-2);max-width:760px;margin:0 auto;text-align:center">The <strong style="color:${d.color}">${d.key}</strong> branch deepens continuously — here are example sub-questions the swarm pursues:</p>
      <div class="subtopics" style="justify-content:center">${d.topics.map(t=>`<span class="chip">${t}</span>`).join('')}</div>`;
    panels.appendChild(p);
  });
  tabs.addEventListener('click',e=>{ const b=e.target.closest('.toggle'); if(!b) return;
    tabs.querySelectorAll('.toggle').forEach(x=>x.classList.remove('active'));
    panels.querySelectorAll('.domain-content').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); panels.querySelector(`.domain-content[data-i="${b.dataset.i}"]`).classList.add('active');
  });
}

/* ===== Charts ===== */
function buildCharts(){
  const weeks=['W1','W2','W3','W4','W5','W6','W7','W8'];
  const g=document.getElementById('growthChart');
  onVisible(g, ()=>{
    const ctx=g.getContext('2d');
    new Chart(ctx,{type:'line',data:{labels:weeks,datasets:[
      {label:'Breadth (topics mapped)',data:[20,42,58,70,80,87,92,96],borderColor:C.sky,backgroundColor:grad(ctx,'rgba(56,189,248,0.35)','rgba(56,189,248,0)'),fill:true,tension:.4,pointRadius:3},
      {label:'Depth (avg detail/topic)',data:[8,16,26,38,52,67,82,95],borderColor:C.green,backgroundColor:grad(ctx,'rgba(74,222,128,0.35)','rgba(74,222,128,0)'),fill:true,tension:.4,pointRadius:3},
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:12,usePointStyle:true}}},scales:{y:{beginAtZero:true,max:100,grid:{color:'rgba(74,222,128,0.06)'},ticks:{callback:v=>v+'%'}},x:{grid:{display:false}}}}});
  });
  const r=document.getElementById('radarChart');
  onVisible(r, ()=>{
    const ctx=r.getContext('2d');
    new Chart(ctx,{type:'radar',data:{labels:['Genetics','Soil','Weather','Health','Nutrition','Economics'],datasets:[
      {label:'Week 2',data:[40,45,38,42,50,35],borderColor:'rgba(56,189,248,0.6)',backgroundColor:'rgba(56,189,248,0.12)',pointBackgroundColor:C.sky},
      {label:'Week 8',data:[88,92,80,90,94,82],borderColor:C.green,backgroundColor:'rgba(74,222,128,0.18)',pointBackgroundColor:C.green},
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:12,usePointStyle:true}}},scales:{r:{min:0,max:100,grid:{color:'rgba(74,222,128,0.1)'},angleLines:{color:'rgba(74,222,128,0.1)'},pointLabels:{color:'#c8e6d4',font:{size:12}},ticks:{display:false}}}}});
  });
}

/* ===== Vault accordion ===== */
function buildVaultAccordion(){
  const container = document.getElementById('vaultAccordion');
  if(!container) return;

  vaultCategories.forEach(cat => {
    const wrap = document.createElement('div');
    wrap.className = 'vault-acc-item';

    const btn = document.createElement('button');
    btn.className = 'vault-cat';
    btn.dataset.id = cat.id;
    btn.innerHTML = `
      <span class="vault-cat-dot" style="color:${cat.color};background:${cat.color}"></span>
      <span class="vault-cat-info">
        <h4>${cat.label}</h4>
        <p>${cat.desc}</p>
      </span>
      <span class="vault-cat-count">${cat.items.length} signals</span>
      <svg class="vault-cat-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>`;

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'vault-items';
    itemsWrap.innerHTML = cat.items.map(item => `
      <div class="vault-item" style="border-left:2px solid ${cat.color}30">
        <h5 style="color:${cat.color}">${item.name}</h5>
        <p>${item.detail}</p>
      </div>`).join('');

    btn.addEventListener('click', () => {
      const isOpen = wrap.classList.contains('open');
      // Close all others
      container.querySelectorAll('.vault-acc-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.vault-cat').classList.remove('open');
      });
      if(!isOpen){
        wrap.classList.add('open');
        btn.classList.add('open');
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(itemsWrap);
    container.appendChild(wrap);
  });
}

/* ===== Obsidian-style animated vault graph ===== */
function buildVaultGraph(){
  const canvas = document.getElementById('vaultGraph');
  if(!canvas || canvas.dataset.built) return;
  canvas.dataset.built = '1';

  const ctx = canvas.getContext('2d');
  let W, H, cx, cy;
  let nodes = [], edges = [];
  let hoveredNode = null;
  const signals = [];
  let t = 0, animId;

  function setup(){
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = Math.round(W * devicePixelRatio);
    canvas.height = Math.round(H * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    cx = W / 2;
    cy = H / 2;
    buildNodes();
  }

  function buildNodes(){
    nodes = [];
    edges = [];
    signals.length = 0;

    // Central vault node
    nodes.push({ id:'vault', label:'GUPWORTHY\nFARM', x:cx, y:cy, r:22, color:'#4ade80', fixed:true, phase:0 });

    const ringR  = Math.min(W, H) * 0.285;
    const subGap = Math.min(W, H) * 0.16;

    vaultCategories.forEach((cat, i) => {
      const angle = (i / vaultCategories.length) * Math.PI * 2 - Math.PI / 2;
      const bx = cx + Math.cos(angle) * ringR;
      const by = cy + Math.sin(angle) * ringR;
      const phase = i * 0.9;
      nodes.push({ id:cat.id, label:cat.label.split(' ')[0], x:bx, y:by, baseX:bx, baseY:by, r:11, color:cat.color, phase });
      edges.push({ from:'vault', to:cat.id, main:true });

      // Sub-nodes — one per item (capped at 8 for clarity)
      const subs = cat.items.slice(0, 8);
      subs.forEach((item, j) => {
        const spread = 0.34;
        const sa = angle + (j - (subs.length - 1) / 2) * spread;
        const sd = ringR + subGap + (j % 2 === 0 ? 0 : 14);
        const sx = cx + Math.cos(sa) * sd;
        const sy = cy + Math.sin(sa) * sd;
        const sid = cat.id + '_' + j;
        nodes.push({ id:sid, label:item.name.split(' ').slice(0,3).join(' '), x:sx, y:sy, baseX:sx, baseY:sy, r:4, color:cat.color, phase:j * 1.4 + i * 0.5, parentId:cat.id });
        edges.push({ from:cat.id, to:sid, sub:true });
      });
    });

    // Cross-category connections (sparse, for brain look)
    const crosses = [
      ['weather','soil'],['soil','nutrition'],['cattle','health'],
      ['nutrition','cattle'],['research','health'],['research','cattle'],
      ['financial','cattle'],['weather','health']
    ];
    crosses.forEach(([a,b]) => {
      if(nodes.find(n=>n.id===a) && nodes.find(n=>n.id===b))
        edges.push({ from:a, to:b, cross:true });
    });

    // Seed initial signals
    for(let i = 0; i < 7; i++) spawnSignal();
  }

  function getNode(id){ return nodes.find(n => n.id === id); }

  function spawnSignal(){
    const subs = nodes.filter(n => n.parentId);
    if(!subs.length) return;
    const src = subs[Math.floor(Math.random() * subs.length)];
    const tgt = getNode(src.parentId) || getNode('vault');
    signals.push({ src, tgt, p:Math.random(), speed:0.003 + Math.random() * 0.004, color:src.color, done:false });
  }

  function draw(){
    t += 0.01;
    ctx.clearRect(0, 0, W, H);

    // Float non-fixed nodes gently
    nodes.forEach(n => {
      if(n.fixed) return;
      n.x = n.baseX + Math.sin(t * 0.75 + n.phase) * 5;
      n.y = n.baseY + Math.cos(t * 0.55 + n.phase) * 4;
    });

    // Edges
    edges.forEach(e => {
      const a = getNode(e.from), b = getNode(e.to);
      if(!a || !b) return;
      const hi = hoveredNode && (
        hoveredNode.id === e.from || hoveredNode.id === e.to ||
        hoveredNode.parentId === e.from || hoveredNode.parentId === e.to
      );
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      if(hi){
        ctx.strokeStyle = (b.color||'#4ade80') + 'cc';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = b.color || '#4ade80';
        ctx.shadowBlur = 8;
      } else if(e.cross){
        ctx.strokeStyle = 'rgba(74,222,128,0.05)';
        ctx.lineWidth = 0.5;
        ctx.shadowBlur = 0;
      } else if(e.sub){
        ctx.strokeStyle = (b.color||'#4ade80') + '28';
        ctx.lineWidth = 0.6;
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = (b.color||'#4ade80') + '55';
        ctx.lineWidth = 0.9;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Animated signal particles (data flowing to vault)
    signals.forEach(sig => {
      sig.p += sig.speed;
      if(sig.p > 1){ sig.done = true; return; }
      const px = sig.src.x + (sig.tgt.x - sig.src.x) * sig.p;
      const py = sig.src.y + (sig.tgt.y - sig.src.y) * sig.p;
      const alpha = Math.sin(sig.p * Math.PI);
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = sig.color + Math.round(alpha * 230).toString(16).padStart(2,'0');
      ctx.shadowColor = sig.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    for(let i = signals.length - 1; i >= 0; i--){
      if(signals[i].done) signals.splice(i, 1);
    }
    while(signals.length < 7) spawnSignal();

    // Nodes
    nodes.forEach(n => {
      const hi = hoveredNode && (hoveredNode.id === n.id || n.parentId === hoveredNode.id || hoveredNode.parentId === n.id);
      const r  = hi ? n.r * 1.5 : n.r;

      // Glow halo
      if(n.id === 'vault' || hi){
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5);
        g.addColorStop(0, n.color + '30');
        g.addColorStop(1, n.color + '00');
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // Node body
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      if(n.id === 'vault'){
        const pulse = 0.8 + (Math.sin(t * 1.8) + 1) * 0.1;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 22 * pulse;
        ctx.fillStyle = n.color;
      } else {
        ctx.shadowColor = n.color;
        ctx.shadowBlur = hi ? 14 : 3;
        ctx.fillStyle = hi ? n.color : n.color + 'aa';
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Labels
      if(n.id === 'vault'){
        const lines = n.label.split('\n');
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.fillStyle = '#071309';
        ctx.textAlign = 'center';
        ctx.fillText(lines[0], n.x, n.y - 2);
        ctx.fillText(lines[1], n.x, n.y + 8);
      } else if(n.r >= 9){
        ctx.font = hi ? 'bold 11px Outfit,sans-serif' : '10px Outfit,sans-serif';
        ctx.fillStyle = hi ? '#fff' : 'rgba(200,230,212,0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + r + 13);
      } else if(hi){
        // Show sub-node label on hover
        ctx.font = 'bold 10px Outfit,sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        const lw = ctx.measureText(n.label).width + 10;
        ctx.fillStyle = 'rgba(7,19,9,0.85)';
        ctx.fillRect(n.x - lw/2, n.y - r - 20, lw, 16);
        ctx.fillStyle = n.color;
        ctx.fillText(n.label, n.x, n.y - r - 8);
      }
    });

    // Central pulse rings
    const center = getNode('vault');
    if(center){
      [1, 1.9, 2.8].forEach((m, idx) => {
        const p = (Math.sin(t * 1.4 - idx * 0.9) + 1) / 2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, center.r + 12 * m + p * 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(74,222,128,${(0.13 - idx * 0.035) * (p * 0.5 + 0.5)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }

    animId = requestAnimationFrame(draw);
  }

  // Hover interaction
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoveredNode = nodes.find(n => Math.hypot(n.x - mx, n.y - my) < n.r + 7) || null;
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseleave', () => { hoveredNode = null; });

  // Click a category node → open its accordion row
  canvas.addEventListener('click', () => {
    if(!hoveredNode) return;
    const catId = hoveredNode.parentId || hoveredNode.id;
    if(catId === 'vault') return;
    const accBtn = document.querySelector(`.vault-cat[data-id="${catId}"]`);
    if(accBtn){
      const wrap = accBtn.closest('.vault-acc-item');
      const alreadyOpen = wrap && wrap.classList.contains('open');
      // Close all, then open unless it was already open
      document.querySelectorAll('.vault-acc-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.vault-cat').classList.remove('open');
      });
      if(!alreadyOpen && wrap){
        wrap.classList.add('open');
        accBtn.classList.add('open');
        setTimeout(() => accBtn.scrollIntoView({ behavior:'smooth', block:'nearest' }), 50);
      }
    }
  });

  // Resize handler
  const onResize = () => {
    cancelAnimationFrame(animId);
    setup();
    draw();
  };
  window.addEventListener('resize', onResize);

  setup();
  draw();
}
