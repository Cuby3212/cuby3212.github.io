(() => {
  "use strict";

  const endpoint = "https://cuby-socials-counter.cuby3212.workers.dev/visits";
  const widget = document.getElementById("visit-counter");
  if (!widget) return;
  const number = document.getElementById("visit-count");
  const status = document.getElementById("visit-status");
  const refresh = document.getElementById("visit-refresh");
  const production = location.origin === "https://cuby3212.github.io";
  let registered = !production;
  let visible = false;
  let started = false;
  let busy = false;
  let count = null;
  let lastAttempt = 0;
  let delay = 60000;
  let timer;
  let cooldown;

  function schedule() {
    clearTimeout(timer);
    if (started && visible && !document.hidden && !busy) {
      timer = setTimeout(update, Math.max(10000, delay - (Date.now() - lastAttempt)));
    }
  }

  async function update() {
    if (busy || document.hidden || Date.now() - lastAttempt < 10000) return;
    busy = true;
    lastAttempt = Date.now();
    refresh.disabled = true;
    widget.setAttribute("aria-busy", "true");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: registered ? "GET" : "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error("Invalid count");
      registered = true;
      if (data.count !== count) {
        number.textContent = new Intl.NumberFormat("es-ES").format(data.count);
        number.classList.remove("visit-changed");
        // Las consultas están separadas al menos diez segundos; la animación anterior ya ha terminado.
        requestAnimationFrame(() => number.classList.add("visit-changed"));
        count = data.count;
      }
      status.textContent = "Estimadas · únicas por día (UTC)";
      delay = 60000;
    } catch {
      status.textContent = count === null ? "Contador no disponible" : "Sin conexión · último total recibido";
      delay = 300000;
    } finally {
      clearTimeout(timeout);
      busy = false;
      widget.removeAttribute("aria-busy");
      clearTimeout(cooldown);
      cooldown = setTimeout(() => { refresh.disabled = false; }, Math.max(0, 10000 - (Date.now() - lastAttempt)));
      schedule();
    }
  }

  refresh.addEventListener("click", update);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }).observe(widget);
  } else visible = true;

  function start() {
    if (document.hidden) return;
    if (!started) {
      started = true;
      update();
    } else schedule();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearTimeout(timer);
    else if (document.readyState === "complete") start();
  });
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
