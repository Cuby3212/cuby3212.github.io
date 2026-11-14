(() => {
  "use strict";

  // Preferencias compartidas. El almacenamiento bloqueado no impide usar la web.
  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const readPreference = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const writePreference = (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  };
  const observeMedia = (query, listener) => {
    if (query.addEventListener) query.addEventListener("change", listener);
    else if (query.addListener) query.addListener(listener);
  };
  const storedMotion = readPreference("cuby-motion");
  let animationsEnabled = storedMotion === "on" || (storedMotion !== "off" && !reducedMotion.matches);
  const motionAllowed = () => animationsEnabled && !reducedMotion.matches && !document.hidden;

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Relojes: dos formateadores reutilizados y una sola actualización por minuto.
  const clocks = [
    { element: document.getElementById("clock-peninsula"), zone: "Europe/Madrid" },
    { element: document.getElementById("clock-canarias"), zone: "Atlantic/Canary" }
  ].map((clock) => {
    try {
      clock.formatter = new Intl.DateTimeFormat("es-ES", {
        timeZone: clock.zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      });
    } catch {
      clock.formatter = null;
    }
    return clock;
  });
  let clockTimer;
  function scheduleClock() {
    clearTimeout(clockTimer);
    if (document.hidden || !clocks.some((clock) => clock.element)) return;
    const now = new Date();
    clocks.forEach(({ element, formatter }) => {
      if (!element) return;
      // Si el navegador no admite zonas horarias, no mostrar una hora local incorrecta.
      try { element.textContent = formatter ? formatter.format(now) : "--:--"; }
      catch { element.textContent = "--:--"; }
    });
    clockTimer = setTimeout(scheduleClock, 60000 - (Date.now() % 60000));
  }

  // Tema y nombres accesibles de los controles.
  const themeButton = document.getElementById("theme-toggle");
  const themeMeta = document.getElementById("theme-color-meta");
  const isDark = () => root.classList.contains("theme-dark") ||
    (!root.classList.contains("theme-light") && darkScheme.matches);
  function updateTheme() {
    const dark = isDark();
    if (themeButton) {
      const icon = themeButton.querySelector("span");
      if (icon) icon.textContent = dark ? "☀️" : "🌙";
      const label = dark ? "Activar modo claro" : "Activar modo oscuro";
      themeButton.setAttribute("aria-label", label);
      themeButton.title = label;
      themeButton.setAttribute("aria-pressed", String(dark));
    }
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#0c0a16" : "#f7c9dd");
  }
  const storedTheme = readPreference("cuby-theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    root.classList.remove("theme-auto", "theme-light", "theme-dark");
    root.classList.add("theme-" + storedTheme);
  }
  updateTheme();
  if (themeButton) themeButton.addEventListener("click", () => {
    const theme = isDark() ? "light" : "dark";
    root.classList.remove("theme-auto", "theme-light", "theme-dark");
    root.classList.add("theme-" + theme);
    writePreference("cuby-theme", theme);
    updateTheme();
  });
  observeMedia(darkScheme, () => {
    if (root.classList.contains("theme-auto")) updateTheme();
  });

  // Saludo y partículas: se conservan las estaciones y los días especiales.
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  let greetings;
  let holidayClass = "";
  let holidayIcon = "";
  if (month === 12 && day >= 24 && day <= 26) {
    greetings = ["¡Feliz Navidad y felices fiestas!", "Días de descanso y abrigo.", "Disfruta de estas fechas con calma."];
    holidayClass = "holiday-xmas"; holidayIcon = "🎁";
  } else if ((month === 12 && day === 31) || (month === 1 && day === 1)) {
    greetings = ["¡Feliz año nuevo!", "Empezando el año con todo.", "Nuevos propósitos por delante."];
    holidayClass = "holiday-newyear"; holidayIcon = "🎆";
  } else if (month === 10 && day === 31) {
    greetings = ["Noche de brujas por aquí.", "Ambiente misterioso hoy.", "Cuidado con los sustos."];
    holidayClass = "holiday-halloween"; holidayIcon = "🎃";
  } else {
    const byHour = {
      morning: ["Buenos días.", "Café primero.", "Hola, buenos días.", "¿Qué tal la mañana?"],
      afternoon: ["Buenas tardes.", "¿Qué tal la tarde?", "Tarde tranquila.", "Hola de nuevo."],
      night: ["Buenas noches.", "¿No deberías dormir?", "Modo noche activado.", "Descansa cuando toque."]
    };
    greetings = byHour[(hour < 6 || hour >= 20) ? "night" : (hour < 13 ? "morning" : "afternoon")];
  }
  const heading = document.querySelector("h1");
  if (heading && holidayClass) heading.classList.add(holidayClass);
  const season = root.getAttribute("data-season") || "spring";
  const particleIcon = holidayIcon || { spring: "🌸", summer: "☀️", autumn: "🍁", winter: "❄️" }[season] || "🌸";
  const particles = document.getElementById("seasonal-fx");
  if (particles) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 8; index++) {
      const particle = document.createElement("span");
      particle.className = "petal";
      particle.textContent = particleIcon;
      fragment.appendChild(particle);
    }
    particles.appendChild(fragment);
  }

  const greeting = document.getElementById("greeting");
  const greetingText = greetings[Math.floor(Math.random() * greetings.length)];
  let greetingIndex = 0;
  let greetingTimer;
  function finishGreeting() {
    clearTimeout(greetingTimer);
    greetingTimer = undefined;
    greetingIndex = greetingText.length;
    if (greeting) {
      greeting.textContent = greetingText;
      greeting.classList.remove("is-typing");
    }
  }
  function typeGreeting() {
    clearTimeout(greetingTimer);
    greetingTimer = undefined;
    if (!greeting || greetingIndex >= greetingText.length) return;
    if (!animationsEnabled || reducedMotion.matches) { finishGreeting(); return; }
    if (document.hidden) return;
    greeting.classList.add("is-typing");
    greetingIndex++;
    greeting.textContent = greetingText.slice(0, greetingIndex);
    if (greetingIndex === greetingText.length) finishGreeting();
    else greetingTimer = setTimeout(typeGreeting, 38);
  }

  // Desplegables nativos con apertura y cierre gradual. No se mide el contenido
  // en cada fotograma; solo al pulsar. Sin JavaScript siguen funcionando.
  const activeDisclosures = new Set();
  function finishDisclosures() {
    Array.from(activeDisclosures).forEach((finish) => finish());
  }
  document.querySelectorAll(".info-toggle, .faq-item").forEach((details) => {
    const summary = details.querySelector("summary");
    if (!summary) return;
    let expanded = details.open;
    let animation = null;
    details.dataset.disclosure = "";
    function updateDisclosure() {
      details.dataset.expanded = String(expanded);
      summary.setAttribute("aria-expanded", String(expanded));
    }
    function finish() {
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
        animation = null;
      }
      activeDisclosures.delete(finish);
      details.open = expanded;
      details.style.height = "";
      details.style.overflow = "";
      updateDisclosure();
    }
    updateDisclosure();
    summary.addEventListener("click", (event) => {
      if (typeof details.animate !== "function") return;
      event.preventDefault();
      // Un desplegable padre vuelve a altura automática antes de medir al hijo.
      Array.from(activeDisclosures).forEach((settle) => {
        if (settle !== finish) settle();
      });
      const startHeight = details.getBoundingClientRect().height;
      if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
      expanded = !expanded;
      updateDisclosure();
      if (!motionAllowed()) { finish(); return; }
      details.style.height = "";
      details.open = true;
      const style = getComputedStyle(details);
      const extraHeight = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"]
        .reduce((sum, property) => sum + (parseFloat(style[property]) || 0), 0);
      const endHeight = expanded ? details.getBoundingClientRect().height :
        summary.getBoundingClientRect().height + extraHeight;
      details.style.overflow = "hidden";
      details.style.height = startHeight + "px";
      animation = details.animate(
        [{ height: startHeight + "px" }, { height: endHeight + "px" }],
        { duration: expanded ? 360 : 280, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
      activeDisclosures.add(finish);
      animation.onfinish = finish;
    });
    details.addEventListener("toggle", () => {
      if (!animation) { expanded = details.open; updateDisclosure(); }
    });
  });
  // Solo se recorren las animaciones activas; el diseño general sigue siendo CSS.
  window.addEventListener("resize", finishDisclosures, { passive: true });
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener("loadingdone", finishDisclosures);
  }

  // Puntero: un fotograma pendiente como máximo y limpieza al pausar o cancelar.
  const backgrounds = document.querySelectorAll(".bg-layer");
  const tiltResets = [];
  let pointerFrame = null;
  let pointerX = 0;
  let pointerY = 0;
  function resetPointerEffects() {
    if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
    tiltResets.forEach((reset) => reset());
  }
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      if (!motionAllowed()) return;
      pointerX = event.clientX; pointerY = event.clientY;
      if (pointerFrame !== null) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = null;
        if (!motionAllowed()) return;
        body.style.setProperty("--mx", pointerX + "px");
        body.style.setProperty("--my", pointerY + "px");
        const x = (pointerX / window.innerWidth - 0.5) * -12;
        const y = (pointerY / window.innerHeight - 0.5) * -12;
        backgrounds.forEach((background) => {
          background.style.transform = "scale(1.035) translate(" + x + "px, " + y + "px)";
        });
      });
    }, { passive: true });
    function addTilt(element, maxTilt, scale) {
      let pressed = false, rotationX = 0, rotationY = 0, frame = null, x = 0, y = 0;
      const render = () => {
        element.style.transform = "perspective(500px) rotateX(" + rotationX +
          "deg) rotateY(" + rotationY + "deg) scale(" + (pressed ? scale * 0.94 : scale) + ")";
      };
      const reset = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; pressed = false; rotationX = rotationY = 0;
        element.style.transform = "";
      };
      tiltResets.push(reset);
      element.addEventListener("pointermove", (event) => {
        if (!motionAllowed()) return;
        x = event.clientX; y = event.clientY;
        if (frame !== null) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          if (!motionAllowed()) return;
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          rotationY = ((x - rect.left) / rect.width - 0.5) * maxTilt * 2;
          rotationX = (0.5 - (y - rect.top) / rect.height) * maxTilt * 2;
          render();
        });
      }, { passive: true });
      element.addEventListener("pointerdown", () => { if (motionAllowed()) { pressed = true; render(); } });
      element.addEventListener("pointerup", () => { pressed = false; if (motionAllowed()) render(); });
      element.addEventListener("pointerleave", reset);
      element.addEventListener("pointercancel", reset);
    }
    const avatar = document.querySelector(".avatar-wrap");
    if (avatar) addTilt(avatar, 12, 1.08);
    document.querySelectorAll(".container .button").forEach((button) => addTilt(button, 6, 1.02));
  }
  window.addEventListener("blur", resetPointerEffects);

  const motionButton = document.getElementById("motion-toggle");
  function syncMotion() {
    const enabled = animationsEnabled && !reducedMotion.matches;
    body.classList.toggle("motion-paused", !enabled);
    if (motionButton) {
      const icon = motionButton.querySelector("span");
      if (icon) icon.textContent = enabled ? "⏸️" : "▶️";
      const label = enabled ? "Pausar animaciones" : "Activar animaciones";
      motionButton.setAttribute("aria-label", label);
      motionButton.setAttribute("aria-pressed", String(enabled));
      motionButton.disabled = reducedMotion.matches;
      motionButton.title = reducedMotion.matches ? "Movimiento reducido por preferencia del sistema" : label;
    }
    if (!enabled) { finishGreeting(); finishDisclosures(); resetPointerEffects(); }
  }
  if (motionButton) motionButton.addEventListener("click", () => {
    animationsEnabled = !animationsEnabled;
    writePreference("cuby-motion", animationsEnabled ? "on" : "off");
    syncMotion();
  });
  observeMedia(reducedMotion, syncMotion);
  function syncVisibility() {
    body.classList.toggle("page-hidden", document.hidden);
    scheduleClock();
    clearTimeout(greetingTimer);
    if (document.hidden) { resetPointerEffects(); finishDisclosures(); }
    else typeGreeting();
  }
  document.addEventListener("visibilitychange", syncVisibility);
  syncMotion();
  syncVisibility();

  // Modo aurora: conserva el código secreto y también se descubre con tres
  // pulsaciones en el nombre. No añade partículas: cambia las ocho existentes.
  const secretPanel = document.getElementById("secret-panel");
  const secretTrigger = document.getElementById("secret-trigger");
  const secretClose = document.getElementById("secret-close");
  const auroraIcons = ["🦋", "✨", "💖", "🏳️‍⚧️", "🌸", "💙", "🤍", "💗"];
  function setSecretMode(enabled) {
    body.classList.toggle("secret-mode", enabled);
    if (secretPanel) secretPanel.hidden = !enabled;
    if (particles) Array.from(particles.children).forEach((particle, index) => {
      particle.textContent = enabled ? auroraIcons[index % auroraIcons.length] : particleIcon;
    });
    const previousToast = document.querySelector(".toast");
    if (previousToast) previousToast.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = enabled ? "Modo aurora activado ✨" : "Has vuelto al modo habitual";
    body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-shown"));
    setTimeout(() => {
      toast.classList.remove("is-shown");
      setTimeout(() => toast.remove(), 400);
    }, 2600);
  }
  if (secretClose) secretClose.addEventListener("click", () => {
    setSecretMode(false);
    if (secretTrigger && secretTrigger.focus) secretTrigger.focus({ preventScroll: true });
  });
  if (secretTrigger) {
    let taps = 0, lastTap = 0;
    secretTrigger.addEventListener("click", () => {
      const timestamp = Date.now();
      if (timestamp - lastTap > 900) taps = 0;
      lastTap = timestamp;
      if (++taps < 3) return;
      taps = 0;
      setSecretMode(!body.classList.contains("secret-mode"));
    });
  }
  const secretSequence = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let secretIndex = 0;
  window.addEventListener("keydown", (event) => {
    if (event.target && event.target.closest && event.target.closest("input, textarea, select, [contenteditable]")) return;
    const key = (event.key || "").toLowerCase();
    if (key === "escape" && body.classList.contains("secret-mode")) {
      setSecretMode(false);
      if (secretTrigger && secretTrigger.focus) secretTrigger.focus({ preventScroll: true });
      secretIndex = 0;
      return;
    }
    secretIndex = key === secretSequence[secretIndex] ? secretIndex + 1 : (key === secretSequence[0] ? 1 : 0);
    if (secretIndex !== secretSequence.length) return;
    secretIndex = 0;
    setSecretMode(!body.classList.contains("secret-mode"));
  });
})();
