export function initCoverage(){
  const satmap = document.getElementById('satmap');
  if(!satmap) return;

  const IMG_GROUND_M = 1600;            // satellite frame is ~1.6 km across
  const SVG = 1000;                      // overlay viewBox units
  const svgPerM = SVG / IMG_GROUND_M;    // 0.625 svg units per metre
  const gateways = [[70,90],[930,60],[945,930],[90,945],[509,506]];
  const farm = [[70,90],[930,60],[945,930],[90,945]];
  const circles = [...satmap.querySelectorAll('#circles circle')];
  const slider = document.getElementById('radiusSlider');
  const presets = document.getElementById('radiusPresets');
  const roRadius = document.getElementById('roRadius');
  const roCover = document.getElementById('roCover');

  function pointInPoly(x,y,poly){
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
      const hit=((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
      if(hit) inside=!inside;
    }
    return inside;
  }
  function coverage(rSvg){
    let inside=0,covered=0; const r2=rSvg*rSvg;
    for(let y=40;y<=960;y+=10){
      for(let x=40;x<=960;x+=10){
        if(!pointInPoly(x,y,farm)) continue;
        inside++;
        for(const g of gateways){
          const dx=x-g[0],dy=y-g[1];
          if(dx*dx+dy*dy<=r2){ covered++; break; }
        }
      }
    }
    return inside ? Math.round(covered/inside*100) : 0;
  }
  function setRadius(m){
    const rSvg=m*svgPerM;
    circles.forEach(c=>c.setAttribute('r',rSvg.toFixed(1)));
    roRadius.textContent = m>=1000 ? (m/1000).toFixed(1)+' km' : Math.round(m)+' m';
    roCover.textContent = coverage(rSvg)+'%';
  }
  slider.addEventListener('input',e=>{
    const m=+e.target.value; setRadius(m);
    presets.querySelectorAll('.toggle').forEach(b=>b.classList.toggle('active',+b.dataset.m===m));
  });
  presets.addEventListener('click',e=>{
    const b=e.target.closest('.toggle'); if(!b) return;
    const m=+b.dataset.m; slider.value=m; setRadius(m);
    presets.querySelectorAll('.toggle').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  });

  const mapIO=new IntersectionObserver(ents=>{
    if(ents[0].isIntersecting){
      let m=120; const target=750;
      const t=setInterval(()=>{ m+=42; if(m>=target){m=target;clearInterval(t);} setRadius(m); },18);
      mapIO.disconnect();
    }
  },{threshold:0.3});
  mapIO.observe(satmap);
  setRadius(750);
}
