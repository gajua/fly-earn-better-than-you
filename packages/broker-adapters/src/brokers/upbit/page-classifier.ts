import { toInstrumentId, type BrokerPageContext, type LoginState } from "@fly/core";
import { detectModal } from "../../modal";
import { parseUpbitExchangeSymbol } from "../../shared/symbol-resolver";

export const classifyUpbitPage = (
  documentRef: Document,
  url: string,
  loginState: LoginState,
): BrokerPageContext => {
  void documentRef;
  const parsed = parseUpbitExchangeSymbol(url);
  let pageKind: BrokerPageContext["pageKind"] = "unknown";
  let confidence = 0.4;
  if (/\/exchange/i.test(url) && parsed) {
    pageKind = "trade";
    confidence = 0.9;
  } else if (/\/login/i.test(url)) {
    pageKind = "login";
    confidence = 0.85;
  }

  return {
    brokerId: "upbit",
    url,
    pageKind,
    symbol: parsed?.normalized,
    instrumentId: parsed
      ? toInstrumentId({
          broker: "upbit",
          marketType: "spot",
          symbol: parsed.normalized,
          quoteCurrency: parsed.quoteCurrency ?? "KRW",
        })
      : undefined,
    loginState,
    modal: detectModal(documentRef),
    confidence,
    detectedAt: new Date().toISOString(),
  };
};
