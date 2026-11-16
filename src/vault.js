// The account on this phone. Passwords and recovery codes never leave the device and are never stored.
//
// The record is encrypted (AES-GCM) with a random record key. That key is saved twice, each copy locked with a key
// made from a secret (PBKDF2-SHA256, 310,000 rounds): once with the password and once with the recovery code.
// Either one opens the record, so a forgotten password can be replaced using the recovery code.
// Without both, the record can't be opened by anyone.

export const ACCOUNT_KEY = "fabry-tracker-account";
const ITERATIONS = 310000;
const PREFIX = "enc1:";

// The keys that hold health information. Settings such as appearance or region stay readable.
export const isProtectedKey = (k) => k === "fabry-tracker-v1" || k === "fabry-tracker-people" || k.startsWith("fabry-tracker-person-");
export const isEncrypted = (v) => typeof v === "string" && v.startsWith(PREFIX);

const vault = { key: null, raw: null, username: "" };
export const unlocked = () => Boolean(vault.key);
export const currentUser = () => vault.username;

const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s) => Uint8Array.from(atob(String(s)), (c) => c.charCodeAt(0));

export const cryptoAvailable = () => typeof crypto !== "undefined" && Boolean(crypto.subtle) && typeof TextEncoder !== "undefined";

async function deriveKey(secret, salt, iterations = ITERATIONS) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, base,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const recordKey = (raw) => crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

async function encryptBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return PREFIX + toB64(iv) + "." + toB64(data);
}
async function decryptBytes(key, value) {
  const [iv, data] = value.slice(PREFIX.length).split(".");
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, key, fromB64(data)));
}
const encryptWith = (key, text) => encryptBytes(key, new TextEncoder().encode(text));
const decryptWith = async (key, value) => new TextDecoder().decode(await decryptBytes(key, value));

export const encryptValue = (text) => encryptWith(vault.key, text);
export const decryptValue = (value) => decryptWith(vault.key, value);

// Recovery codes: 16 letters and digits in groups of four, without look-alikes (0/O, 1/I/L).
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newRecoveryCode() {
  // Each character is drawn evenly: random bytes that don't map evenly onto the 31 characters are thrown away.
  const limit = 256 - (256 % CODE_CHARS.length);
  let s = "";
  while (s.length < 16) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < limit && s.length < 16) s += CODE_CHARS[b % CODE_CHARS.length];
    }
  }
  return s.match(/.{4}/g).join("-");
}
const codeSecret = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const ls = () => { try { return window.localStorage; } catch (e) { return null; } };
export function readAccount() {
  try {
    const a = JSON.parse(ls().getItem(ACCOUNT_KEY));
    return a && a.username && (a.wrapPw || a.check) ? a : null;
  } catch (e) {
    return null;
  }
}
const protectedKeys = () => { const s = ls(); return s ? Object.keys(s).filter(isProtectedKey) : []; };

// Locks every protected value with the record key: plain values from before the account existed, or values
// locked with an older key (accounts made by version 3.4).
async function relock(oldKey) {
  const s = ls();
  for (const k of protectedKeys()) {
    let v = s.getItem(k);
    if (v === null) continue;
    if (isEncrypted(v)) {
      if (!oldKey) continue;
      v = await decryptWith(oldKey, v);
    }
    s.setItem(k, await encryptWith(vault.key, v));
  }
}

async function wrap(raw, secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toB64(salt), wrapped: await encryptBytes(await deriveKey(secret, salt), raw) };
}
async function unwrap(w, secret) {
  try {
    return await decryptBytes(await deriveKey(secret, fromB64(w.salt), w.iterations || ITERATIONS), w.wrapped);
  } catch (e) {
    throw new Error("wrong");
  }
}

// Makes a new record key, protected by the password and a new recovery code. Returns the code to show once.
async function setUpKeys(username, password, created, oldKey) {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  vault.key = await recordKey(raw);
  vault.raw = raw;
  vault.username = username;
  const code = newRecoveryCode();
  const account = { v: 2, username, created, iterations: ITERATIONS, wrapPw: await wrap(raw, password), wrapRc: await wrap(raw, codeSecret(code)) };
  await relock(oldKey);
  ls().setItem(ACCOUNT_KEY, JSON.stringify(account));
  return code;
}

export async function createAccount(username, password) {
  return setUpKeys(username, password, new Date().toISOString(), null);
}

// Returns { recoveryCode } when an older account was upgraded and needs its first recovery code shown.
export async function logIn(username, password) {
  const a = readAccount();
  if (!a) throw new Error("no account");
  if (username.trim().toLowerCase() !== a.username.trim().toLowerCase()) throw new Error("wrong");
  if (a.wrapPw) {
    const raw = await unwrap({ ...a.wrapPw, iterations: a.iterations }, password);
    vault.key = await recordKey(raw);
    vault.raw = raw;
    vault.username = a.username;
    await relock(null); // anything saved unlocked (for example by an older version) gets locked now
    return {};
  }
  // Account made by version 3.4: the password itself was the record key. Upgrade it and add a recovery code.
  const oldKey = await deriveKey(password, fromB64(a.salt), a.iterations || ITERATIONS);
  try {
    await decryptWith(oldKey, a.check);
  } catch (e) {
    throw new Error("wrong");
  }
  return { recoveryCode: await setUpKeys(a.username, password, a.created || new Date().toISOString(), oldKey) };
}

export async function changePassword(oldPassword, newPassword) {
  const a = readAccount();
  const raw = await unwrap({ ...a.wrapPw, iterations: a.iterations }, oldPassword);
  ls().setItem(ACCOUNT_KEY, JSON.stringify({ ...a, iterations: ITERATIONS, wrapPw: await wrap(raw, newPassword),
    wrapRc: { ...a.wrapRc, iterations: a.wrapRc.iterations || a.iterations } }));
}

// "I forgot my password": the recovery code opens the record key, which is then locked with a new password.
export async function resetPassword(code, newPassword) {
  const a = readAccount();
  if (!a || !a.wrapRc) throw new Error("no code");
  const raw = await unwrap({ ...a.wrapRc, iterations: a.wrapRc.iterations || a.iterations }, codeSecret(code));
  vault.key = await recordKey(raw);
  vault.raw = raw;
  vault.username = a.username;
  ls().setItem(ACCOUNT_KEY, JSON.stringify({ ...a, wrapPw: await wrap(raw, newPassword), iterations: ITERATIONS,
    wrapRc: { ...a.wrapRc, iterations: a.wrapRc.iterations || a.iterations } }));
  return a.username;
}

// A fresh recovery code (the old one stops working). Needs the password.
export async function replaceRecoveryCode(password) {
  const a = readAccount();
  const raw = await unwrap({ ...a.wrapPw, iterations: a.iterations }, password);
  const code = newRecoveryCode();
  ls().setItem(ACCOUNT_KEY, JSON.stringify({ ...a, wrapRc: { ...(await wrap(raw, codeSecret(code))), iterations: ITERATIONS } }));
  return code;
}

export function logOut() {
  vault.key = null;
  vault.raw = null;
  vault.username = "";
}

// Last resort when both the password and the recovery code are lost: erase and start over.
export function eraseEverything() {
  const s = ls();
  if (s) Object.keys(s).filter((k) => k.startsWith("fabry-tracker-")).forEach((k) => s.removeItem(k));
  logOut();
}

// ---------- Face ID / fingerprint ----------
// Uses a passkey kept by the phone (WebAuthn) with the PRF extension: after Face ID or a fingerprint, the phone returns
// a secret that only that passkey can produce for this app. That secret locks a third copy of the record key, so the
// record is still encrypted at rest and nothing is sent anywhere. Phones or browsers without PRF don't offer it.
const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
const prfKey = (bytes) => crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
const prfFirst = (cred) => {
  const ext = cred && cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
  return ext.prf && ext.prf.results && ext.prf.results.first ? new Uint8Array(ext.prf.results.first) : null;
};

export async function bioAvailable() {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials) return false;
    if (PublicKeyCredential.getClientCapabilities) {
      const caps = await PublicKeyCredential.getClientCapabilities();
      if (caps && caps["extension:prf"] === false) return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
}
export const bioEnabled = () => { const a = readAccount(); return Boolean(a && a.bio); };

async function bioSecret(credId, salt) {
  const cred = await navigator.credentials.get({ publicKey: {
    challenge: rand(32), userVerification: "required", timeout: 60000,
    allowCredentials: [{ type: "public-key", id: fromB64(credId) }],
    extensions: { prf: { eval: { first: fromB64(salt) } } },
  } });
  const out = prfFirst(cred);
  if (!out) throw new Error("noprf");
  return out;
}

// Turns on Face ID for this account. Must be logged in. The phone may ask for Face ID twice the first time.
export async function enableBio() {
  if (!vault.raw) throw new Error("locked");
  const a = readAccount();
  const salt = toB64(rand(32));
  let cred;
  try {
    cred = await navigator.credentials.create({ publicKey: {
      rp: { name: "My Rare Disease Tracker" },
      user: { id: rand(16), name: a.username, displayName: a.username },
      challenge: rand(32),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
      timeout: 60000,
      extensions: { prf: { eval: { first: fromB64(salt) } } },
    } });
  } catch (e) {
    throw new Error(e && e.name === "NotAllowedError" ? "cancelled" : "failed");
  }
  const ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
  if (!ext.prf || ext.prf.enabled === false) throw new Error("noprf");
  const credId = toB64(cred.rawId);
  let secret = prfFirst(cred);
  if (!secret) {
    try { secret = await bioSecret(credId, salt); } catch (e) { throw new Error(e.message === "noprf" ? "noprf" : "cancelled"); }
  }
  const wrapped = await encryptBytes(await prfKey(secret), vault.raw);
  ls().setItem(ACCOUNT_KEY, JSON.stringify({ ...readAccount(), bio: { credId, salt, wrapped } }));
}

export async function bioLogIn() {
  const a = readAccount();
  if (!a || !a.bio) throw new Error("off");
  let secret;
  try {
    secret = await bioSecret(a.bio.credId, a.bio.salt);
  } catch (e) {
    throw new Error(e.message === "noprf" ? "noprf" : "cancelled");
  }
  let raw;
  try {
    raw = await decryptBytes(await prfKey(secret), a.bio.wrapped);
  } catch (e) {
    throw new Error("wrong");
  }
  vault.key = await recordKey(raw);
  vault.raw = raw;
  vault.username = a.username;
  await relock(null);
}

export function disableBio() {
  const a = readAccount();
  if (!a) return;
  delete a.bio;
  ls().setItem(ACCOUNT_KEY, JSON.stringify(a));
}
