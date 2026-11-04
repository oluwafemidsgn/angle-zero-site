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
  // Home
  ".hero__copy > :not(.hero__title)",
  ".stat", ".numbers__note", ".types__note",
  ".case", ".work__note",
  ".services__intro > :not(h2)", ".core", ".index__item", ".services__more",
  ".process__head > :not(h2)",
  ".measure > .label",
  ".section-head > :not(h2)", ".facts li",
  ".brands__intro > :not(h2)", ".brand-oval",
  ".quote-feature", ".quote-small",
  ".leadership__photo", ".leadership__text > :not(h3)",
  // Inner pages
  ".page-hero > :not(h1):not(.page-hero__row)", ".page-hero__note",
  ".svc-ovals .oval", ".feature-card",
  ".sec-head__main > :not(h2)", ".sec-head__note",
  ".core-band__intro > :not(h2)", ".included li", ".specialties li",
  ".overview__left > :not(h2)", ".overview__right > *",
  ".founder > .oval", ".founder__text > :not(h2)", ".crew > .oval", ".crew__text > :not(h2):not(ol)",
  ".gallery .oval", ".pull", ".next", ".events-note",
  ".brief", ".side-panel", ".faq__item",
  ".rule",
  // Shared
  ".cta > :not(h2)",
  ".footer__mark", ".footer__wordmark",
];
const ZOOM = ".brand-oval, .leadership__photo, .footer__mark, .svc-ovals .oval, .founder > .oval, .crew > .oval, .gallery .oval";

const units = [];
UNITS.forEach((selector) => {
  document.querySelectorAll(selector).forEach((el) => {
    if (el.closest("[data-reveal]")) return;
    el.dataset.reveal = el.matches(ZOOM) ? "zoom" : "";
    units.push(el);
  });
});

// Stagger siblings that reveal together
units.forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
  el.style.setProperty("--d", `${Math.min(siblings.indexOf(el), 6) * 0.09}s`);
});

const headings = [...document.querySelectorAll(".hero__title, .h-page, .h-case, .h-96, .h-xl, .h-lg, .h-ml, .cta__title, .leadership__title, .h-xl-name")]
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

  // Items at the very end of the page (the footer logo on phones) can sit
  // below the trigger line even when fully scrolled, so reveal the rest there.
  const revealRest = () => {
    if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 4) return;
    [...units, ...headings].forEach((el) => el.classList.add("is-in"));
    window.removeEventListener("scroll", revealRest);
  };
  window.addEventListener("scroll", revealRest, { passive: true });
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
if (hero) initHero();

function initHero() {
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
}

/* ---------- Curved text fitted around the video oval ---------- */

const stage = document.querySelector(".types__stage");
const arcSvg = stage?.querySelector(".types__arc");
const arcPath = arcSvg?.querySelector("path");
const arcText = arcSvg?.querySelector("text");
const arcTextPath = arcSvg?.querySelector("textPath");
const videoOval = stage?.querySelector(".types__oval");

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

if (stage) {
  document.fonts.ready.then(layoutArc);
  new ResizeObserver(layoutArc).observe(stage);
}

/* ---------- Scroll-linked motion ---------- */

const timeline = document.querySelector(".timeline");
const steps = timeline ? [...timeline.querySelectorAll(".step")] : [];
const growers = [...document.querySelectorAll("[data-grow]")];

function onScroll() {
  const vh = window.innerHeight;

  // Large images settle from slightly small to full size as they enter
  growers.forEach((el) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--p", (reduceMotion ? 1 : clamp((vh - r.top) / (vh * 0.7))).toFixed(3));
  });

  if (stage) scrollArc(vh);
  if (timeline) scrollTimeline(vh);
}

function scrollArc(vh) {
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
}

function scrollTimeline(vh) {
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
if (!video) {
  // No video on this page
} else if (reduceMotion) {
  video.removeAttribute("autoplay");
  video.pause();
} else {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }).observe(video);
}

/* ---------- Events: filter by sector ---------- */

const filterButtons = [...document.querySelectorAll("[data-filter]")];
const events = [...document.querySelectorAll("[data-events] .event")];

filterButtons.forEach((button) =>
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    events.forEach((el) => {
      const show = filter === "all" || el.dataset.sector === filter;
      if (reduceMotion) {
        el.classList.toggle("is-hidden", !show);
        return;
      }
      // Fade out, swap, fade back in
      el.classList.add("is-filtering");
      setTimeout(() => {
        el.classList.toggle("is-hidden", !show);
        el.classList.add("is-in");
        requestAnimationFrame(() => el.classList.remove("is-filtering"));
      }, 250);
    });
  })
);

/* ---------- Contact: FAQ accordion ---------- */

document.querySelectorAll(".faq__q").forEach((button) =>
  button.addEventListener("click", () => {
    button.setAttribute("aria-expanded", String(button.getAttribute("aria-expanded") !== "true"));
  })
);

/* ---------- Contact: brief form ---------- */

// The brief goes to Slack through the /api/brief function. If that is not
// available, it falls back to a pre-filled email so no brief is lost.
const brief = document.querySelector("#brief");
if (brief) {
  const status = brief.querySelector(".form-status");
  const submit = brief.querySelector('button[type="submit"]');

  brief.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (brief.classList.contains("is-sending")) return;
    const data = new FormData(brief);
    const missing = ["name", "email"].find((key) => !String(data.get(key) || "").trim());
    if (missing || !brief.email.checkValidity()) {
      status.textContent = missing === "name" ? "Add your name so we know who to reply to." : "Add a valid email so we can reply.";
      brief[missing || "email"].focus();
      return;
    }

    const payload = Object.fromEntries(data);
    payload.needs = data.getAll("needs");

    brief.classList.add("is-sending");
    submit.textContent = "Sending…";
    status.textContent = "";
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.status);
      brief.reset();
      status.textContent = "Got it. We'll reply within two working days.";
    } catch {
      openEmail(data);
      status.textContent = "Your email app should open with the brief filled in.";
    } finally {
      brief.classList.remove("is-sending");
      submit.textContent = "Send the brief";
    }
  });
}

function openEmail(data) {
  const lines = [
    `Name: ${data.get("name")}`,
    `Company: ${data.get("company")}`,
    `Email: ${data.get("email")}`,
    `Phone: ${data.get("phone")}`,
    `Event: ${data.get("event")}`,
    `Date: ${data.get("date")}`,
    `Event type: ${data.get("type") || ""}`,
    `Expected attendance: ${data.get("attendance") || ""}`,
    `What we need: ${data.getAll("needs").join(", ")}`,
    "",
    String(data.get("message") || ""),
  ];
  const subject = `Event brief: ${data.get("event") || data.get("company") || data.get("name")}`;
  window.location.href = `mailto:hello@anglezero.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
