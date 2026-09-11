import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type FormEvent } from "react";
import type {
  BrainDiagnostics,
  BridgeStatus,
  PairingDetails,
} from "./contracts";

const EMPTY_STATUS: BridgeStatus = {
  isRunning: false,
  port: 0,
  pairedOrigin: null,
};

export function DeveloperPanel() {
  const [extensionId, setExtensionId] = useState("");
  const [status, setStatus] = useState<BridgeStatus>(EMPTY_STATUS);
  const [pairing, setPairing] = useState<PairingDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [brain, setBrain] = useState<BrainDiagnostics | null>(null);

  const refreshStatus = async () => {
    try {
      setStatus(await invoke<BridgeStatus>("bridge_status"));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(String(error));
    }
  };

  useEffect(() => {
    void refreshStatus();
    const readBrainStatus = () => {
      const value = localStorage.getItem("fly-brain-diagnostics");
      if (!value) return;
      try {
        setBrain(JSON.parse(value) as BrainDiagnostics);
      } catch {
        setBrain(null);
      }
    };
    readBrainStatus();
    const timer = window.setInterval(readBrainStatus, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const pairExtension = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    try {
      const details = await invoke<PairingDetails>("pair_extension", {
        extensionId: extensionId.trim(),
      });
      setPairing(details);
      setStatus(details);
    } catch (error) {
      setPairing(null);
      setErrorMessage(String(error));
    }
  };

  return (
    <main className="panel">
      <header>
        <p className="eyebrow">LOCAL OBSERVATION BRIDGE</p>
        <h1>Fly Developer Panel</h1>
        <p className="muted">
          The bridge accepts observation snapshots only. It has no order or
          browser-control capability.
        </p>
      </header>

      <section className="status-card">
        <div>
          <span className={`status-dot ${status.isRunning ? "online" : ""}`} />
          {status.isRunning ? "Bridge running" : "Bridge unavailable"}
        </div>
        <code>127.0.0.1:{status.port || "—"}</code>
        <p>Paired origin: {status.pairedOrigin ?? "Not paired"}</p>
        <button type="button" onClick={() => void refreshStatus()}>
          Refresh status
        </button>
      </section>

      <section className="status-card" data-testid="desktop-brain-status">
        <div>
          <span
            className={`status-dot ${brain?.connectomeLoaded ? "online" : ""}`}
          />
          Brain:{" "}
          {brain?.connectomeLoaded
            ? `${brain.dataset ?? "MaleCNS v1.0"}`
            : "MaleCNS unavailable"}
        </div>
        <p>Connectome: {brain?.connectomeLoaded ? "loaded" : "not loaded"}</p>
        <p>
          Neurons: {brain?.neuronCount?.toLocaleString() ?? "—"} · Edges:{" "}
          {brain?.edgeCount?.toLocaleString() ?? "—"}
        </p>
        <p>Simulation: {brain?.simulationMs?.toFixed(2) ?? "—"} ms</p>
        <p>FlyState: {brain?.flyState ?? "IDLE_DESKTOP"}</p>
        {brain?.activeInputNeurons[0] && (
          <p>
            Input bodyId {brain.activeInputNeurons[0].bodyId} ·{" "}
            {brain.activeInputNeurons[0].activity.toFixed(3)}
          </p>
        )}
        {brain?.topOutputNeurons[0] && (
          <p>
            Output bodyId {brain.topOutputNeurons[0].bodyId} ·{" "}
            {brain.topOutputNeurons[0].activity.toFixed(3)}
          </p>
        )}
        {brain?.error && <p className="error">{brain.error}</p>}
      </section>

      <form
        className="pairing-card"
        onSubmit={(event) => void pairExtension(event)}
      >
        <label htmlFor="extension-id">Chrome extension ID</label>
        <input
          id="extension-id"
          value={extensionId}
          onChange={(event) => setExtensionId(event.currentTarget.value)}
          placeholder="32 lowercase letters (a–p)"
          pattern="[a-p]{32}"
          minLength={32}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          required
        />
        <button type="submit">Pair exact origin</button>
      </form>

      {pairing ? (
        <section className="token-card">
          <h2>Session credential</h2>
          <p>
            Send this value as <code>Authorization: Bearer …</code>. It rotates
            whenever Fly starts and is not persisted.
          </p>
          <code className="token">{pairing.token}</code>
        </section>
      ) : null}

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
    </main>
  );
}
