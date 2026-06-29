// ============================================================
//  Agrios — app entry. Loads HTML partials, then boots sections.
// ============================================================
import { applyChartTheme } from './theme.js';
import { initKnowledge } from './sections/knowledge.js';
import { initArchitecture } from './sections/architecture.js';
import { initCoverage } from './sections/coverage.js';
import { initTesting } from './sections/testing.js';
import { initFields } from './sections/fields.js';
import { initCattle } from './sections/cattle.js';
import { initInteraction } from './sections/interaction.js';
import { initAnalytics } from './sections/analytics.js';
import { initRoadmap } from './sections/roadmap.js';
import { initMarket } from './sections/market.js';

/* ---------- HTML include loader ---------- */
async function includePartials(){
  const slots = [...document.querySelectorAll('[data-include]')];
  await Promise.all(slots.map(async slot => {
    const url = slot.getAttribute('data-include');
    try{
      const res = await fetch(url, {cache:'no-cache'});
      if(!res.ok) throw new Error(res.status+' '+url);
      slot.innerHTML = await res.text();
      slot.removeAttribute('data-include');
    }catch(err){
      console.error('Include failed:', url, err);
      slot.innerHTML = `<div style="padding:40px;text-align:center;color:#7c9a86">Could not load ${url}</div>`;
    }
  }));
}

/* ---------- Reveal on scroll ---------- */
function initReveal(){
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}

/* ---------- Animated counters ---------- */
function initCounters(){
  function animate(el){
    const target=parseFloat(el.dataset.count), suffix=el.dataset.suffix||'';
    const dur=1400, start=performance.now();
    (function tick(now){
      const p=Math.min((now-start)/dur,1), eased=1-Math.pow(1-p,3), val=target*eased;
      el.textContent=(target%1===0?Math.round(val):val.toFixed(1))+suffix;
      if(p<1) requestAnimationFrame(tick);
    })(start);
  }
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ animate(e.target); io.unobserve(e.target); } });
  },{threshold:0.6});
  document.querySelectorAll('[data-count]').forEach(el=>io.observe(el));
}

/* ---------- Nav: burger + scrollspy ---------- */
function initNav(){
  const burger=document.getElementById('burger'), navLinks=document.getElementById('navLinks');
  if(burger){
    burger.addEventListener('click',()=>navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>navLinks.classList.remove('open')));
  }
  const linkFor=id=>navLinks.querySelector(`a[href="#${id}"]`);
  const spy=new IntersectionObserver(entries=>{
    entries.forEach(e=>{ const l=linkFor(e.target.id); if(!l) return;
      if(e.isIntersecting){ navLinks.querySelectorAll('a').forEach(x=>x.classList.remove('active')); l.classList.add('active'); } });
  },{rootMargin:'-45% 0px -50% 0px'});
  document.querySelectorAll('section[id]').forEach(s=>spy.observe(s));
}

/* ---------- Boot ---------- */
(async function boot(){
  await includePartials();
  applyChartTheme();
  initReveal();
  initCounters();
  initNav();

  const safe=(name,fn)=>{ try{ fn(); }catch(err){ console.error(name+' init failed:',err); } };
  safe('knowledge', initKnowledge);
  safe('architecture', initArchitecture);
  safe('coverage', initCoverage);
  safe('testing', initTesting);
  safe('fields', initFields);
  safe('cattle', initCattle);
  safe('interaction', initInteraction);
  safe('analytics', initAnalytics);
  safe('roadmap', initRoadmap);
  safe('market', initMarket);
})();
