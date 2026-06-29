export function initArchitecture(){
  buildHoverDetail();
  // Draw lines after a short tick to ensure layout is complete
  setTimeout(drawConnectors, 80);
  window.addEventListener('resize', () => { clearTimeout(window._archTimer); window._archTimer = setTimeout(drawConnectors, 120); });
}

/* ---------- Hover detail panel ---------- */
function buildHoverDetail(){
  const wrap = document.getElementById('archWrap');
  const detail = document.getElementById('netDetail');
  if(!wrap || !detail) return;

  const nodes = [...wrap.querySelectorAll('.arch-node')];
  nodes.forEach(n => {
    const activate = () => {
      nodes.forEach(x => x.classList.remove('active'));
      n.classList.add('active');
      detail.innerHTML = n.getAttribute('data-detail') || '';
    };
    n.addEventListener('mouseenter', activate);
    n.addEventListener('click', activate);
  });
}

/* ---------- SVG connector lines ---------- */
function drawConnectors(){
  const svg  = document.getElementById('archSvg');
  const wrap = document.getElementById('archWrap');
  if(!svg || !wrap) return;

  const wRect = wrap.getBoundingClientRect();
  if(!wRect.width) return;

  svg.setAttribute('viewBox', `0 0 ${wRect.width} ${wRect.height}`);
  svg.setAttribute('width',  wRect.width);
  svg.setAttribute('height', wRect.height);
  svg.innerHTML = '';

  /* Helper: get centre + edges of an element relative to wrap */
  function rc(el){
    const r = el.getBoundingClientRect();
    return {
      cx: r.left - wRect.left + r.width  / 2,
      cy: r.top  - wRect.top  + r.height / 2,
      top:   r.top  - wRect.top,
      bot:   r.top  - wRect.top  + r.height,
      left:  r.left - wRect.left,
      right: r.left - wRect.left + r.width,
    };
  }

  /* Draw a smooth bezier from (x1,y1) to (x2,y2) */
  function bez(x1, y1, x2, y2, color, w){
    const my = (y1 + y2) / 2;
    const p = document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d', `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color || 'rgba(74,222,128,0.3)');
    p.setAttribute('stroke-width', w || 1.5);
    svg.appendChild(p);
    return p;
  }

  /* Straight vertical line */
  function vline(x, y1, y2, color, w){
    const l = document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1', x); l.setAttribute('y1', y1);
    l.setAttribute('x2', x); l.setAttribute('y2', y2);
    l.setAttribute('stroke', color || 'rgba(74,222,128,0.4)');
    l.setAttribute('stroke-width', w || 1.5);
    svg.appendChild(l);
  }

  /* Horizontal line */
  function hline(x1, x2, y, color, w){
    const l = document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y);
    l.setAttribute('x2', x2); l.setAttribute('y2', y);
    l.setAttribute('stroke', color || 'rgba(74,222,128,0.2)');
    l.setAttribute('stroke-width', w || 1);
    svg.appendChild(l);
  }

  /* Dot marker */
  function dot(x, y, color, r){
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y);
    c.setAttribute('r', r || 3);
    c.setAttribute('fill', color || 'rgba(74,222,128,0.5)');
    svg.appendChild(c);
  }

  /* --- Get node references --- */
  const vault    = rc(document.getElementById('archVault'));
  const starlink = rc(document.getElementById('archStarlink'));
  const hub      = rc(document.getElementById('archHub'));
  const gws      = [...document.querySelectorAll('.arch-node-gw')].map(rc);
  const inputs   = [...document.querySelectorAll('.arch-node-input')].map(rc);

  if(!gws.length || !inputs.length) return;

  /* 1. Vault → Starlink */
  vline(vault.cx, vault.bot, starlink.top, 'rgba(74,222,128,0.55)', 2);
  dot(vault.cx, vault.bot, '#4ade80aa', 4);
  dot(starlink.cx, starlink.top, '#38bdf8aa', 4);

  /* 2. Starlink → Hub */
  vline(starlink.cx, starlink.bot, hub.top, 'rgba(56,189,248,0.45)', 2);
  dot(starlink.cx, starlink.bot, '#38bdf8aa', 4);
  dot(hub.cx, hub.top, '#f59e0baa', 4);

  /* 3. Hub → each Gateway (fan-out bezier curves) */
  gws.forEach(gw => {
    const color = gw.cx < hub.cx - 5 || gw.cx > hub.cx + 5
      ? 'rgba(74,222,128,0.3)'
      : 'rgba(74,222,128,0.5)';
    bez(hub.cx, hub.bot, gw.cx, gw.top, color, 1.5);
    dot(gw.cx, gw.top, '#4ade8088', 3);
  });
  dot(hub.cx, hub.bot, '#f59e0baa', 4);

  /* 4. Gateway field bus — a horizontal rail just below the GW row,
        spanning the full width of both GWs and inputs.
        Every GW drops down to it; every input rises up to it. */
  const gwBot   = Math.max(...gws.map(g => g.bot));
  const inTop   = Math.min(...inputs.map(i => i.top));
  const busY    = gwBot + (inTop - gwBot) * 0.28;   // sits close below GWs
  const allCX   = [...gws, ...inputs].map(n => n.cx);
  const busLeft = Math.min(...allCX) - 14;
  const busRight= Math.max(...allCX) + 14;

  /* Short drop from each GW bottom → bus */
  gws.forEach(gw => {
    vline(gw.cx, gw.bot, busY, 'rgba(74,222,128,0.45)', 1.5);
    dot(gw.cx, gwBot, '#4ade8088', 3);
    dot(gw.cx, busY,  '#4ade80cc', 4);   // junction dot ON the bus
  });

  /* The prominent horizontal field bus */
  hline(busLeft, busRight, busY, 'rgba(74,222,128,0.55)', 2.5);

  /* Rise from bus → each input top */
  inputs.forEach(inp => {
    vline(inp.cx, busY, inp.top, 'rgba(74,222,128,0.28)', 1.2);
    dot(inp.cx, busY,  '#4ade8077', 3);   // junction dot on bus
    dot(inp.cx, inp.top, '#4ade8055', 2.5);
  });
}
