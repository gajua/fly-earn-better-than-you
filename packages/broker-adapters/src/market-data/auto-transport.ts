import {
  defaultBrowserTransport,
  type MarketDataTransport,
} from "./types";

type ProxyFetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly body: string;
};

/**
 * Prefer extension background proxy (bypasses page CORS). Falls back to
 * browser fetch for unit tests / non-extension contexts.
 */
export const createAutoMarketDataTransport = (): MarketDataTransport => ({
  async fetchText(url, init) {
    const chromeApi = (
      globalThis as {
        chrome?: {
          runtime?: {
            id?: string;
            sendMessage: (message: unknown) => Promise<unknown>;
          };
        };
      }
    ).chrome;

    if (chromeApi?.runtime?.id) {
      const response = (await chromeApi.runtime.sendMessage({
        kind: "proxy-fetch",
        url,
        method: init?.method ?? "GET",
      })) as ProxyFetchResponse | { ok: false; reason?: string };
      if (
        response &&
        typeof response === "object" &&
        "body" in response &&
        typeof response.body === "string"
      ) {
        return {
          ok: Boolean(response.ok),
          status: Number(response.status ?? 0),
          body: response.body,
        };
      }
    }

    return defaultBrowserTransport().fetchText(url, init);
  },
});
