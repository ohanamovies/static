let bodyLockDepth = 0;
let savedScrollY = 0;
let savedBodyStyles = {};
let savedHtmlScrollBehavior = "";

export function lockBodyScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  bodyLockDepth += 1;
  if (bodyLockDepth > 1) return;

  const body = document.body;
  const html = document.documentElement;

  savedScrollY = window.scrollY || html.scrollTop || 0;
  savedHtmlScrollBehavior = html.style.scrollBehavior;
  savedBodyStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
  };

  // Disable smooth scrolling while locking/restoring. Global smooth scroll makes
  // history/focus restoration visibly animate on iOS instead of staying still.
  html.style.scrollBehavior = "auto";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
}

export function unlockBodyScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (bodyLockDepth === 0) return;

  bodyLockDepth -= 1;
  if (bodyLockDepth > 0) return;

  const body = document.body;
  const html = document.documentElement;
  const restoreY = savedScrollY;

  Object.assign(body.style, savedBodyStyles);
  window.scrollTo({ top: restoreY, left: 0, behavior: "auto" });

  requestAnimationFrame(() => {
    html.style.scrollBehavior = savedHtmlScrollBehavior;
    savedHtmlScrollBehavior = "";
  });

  savedScrollY = 0;
  savedBodyStyles = {};
}

export function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll([
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "details > summary:first-of-type",
    "[tabindex]:not([tabindex='-1'])",
  ].join(","))).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

export function trapTabKey(event, container) {
  if (event.key !== "Tab") return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    container?.focus?.();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
