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
      if (open) placeMenu();
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

  /* ---------- Nav hairline once the page scrolls ---------- */
  const nav = $("[data-nav]");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Count-up figures ---------- */
  const format = (n) => n.toLocaleString("en-US");
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix ?? (el.textContent.trim().endsWith("+") ? "+" : "");
    if (reduced || !target) return;
    const start = performance.now();
    const dur = 1400;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + format(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Scroll reveals ---------- */
  const targets = $$("[data-reveal], [data-comp]");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        $$("[data-count]", entry.target).forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Gentle parallax on the home hero pieces ---------- */
  const layers = $$("[data-parallax]");
  if (layers.length && !reduced) {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      layers.forEach((el) => { el.style.translate = `0 ${(y * Number(el.dataset.parallax)).toFixed(1)}px`; });
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* ---------- Events filter ---------- */
  const filters = $("[data-filters]");
  if (filters) {
    const buttons = $$("[data-filter]", filters);
    buttons.forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      $$("main [data-cat]").forEach((el) => { el.hidden = f !== "all" && el.dataset.cat !== f; });
    }));
  }

  /* ---------- FAQ ---------- */
  $$(".faq__item").forEach((item) => {
    const btn = $("button", item);
    const set = (open) => { item.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open)); };
    item.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      set(!item.classList.contains("is-open"));
    });
  });

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
