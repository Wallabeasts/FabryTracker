// Fabry Tracker saves through window.storage. On a normal website that is this
// browser's localStorage. If the browser blocks storage (some private modes), the
// app still works for the visit, and it tells the patient their data isn't being saved.

const memory = new Map();

function localStore() {
  try {
    const probe = "__fabry_tracker_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

if (!window.storage) {
  const ls = localStore();
  window.storage = {
    async get(key) {
      const value = ls ? ls.getItem(key) : memory.has(key) ? memory.get(key) : null;
      if (value === null || value === undefined) throw new Error(`No saved value for ${key}`);
      return { key, value, shared: false };
    },
    async set(key, value) {
      memory.set(key, value);
      if (!ls) return null; // kept for this visit only
      try {
        ls.setItem(key, value);
        return { key, value, shared: false };
      } catch (e) {
        return null; // storage full or blocked
      }
    },
    async delete(key) {
      memory.delete(key);
      if (ls) ls.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = ls ? Object.keys(ls) : [...memory.keys()];
      return { keys: keys.filter((k) => k.startsWith(prefix)), prefix, shared: false };
    },
  };
}
