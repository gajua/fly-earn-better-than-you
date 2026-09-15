const TOAST_ID = "fly-earn-paper-toast";

export const showPaperToast = (html: string, durationMs = 6_000): void => {
  let host = document.getElementById(TOAST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = TOAST_ID;
    host.setAttribute("aria-live", "polite");
    Object.assign(host.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      maxWidth: "min(420px, 92vw)",
      padding: "14px 18px",
      borderRadius: "14px",
      background: "rgba(12, 16, 24, 0.94)",
      color: "#eef2ff",
      font: "14px/1.45 ui-sans-serif, system-ui, sans-serif",
      boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
      pointerEvents: "none",
    });
    document.documentElement.appendChild(host);
  }
  host.innerHTML = html;
  host.style.opacity = "1";
  window.clearTimeout(
    (host as HTMLElement & { __flyToastTimer?: number }).__flyToastTimer,
  );
  (host as HTMLElement & { __flyToastTimer?: number }).__flyToastTimer =
    window.setTimeout(() => {
      host!.style.opacity = "0";
    }, durationMs);
};
