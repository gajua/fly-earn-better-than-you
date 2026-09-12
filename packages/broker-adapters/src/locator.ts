export interface LocatedTarget {
  readonly element: HTMLElement;
  readonly confidence: number;
  readonly strategy: string;
}

export const LOCATOR_CONFIDENCE_THRESHOLD = 0.8;

export type LocatorCandidate = {
  readonly selector?: string;
  readonly testId?: string;
  readonly ariaLabel?: string;
  readonly role?: string;
  readonly accessibleName?: string;
  readonly visibleText?: string;
  readonly confidence: number;
  readonly strategy: string;
};

const isUsableElement = (element: HTMLElement): boolean => {
  if (!element.isConnected) return false;
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (style.opacity !== "" && Number(style.opacity) === 0) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  if ((element as HTMLButtonElement).disabled) return false;
  // Zero-size rejection is best-effort; JSDOM fixtures often lack layout.
  const rect = element.getBoundingClientRect();
  if (rect.width < 0 || rect.height < 0) return false;
  return true;
};

export const resolveLocator = (
  documentRef: Document,
  candidates: readonly LocatorCandidate[],
  root: ParentNode = documentRef,
): LocatedTarget | null => {
  const ranked = [...candidates].sort((a, b) => b.confidence - a.confidence);
  for (const candidate of ranked) {
    let element: HTMLElement | null = null;
    if (candidate.testId) {
      element = root.querySelector<HTMLElement>(
        `[data-testid="${candidate.testId}"], [data-fly-target="${candidate.testId}"]`,
      );
    } else if (candidate.visibleText) {
      const matches = Array.from(
        root.querySelectorAll<HTMLElement>(
          "button, a, [role='button'], [role='tab']",
        ),
      );
      const narrowed = candidate.selector
        ? matches.filter((node) => {
            try {
              return node.matches(candidate.selector!);
            } catch {
              return false;
            }
          })
        : matches;
      element =
        narrowed.find(
          (node) =>
            (node.textContent ?? "").trim().toLowerCase() ===
            candidate.visibleText!.toLowerCase(),
        ) ?? null;
    } else if (candidate.selector) {
      // Reject hashed/generated class-only selectors as primary strategy.
      // Keep semantic hyphenated classes like `.chart-widget-shell`.
      const selector = candidate.selector.trim();
      if (/^\.[a-z0-9]{8,}$/i.test(selector) || /^\.css-[a-z0-9]+$/i.test(selector)) {
        continue;
      }
      element = root.querySelector<HTMLElement>(candidate.selector);
    } else if (candidate.ariaLabel) {
      element = root.querySelector<HTMLElement>(
        `[aria-label="${candidate.ariaLabel}"]`,
      );
    } else if (candidate.role && candidate.accessibleName) {
      const matches = Array.from(
        root.querySelectorAll<HTMLElement>(`[role="${candidate.role}"]`),
      );
      element =
        matches.find(
          (node) =>
            (node.getAttribute("aria-label") ?? node.textContent ?? "")
              .trim()
              .toLowerCase() === candidate.accessibleName!.toLowerCase(),
        ) ?? null;
    }
    if (!element || !isUsableElement(element)) continue;
    if (candidate.confidence < LOCATOR_CONFIDENCE_THRESHOLD) continue;
    return {
      element,
      confidence: candidate.confidence,
      strategy: candidate.strategy,
    };
  }
  return null;
};

export const revalidateTarget = (
  target: LocatedTarget | null,
): LocatedTarget | null => {
  if (!target) return null;
  return isUsableElement(target.element) ? target : null;
};
