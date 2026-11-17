// The phone apps (iPhone and Android) run this same page inside the app itself.
// This file tells the rest of the code when that is so, and keeps the record safe there.
//
// iPhone (Capacitor): the page's own storage can, rarely, be cleared by iOS when the phone runs low on space.
// So every save is also copied into the app's permanent storage (Capacitor Preferences), and if the page's
// storage ever comes back empty, the record is put back from that copy. Nothing leaves the phone.
//
// Android: the app's page storage is kept in the app's own private folder and isn't cleared by the system,
// so no copy is needed there.

export const IOS_APP = location.protocol === "capacitor:";
export const ANDROID_APP = location.hostname === "appassets.androidplatform.net";
export const NATIVE_APP = IOS_APP || ANDROID_APP;

const cap = () => (typeof window !== "undefined" ? window.Capacitor : null);
const prefs = (method, options = {}) => {
  const c = cap();
  if (!c || typeof c.nativePromise !== "function") return Promise.reject(new Error("no bridge"));
  return c.nativePromise("Preferences", method, options);
};

function mirrorLocalStorage() {
  let ls;
  try { ls = window.localStorage; } catch (e) { return; }
  if (!ls || !window.Storage) return;
  const proto = window.Storage.prototype;
  const set = proto.setItem, remove = proto.removeItem, clear = proto.clear;
  proto.setItem = function (key, value) {
    set.call(this, key, value);
    if (this === ls) prefs("set", { key: String(key), value: String(value) }).catch(() => {});
  };
  proto.removeItem = function (key) {
    remove.call(this, key);
    if (this === ls) prefs("remove", { key: String(key) }).catch(() => {});
  };
  proto.clear = function () {
    clear.call(this);
    if (this === ls) prefs("clear").catch(() => {});
  };
}

// Brings the two copies together when the app opens:
// - keys the permanent copy has but the page lost are put back (then the page reloads once, so it reads them);
// - keys the page has but the permanent copy lacks (for example, saved by an earlier version) are copied over.
async function reconcile() {
  let ls;
  try { ls = window.localStorage; } catch (e) { return; }
  if (!ls) return;
  const { keys = [] } = await prefs("keys");
  let restored = 0;
  for (const key of keys) {
    if (ls.getItem(key) !== null) continue;
    const { value } = await prefs("get", { key });
    if (value !== null && value !== undefined) {
      window.Storage.prototype.setItem.call(ls, key, value);
      restored++;
    }
  }
  // Then refresh the permanent copy from the page (in the background), so the two never drift apart.
  (async () => {
    for (const key of Object.keys(ls)) {
      const value = ls.getItem(key);
      if (value !== null) await prefs("set", { key, value }).catch(() => {});
    }
  })();
  const flag = "__rdt_restored__";
  if (restored > 0 && !sessionStorage.getItem(flag)) {
    sessionStorage.setItem(flag, "1");
    location.reload();
  }
}

// Resolves once the iPhone app has put back anything iOS cleared from the page's storage. The app waits for this
// before it reads or saves anything, so it can never start from (or save over) a missing record.
export const nativeReady = IOS_APP && cap()
  ? (mirrorLocalStorage(), Promise.race([reconcile().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]))
  : Promise.resolve();

// Saves an export (backup or spreadsheet) from inside a phone app. Returns true if it was handled here.
export async function saveFileInApp(text, filename, mime) {
  if (ANDROID_APP && window.AndroidExport && typeof window.AndroidExport.saveText === "function") {
    window.AndroidExport.saveText(text, filename, mime);
    return true;
  }
  if (IOS_APP && typeof File !== "undefined" && navigator.canShare) {
    const file = new File([text], filename, { type: mime });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
      } catch (e) {
        // closed by the patient; the copy box still works
      }
      return true;
    }
  }
  return false;
}

// ---------- Face ID / fingerprint inside the phone apps ----------
// Inside the apps the page can't use passkeys, so the phone's own secure storage is used instead:
// - iPhone: the Keychain, with an item that only opens after Face ID or Touch ID (BiometricVault, in SceneDelegate.swift).
// - Android: an Android Keystore key that only works after a strong fingerprint or face check (BioBridge, in MainActivity).
// What is kept there is a random secret that locks a copy of the record key. It never leaves the phone.
let bioSeq = 0;
const bioWaiting = new Map();
if (ANDROID_APP && typeof window !== "undefined") {
  // MainActivity calls this when the fingerprint prompt finishes.
  window.__rdtNativeBio = (id, ok, value, code) => {
    const p = bioWaiting.get(id);
    if (!p) return;
    bioWaiting.delete(id);
    if (ok) p.resolve(value || "");
    else p.reject(new Error(code || "failed"));
  };
}
const androidBio = () => (ANDROID_APP && window.AndroidBio ? window.AndroidBio : null);
function androidCall(method, ...args) {
  const b = androidBio();
  if (!b || typeof b[method] !== "function") return Promise.reject(new Error("unavailable"));
  const id = ++bioSeq;
  return new Promise((resolve, reject) => {
    bioWaiting.set(id, { resolve, reject });
    try { b[method](id, ...args); } catch (e) { bioWaiting.delete(id); reject(new Error("failed")); }
  });
}
const iosCall = (method, options) => prefsLike("BiometricVault", method, options);
function prefsLike(plugin, method, options) {
  const c = cap();
  if (!c || typeof c.nativePromise !== "function") return Promise.reject(new Error("unavailable"));
  return c.nativePromise(plugin, method, options).catch((e) => {
    const code = (e && (e.code || e.message)) || "failed";
    throw new Error(/cancel/i.test(code) ? "cancelled" : /changed|invalid/i.test(code) ? "changed" : String(code));
  });
}

// Why Face ID / Touch ID can't be used right now (iPhone): "denied" (turned off for this app in iPhone Settings),
// "notEnrolled", "noPasscode", "lockout", "none" (no Face ID on this phone), or "" when it can be used.
let bioReason = "";
let bioDevice = "";
export const nativeBioReason = () => bioReason;
export const nativeBioDevice = () => bioDevice; // "faceID" or "touchID" even when it can't be used right now
// Which kind of check this phone app offers: "faceID", "touchID", "biometric", or "" when none is set up.
export async function nativeBioType() {
  try {
    if (IOS_APP) {
      const r = await iosCall("available");
      bioReason = (r && !r.available && r.reason) || (r && r.available ? "" : "none");
      bioDevice = (r && r.type) || "";
      return r && r.available ? r.type || "faceID" : "";
    }
    const b = androidBio();
    if (b && typeof b.available === "function") return b.available() === "yes" ? "biometric" : "";
  } catch (e) { /* none */ }
  return "";
}
// Saves the secret behind Face ID / fingerprint. Android asks for a fingerprint here; iPhone doesn't need to.
export async function nativeBioSave(key, value, prompt) {
  if (IOS_APP) { await iosCall("save", { key, value }); return; }
  await androidCall("save", key, value, prompt || "");
}
// Asks for Face ID / fingerprint and returns the secret.
export async function nativeBioLoad(key, prompt) {
  if (IOS_APP) { const r = await iosCall("load", { key, prompt: prompt || "" }); return (r && r.value) || ""; }
  return androidCall("load", key, prompt || "");
}
export async function nativeBioRemove(key) {
  try {
    if (IOS_APP) await iosCall("remove", { key });
    else await androidCall("remove", key);
  } catch (e) { /* already gone */ }
}

// ---------- Apple Health (iPhone app only, read only) ----------
// HealthDataPlugin in SceneDelegate.swift. Used only when the patient taps "Connect Apple Health".
export async function healthAvailable() {
  if (!IOS_APP) return false;
  try { const r = await prefsLike("HealthData", "available", {}); return Boolean(r && r.available); } catch (e) { return false; }
}
export const healthConnect = () => prefsLike("HealthData", "connect", {});
// Returns { sbp, dbp, hr, weightKg, heightCm }: lists of { date: "YYYY-MM-DD", value } (one average per day).
export const healthRead = (days = 730) => prefsLike("HealthData", "read", { days });

// ---------- Apple Watch (iPhone app only) ----------
// WatchSyncPlugin in SceneDelegate.swift. The phone tells the watch which Quick Log buttons to show (the current
// disease, in the patient's language). The watch sends back what was logged, straight from the watch to this iPhone
// over Apple's WatchConnectivity link: never through a server. Entries wait in the app's own storage on the phone
// until the record is unlocked; then they are added (taps) or shown to the patient to check (spoken entries).
// Returns { paired, installed } or null outside the iPhone app.
export async function watchStatus() {
  if (!IOS_APP) return null;
  try { const r = await prefsLike("WatchSync", "status", {}); return r || null; } catch (e) { return null; }
}
export async function watchSetup(config) {
  if (!IOS_APP) return;
  try { await prefsLike("WatchSync", "setup", { config: JSON.stringify(config) }); } catch (e) { /* no watch */ }
}
// Entries waiting from the watch: a list of { id, person, date, kind, ... }.
export async function watchPending() {
  if (!IOS_APP) return [];
  try {
    const r = await prefsLike("WatchSync", "pending", {});
    const items = JSON.parse((r && r.items) || "[]");
    return Array.isArray(items) ? items.filter((x) => x && typeof x === "object") : [];
  } catch (e) { return []; }
}
// Forgets entries once they're in the record (or the patient chose not to keep them).
export async function watchClear(ids) {
  if (!IOS_APP || !ids.length) return;
  try { await prefsLike("WatchSync", "clear", { ids: JSON.stringify(ids) }); } catch (e) { /* try again next time */ }
}
