// Guarded service-worker registration. Never registers in dev / Lovable preview.
export function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  const isPreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  const inIframe = window.self !== window.top;
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";
  const disabled = !import.meta.env.PROD || isPreview || inIframe || killSwitch;

  if (disabled) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister();
      });
    }).catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[pwa] registration failed", err);
    });
  });
}
