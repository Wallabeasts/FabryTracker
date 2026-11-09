// Password checks for the account, backups and shared copies. Everything runs on the phone.
//
// A password is turned away if it's short, numbers only (like a date), a simple pattern, contains the username,
// or is a well-known password or guessable word with numbers or symbols added (like "Password1!" or "Fabry2026").
// The strength meter is a guide on top of that.

export const MIN_LENGTH = 8;

// Words people commonly build passwords from. Matched after lowercasing, undoing look-alike swaps (@ → a, 0 → o)
// and removing numbers and symbols at either end, so "P@ssw0rd123!" counts as "password".
const COMMON_WORDS = `
password passwd passw pass word qwerty qwertyui qwertyuiop asdf asdfgh asdfghjk asdfghjkl zxcvbn zxcvbnm qazwsx qazwsxedc
zaqwsx abc abcd abcde abcdef abcdefg abcdefgh abcdefghi letmein welcome iloveyou iloveu loveyou love lovely lover mylove
sunshine princess football baseball basketball soccer hockey monkey dragon master shadow superman batman spiderman starwars
whatever computer internet admin administrator login user guest test tester testing changeme default secret trustno trustnoone
freedom hello helloworld goodbye goodluck nothing blessed jesus jesuschrist christ god godisgood lord faith grace angel
angels heaven trinity family summer winter spring autumn rainbow butterfly chocolate cookie cookies flower flowers babygirl
baby sweetheart sweetie honey princess1 iloveyou1 forever friends friend charlie michael michelle jennifer jessica ashley
daniel matthew joshua andrew thomas robert william david james john joseph anthony christopher jordan justin hunter ranger
buster maggie ginger pepper bailey buddy daisy lucky tigger tiger mustang harley ferrari corvette killer pokemon minecraft
fortnite purple orange yellow silver golden diamond whatever1 mypassword mypass passpass testtest qwerty1 iphone android
samsung apple google facebook instagram twitter youtube netflix amazon microsoft windows
fabry fabrys fabrydisease fabrytracker rare raredisease rarediseases raredisease tracker tracker diseasetracker disease
health healthy medical medicine doctor nurse hospital clinic kidney kidneys heart patient mychart epic cystinosis alport
alports gaucher pompe xlh bardet bbs alstrom hyperoxaluria oxalate adtkd mps mody uab birmingham alabama rolltide roll tide
wareagle auburn zaq12wsx 1qaz2wsx 2wsx3edc qwerty123 qwer1234 abc12345 abcd1234 1234abcd 12345abc a1b2c3d4 q1w2e3r4
password1 password12 password123 iloveyou1 letmein1 welcome1 trustno1 monkey123 dragon123
`.trim().split(/\s+/);
const COMMON = new Set(COMMON_WORDS);

const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "zyxwvutsrqponmlkjihgfedcba", "01234567890", "09876543210",
  "qwertyuiopasdfghjklzxcvbnm", "1qaz2wsx3edc4rfv", "1q2w3e4r5t6y", "q1w2e3r4t5y6", "a1b2c3d4e5f6", "1a2b3c4d5e6f"];

const unLeet = (s) => s.replace(/@|4/g, "a").replace(/0/g, "o").replace(/3/g, "e").replace(/\$|5/g, "s").replace(/!|1|\|/g, "i").replace(/7/g, "t");
// The letters at the heart of the password, with leading and trailing numbers and symbols removed.
function core(pw) {
  const low = pw.toLowerCase().replace(/\s+/g, "");
  const stripped = low.replace(/^[^a-z@$]+/, "").replace(/[^a-z]+$/, "");
  return [stripped, unLeet(stripped), unLeet(low).replace(/^[^a-z]+/, "").replace(/[^a-z]+$/, "")];
}
const isPattern = (pw) => {
  const s = pw.toLowerCase();
  if (/^(.)\1+$/.test(s)) return true; // aaaaaaaa
  if (/^(.{1,4})\1+$/.test(s)) return true; // abcabcabc, 12341234
  return SEQUENCES.some((q) => q.includes(s));
};

// Returns { ok, problem, score (0-4), label }.
export function checkPassword(pw, username = "") {
  const p = String(pw || "");
  const out = (ok, problem, score) => ({ ok, problem, score, label: ["Too weak", "Weak", "Fair", "Strong", "Very strong"][score] });
  if (!p) return out(false, "", 0);
  if (p.length < MIN_LENGTH) return out(false, `Use at least ${MIN_LENGTH} characters.`, 0);
  if (/^[\d\s\-/.]+$/.test(p)) return out(false, "Use letters too. Numbers on their own, like dates, are easy to guess.", 0);
  if (isPattern(p)) return out(false, "That's a simple pattern that's easy to guess. Try something less predictable.", 0);
  const u = String(username || "").trim().toLowerCase();
  if (u.length >= 3 && p.toLowerCase().includes(u)) return out(false, "Don't include your username in your password.", 0);
  const cores = core(p);
  if (cores.some((c) => COMMON.has(c)) || COMMON.has(p.toLowerCase())) {
    return out(false, "That's a common password or word that's easy to guess. Try a few unrelated words instead.", 1);
  }
  // A guide to strength: length and variety of characters.
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  const words = p.trim().split(/[\s\-_.]+/).filter((w) => w.length >= 3).length;
  let score = 1;
  if (p.length >= 10 || kinds >= 3) score = 2;
  if ((p.length >= 12 && kinds >= 2) || (p.length >= 10 && kinds >= 3) || words >= 3) score = 3;
  if (p.length >= 16 && (kinds >= 2 || words >= 3)) score = 4;
  return out(true, "", score);
}
