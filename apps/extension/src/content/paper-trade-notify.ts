import { showPaperToast } from "./paper-toast";
import { formatPct, formatUsdt } from "./paper-snapshot";
import type { LocalePreference } from "../i18n";
import { resolveLocale, t } from "../i18n";

export const notifyPaperFill = (input: {
  readonly side: "buy" | "sell";
  readonly symbol: string;
  readonly value: number;
  readonly price: number;
  readonly tradeReturnPct?: number;
  readonly pnl?: number;
  readonly cumulativeReturnPct?: number;
  readonly locale: LocalePreference;
  readonly useToast: boolean;
  readonly useChromeNotification: boolean;
}): void => {
  const locale = resolveLocale(input.locale);
  if (input.side === "buy") {
    const title = t("toast.paperBuyTitle", locale).replace(
      "{symbol}",
      input.symbol,
    );
    const body = t("toast.paperBuyBody", locale)
      .replace("{value}", formatUsdt(input.value))
      .replace("{price}", input.price.toLocaleString());
    if (input.useToast) {
      showPaperToast(`<strong>${title}</strong><br/>${body}`);
    }
    if (input.useChromeNotification) {
      void chrome.runtime.sendMessage({
        kind: "paper-trade-notify",
        title,
        message: body,
      });
    }
    return;
  }
  const title = t("toast.paperSellTitle", locale).replace(
    "{symbol}",
    input.symbol,
  );
  const ret =
    input.tradeReturnPct != null ? formatPct(input.tradeReturnPct) : "—";
  const pnl =
    input.pnl != null
      ? `${input.pnl >= 0 ? "+" : ""}${input.pnl.toLocaleString()} USDT`
      : "—";
  const cum =
    input.cumulativeReturnPct != null
      ? formatPct(input.cumulativeReturnPct)
      : "—";
  const body = t("toast.paperSellBody", locale)
    .replace("{return}", ret)
    .replace("{pnl}", pnl)
    .replace("{cumulative}", cum);
  if (input.useToast) {
    showPaperToast(`<strong>${title}</strong><br/>${body}`);
  }
  if (input.useChromeNotification) {
    void chrome.runtime.sendMessage({
      kind: "paper-trade-notify",
      title,
      message: body.replace(/<br\/?>/gi, "\n"),
    });
  }
};
