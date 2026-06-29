// Small shared helpers.

// Run cb once when el first scrolls into view.
export function onVisible(el, cb, threshold=0.25){
  if(!el) return;
  const io=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting){ cb(); io.disconnect(); }
  },{threshold});
  io.observe(el);
}

export const $  = (sel, root=document)=>root.querySelector(sel);
export const $$ = (sel, root=document)=>[...root.querySelectorAll(sel)];
