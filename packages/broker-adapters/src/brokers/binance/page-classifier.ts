import type {
  BrokerPageContext,
  BrokerPageKind,
  LoginState,
} from "@fly/core";
import { detectModal } from "../../modal";
import { parseBinanceTradeSymbol } from "../../shared/symbol-resolver";
import { toInstrumentId } from "@fly/core";

export const classifyBinancePage = (
  documentRef: Document,
  url: string,
  loginState: LoginState,
): BrokerPageContext => {
  const symbolParse = parseBinanceTradeSymbol(url);
  let pageKind: BrokerPageKind = "unknown";
  let confidence = 0.35;

  if (/\/login/i.test(url) || loginState === "LOGGED_OUT") {
    // Keep trade detection primary when on /trade even if logged out.
  }

  if (/\/trade\//i.test(url) && symbolParse) {
    pageKind = "trade";
    confidence = 0.92;
  } else if (/\/markets/i.test(url)) {
    pageKind = "markets";
    confidence = 0.75;
  } else if (/\/my\/wallet|\/portfolio/i.test(url)) {
    pageKind = "portfolio";
    confidence = 0.7;
  } else if (/\/login/i.test(url)) {
    pageKind = "login";
    confidence = 0.85;
  }

  const h1 = documentRef.querySelector("h1")?.textContent?.trim();
  const symbol =
    symbolParse?.normalized ??
    (h1?.includes("/") ? h1.replace("/", "") : undefined);

  return {
    brokerId: "binance",
    url,
    pageKind,
    symbol,
    instrumentId: symbol
      ? toInstrumentId({
          broker: "binance",
          marketType: "spot",
          symbol,
          quoteCurrency: symbolParse?.quoteCurrency ?? "USDT",
        })
      : undefined,
    loginState,
    modal: detectModal(documentRef),
    confidence,
    detectedAt: new Date().toISOString(),
  };
};
