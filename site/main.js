const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const hasMotion = !reduceMotion && window.gsap && window.ScrollTrigger;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ---------- Smooth scroll ---------- */

let lenis = null;
if (hasMotion) {
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
}

$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id.length > 1 && $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -90, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  })
);

/* ---------- Nav: hides on the way down, returns on the way up ---------- */

const nav = $("[data-nav]");
const menu = $("[data-menu]");
const menuToggle = $("[data-menu-toggle]");
let lastY = 0;

function onScrollNav(y) {
  if (!nav.classList.contains("is-open")) nav.classList.toggle("is-hidden", y > lastY && y > 300);
  lastY = y;
}
if (lenis) lenis.on("scroll", ({ scroll }) => onScrollNav(scroll));
else window.addEventListener("scroll", () => onScrollNav(window.scrollY), { passive: true });

function setMenu(open) {
  nav.classList.toggle("is-open", open);
  nav.classList.remove("is-hidden");
  menu.classList.toggle("is-open", open);
  menu.inert = !open;
  document.documentElement.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  if (lenis) open ? lenis.stop() : lenis.start();
}
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("is-open")) {
    setMenu(false);
    menuToggle.focus();
  }
});
window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => e.matches && setMenu(false));

/* ---------- Hero: photos slide along and change shape on a loop ---------- */

const shuffleEl = $("[data-shuffle]");
if (shuffleEl && !reduceMotion) {
  const photos = $$(".shuffle__ph", shuffleEl);
  const SLOTS = photos.length;
  const step = () =>
    photos.forEach((el) => {
      const slot = Number(el.dataset.slot);
      if (slot > 0) {
        el.dataset.slot = slot - 1;
        return;
      }
      // The first photo fades out and comes back in on the far right
      el.classList.add("is-leaving");
      setTimeout(() => {
        el.classList.add("no-anim");
        el.dataset.slot = SLOTS - 1;
        void el.offsetWidth;
        el.classList.remove("no-anim", "is-leaving");
      }, 500);
    });
  let timer = null;
  const start = () => { if (!timer) timer = setInterval(step, 3200); };
  const stop = () => { clearInterval(timer); timer = null; };
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(shuffleEl);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}

/* ---------- Forums: sentence follows the edge of the rounded video ---------- */

const stage = $("[data-forums]");
if (stage) {
  const svg = $(".forums__arc", stage);
  const path = $("path", svg);
  const text = $("text", svg);
  const textPath = $("textPath", svg);
  const box = $(".forums__video", stage);
  const video = $("video", stage);

  const layout = () => {
    const s = stage.getBoundingClientRect();
    const w = box.offsetWidth, h = box.offsetHeight;
    const gap = Math.max(8, w * 0.018);
    const R = h / 2 + gap;
    const cx = box.offsetLeft + w / 2, cy = box.offsetTop + h / 2;
    const S = (w - h) / 2;
    svg.setAttribute("viewBox", `0 0 ${s.width} ${s.height}`);
    path.setAttribute("d", `M ${cx - S - R} ${cy} A ${R} ${R} 0 0 1 ${cx - S} ${cy - R} L ${cx + S} ${cy - R} A ${R} ${R} 0 0 1 ${cx + S + R} ${cy}`);
    // Size the type so the sentence fits the edge, capped at Heading 2
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const cs = getComputedStyle(text);
    Object.assign(probe.style, { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: "100px", textTransform: "uppercase" });
    probe.textContent = textPath.textContent;
    svg.appendChild(probe);
    const len = probe.getComputedTextLength();
    probe.remove();
    text.style.fontSize = `${Math.min((100 * path.getTotalLength() * 0.97) / len, 48)}px`;
  };
  document.fonts.ready.then(layout);
  new ResizeObserver(layout).observe(stage);

  if (reduceMotion) {
    video.removeAttribute("autoplay");
    video.pause();
  } else {
    new IntersectionObserver(([e]) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause())).observe(video);
  }

  // Sentence slides in from the right, landing when the video reaches the middle of the screen
  if (hasMotion) {
    ScrollTrigger.create({
      trigger: box,
      start: "top bottom",
      end: "center center",
      scrub: 0.4,
      onUpdate: (self) => textPath.setAttribute("startOffset", `${50 + (1 - self.progress) * 100}%`),
      onRefresh: (self) => textPath.setAttribute("startOffset", `${50 + (1 - self.progress) * 100}%`),
    });
  }
}

/* ---------- Pinned lists: the row at the reading line lights up, the photo swaps ---------- */

$$("[data-pinned]").forEach((block) => {
  const rows = $$("[data-row]", block);
  const pics = $$("[data-preview]", block);
  const activate = (row) => {
    rows.forEach((r) => r.classList.toggle("is-active", r === row));
    pics.forEach((p) => p.classList.toggle("is-on", p.dataset.preview === row.dataset.img));
  };
  activate(rows[0]);
  if (hasMotion) {
    // One trigger over the whole list, so fast scrolling can't skip a row
    ScrollTrigger.create({
      trigger: rows[0].parentElement,
      start: "top 58%",
      end: "bottom 58%",
      onUpdate: ({ progress }) => {
        const row = rows[Math.min(rows.length - 1, Math.floor(progress * rows.length))];
        if (!row.classList.contains("is-active")) activate(row);
      },
    });
  } else {
    rows.forEach((r) => r.classList.add("is-active"));
  }
});

/* ---------- Countdown: steps fill in turn as you scroll ---------- */

$$("[data-steps]").forEach((list) => {
  const steps = $$(".step", list);
  if (!hasMotion) {
    steps.forEach((s) => s.classList.add("is-on"));
    return;
  }
  ScrollTrigger.create({
    trigger: list,
    start: "top 88%",
    end: "bottom 62%",
    scrub: true,
    onUpdate: ({ progress }) => {
      const n = Math.ceil(progress * steps.length);
      steps.forEach((s, i) => s.classList.toggle("is-on", i < n));
    },
    onLeave: () => steps.forEach((s) => s.classList.add("is-on")),
  });
});

/* ---------- Brand rows: run in opposite directions, faster with scroll ---------- */

const loops = [];
$$("[data-mq]").forEach((row) => {
  if (!hasMotion) return;
  const track = $(".mq__track", row);
  const set = $(".mq__set", row);
  const fill = () => {
    while (track.children.length < 2 || track.offsetWidth < window.innerWidth * 2 + set.offsetWidth) {
      const copy = set.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      track.appendChild(copy);
    }
  };
  fill();
  row.style.justifyContent = "flex-start";
  const dir = Number(row.dataset.mq);
  const dist = () => set.offsetWidth;
  const loop = gsap.fromTo(
    track,
    { x: () => (dir < 0 ? 0 : -dist()) },
    { x: () => (dir < 0 ? -dist() : 0), duration: 34, ease: "none", repeat: -1 }
  );
  loops.push(loop);
  document.fonts.ready.then(() => { fill(); loop.invalidate().restart(); });
});

/* ---------- Scroll motion ---------- */

if (hasMotion) initMotion();

function initMotion() {
  // Headings rise out of a mask, word by word
  $$("[data-rise]").forEach((el) => {
    const label = el.textContent.trim();
    el.setAttribute("aria-label", label);
    el.innerHTML = label.split(/\s+/).map((w) => `<span class="w" aria-hidden="true"><span>${w.replace(/&/g, "&amp;")}</span></span>`).join(" ");
    gsap.from($$(".w > span", el), {
      yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.05,
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    });
  });

  // Statement: lines rise, photos open up between the words as you scroll
  const statement = $("[data-statement]");
  if (statement) {
    gsap.from($$(".statement__line > span:not(.statement__ph)", statement), {
      yPercent: 40, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.06,
      scrollTrigger: { trigger: statement, start: "top 80%", once: true },
    });
    gsap.from($$("[data-inline]", statement), {
      width: 0, ease: "none", stagger: 0.12,
      scrollTrigger: { trigger: statement, start: "top 78%", end: "top 25%", scrub: 0.6 },
    });
  }

  // Paragraphs light up word by word
  $$("[data-light]").forEach((el) => {
    const label = el.textContent.trim();
    el.setAttribute("aria-label", label);
    el.innerHTML = label.split(/\s+/).map((w) => `<span aria-hidden="true">${w.replace(/&/g, "&amp;")}</span>`).join(" ");
    gsap.fromTo($$("span", el), { opacity: 0.15 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 88%", end: "bottom 58%", scrub: 0.5 },
    });
  });

  // Soft fades, staggered between siblings
  $$("[data-fade]").forEach((el) => {
    const sibs = $$(":scope > [data-fade]", el.parentElement);
    gsap.from(el, {
      y: 32, opacity: 0, duration: 1, ease: "power3.out", delay: Math.max(sibs.indexOf(el), 0) * 0.08,
      scrollTrigger: { trigger: el, start: "top 94%", once: true },
    });
  });

  // List rows arrive one after another
  $$("[data-list]").forEach((list) => {
    gsap.from([...list.children], {
      y: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.07,
      scrollTrigger: { trigger: list, start: "top 88%", once: true },
    });
  });

  // Project boxes rise in
  $$("[data-rise-box]").forEach((el) => {
    gsap.from(el, {
      y: 64, opacity: 0, duration: 1.2, ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    });
  });

  // Photos drift inside their frames
  $$("[data-parallax] img").forEach((img) => {
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: "none",
      scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  // Photo groups scale in
  $$("[data-zoom]").forEach((el, i) => {
    gsap.from(el, {
      scale: 0.9, opacity: 0, duration: 1.2, ease: "power3.out", delay: (i % 4) * 0.08,
      scrollTrigger: { trigger: el, start: "top 94%", once: true },
    });
  });

  // Quotes rise at different speeds
  $$("[data-speed]").forEach((el) => {
    gsap.fromTo(el, { y: Number(el.dataset.speed) }, {
      y: 0, ease: "none",
      scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "center 55%", scrub: true },
    });
  });

  // Numbers count up
  $$("[data-count]").forEach((el) => {
    const m = el.textContent.trim().match(/^([^\d]*)([\d,]+)(.*)$/);
    if (!m) return;
    const [, prefix, digits, suffix] = m;
    const end = Number(digits.replace(/,/g, ""));
    const commas = digits.includes(",");
    const state = { v: 0 };
    const set = () => (el.textContent = prefix + (commas ? Math.round(state.v).toLocaleString("en-US") : Math.round(state.v)) + suffix);
    set();
    gsap.to(state, { v: end, duration: 1.8, ease: "power2.out", onUpdate: set, scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });

  // Brand rows speed up with scroll
  if (loops.length && lenis) {
    let boost = 1;
    gsap.ticker.add(() => {
      boost += (1 + Math.min(Math.abs(lenis.velocity), 80) * 0.14 - boost) * 0.08;
      loops.forEach((l) => l.timeScale(boost));
    });
  }

  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

/* ---------- Events: filter by sector ---------- */

const filters = $$("[data-filter]");
const events = $$("[data-event]");
filters.forEach((button) =>
  button.addEventListener("click", () => {
    const f = button.dataset.filter;
    filters.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    events.forEach((el) => el.classList.add("is-filtering"));
    setTimeout(() => {
      events.forEach((el) => {
        el.hidden = !(f === "all" || el.dataset.event === f);
        if (window.gsap) gsap.set(el, { clearProps: "transform,opacity,translate,rotate,scale" });
        requestAnimationFrame(() => el.classList.remove("is-filtering"));
      });
      if (hasMotion) ScrollTrigger.refresh();
    }, reduceMotion ? 0 : 250);
  })
);

/* ---------- Contact: FAQ ---------- */

$$(".faq__q").forEach((button) =>
  button.addEventListener("click", () => {
    button.setAttribute("aria-expanded", String(button.getAttribute("aria-expanded") !== "true"));
    if (hasMotion) setTimeout(() => ScrollTrigger.refresh(), 550);
  })
);

/* ---------- Contact: brief form ---------- */

// The brief goes to Slack through the /api/brief function. If that is not
// available, it falls back to a pre-filled email so no brief is lost.
const brief = $("#brief");
if (brief) {
  const status = $(".form-status", brief);
  const submit = $('button[type="submit"]', brief);

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
