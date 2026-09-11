import {
  isPairingConfig,
  isSensorMessage,
  type PairingConfig,
} from "./validation.js";

const CONFIG_KEY = "pairing";
const DEMO_ORIGIN = "http://127.0.0.1:5173";
const BRIDGE_PATH = "/v1/environment";

const restrictSessionStorage = (): Promise<void> =>
  chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });

const readPairing = async (): Promise<PairingConfig | null> => {
  const stored = await chrome.storage.session.get(CONFIG_KEY);
  return isPairingConfig(stored[CONFIG_KEY]) ? stored[CONFIG_KEY] : null;
};

const isDemoSender = (senderUrl: string | undefined): boolean => {
  if (!senderUrl) return false;
  try {
    return new URL(senderUrl).origin === DEMO_ORIGIN;
  } catch {
    return false;
  }
};

const forwardSnapshot = async (
  message: unknown,
  senderUrl: string | undefined,
): Promise<{ ok: boolean; reason?: string }> => {
  if (!isDemoSender(senderUrl) || !isSensorMessage(message)) {
    return { ok: false, reason: "invalid-sensor-message" };
  }

  const pairing = await readPairing();
  const currentExtensionOrigin = chrome.runtime.getURL("").replace(/\/$/, "");
  if (!pairing || pairing.extensionOrigin !== currentExtensionOrigin) {
    return { ok: false, reason: "not-paired" };
  }

  try {
    const response = await fetch(`${pairing.bridgeOrigin}${BRIDGE_PATH}`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        Authorization: `Bearer ${pairing.sessionToken}`,
        "Content-Type": "application/json",
        "X-Fly-Extension-Origin": pairing.extensionOrigin,
      },
      body: JSON.stringify(message),
    });

    return response.ok
      ? { ok: true }
      : { ok: false, reason: `bridge-http-${response.status}` };
  } catch {
    return { ok: false, reason: "bridge-unreachable" };
  }
};

void restrictSessionStorage();
chrome.runtime.onInstalled.addListener(() => void restrictSessionStorage());
chrome.runtime.onStartup.addListener(() => void restrictSessionStorage());

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void forwardSnapshot(message, sender.url).then(sendResponse);
  return true;
});
