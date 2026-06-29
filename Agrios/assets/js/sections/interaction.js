import { chatData } from '../data.js';
import { onVisible } from '../util.js';

export function initInteraction(){
  // Telegram chat
  const chat=document.getElementById('chat');
  if(chat){
    const render=()=>{
      chat.innerHTML='';
      chatData.forEach((m,i)=>{
        const d=document.createElement('div'); d.className='msg '+m.who; d.style.animationDelay=(i*0.5)+'s';
        if(m.voice){
          d.innerHTML=`<span class="voice"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3 3 0 003-3V6a3 3 0 00-6 0v9a3 3 0 003 3zM19 11a7 7 0 01-14 0"/></svg><span class="wave"><i></i><i></i><i></i><i></i><i></i></span> ${m.t}</span>`;
        } else d.textContent=m.t;
        chat.appendChild(d);
      });
    };
    onVisible(chat, render, 0.3);
  }

  // Voice pipeline hover
  const pipe=document.getElementById('voicePipeline');
  const detail=document.getElementById('voiceDetail');
  if(pipe && detail){
    const steps=[...pipe.querySelectorAll('.pipe-step')];
    const show=(s)=>{ steps.forEach(x=>x.classList.remove('active')); s.classList.add('active'); detail.textContent=s.getAttribute('data-detail'); };
    steps.forEach(s=>{ s.addEventListener('mouseenter',()=>show(s)); s.addEventListener('click',()=>show(s)); });
    detail.textContent = steps[0].getAttribute('data-detail');
  }
}
