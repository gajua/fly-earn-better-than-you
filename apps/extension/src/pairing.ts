import {
  createPairingConfig,
  isPairingConfig,
  type PairingConfig,
} from "./validation.js";

const CONFIG_KEY = "pairing";

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element: ${id}`);
  return element as T;
};

const form = getRequiredElement<HTMLFormElement>("pairing-form");
const portInput = getRequiredElement<HTMLInputElement>("port");
const tokenInput = getRequiredElement<HTMLInputElement>("session-token");
const unpairButton = getRequiredElement<HTMLButtonElement>("unpair");
const statusElement = getRequiredElement<HTMLParagraphElement>("status");
const originElement = getRequiredElement<HTMLElement>("extension-origin");
const extensionOrigin = chrome.runtime.getURL("").replace(/\/$/, "");

const renderStatus = (pairing: PairingConfig | null, error?: string): void => {
  if (error) {
    statusElement.textContent = error;
    statusElement.dataset.state = "error";
    return;
  }

  if (!pairing) {
    statusElement.textContent = "Not paired";
    statusElement.dataset.state = "idle";
    return;
  }

  statusElement.textContent = `Paired to ${pairing.bridgeOrigin} for this Chrome launch`;
  statusElement.dataset.state = "paired";
  portInput.value = String(pairing.port);
};

const readStoredPairing = async (): Promise<PairingConfig | null> => {
  const stored = await chrome.storage.session.get(CONFIG_KEY);
  return isPairingConfig(stored[CONFIG_KEY]) ? stored[CONFIG_KEY] : null;
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const pairing = createPairingConfig(
    Number(portInput.value),
    tokenInput.value,
    extensionOrigin,
  );

  if (!pairing) {
    renderStatus(
      null,
      "Use port 1024–65535 and the 32+ character base64url token from Tauri.",
    );
    return;
  }

  void chrome.storage.session
    .set({ [CONFIG_KEY]: pairing })
    .then(() => {
      tokenInput.value = "";
      renderStatus(pairing);
    })
    .catch(() => renderStatus(null, "Pairing could not be saved."));
});

unpairButton.addEventListener("click", () => {
  void chrome.storage.session
    .remove(CONFIG_KEY)
    .then(() => {
      tokenInput.value = "";
      renderStatus(null);
    })
    .catch(() => renderStatus(null, "Pairing could not be removed."));
});

originElement.textContent = extensionOrigin;
void readStoredPairing().then((pairing) => renderStatus(pairing));
