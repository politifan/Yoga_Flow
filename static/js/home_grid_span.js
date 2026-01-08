(() => {
  const MQ_MOBILE = window.matchMedia("(max-width: 900px)");

  let rafId = 0;
  const schedule = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      updateVar();
    });
  };

  const pxToNumber = (value) => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  const updateVar = () => {
    const rootStyle = document.documentElement.style;

    if (MQ_MOBILE.matches) {
      rootStyle.removeProperty("--grid3-span");
      return;
    }

    const grid = document.querySelector(".how .grid3");
    if (!grid) return;

    const cards = grid.querySelectorAll(".card");
    if (cards.length < 2) return;

    const firstRect = cards[0].getBoundingClientRect();
    const lastRect = cards[cards.length - 1].getBoundingClientRect();

    const section = grid.closest(".container");
    const sectionStyle = section ? window.getComputedStyle(section) : null;
    const paddingLeft = sectionStyle ? pxToNumber(sectionStyle.paddingLeft) : 0;
    const paddingRight = sectionStyle ? pxToNumber(sectionStyle.paddingRight) : 0;

    const span = lastRect.right - firstRect.left;
    const spanWithPadding = Math.ceil(span + paddingLeft + paddingRight);

    if (spanWithPadding > 0) {
      rootStyle.setProperty("--grid3-span", `${spanWithPadding}px`);
    }
  };

  window.addEventListener("resize", schedule, { passive: true });
  if (typeof MQ_MOBILE.addEventListener === "function") {
    MQ_MOBILE.addEventListener("change", schedule);
  } else if (typeof MQ_MOBILE.addListener === "function") {
    MQ_MOBILE.addListener(schedule);
  }

  const grid = document.querySelector(".how .grid3");
  if (grid && "ResizeObserver" in window) {
    const ro = new ResizeObserver(schedule);
    ro.observe(grid);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  window.addEventListener("load", schedule, { once: true });
})();
