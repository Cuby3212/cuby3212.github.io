document.getElementById("year").textContent = new Date().getFullYear();
try {
  const tP = document.getElementById("clock-peninsula"), tC = document.getElementById("clock-canarias");
  const fP = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const fC = new Intl.DateTimeFormat("es-ES", { timeZone: "Atlantic/Canary", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function updClk() {
    const n = new Date();
    if (tP) tP.textContent = fP.format(n);
    if (tC) tC.textContent = fC.format(n);
  }
  if (tP && tC) {
    updClk();
    setInterval(updClk, 1000);
  }
} catch (e) {
  const fallback = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const tP = document.getElementById("clock-peninsula"), tC = document.getElementById("clock-canarias");
  if (tP) tP.textContent = fallback;
  if (tC) tC.textContent = fallback;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".bg-layer").forEach(b => b.classList.add("loaded"));
});

try {
  const now = new Date(), m = now.getMonth() + 1, d = now.getDate(), hr = now.getHours(), grEl = document.getElementById("greeting"), h1El = document.querySelector("h1");
  let opts = ["Hola.", "Bienvenido/a de nuevo.", "Qué tal todo.", "Un placer verte por aquí.", "Por aquí andamos."], holidayClass = "";
  if (m === 12 && d >= 24 && d <= 26) {
    opts = ["¡Feliz Navidad y felices fiestas!", "Días de descanso y abrigo.", "Disfruta de estas fechas con calma."];
    holidayClass = "holiday-xmas";
  } else if ((m === 12 && d === 31) || (m === 1 && d === 1)) {
    opts = ["¡Feliz año nuevo!", "Empezando el año con todo.", "Nuevos propósitos por delante."];
    holidayClass = "holiday-newyear";
  } else if (m === 10 && d === 31) {
    opts = ["Noche de brujas por aquí.", "Ambiente misterioso hoy.", "Cuidado con los sustos."];
    holidayClass = "holiday-halloween";
  } else {
    const gSet = {
      m: ["Buenos días.", "Café primero.", "Hola, buenos días.", "¿Qué tal la mañana?"],
      a: ["Buenas tardes.", "¿Qué tal la tarde?", "Tarde tranquila.", "Hola de nuevo."],
      n: ["Buenas noches.", "¿No deberías dormir?", "Modo noche activado.", "Descansa cuando toque."]
    };
    const band = hr < 6 || hr >= 20 ? "n" : hr < 13 ? "m" : "a";
    opts = gSet[band];
  }
  if (h1El && holidayClass) h1El.classList.add(holidayClass);
  if (grEl) {
    const txt = opts[Math.floor(Math.random() * opts.length)];
    let aOn = true;
    try { aOn = (localStorage.getItem("cuby-motion") || (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "on")) === "on"; } catch (e) {}
    if (aOn) {
      let i = 0;
      grEl.classList.add("is-typing");
      const tI = setInterval(() => {
        i++;
        grEl.textContent = txt.slice(0, i);
        if (i >= txt.length) {
          clearInterval(tI);
          grEl.classList.remove("is-typing");
        }
      }, 38);
    } else {
      grEl.textContent = txt;
    }
  }
} catch (e) {}

try {
  const rt = document.documentElement, thmBtn = document.getElementById("theme-toggle"), bgs = document.querySelectorAll(".bg-layer");
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const isD = () => rt.classList.contains("theme-dark") || (!rt.classList.contains("theme-light") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const updThm = () => {
    const s = thmBtn ? thmBtn.querySelector("span") : null, meta = document.getElementById("theme-color-meta");
    if (s) s.textContent = isD() ? "☀️" : "🌙";
    if (meta) meta.setAttribute("content", isD() ? "#0c0a16" : "#f7c9dd");
  };
  const aThm = get("cuby-theme");
  if (aThm === "light" || aThm === "dark") {
    rt.classList.remove("theme-auto", "theme-light", "theme-dark");
    rt.classList.add("theme-" + aThm);
  }
  updThm();
  if (thmBtn) {
    thmBtn.addEventListener("click", () => {
      const d = !isD();
      rt.classList.remove("theme-auto", "theme-light", "theme-dark");
      rt.classList.add(d ? "theme-dark" : "theme-light");
      set("cuby-theme", d ? "dark" : "light");
      updThm();
    });
  }
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (rt.classList.contains("theme-auto")) updThm();
  });
  const motBtn = document.getElementById("motion-toggle");
  let aOn = (get("cuby-motion") || (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "on")) === "on";
  const updMot = () => { const s = motBtn ? motBtn.querySelector("span") : null; if (s) s.textContent = aOn ? "⏸️" : "▶️"; };
  const setMot = o => {
    aOn = o;
    set("cuby-motion", o ? "on" : "off");
    updMot();
    [...bgs, document.querySelector(".avatar-wrap"), document.querySelector("h1"), ...document.querySelectorAll(".petal,.star")].filter(Boolean).forEach(e => e.style.animationPlayState = o ? "running" : "paused");
    document.body.classList.toggle("motion-paused", !o);
    if (!o) {
      document.querySelectorAll(".container .button,.avatar-wrap").forEach(e => e.style.transform = "");
    }
  };
  setMot(aOn);
  if (motBtn) motBtn.addEventListener("click", () => setMot(!aOn));
} catch (e) {}

const sN = document.documentElement.getAttribute('data-season') || 'spring';
const sI = { spring: '🌸', summer: '☀️', autumn: '🍁', winter: '❄️' }[sN];
const fE = document.getElementById('seasonal-fx');
if (fE) for (let i = 0; i < 8; i++) {
  const sp = document.createElement('span');
  sp.className = 'petal';
  sp.textContent = sI;
  fE.appendChild(sp);
}