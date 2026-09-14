import { describe, expect, it } from "vitest";
import { resolveLocale, t } from "./index";

describe("i18n", () => {
  it("resolves explicit locales", () => {
    expect(resolveLocale("ko")).toBe("ko");
    expect(resolveLocale("en")).toBe("en");
  });

  it("auto-falls back from navigator language", () => {
    expect(resolveLocale("auto", "ko-KR")).toBe("ko");
    expect(resolveLocale("auto", "en-US")).toBe("en");
    expect(resolveLocale("auto", "ja-JP")).toBe("en");
  });

  it("returns ko and en dictionaries", () => {
    expect(t("bubble.explore", "ko")).toContain("돌아다니는");
    expect(t("bubble.explore", "en")).toContain("Wandering");
    expect(t("popup.learningPrivacy", "en")).toContain("not uploaded");
  });
});
