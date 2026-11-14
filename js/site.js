(() => {
  "use strict";

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
      try { element.textContent = formatter ? formatter.format(now) : "--:--"; }
      catch { element.textContent = "--:--"; }
    });
    clockTimer = setTimeout(scheduleClock, 60000 - (Date.now() % 60000));
  }

  const themeButton = document.getElementById("theme-toggle");
  const themeMeta = document.getElementById("theme-color-meta");
  const isDark = () => root.classList.contains("theme-dark") ||
    (!root.classList.contains("theme-light") && darkScheme.matches);
  function updateTheme() {
    const dark = isDark();
    if (themeButton) {
      const label = dark ? "Activar modo claro" : "Activar modo oscuro";
      themeButton.setAttribute("aria-label", label);
      themeButton.title = label;
      themeButton.setAttribute("aria-pressed", String(dark));
    }
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#1c2026" : "#faf9f7");
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

  const event = root.getAttribute("data-event");
  const holidayIcon = { xmas: "🎁", newyear: "🎆", halloween: "🎃" }[event] || "";
  const season = root.getAttribute("data-season") || "spring";
  const particleIcon = holidayIcon || { spring: "🌸", summer: "☀️", autumn: "🍁", winter: "❄️" }[season] || "🌸";
  const particles = document.getElementById("seasonal-fx");
  if (particles) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 8; index++) {
      const particle = document.createElement("span");
      particle.className = "petal";
      particle.style.setProperty("--i", index);
      particle.textContent = particleIcon;
      fragment.appendChild(particle);
    }
    particles.appendChild(fragment);
  }

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
  window.addEventListener("resize", finishDisclosures, { passive: true });
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener("loadingdone", finishDisclosures);
  }

  const motionButton = document.getElementById("motion-toggle");
  function syncMotion() {
    const enabled = animationsEnabled && !reducedMotion.matches;
    body.classList.toggle("motion-paused", !enabled);
    if (motionButton) {
      const label = enabled ? "Pausar animaciones" : "Activar animaciones";
      motionButton.setAttribute("aria-label", label);
      motionButton.setAttribute("aria-pressed", String(enabled));
      motionButton.disabled = reducedMotion.matches;
      motionButton.title = reducedMotion.matches ? "Movimiento reducido por preferencia del sistema" : label;
    }
    if (!enabled) finishDisclosures();
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
    if (document.hidden) { finishDisclosures(); }
  }
  document.addEventListener("visibilitychange", syncVisibility);
  syncMotion();
  syncVisibility();

  const secretTrigger = document.getElementById("secret-trigger");
  const easterEggIcons = ["🦋", "✨", "💖", "🏳️‍⚧️", "🌸", "💙", "🤍", "💗"];
  function setSecretMode(enabled) {
    body.classList.toggle("secret-mode", enabled);
    if (particles) Array.from(particles.children).forEach((particle, index) => {
      particle.textContent = enabled ? easterEggIcons[index % easterEggIcons.length] : particleIcon;
    });
    const previousToast = document.querySelector(".toast");
    if (previousToast) previousToast.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = enabled ? "Modo easter egg activado ✨" : "Has vuelto al modo habitual";
    body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-shown"));
    setTimeout(() => {
      toast.classList.remove("is-shown");
      setTimeout(() => toast.remove(), 400);
    }, 2600);
  }
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
