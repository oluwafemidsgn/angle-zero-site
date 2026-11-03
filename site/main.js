document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/* ---------- Mobile menu ---------- */

const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav__toggle");

function setOpen(open) {
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

nav.querySelectorAll(".nav__menu a").forEach((link) =>
  link.addEventListener("click", () => setOpen(false))
);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("is-open")) {
    setOpen(false);
    toggle.focus();
  }
});

/* ---------- Split headings into masked words / letters ---------- */

function split(el, byChar) {
  const text = el.textContent.trim();
  const parts = byChar ? [...text] : text.split(/\s+/);
  el.setAttribute("aria-label", text);
  el.innerHTML = parts
    .map((part, i) => `<span class="w" aria-hidden="true"><span class="w__i" style="--i:${i}">${part}</span></span>`)
    .join(byChar ? "" : " ");
  el.classList.add("split");
}

/* ---------- Scroll reveals ---------- */

const UNITS = [
  ".hero__copy > :not(.hero__title)",
  ".stat", ".numbers__note", ".types__note",
  ".case", ".work__note",
  ".services__intro > :not(h2)", ".tile",
  ".process__head > :not(h2)",
  ".measure > .label",
  ".section-head > :not(h2)", ".facts li",
  ".brands__intro > :not(h2)", ".brand-oval",
  ".leadership__photo", ".leadership__text > :not(h3)",
  ".cta > :not(h2)",
  ".footer__mark", ".footer__wordmark",
];

const units = [];
UNITS.forEach((selector) => {
  document.querySelectorAll(selector).forEach((el) => {
    if (el.closest("[data-reveal]")) return;
    el.dataset.reveal = el.matches(".brand-oval, .leadership__photo, .footer__mark") ? "zoom" : "";
    units.push(el);
  });
});

// Stagger siblings that reveal together
units.forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
  el.style.setProperty("--d", `${Math.min(siblings.indexOf(el), 6) * 0.09}s`);
});

const headings = [...document.querySelectorAll(".hero__title, .h-xl, .h-lg, .h-ml, .cta__title, .leadership__title, .h-xl-name")]
  .filter((el) => !el.closest("[data-reveal]"));
headings.forEach((el) => split(el, el.classList.contains("leadership__title")));

if (reduceMotion) {
  document.querySelectorAll("[data-reveal], .split").forEach((el) => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  [...units, ...headings].forEach((el) => io.observe(el));
}

/* ---------- Count-up numbers ---------- */

function countUp(el) {
  const original = el.textContent.trim();
  const match = original.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!match) return;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits.replace(/,/g, ""));
  const useCommas = digits.includes(",");
  const duration = 1800;
  const start = performance.now();
  el.style.minWidth = `${el.offsetWidth}px`;

  function frame(now) {
    const t = clamp((now - start) / duration);
    const eased = 1 - Math.pow(2, -10 * t);
    const value = Math.round(target * (t === 1 ? 1 : eased));
    el.textContent = prefix + (useCommas ? value.toLocaleString("en-US") : value) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const counters = document.querySelectorAll("[data-count]");
if (!reduceMotion) {
  const counterIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        counterIO.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => counterIO.observe(el));
}

/* ---------- Hero: shuffle ovals on a loop ---------- */

const hero = document.querySelector(".hero");
const heroOvals = [...document.querySelectorAll(".hero__oval")];
const SLOTS = heroOvals.length;
const SHUFFLE_EVERY = 3200;

heroOvals.forEach((el) => el.style.setProperty("--n", el.dataset.slot));
requestAnimationFrame(() => hero.classList.add("is-in"));

function shuffle() {
  heroOvals.forEach((el) => {
    const slot = Number(el.dataset.slot);
    if (slot > 0) {
      el.dataset.slot = slot - 1;
      return;
    }
    // The left-most photo fades out and re-enters on the far right
    el.classList.add("is-leaving");
    setTimeout(() => {
      el.classList.add("no-anim");
      el.dataset.slot = SLOTS - 1;
      void el.offsetWidth;
      el.classList.remove("no-anim");
      el.classList.remove("is-leaving");
    }, 550);
  });
}

if (!reduceMotion) {
  let timer;
  const start = () => { if (!timer) timer = setInterval(shuffle, SHUFFLE_EVERY); };
  const stop = () => { clearInterval(timer); timer = null; };
  setTimeout(() => { hero.classList.add("is-ready"); start(); }, 1600);

  // Pause when the hero is off-screen or the tab is hidden
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}

/* ---------- Curved text fitted around the video oval ---------- */

const stage = document.querySelector(".types__stage");
const arcSvg = stage.querySelector(".types__arc");
const arcPath = arcSvg.querySelector("path");
const arcText = arcSvg.querySelector("text");
const arcTextPath = arcSvg.querySelector("textPath");
const videoOval = stage.querySelector(".types__oval");

function layoutArc() {
  const s = stage.getBoundingClientRect();
  // Measure the oval at its resting size, not mid-animation
  const w = videoOval.offsetWidth;
  const h = videoOval.offsetHeight;
  const cx = videoOval.offsetLeft + w / 2;
  const cy = videoOval.offsetTop + h / 2;
  const small = s.width < 700;

  const gap = small ? 8 : w * 0.025;
  const rx = w / 2 + gap;
  const ry = h / 2 + gap;
  // Arc spans the top of the oval; on phones it wraps further down the sides
  const span = (small ? 250 : 196) * (Math.PI / 180);
  const a0 = 1.5 * Math.PI - span / 2;
  const a1 = 1.5 * Math.PI + span / 2;
  const x0 = cx + rx * Math.cos(a0), y0 = cy + ry * Math.sin(a0);
  const x1 = cx + rx * Math.cos(a1), y1 = cy + ry * Math.sin(a1);

  arcSvg.setAttribute("viewBox", `0 0 ${s.width} ${s.height}`);
  arcPath.setAttribute("d", `M ${x0} ${y0} A ${rx} ${ry} 0 1 1 ${x1} ${y1}`);

  // Size the type so the sentence fills the arc
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const cs = getComputedStyle(arcText);
  Object.assign(probe.style, { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: "100px", letterSpacing: "-1px" });
  probe.textContent = arcTextPath.textContent;
  arcSvg.appendChild(probe);
  const textLen = probe.getComputedTextLength();
  probe.remove();
  const fit = (100 * arcPath.getTotalLength() * 0.97) / textLen;
  arcText.style.fontSize = `${Math.min(fit, 64)}px`;
}

document.fonts.ready.then(layoutArc);
new ResizeObserver(layoutArc).observe(stage);

/* ---------- Scroll-linked motion ---------- */

const timeline = document.querySelector(".timeline");
const steps = [...timeline.querySelectorAll(".step")];

function onScroll() {
  const vh = window.innerHeight;

  // Video oval grows in as it enters
  const sr = stage.getBoundingClientRect();
  const p = reduceMotion ? 1 : clamp((vh - sr.top) / (vh * 0.5));
  videoOval.style.setProperty("--p", p.toFixed(3));

  // Curved text travels in from the right along the arc: fully hidden past
  // the arc's end when the section enters, complete when the oval reaches
  // the middle of the screen.
  const or = videoOval.getBoundingClientRect();
  const centre = or.top + or.height / 2;
  const t = reduceMotion ? 1 : clamp((vh - centre) / (vh / 2));
  arcTextPath.setAttribute("startOffset", `${50 + (1 - t) * 100}%`);

  // Timeline fill follows the reading line at 60% of the viewport
  const tr = timeline.getBoundingClientRect();
  const progress = reduceMotion ? 1 : clamp((vh * 0.6 - tr.top - 33) / (tr.height - 66));
  timeline.style.setProperty("--progress", progress.toFixed(4));
  steps.forEach((step) => {
    const pill = step.querySelector(".step__pill").getBoundingClientRect();
    step.classList.toggle("is-active", reduceMotion || pill.top + pill.height / 2 <= vh * 0.6 + 1);
  });
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { onScroll(); ticking = false; });
}, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

/* ---------- Video: only play while on screen ---------- */

const video = document.querySelector(".types__video");
if (reduceMotion) {
  video.removeAttribute("autoplay");
  video.pause();
} else {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }).observe(video);
}
