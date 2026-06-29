// Shared Chart.js theme + helpers for Agrios.
export const C = {
  green:'#4ade80', lime:'#a3e635', sky:'#38bdf8',
  amber:'#f59e0b', violet:'#a78bfa', deep:'#22c55e', red:'#ef4444'
};

export function applyChartTheme(){
  if(!window.Chart) return;
  Chart.defaults.color = '#7c9a86';
  Chart.defaults.font.family = "'Outfit', sans-serif";
  Chart.defaults.borderColor = 'rgba(74,222,128,0.08)';
}

// vertical gradient helper bound to a 2d context
export function grad(ctx, c1, c2, h){
  const g = ctx.createLinearGradient(0, 0, 0, h || 320);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

export const gridY = { grid:{ color:'rgba(74,222,128,0.06)' } };
export const gridXoff = { grid:{ display:false } };
