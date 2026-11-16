// The app never runs inside another site's frame, where a hidden page could trick taps onto its buttons.
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try { window.top.location.href = window.location.href; } catch (e) { /* the framing page stays blank */ }
  throw new Error("framed");
}
import "./storage.js";
import { savedLang, setLanguage } from "./i18n.js";
import { createRoot } from "react-dom/client";
import App, { THEME_CSS, PALETTE_KEY, MOOD_KEY, MOOD_CSS } from "./App.jsx";

// Apply the saved appearance before the first paint, so dark mode never flashes white.
const style = document.createElement("style");
style.textContent = THEME_CSS + "\n" + MOOD_CSS();
document.head.appendChild(style);
let theme = "system";
try {
  theme = window.localStorage.getItem("fabry-tracker-theme") || "system";
} catch (e) {
  // storage blocked: follow the device
}
document.documentElement.setAttribute("data-theme", theme);
// The page color of the condition last open, so the first paint is already the right color.
let palette = "blue";
try {
  palette = window.localStorage.getItem(PALETTE_KEY) || "blue";
} catch (e) {
  // storage blocked: blue
}
document.documentElement.setAttribute("data-palette", palette);
// The color palette slider in Settings (5 is normal).
let mood = "5";
try {
  mood = window.localStorage.getItem(MOOD_KEY) || "5";
} catch (e) {
  // storage blocked: normal colors
}
document.documentElement.setAttribute("data-mood", /^[1-5]$/.test(mood) ? mood : "5");

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

// The saved (or phone's) language. Waits briefly for its file so the first screen is already translated.
const lang = savedLang();
const ready = lang === "en" ? Promise.resolve() : Promise.race([setLanguage(lang), new Promise((r) => setTimeout(r, 1500))]);
ready.finally(() => createRoot(document.getElementById("root")).render(<App />));
