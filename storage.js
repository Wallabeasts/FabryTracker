// My Rare Disease Tracker saves through window.storage. On a normal website that is this
// browser's localStorage. If the browser blocks storage (some private modes), the
// app still works for the visit, and it tells the patient their data isn't being saved.

import { isProtectedKey, isEncrypted, unlocked, encryptValue, decryptValue, readAccount } from "./vault.js";

const memory = new Map();
const latest = {};

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
      let value = ls ? ls.getItem(key) : memory.has(key) ? memory.get(key) : null;
      if (value === null || value === undefined) throw new Error(`No saved value for ${key}`);
      // Health records are encrypted with the account password and read only after logging in.
      if (isEncrypted(value)) {
        if (!unlocked()) throw new Error("Locked");
        value = await decryptValue(value);
      }
      return { key, value, shared: false };
    },
    async set(key, value) {
      memory.set(key, value);
      if (!ls) return null; // kept for this visit only
      if (isProtectedKey(key)) {
        if (unlocked()) {
          // Encrypting takes a moment; if a newer save of the same key started meanwhile, it wins.
          const n = (latest[key] = (latest[key] || 0) + 1);
          value = await encryptValue(value);
          if (latest[key] !== n) return { key, value, shared: false };
        } else if (readAccount()) return null; // never write a health record unlocked once there is an account
      }
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
