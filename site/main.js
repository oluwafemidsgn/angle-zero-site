// Angle Zero: site behaviour. Plain JS, no libraries.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile menu ---------- */
  const toggle = $("[data-menu-toggle]");
  const menu = $("[data-menu]");
  if (toggle && menu) {
    // The menu opens directly under the header, wherever the header sits
    // (the announcement bar above it scrolls away, the header is sticky).
    const placeMenu = () => {
      const bottom = $("[data-nav]").getBoundingClientRect().bottom;
      menu.style.setProperty("--menu-top", `${Math.max(0, Math.round(bottom))}px`);
    };
    window.addEventListener("resize", () => { if (menu.classList.contains("is-open")) placeMenu(); });
    const setOpen = (open) => {
      if (open) { $("[data-nav]").classList.remove("is-hidden"); placeMenu(); }
      document.documentElement.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      menu.inert = !open;
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  /* ==========================================================================
     Motion engine
     Every effect is assigned here by role, so the HTML stays plain. Reveal
     types (data-anim): up, clip, draw, pop, card, split. Scroll-linked
     effects run in one rAF loop and only for elements on screen.
     ========================================================================== */
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const small = () => window.innerWidth < 720;
  const nav = $("[data-nav]");

  /* ---------- Count-up figures ---------- */
  const format = (n) => n.toLocaleString("en-US");
  const countUp = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix ?? (el.textContent.trim().endsWith("+") ? "+" : "");
    if (reduced || !target) return;
    const start = performance.now();
    const dur = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + format(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Assign reveal roles ---------- */
  const tag = (sel, type) => $$(sel).forEach((el) => {
    if (el.closest(".menu, .comp, .pt, .hp")) return;
    const cur = el.dataset.anim ? el.dataset.anim.split(" ") : [];
    if (!cur.includes(type)) cur.push(type);
    el.dataset.anim = cur.join(" ");
  });

  // Headlines rise word by word from behind a mask
  const splitText = (el) => {
    const label = el.textContent.replace(/\s+/g, " ").trim();
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const w = document.createElement("span"); w.className = "w";
            const wi = document.createElement("span"); wi.className = "wi"; wi.textContent = part;
            wi.style.setProperty("--wi", i++);
            w.append(wi); frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    el.setAttribute("aria-label", label);
    [...el.children].forEach((c) => c.setAttribute("aria-hidden", "true"));
    el.classList.add("is-split");
    el.dataset.anim = "words";
  };

  if (!reduced) {
    $$("main .t-display-xl, main .t-display-l:not([data-count]), main .t-display-m, .cta h2").forEach((h) => {
      if (h.closest(".comp, .menu, .ccard--steps") || h.matches("[data-count], .stat__fig")) return;
      splitText(h);
    });

    tag(".photo:not(.room__photo)", "clip");
    tag(`.home-hero > p, .home-hero > .btn-row, .hero > .t-caption, .hero > p, .hero__row, .split-hero__text > p,
         .split-hero__text > .t-caption, .split-hero__text > .btn, .sec-head > p, .sec-head .t-caption, .sec-head--center > p,
         .numbers__note, .why__list li, .room, .feature__text > p, .feature__text > .link, .split__text > p,
         .split__text > div, .core__text > p, .founder__text > p, .cs-block__label, .cs-block__body > p, .scope-list li,
         .results__more, .quote > .t-caption, .quote figcaption, .next-event__text, .next-event .link, .brief > *,
         .talk__card > :not(dl), .talk__card dl > div, .cta__inner > p, .cta__inner > .btn-row, .next-card, .footer__brand,
         .footer__col, .footer__bottom, .t-body-s.measure-l, .center .link, .srow, .faq__item, .numbers__item, .stats .stat,
         .facts > div, .ecard, .brands > h2, .feature__scope, .core__text > .t-caption, .founder__stamp`, "up");
    // Draw lines take their colour and weight from the element's own border,
    // read before the border is hidden for the effect
    const drawSel = `.numbers__item, .stat, .srow, .scope-list li, .facts > div, .faq__item, .talk__card dl > div, .room,
         .ccard__foot, .why__list li + li, .footer__bottom, .results__more`;
    $$(drawSel).forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.borderTopWidth === "0px") return;
      el.style.setProperty("--bw", cs.borderTopWidth);
      el.style.setProperty("--bc", cs.borderTopColor);
      el.dataset.drawable = "1";
    });
    tag("[data-drawable]", "draw");
    tag(".chips, main .tags, .filters, .legend, .cta__bars", "pop");
    tag(".tiles > li, .cards-3 > li, .crew > li", "card");

    // Stagger children of pop groups, alternate card tilt
    $$('[data-anim~="pop"]').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--ci", i)));
    $$('[data-anim~="card"]').forEach((c, i) => c.style.setProperty("--rr", `${(i % 2 ? 3 : -3)}deg`));
  }

  /* ---------- Reveal on scroll, staggered per batch ---------- */
  const revealables = $$("[data-anim], [data-comp], .cta, .tile");
  const reveal = (el, delay = 0) => {
    el.style.setProperty("--d", `${delay}ms`);
    el.classList.add("is-in");
    $$("[data-count]", el).forEach(countUp);
    if (el.matches("[data-count]")) countUp(el);
  };
  // A fully clipped photo has no visible area, so the observer would never
  // see it: watch its container instead and reveal the photo from there.
  const watchTarget = new Map();
  revealables.forEach((el) => {
    const sentinel = el.matches('[data-anim~="clip"]') ? el.parentElement : el;
    if (!watchTarget.has(sentinel)) watchTarget.set(sentinel, []);
    watchTarget.get(sentinel).push(el);
  });
  let revealRest = () => {};
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .flatMap((s) => { io.unobserve(s); return watchTarget.get(s) || []; });
      shown.forEach((el, i) => { if (!el.classList.contains("is-in")) reveal(el, Math.min(i, 8) * 80); });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    watchTarget.forEach((_, s) => io.observe(s));
    // At the very bottom of the page some items can never reach the trigger line
    revealRest = () => revealables.forEach((el, i) => { if (!el.classList.contains("is-in")) reveal(el, (i % 6) * 70); });
  } else {
    revealables.forEach((el) => reveal(el));
  }

  /* ---------- Scroll progress, header hide/show, scroll-linked motion ---------- */
  const progress = document.createElement("div");
  progress.className = "progress"; progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);

  const depthEls = $$("[data-parallax]");
  const photoEls = reduced ? [] : $$(".feature__photo .photo, .split .photo, .core .photo, .cs-image .photo, .gallery .photo, .talk .photo");
  photoEls.forEach((p) => p.setAttribute("data-parallax-img", ""));
  const ctaStamps = $$(".cta__stamp");
  const postmark = $(".hv-postmark");
  const csImage = $(".cs-image .photo");
  const marqueeTrack = () => $(".marquee__track");

  let lastY = window.scrollY, velocity = 0, ticking = false;
  const inView = (r) => r.bottom > -100 && r.top < window.innerHeight + 100;

  const frame = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty("--sp", max > 0 ? (y / max).toFixed(4) : 0);
    if (max > 0 && y >= max - 4) revealRest();

    // Header: hide going down, show going up (never while the menu is open)
    if (nav && !document.documentElement.classList.contains("menu-open")) {
      nav.classList.toggle("is-stuck", y > 60);
      if (y > 300 && y > lastY + 4) nav.classList.add("is-hidden");
      else if (y < lastY - 4 || y < 300) nav.classList.remove("is-hidden");
    }
    velocity = velocity * 0.85 + (y - lastY) * 0.15;
    lastY = y;
    if (reduced) return;

    const amp = small() ? 0.5 : 1;
    depthEls.forEach((el) => {
      el.style.setProperty("--dy", `${(y * Number(el.dataset.parallax) * amp).toFixed(1)}px`);
      el.dataset.depth = "";
    });
    if (postmark) postmark.style.setProperty("--spin", `${(y * 0.25).toFixed(1)}deg`);
    photoEls.forEach((p) => {
      const r = p.getBoundingClientRect();
      if (!inView(r)) return;
      const t = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      p.style.setProperty("--py", `${(t * -40 * amp).toFixed(1)}px`);
    });
    ctaStamps.forEach((s, i) => {
      const r = s.parentElement.getBoundingClientRect();
      if (!inView(r)) return;
      const t = (r.top - window.innerHeight / 2) / window.innerHeight;
      s.style.setProperty("--dy", `${(t * (i ? 90 : 60)).toFixed(1)}px`);
    });
    if (csImage) {
      const r = csImage.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, 1 - (r.top - window.innerHeight * 0.15) / window.innerHeight));
      csImage.style.transform = `scale(${(0.86 + 0.14 * t).toFixed(4)})`;
    }
    const track = marqueeTrack();
    if (track && track.getAnimations) {
      const a = track.getAnimations()[0];
      if (a) a.playbackRate = 1 + Math.min(6, Math.abs(velocity) * 0.25);
    }
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  frame();
  // Let the marquee ease back to its resting speed after scrolling stops
  if (!reduced) setInterval(() => { if (Math.abs(velocity) > 0.05) { velocity *= 0.8; requestFrame(); } }, 120);

  /* ---------- Brands: endless marquee ---------- */
  const brandList = $(".brands ul");
  if (brandList && !reduced) {
    const wrap = document.createElement("div"); wrap.className = "marquee";
    const track = document.createElement("div"); track.className = "marquee__track";
    brandList.replaceWith(wrap);
    const copy = brandList.cloneNode(true); copy.setAttribute("aria-hidden", "true");
    track.append(brandList, copy); wrap.append(track);
    wrap.addEventListener("mouseenter", () => track.getAnimations()[0]?.pause());
    wrap.addEventListener("mouseleave", () => track.getAnimations()[0]?.play());
  }

  /* ---------- Service tile icons: normalise path lengths for the draw ---------- */
  $$(".tile svg path").forEach((p) => p.setAttribute("pathLength", "1"));

  /* ---------- "Why" list: sliding highlight ---------- */
  const whyList = $(".why__list");
  if (whyList) {
    const hl = document.createElement("span"); hl.className = "why__hl"; hl.setAttribute("aria-hidden", "true");
    whyList.prepend(hl);
    const items = $$("li", whyList);
    const moveTo = (li) => {
      items.forEach((x) => x.classList.toggle("is-active", x === li));
      hl.style.top = `${li.offsetTop}px`; hl.style.height = `${li.offsetHeight}px`;
    };
    items.forEach((li) => {
      li.tabIndex = 0;
      li.addEventListener("mouseenter", () => moveTo(li));
      li.addEventListener("focus", () => moveTo(li));
      li.addEventListener("click", () => moveTo(li));
    });
    whyList.addEventListener("mouseleave", () => moveTo(items[0]));
    const reset = () => moveTo(items.find((x) => x.classList.contains("is-active")) || items[0]);
    reset();
    window.addEventListener("resize", reset);
    document.fonts?.ready.then(reset);
  }

  /* ---------- Pointer-only interactions ---------- */
  if (fine && !reduced) {
    // Cards tilt toward the cursor
    $$(".tile, .ccard, .ecard, .next-card, .crew li, .talk__card, .core").forEach((el) => {
      el.setAttribute("data-tilt", "");
      const strength = el.matches(".core, .talk__card") ? 3 : 7;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add("is-tilting");
        el.style.setProperty("--ty", `${(px * strength).toFixed(2)}deg`);
        el.style.setProperty("--tx", `${(-py * strength).toFixed(2)}deg`);
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("is-tilting");
        el.style.setProperty("--tx", "0deg"); el.style.setProperty("--ty", "0deg");
      });
    });

    // Buttons lean toward the cursor
    $$(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.classList.add("is-magnet");
        b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px)`;
      });
      b.addEventListener("pointerleave", () => { b.classList.remove("is-magnet"); b.style.transform = ""; });
    });

    // Recent rooms: a photo preview follows the cursor
    const rooms = $$(".room");
    if (rooms.length) {
      const preview = document.createElement("div"); preview.className = "room-preview"; preview.setAttribute("aria-hidden", "true");
      const pimg = document.createElement("img"); pimg.alt = ""; preview.append(pimg);
      document.body.append(preview);
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      const follow = () => {
        cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
        preview.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
        raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(follow) : 0;
      };
      rooms.forEach((room) => {
        room.addEventListener("pointerenter", (e) => {
          const src = $("img", room)?.currentSrc;
          if (src) pimg.src = src.replace(/-(480|800)\.webp/, "-800.webp");
          tx = cx = e.clientX + 24; ty = cy = e.clientY - 120;
          preview.classList.add("is-on");
        });
        room.addEventListener("pointermove", (e) => { tx = e.clientX + 24; ty = e.clientY - 120; if (!raf) raf = requestAnimationFrame(follow); });
        room.addEventListener("pointerleave", () => preview.classList.remove("is-on"));
      });
    }
  }

  /* ---------- Events filter: cards fade out and back in ---------- */
  const filters = $("[data-filters]");
  if (filters) {
    const buttons = $$("[data-filter]", filters);
    buttons.forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      $$("main [data-cat]").forEach((el) => {
        const show = f === "all" || el.dataset.cat === f;
        if (reduced || !el.animate) { el.hidden = !show; return; }
        if (!show && !el.hidden) {
          el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-16px) scale(.98)" }], { duration: 280, easing: "ease-in" })
            .finished.then(() => { el.hidden = true; });
        } else if (show && el.hidden) {
          setTimeout(() => {
            el.hidden = false;
            el.animate([{ opacity: 0, transform: "translateY(40px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 700, easing: "cubic-bezier(.16,1,.3,1)" });
          }, 290);
        }
      });
    }));
  }

  /* ---------- FAQ: answers slide open and closed ---------- */
  $$(".faq__item").forEach((item) => {
    const btn = $("button", item);
    const ans = $(".faq__a", item);
    const set = (open) => {
      btn.setAttribute("aria-expanded", String(open));
      if (reduced) { item.classList.toggle("is-open", open); return; }
      const from = ans.offsetHeight;
      item.classList.toggle("is-open", open);
      ans.style.height = "auto";
      const to = open ? ans.scrollHeight : 0;
      ans.style.height = `${from}px`;
      ans.offsetHeight; // reflow so the transition runs
      ans.style.height = `${to}px`;
      ans.addEventListener("transitionend", function done(e) {
        if (e.propertyName !== "height") return;
        if (open) ans.style.height = "";
        ans.removeEventListener("transitionend", done);
      });
    };
    item.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      set(!item.classList.contains("is-open"));
    });
  });

  /* ---------- Page transitions ---------- */
  if (!reduced) {
    const pt = document.createElement("div");
    pt.className = "pt"; pt.setAttribute("aria-hidden", "true");
    pt.innerHTML = '<div class="pt__bars"><span class="bg-lime"></span><span class="bg-pink"></span><span class="bg-lilac"></span><span class="bg-sun"></span></div>';
    document.body.append(pt);
    // Arriving from another page on this site: the head script already
    // covered the page before it painted. Swap that for the real cover in the
    // same frame, then sweep it away, so the cover never drops in between.
    const root = document.documentElement;
    try { sessionStorage.removeItem("az-pt"); } catch {}
    if (root.classList.contains("pt-arriving")) {
      pt.classList.add("is-cover-start");
      root.classList.remove("pt-arriving");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        pt.classList.remove("is-cover-start");
        pt.classList.add("is-revealing");
      }));
    }
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname) || (url.pathname === location.pathname && url.hash)) return;
      e.preventDefault();
      try { sessionStorage.setItem("az-pt", "1"); } catch {}
      pt.classList.remove("is-revealing");
      pt.classList.add("is-covering");
      setTimeout(() => { location.href = url.href; }, 560);
    });
    // Coming back with the browser's back button: never leave the cover up
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      root.classList.remove("pt-arriving");
      pt.classList.remove("is-covering", "is-cover-start");
      try { sessionStorage.removeItem("az-pt"); } catch {}
    });
  }

  /* ---------- Contact: brief form ---------- */
  // The brief goes to Slack through /api/brief. If that is not available,
  // it falls back to a pre-filled email so no brief is lost.
  const brief = $("#brief");
  if (brief) {
    const EMAIL = "hello@anglezero.co";
    const status = $(".form-status", brief);
    const submit = $('button[type="submit"]', brief);

    const mark = (input, bad) => input.closest(".field")?.classList.toggle("is-invalid", bad);
    ["name", "email"].forEach((n) => brief[n].addEventListener("input", () => mark(brief[n], false)));

    brief.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (brief.classList.contains("is-sending")) return;

      const nameBad = !brief.name.value.trim();
      const emailBad = !brief.email.value.trim() || !brief.email.checkValidity();
      mark(brief.name, nameBad);
      mark(brief.email, emailBad);
      if (nameBad || emailBad) {
        status.classList.add("is-error");
        status.textContent = nameBad ? "Please add your name." : "Please add a valid email so we can reply.";
        (nameBad ? brief.name : brief.email).focus();
        return;
      }

      const data = new FormData(brief);
      const payload = Object.fromEntries(data.entries());
      payload.needs = data.getAll("needs");

      status.classList.remove("is-error");
      status.textContent = "Sending…";
      brief.classList.add("is-sending");
      submit.textContent = "Sending…";

      try {
        const res = await fetch("/api/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(String(res.status));
        brief.reset();
        status.textContent = "Thanks. The brief is with us and we’ll reply within two working days.";
      } catch {
        window.location.href = mailto(data);
        status.textContent = "Your email app should open with the brief filled in.";
      } finally {
        brief.classList.remove("is-sending");
        submit.textContent = "Send the brief";
      }
    });

    function mailto(data) {
      const line = (label, key) => {
        const v = key === "needs" ? data.getAll("needs").join(", ") : data.get(key);
        return v ? `${label}: ${v}` : null;
      };
      const body = [
        line("Name", "name"), line("Company", "company"), line("Email", "email"), line("Phone", "phone"),
        line("Event", "event"), line("Date", "date"), line("Event type", "type"),
        line("Expected attendance", "attendance"), line("Needs", "needs"), "", data.get("message") || "",
      ].filter((l) => l !== null).join("\n");
      const subject = `Event brief: ${data.get("event") || data.get("company") || data.get("name")}`;
      return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  }
})();
