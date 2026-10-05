document.getElementById("year").textContent=new Date().getFullYear();
const tP=document.getElementById("clock-peninsula"),tC=document.getElementById("clock-canarias");
const fP=new Intl.DateTimeFormat("es-ES",{timeZone:"Europe/Madrid",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
const fC=new Intl.DateTimeFormat("es-ES",{timeZone:"Atlantic/Canary",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
function updClk(){const n=new Date();if(tP)tP.textContent=fP.format(n);if(tC)tC.textContent=fC.format(n)}
if(tP&&tC){updClk();setInterval(updClk,1000)}
document.addEventListener("DOMContentLoaded",()=>document.querySelectorAll(".bg-layer").forEach(b=>b.classList.add("loaded")));
const hr=new Date().getHours(),grEl=document.getElementById("greeting");
const gSet={m:["Buenos días.","Café primero. ☕","Hola, buenos días.","¿Ya has desayunado?"],a:["Buenas tardes.","¿Qué tal la tarde?","Tarde de sofá.","Hola de nuevo."],n:["Buenas noches.","¿No deberías dormir?","Modo noche activado.","Descansa cuando toque."]};
if(grEl){
  const opts=hr<6||hr>=20?gSet.n:hr<13?gSet.m:gSet.a, txt=opts[Math.floor(Math.random()*opts.length)];
  let aOn=true;
  try{aOn=(localStorage.getItem("cuby-motion")||(window.matchMedia("(prefers-reduced-motion: reduce)").matches?"off":"on"))==="on"}catch(e){}
  if(aOn){let i=0;grEl.classList.add("is-typing");const tI=setInterval(()=>{i++;grEl.textContent=txt.slice(0,i);if(i>=txt.length){clearInterval(tI);grEl.classList.remove("is-typing")}},38)}else grEl.textContent=txt;
}
const rt=document.documentElement,thmBtn=document.getElementById("theme-toggle"),bgs=document.querySelectorAll(".bg-layer");
const get=(k)=>{try{return localStorage.getItem(k)}catch(e){return null}},set=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const isD=()=>rt.classList.contains("theme-dark")||(!rt.classList.contains("theme-light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);
const updThm=()=>{const s=thmBtn.querySelector("span"),m=document.getElementById("theme-color-meta");if(s)s.textContent=isD()?"☀️":"🌙";if(m)m.setAttribute("content",isD()?"#0c0a16":"#f7c9dd")};
const aThm=get("cuby-theme");if(aThm==="light"||aThm==="dark"){rt.classList.remove("theme-auto","theme-light","theme-dark");rt.classList.add("theme-"+aThm)}updThm();
thmBtn.addEventListener("click",()=>{const d=!isD();rt.classList.remove("theme-auto","theme-light","theme-dark");rt.classList.add(d?"theme-dark":"theme-light");set("cuby-theme",d?"dark":"light");updThm()});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(rt.classList.contains("theme-auto"))updThm()});
const motBtn=document.getElementById("motion-toggle");
let aOn=(get("cuby-motion")||(window.matchMedia("(prefers-reduced-motion: reduce)").matches?"off":"on"))==="on";
const updMot=()=>{const s=motBtn.querySelector("span");if(s)s.textContent=aOn?"⏸️":"▶️"};
const setMot=o=>{aOn=o;set("cuby-motion",o?"on":"off");updMot();[...bgs,document.querySelector(".avatar-wrap"),document.querySelector("h1"),...document.querySelectorAll(".petal,.star")].filter(Boolean).forEach(e=>e.style.animationPlayState=o?"running":"paused");document.body.classList.toggle("motion-paused",!o);if(o){document.body.style.removeProperty("--mx");document.body.style.removeProperty("--my")}else{document.querySelectorAll(".confetti-flag").forEach(f=>f.remove());document.querySelectorAll(".container .button,.avatar-wrap").forEach(e=>e.style.transform="")}};
setMot(aOn);motBtn.addEventListener("click",()=>setMot(!aOn));
if(window.matchMedia("(hover: hover) and (pointer: fine)").matches){
  let tck=false;
  window.addEventListener("pointermove",e=>{
    if(!aOn)return;document.body.style.setProperty("--mx",e.clientX+"px");document.body.style.setProperty("--my",e.clientY+"px");
    if(bgs.length&&!tck){tck=true;requestAnimationFrame(()=>{const t=`scale(1.035) translate(${(e.clientX/window.innerWidth-.5)*-12}px, ${(e.clientY/window.innerHeight-.5)*-12}px)`;bgs.forEach(el=>el.style.transform=t);tck=false})}
  });
}
function bFlgs(x,y){for(let i=0;i<8;i++){const f=document.createElement("span");f.className="confetti-flag";const a=Math.random()*Math.PI*2,d=40+Math.random()*40;f.style.left=x+"px";f.style.top=y+"px";f.style.setProperty("--tx",Math.cos(a)*d+"px");f.style.setProperty("--ty",Math.sin(a)*d+"px");f.style.setProperty("--r",(Math.random()*180-90)+"deg");document.body.appendChild(f);setTimeout(()=>f.remove(),850)}}
document.querySelectorAll(".container .button").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();if(aOn){bFlgs(e.clientX,e.clientY);if(navigator.vibrate)navigator.vibrate(15);setTimeout(()=>window.location.href=b.href,160)}else window.location.href=b.href}));
function aTlt(el,mT,hS){
  let p=false,rx=0,ry=0;
  const r=()=>{el.style.transform=`perspective(500px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${p?hS*.94:hS})`};
  el.addEventListener("pointermove",e=>{if(!aOn)return;const rc=el.getBoundingClientRect();ry=((e.clientX-rc.left)/rc.width-.5)*mT*2;rx=(.5-(e.clientY-rc.top)/rc.height)*mT*2;r()});
  el.addEventListener("pointerdown",()=>{if(aOn){p=true;r()}});el.addEventListener("pointerup",()=>{p=false;if(aOn)r()});el.addEventListener("pointerleave",()=>{p=false;rx=ry=0;el.style.transform=""});
}
const aw=document.querySelector(".avatar-wrap");if(aw)aTlt(aw,12,1.08);document.querySelectorAll(".container .button").forEach(b=>aTlt(b,6,1.02));
const kC=["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];let kI=0;
window.addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(k===kC[kI]){kI++;if(kI===kC.length){kI=0;const a=document.body.classList.toggle("secret-mode");const t=document.createElement("div");t.className="toast";t.textContent=a?"🏳‍⚧️ Easter egg activado 🏳️‍⚧️":"Easter egg desactivado";document.body.appendChild(t);requestAnimationFrame(()=>t.classList.add("is-shown"));setTimeout(()=>{t.classList.remove("is-shown");setTimeout(()=>t.remove(),400)},2600);if(a&&aOn){for(let i=0;i<30;i++)setTimeout(()=>{const f=document.createElement("span");f.className="confetti-flag rain-flag";f.style.left=Math.random()*100+"vw";f.style.top="-2rem";f.style.setProperty("--tx",(Math.random()*60-30)+"px");f.style.setProperty("--ty",(window.innerHeight+60)+"px");f.style.setProperty("--r",(Math.random()*360)+"deg");document.body.appendChild(f);setTimeout(()=>f.remove(),2600)},i*60)}}}else kI=k===kC[0]?1:0});