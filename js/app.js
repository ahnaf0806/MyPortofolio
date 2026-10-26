"use strict";

/* =========================================
   NAFORA.LABS — APPLICATION CORE
   ========================================= */

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

const intro = document.getElementById("intro");
const workspace = document.getElementById("workspace");
const enterButton = document.getElementById("enter-button");
const transitionOverlay = document.getElementById("transition-overlay");
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const pointerGlow = document.querySelector(".pointer-glow");
const canvas = document.getElementById("particle-canvas");
const context = canvas.getContext("2d", { alpha: true });

let hasEntered = false;
let animationFrame = 0;
let particles = [];
let width = 0;
let height = 0;
let lastFrameTime = 0;

/* Theme */

function readSavedTheme() {
  try {
    const saved = localStorage.getItem("nafora-theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  } catch {
    return "dark";
  }
}

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";

  root.dataset.theme = nextTheme;
  themeIcon.textContent = nextTheme === "dark" ? "☼" : "☾";
  themeToggle.setAttribute(
    "aria-label",
    nextTheme === "dark" ? "Beralih ke light mode" : "Beralih ke dark mode",
  );

  try {
    localStorage.setItem("nafora-theme", nextTheme);
  } catch {
    // Tema tetap berfungsi meskipun penyimpanan tidak tersedia.
  }
}

setTheme(readSavedTheme());

themeToggle.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(next);
});

/* Pointer spotlight */

if (finePointer.matches && !reducedMotion.matches && pointerGlow) {
  let pointerX = -500;
  let pointerY = -500;
  let glowX = pointerX;
  let glowY = pointerY;

  window.addEventListener(
    "pointermove",
    (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    },
    { passive: true },
  );

  function updatePointerGlow() {
    glowX += (pointerX - glowX) * 0.12;
    glowY += (pointerY - glowY) * 0.12;

    pointerGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;

    requestAnimationFrame(updatePointerGlow);
  }

  updatePointerGlow();
}

/* Particle canvas */

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const area = width * height;
  const mobile = width < 640;
  const count = reducedMotion.matches
    ? 0
    : Math.min(
        mobile ? 22 : 65,
        Math.max(12, Math.round(area / (mobile ? 24000 : 18000))),
      );

  particles = Array.from({ length: count }, () => createParticle());
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticle() {
  return {
    x: randomBetween(0, width),
    y: randomBetween(0, height),
    radius: randomBetween(0.6, 1.8),
    vx: randomBetween(-0.12, 0.12),
    vy: randomBetween(-0.18, -0.025),
    alpha: randomBetween(0.18, 0.7),
    phase: randomBetween(0, Math.PI * 2),
    twinkleSpeed: randomBetween(0.0004, 0.0012),
  };
}

function drawParticles(time = 0) {
  if (reducedMotion.matches || document.hidden) {
    context.clearRect(0, 0, width, height);
    animationFrame = 0;
    return;
  }

  // Batasi frame rate agar efek tetap ringan.
  if (time - lastFrameTime < 30) {
    animationFrame = requestAnimationFrame(drawParticles);
    return;
  }

  const delta = lastFrameTime ? Math.min(time - lastFrameTime, 40) : 16;
  lastFrameTime = time;

  context.clearRect(0, 0, width, height);

  const lightMode = root.dataset.theme === "light";
  const particleColor = lightMode ? "40, 104, 220" : "111, 176, 255";

  for (const particle of particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.phase += particle.twinkleSpeed * delta;

    if (particle.y < -5) {
      particle.y = height + 5;
      particle.x = randomBetween(0, width);
    }

    if (particle.x < -5) particle.x = width + 5;
    if (particle.x > width + 5) particle.x = -5;

    const flicker = 0.6 + Math.sin(particle.phase) * 0.4;
    const alpha = particle.alpha * flicker;

    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);

    context.fillStyle = `rgba(${particleColor}, ${alpha})`;
    context.fill();
  }

  animationFrame = requestAnimationFrame(drawParticles);
}

function startParticles() {
  if (reducedMotion.matches || document.hidden || animationFrame) {
    return;
  }

  lastFrameTime = 0;
  animationFrame = requestAnimationFrame(drawParticles);
}

function stopParticles() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  context.clearRect(0, 0, width, height);
}

window.addEventListener("resize", resizeCanvas, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopParticles();
  } else {
    startParticles();
  }
});

reducedMotion.addEventListener("change", () => {
  resizeCanvas();

  if (reducedMotion.matches) {
    stopParticles();
  } else {
    startParticles();
  }
});

resizeCanvas();
startParticles();

/* Enter the workspace */

function showWorkspace() {
  if (hasEntered) return;

  hasEntered = true;
  enterButton.disabled = true;

  workspace.classList.add("active");
  workspace.inert = false;
  intro.classList.remove("active");
  intro.setAttribute("aria-hidden", "true");

  workspace.querySelectorAll(".app-tile").forEach((tile, index) => {
    tile.style.animationDelay = `${index * 70}ms`;
  });

  document.getElementById("workspace-status").textContent =
    "Workspace initialized";

  themeToggle.focus({ preventScroll: true });
}

enterButton.addEventListener("click", () => {
  if (hasEntered) return;

  if (reducedMotion.matches) {
    showWorkspace();
    return;
  }

  transitionOverlay.classList.remove("is-active");

  // Memulai ulang animasi tanpa memerlukan library.
  void transitionOverlay.offsetWidth;
  transitionOverlay.classList.add("is-active");

  window.setTimeout(showWorkspace, 580);

  window.setTimeout(() => {
    transitionOverlay.classList.remove("is-active");
    enterButton.disabled = false;
  }, 1050);
});

/* Small system clock */

const clock = document.getElementById("system-clock");

function updateClock() {
  const now = new Date();

  clock.textContent = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

updateClock();
window.setInterval(updateClock, 30_000);
