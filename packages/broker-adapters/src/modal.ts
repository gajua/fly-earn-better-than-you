import type { ModalContext, ModalKind } from "@fly/core";

export const detectModal = (documentRef: Document): ModalContext | null => {
  const dialogs = Array.from(
    documentRef.querySelectorAll<HTMLElement>(
      `[role="dialog"], [aria-modal="true"], [data-fly-modal]`,
    ),
  ).filter((element) => {
    const view = documentRef.defaultView;
    if (!view) return false;
    const style = view.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  });

  if (dialogs.length === 0) return null;
  const dialog = dialogs[0]!;
  const kindAttr = dialog.dataset.flyModal?.toLowerCase();
  const kind: ModalKind =
    kindAttr === "order" ||
    kindAttr === "order-confirmation" ||
    kindAttr === "login" ||
    kindAttr === "warning"
      ? kindAttr
      : "other";
  return {
    kind,
    visible: true,
    confidence: dialog.getAttribute("aria-modal") === "true" ? 0.95 : 0.85,
  };
};
