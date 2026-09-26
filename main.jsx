import "./storage.js";
import { createRoot } from "react-dom/client";
import App, { THEME_CSS } from "./App.jsx";

// Apply the saved appearance before the first paint, so dark mode never flashes white.
const style = document.createElement("style");
style.textContent = THEME_CSS;
document.head.appendChild(style);
let theme = "system";
try {
  theme = window.localStorage.getItem("fabry-tracker-theme") || "system";
} catch (e) {
  // storage blocked: follow the device
}
document.documentElement.setAttribute("data-theme", theme);

// Keep the browser's "install app" prompt so Settings can offer an Install button.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__fabryInstallPrompt = e;
  window.dispatchEvent(new Event("fabry-install-ready"));
});

// Offline support: the service worker keeps a copy of the app on the phone.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "127.0.0.1" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(<App />);
