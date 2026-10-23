(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function updClk() {
    const n = new Date();
    const tP = document.getElementById("clock-peninsula");
    const tC = document.getElementById("clock-canarias");
    if (tP) {
      try {
        tP.textContent = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(n);
      } catch (e) {
        tP.textContent = n.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      }
    }
    if (tC) {
      try {
        tC.textContent = new Intl.DateTimeFormat("es-ES", { timeZone: "Atlantic/Canary", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(n);
      } catch (e) {
        const cDate = new Date(n.getTime() - 3600000);
        tC.textContent = cDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      }
    }
  }
  updClk();
  setInterval(updClk, 1000);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentHour = now.getHours();
  const grEl = document.getElementById("greeting");
  const h1El = document.querySelector("h1");
  let opts = ["Hola.", "Bienvenido/a de nuevo.", "Qué tal todo.", "Un placer verte por aquí.", "Por aquí andamos."];
  let holidayClass = "";

  if (currentMonth === 12 && currentDay >= 24 && currentDay <= 26) {
    opts = ["¡Feliz Navidad y felices fiestas!", "Días de descanso y abrigo.", "Disfruta de estas fechas con calma."];
    holidayClass = "holiday-xmas";
  } else if ((currentMonth === 12 && currentDay === 31) || (currentMonth === 1 && currentDay === 1)) {
    opts = ["¡Feliz año nuevo!", "Empezando el año con todo.", "Nuevos propósitos por delante."];
    holidayClass = "holiday-newyear";
  } else if (currentMonth === 10 && currentDay === 31) {
    opts = ["Noche de brujas por aquí.", "Ambiente misterioso hoy.", "Cuidado con los sustos."];
    holidayClass = "holiday-halloween";
  } else {
    const gSet = {
      m: ["Buenos días.", "Café primero.", "Hola, buenos días.", "¿Qué tal la mañana?"],
      a: ["Buenas tardes.", "¿Qué tal la tarde?", "Tarde tranquila.", "Hola de nuevo."],
      n: ["Buenas noches.", "¿No deberías dormir?", "Modo noche activado.", "Descansa cuando toque."]
    };
    const band = (currentHour < 6 || currentHour >= 20) ? "n" : (currentHour < 13 ? "m" : "a");
    opts = gSet[band];
  }

  if (h1El && holidayClass) {
    h1El.classList.add(holidayClass);
  }

  if (grEl) {
    const txt = opts[Math.floor(Math.random() * opts.length)];
    let aOn = true;
    try {
      aOn = (localStorage.getItem("cuby-motion") || (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "on")) === "on";
    } catch (e) {}
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

  const rt = document.documentElement;
  const thmBtn = document.getElementById("theme-toggle");
  const bgs = document.querySelectorAll(".bg-layer");
  const getVal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const setVal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const isD = () => rt.classList.contains("theme-dark") || (!rt.classList.contains("theme-light") && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const updThm = () => {
    const s = thmBtn ? thmBtn.querySelector("span") : null;
    const meta = document.getElementById("theme-color-meta");
    if (s) s.textContent = isD() ? "☀️" : "🌙";
    if (meta) meta.setAttribute("content", isD() ? "#0c0a16" : "#f7c9dd");
  };

  const aThm = getVal("cuby-theme");
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
      setVal("cuby-theme", d ? "dark" : "light");
      updThm();
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (rt.classList.contains("theme-auto")) updThm();
  });

  const motBtn = document.getElementById("motion-toggle");
  let aOn = (getVal("cuby-motion") || (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "on")) === "on";

  const updMot = () => {
    const s = motBtn ? motBtn.querySelector("span") : null;
    if (s) s.textContent = aOn ? "⏸️" : "▶️";
  };

  const setMot = (o) => {
    aOn = o;
    setVal("cuby-motion", o ? "on" : "off");
    updMot();
    const animEls = [...document.querySelectorAll(".bg-layer"), document.querySelector(".avatar-wrap"), document.querySelector("h1"), ...document.querySelectorAll(".petal, .star")].filter(Boolean);
    animEls.forEach((e) => { e.style.animationPlayState = o ? "running" : "paused"; });
    document.body.classList.toggle("motion-paused", !o);
    if (!o) {
      document.querySelectorAll(".container .button, .avatar-wrap").forEach((e) => { e.style.transform = ""; });
    }
  };
  setMot(aOn);

  if (motBtn) {
    motBtn.addEventListener("click", () => setMot(!aOn));
  }

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let tck = false;
    window.addEventListener("pointermove", (e) => {
      if (!aOn) return;
      document.body.style.setProperty("--mx", e.clientX + "px");
      document.body.style.setProperty("--my", e.clientY + "px");
      if (bgs.length && !tck) {
        tck = true;
        requestAnimationFrame(() => {
          const nx = (e.clientX / window.innerWidth - 0.5) * -12;
          const ny = (e.clientY / window.innerHeight - 0.5) * -12;
          bgs.forEach((el) => {
            el.style.transform = "scale(1.035) translate(" + nx + "px, " + ny + "px)";
          });
          tck = false;
        });
      }
    });

    function aTlt(el, mT, hS) {
      let p = false, rx = 0, ry = 0;
      const r = () => {
        el.style.transform = "perspective(500px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) scale(" + (p ? hS * 0.94 : hS) + ")";
      };
      el.addEventListener("pointermove", (e) => {
        if (!aOn) return;
        const rc = el.getBoundingClientRect();
        ry = ((e.clientX - rc.left) / rc.width - 0.5) * mT * 2;
        rx = (0.5 - (e.clientY - rc.top) / rc.height) * mT * 2;
        r();
      });
      el.addEventListener("pointerdown", () => { if (aOn) { p = true; r(); } });
      el.addEventListener("pointerup", () => { p = false; if (aOn) r(); });
      el.addEventListener("pointerleave", () => { p = false; rx = ry = 0; el.style.transform = ""; });
    }

    const aw = document.querySelector(".avatar-wrap");
    if (aw) aTlt(aw, 12, 1.08);
    document.querySelectorAll(".container .button").forEach((b) => aTlt(b, 6, 1.02));
  }

  const kC = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let kI = 0;
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === kC[kI]) {
      kI++;
      if (kI === kC.length) {
        kI = 0;
        const a = document.body.classList.toggle("secret-mode");
        const t = document.createElement("div");
        t.className = "toast";
        t.textContent = a ? "Easter egg activado" : "Easter egg desactivado";
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add("is-shown"));
        setTimeout(() => {
          t.classList.remove("is-shown");
          setTimeout(() => t.remove(), 400);
        }, 2600);
      }
    } else {
      kI = (k === kC[0]) ? 1 : 0;
    }
  });

  const sN = document.documentElement.getAttribute("data-season") || "spring";
  const sI = { spring: "🌸", summer: "☀️", autumn: "🍁", winter: "❄️" }[sN] || "🌸";
  const fE = document.getElementById("seasonal-fx");
  if (fE) {
    for (let i = 0; i < 8; i++) {
      const sp = document.createElement("span");
      sp.className = "petal";
      sp.textContent = sI;
      fE.appendChild(sp);
    }
  }
})();