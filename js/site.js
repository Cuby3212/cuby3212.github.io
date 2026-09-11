document.getElementById('year').textContent = new Date().getFullYear();

window.addEventListener('load', () => {
  const bg = document.querySelector('.bg-layer');
  if (bg) bg.classList.add('loaded');
});

const hour = new Date().getHours();
const greetingEl = document.getElementById('greeting');
if (greetingEl) {
  if (hour >= 6 && hour < 13) greetingEl.textContent = '¡Buenos días! ☀️';
  else if (hour >= 13 && hour < 20) greetingEl.textContent = '¡Buenas tardes! 🌤️';
  else greetingEl.textContent = '¡Buenas noches! 🌙';
}

const root = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function isDarkActive() {
  if (root.classList.contains('theme-dark')) return true;
  if (root.classList.contains('theme-light')) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateThemeIcon() {
  themeBtn.textContent = isDarkActive() ? '☀️' : '🌙';
}

const badgeLight = document.getElementById('visit-badge-light');
const badgeDark = document.getElementById('visit-badge-dark');
if (badgeLight) badgeLight.src = 'https://views-counter.vercel.app/badge?pageId=cuby3212-github-io&leftColor=e893b0&rightColor=fbdce8&type=unique&sessionExpire=1440&label=visitas&style=upper';
if (badgeDark) badgeDark.src = 'https://views-counter.vercel.app/badge?pageId=cuby3212-github-io&leftColor=2a1830&rightColor=8a4a63&type=unique&sessionExpire=1440&label=visitas&style=upper';

function updateCounterBadge() {
  const dark = isDarkActive();
  if (badgeLight) badgeLight.classList.toggle('is-visible', !dark);
  if (badgeDark) badgeDark.classList.toggle('is-visible', dark);
}

function applyStoredTheme() {
  const saved = safeGet('cuby-theme');
  if (saved === 'light' || saved === 'dark') {
    root.classList.remove('theme-auto', 'theme-light', 'theme-dark');
    root.classList.add('theme-' + saved);
  }
  updateThemeIcon();
  updateCounterBadge();
}

themeBtn.addEventListener('click', () => {
  const goingDark = !isDarkActive();
  root.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  root.classList.add(goingDark ? 'theme-dark' : 'theme-light');
  safeSet('cuby-theme', goingDark ? 'dark' : 'light');
  updateThemeIcon();
  updateCounterBadge();
});

applyStoredTheme();

const motionBtn = document.getElementById('motion-toggle');
const systemReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const storedMotion = safeGet('cuby-motion');
let animationsOn = storedMotion ? storedMotion === 'on' : !systemReduceMotion;

function animatedElements() {
  return [
    document.querySelector('.bg-layer'),
    document.querySelector('.avatar-wrap'),
    document.querySelector('h1'),
    ...document.querySelectorAll('.petal'),
    ...document.querySelectorAll('.star'),
  ].filter(Boolean);
}

function updateMotionIcon() {
  motionBtn.textContent = animationsOn ? '⏸️' : '▶️';
}

function setAnimations(on) {
  animationsOn = on;
  safeSet('cuby-motion', on ? 'on' : 'off');
  updateMotionIcon();

  animatedElements().forEach((el) => {
    el.style.animationPlayState = on ? 'running' : 'paused';
  });
  document.body.classList.toggle('motion-paused', !on);

  if (on) {
    document.body.style.removeProperty('--mx');
    document.body.style.removeProperty('--my');
  } else {
    document.querySelectorAll('.confetti-flag').forEach((f) => f.remove());
    document.querySelectorAll('.container .button, .avatar-wrap').forEach((el) => { el.style.transform = ''; });
  }
}

setAnimations(animationsOn);
motionBtn.addEventListener('click', () => setAnimations(!animationsOn));

window.addEventListener('pointermove', (e) => {
  if (!animationsOn) return;
  document.body.style.setProperty('--mx', e.clientX + 'px');
  document.body.style.setProperty('--my', e.clientY + 'px');
});

function burstFlags(x, y) {
  for (let i = 0; i < 8; i++) {
    const flag = document.createElement('span');
    flag.className = 'confetti-flag';
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 40;
    flag.style.left = x + 'px';
    flag.style.top = y + 'px';
    flag.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    flag.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    flag.style.setProperty('--r', (Math.random() * 180 - 90) + 'deg');
    document.body.appendChild(flag);
    setTimeout(() => flag.remove(), 850);
  }
}
document.querySelectorAll('.container .button').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (animationsOn) {
      burstFlags(e.clientX, e.clientY);
      if (navigator.vibrate) navigator.vibrate(15);
    }
    window.open(btn.href, '_blank', 'noopener,noreferrer');
  });
});

function attachTilt(el, maxTilt, hoverScale) {
  let pressed = false;
  let rotX = 0;
  let rotY = 0;
  function render() {
    const s = pressed ? hoverScale * 0.94 : hoverScale;
    el.style.transform = `perspective(500px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${s})`;
  }
  el.addEventListener('pointermove', (e) => {
    if (!animationsOn) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotY = (px - 0.5) * maxTilt * 2;
    rotX = (0.5 - py) * maxTilt * 2;
    render();
  });
  el.addEventListener('pointerdown', () => { if (animationsOn) { pressed = true; render(); } });
  el.addEventListener('pointerup', () => { pressed = false; if (animationsOn) render(); });
  el.addEventListener('pointerleave', () => { pressed = false; rotX = 0; rotY = 0; el.style.transform = ''; });
}

const avatarWrap = document.querySelector('.avatar-wrap');
if (avatarWrap) attachTilt(avatarWrap, 12, 1.08);
document.querySelectorAll('.container .button').forEach((btn) => attachTilt(btn, 6, 1.02));

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-shown'));
  setTimeout(() => {
    toast.classList.remove('is-shown');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

const copyBtn = document.getElementById('copy-link');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('🔗 ¡Enlace copiado!');
    } catch (e) {
      showToast('No se pudo copiar 😅');
    }
  });
}

function rainFlags() {
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const flag = document.createElement('span');
      flag.className = 'confetti-flag rain-flag';
      flag.style.left = Math.random() * 100 + 'vw';
      flag.style.top = '-2rem';
      flag.style.setProperty('--tx', (Math.random() * 60 - 30) + 'px');
      flag.style.setProperty('--ty', (window.innerHeight + 60) + 'px');
      flag.style.setProperty('--r', (Math.random() * 360) + 'deg');
      document.body.appendChild(flag);
      setTimeout(() => flag.remove(), 2600);
    }, i * 60);
  }
}

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;
window.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const expected = konamiCode[konamiIndex];
  if (key === expected) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      konamiIndex = 0;
      const active = document.body.classList.toggle('secret-mode');
      showToast(active ? '🏳️‍⚧️ ¡Código secreto activado! 🏳️‍⚧️' : 'Modo secreto desactivado');
      if (active && animationsOn) rainFlags();
    }
  } else {
    konamiIndex = key === konamiCode[0] ? 1 : 0;
  }
});
