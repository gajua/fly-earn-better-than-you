import { getCurrentWindow } from "@tauri-apps/api/window";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DeveloperPanel } from "./developer-panel";
import { FlyOverlay } from "./fly-overlay";
import "./styles.css";

const isDeveloperPanel = getCurrentWindow().label === "developer";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isDeveloperPanel ? <DeveloperPanel /> : <FlyOverlay />}
  </StrictMode>,
);
