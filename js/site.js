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
  let animationsEnabled = storedMotion !== "off";
  const motionAllowed = () => animationsEnabled && !reducedMotion.matches && !document.hidden;
  const favicon = document.getElementById("site-favicon");
  let faviconFrames;
  let faviconLoading = false;
  let faviconTimer;
  let faviconIndex = 0;
  function syncFavicon() {
    if (!favicon) return;
    clearTimeout(faviconTimer);
    if (!motionAllowed()) {
      favicon.href = "images/avatar.png";
      return;
    }
    if (!faviconFrames) {
      if (!faviconLoading) {
        faviconLoading = true;
        fetch("images/favicon-frames.json").then((response) => {
          if (!response.ok) throw new Error("Favicon no disponible");
          return response.json();
        }).then((frames) => {
          if (!Array.isArray(frames) || frames.length === 0 ||
              !frames.every((frame) => typeof frame === "string" && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame))) {
            throw new Error("Fotogramas del favicon no válidos");
          }
          faviconFrames = frames;
          syncFavicon();
        }).catch(() => {
          faviconLoading = false;
        });
      }
      return;
    }
    // Los fotogramas se han preparado de antemano para no dibujarlos ni descargarlos en cada cambio.
    favicon.href = faviconFrames[faviconIndex];
    faviconIndex = (faviconIndex + 1) % faviconFrames.length;
    faviconTimer = setTimeout(syncFavicon, 180);
  }

  window.addEventListener("online", syncFavicon);

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
  const emojiFont = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
  const emojiCache = new Map();
  function emojiAsset(icon) {
    const code = Array.from(icon).filter((char) => char !== "\ufe0f" || icon.includes("\u200d"))
      .map((char) => char.codePointAt(0).toString(16)).join("-");
    return "images/emoji/" + code + ".svg";
  }
  function getEmojiSource(icon) {
    if (emojiCache.has(icon)) return emojiCache.get(icon);
    let native = false;
    let source = emojiAsset(icon);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.font = "96px " + emojiFont;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(icon + (icon.includes("\ufe0f") ? "" : "\ufe0f"), 64, 68);
        const pixels = context.getImageData(0, 0, 128, 128).data;
        // El color se comprueba una sola vez por emoji; si no se detecta, se usa el SVG local.
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 128 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
              Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 32) {
            native = true;
            break;
          }
        }
        if (native && icon.includes("\u200d")) {
          const joined = canvas.toDataURL("image/png");
          context.clearRect(0, 0, 128, 128);
          context.fillText(icon.replace(/\u200d/g, "\u200b"), 64, 68);
          native = joined !== canvas.toDataURL("image/png");
          if (native) source = joined;
        } else if (native) source = canvas.toDataURL("image/png");
      }
    } catch { native = false; }
    const result = native ? source : emojiAsset(icon);
    emojiCache.set(icon, result);
    return result;
  }
  function emojiImage(source, className) {
    const image = document.createElement("img");
    image.className = className;
    image.alt = "";
    image.width = image.height = 128;
    image.src = source;
    return image;
  }
  function setInlineEmoji(element, icon) {
    if (!element) return;
    element.textContent = icon;
    if (!icon) return;
    // Se usa el dibujo comprobado para evitar diferencias con las fuentes del texto.
    element.replaceChildren(emojiImage(getEmojiSource(icon), "emoji-image"));
  }
  document.querySelectorAll(".emoji").forEach((element) => setInlineEmoji(element, element.textContent));
  setInlineEmoji(document.querySelector(".event-decoration"),
    { xmas: "🎄", newyear: "🎆", halloween: "🎃" }[event] || "");
  function setParticleIcon(particle, icon) {
    particle.replaceChildren(emojiImage(getEmojiSource(icon), "petal-image"));
  }
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  function randomizeParticle(particle, initial = false) {
    const duration = randomBetween(14, 27);
    const values = {
      "--x": randomBetween(3, 97) + "%",
      "--duration": duration + "s",
      "--delay": (initial ? -Math.random() * duration : randomBetween(0, 3)) + "s",
      "--drift-a": randomBetween(-3, 3) + "rem",
      "--drift-b": randomBetween(-3, 3) + "rem",
      "--drift-end": randomBetween(-3, 3) + "rem",
      "--rotation-start": randomBetween(-90, 90) + "deg",
      "--rotation-mid": randomBetween(-120, 120) + "deg",
      "--rotation-end": randomBetween(-180, 180) + "deg",
      "--scale": randomBetween(.85, 1.25),
      "--alpha": randomBetween(.55, .85)
    };
    Object.entries(values).forEach(([key, value]) => particle.style.setProperty(key, value));
    particle.style.animationName = particle.style.animationName === "fall" ? "fall-next" : "fall";
  }
  if (particles) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 8; index++) {
      const particle = document.createElement("span");
      particle.className = "petal";
      randomizeParticle(particle, true);
      particle.addEventListener("animationend", () => randomizeParticle(particle));
      setParticleIcon(particle, particleIcon);
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
    syncFavicon();
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
    syncFavicon();
    body.classList.toggle("page-hidden", document.hidden);
    scheduleClock();
    if (document.hidden) { finishDisclosures(); }
  }
  document.addEventListener("visibilitychange", syncVisibility);
  syncMotion();
  syncVisibility();

  const card = document.querySelector(".container");
  if (card && motionAllowed()) {
    card.classList.add("is-entering");
    const finishEntrance = (event) => {
      if (event.target === card && event.animationName === "card-enter") card.classList.remove("is-entering");
    };
    card.addEventListener("animationend", finishEntrance);
    card.addEventListener("animationcancel", finishEntrance);
  }
  document.querySelectorAll(".button").forEach((button, index) => {
    if (motionAllowed()) {
      button.style.setProperty("--entry-order", index);
      button.classList.add("is-revealing");
    }
    const glint = () => {
      if (motionAllowed()) button.classList.add("press-glow");
    };
    button.addEventListener("pointerdown", glint, { passive: true });
    button.addEventListener("keydown", (event) => { if (event.key === "Enter") glint(); });
    const finishButtonAnimation = (event) => {
      if (event.target !== button) return;
      if (event.animationName === "links-enter") button.classList.remove("is-revealing");
      if (event.animationName === "button-glint") button.classList.remove("press-glow");
    };
    button.addEventListener("animationend", finishButtonAnimation);
    button.addEventListener("animationcancel", finishButtonAnimation);
  });

  const secretTrigger = document.getElementById("secret-trigger");
  const easterEggIcons = ["🦋", "✨", "💖", "🏳️‍⚧️", "🌸", "💙", "🤍", "💗"];
  function setSecretMode(enabled) {
    body.classList.toggle("secret-mode", enabled);
    if (particles) Array.from(particles.children).forEach((particle, index) => {
      setParticleIcon(particle, enabled ? easterEggIcons[index % easterEggIcons.length] : particleIcon);
    });
    const previousToast = document.querySelector(".toast");
    if (previousToast) previousToast.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = enabled ? "Modo easter egg activado " : "Has vuelto al modo habitual";
    if (enabled) {
      const sparkle = document.createElement("span");
      sparkle.className = "emoji";
      sparkle.setAttribute("aria-hidden", "true");
      setInlineEmoji(sparkle, "✨");
      toast.appendChild(sparkle);
    }
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
