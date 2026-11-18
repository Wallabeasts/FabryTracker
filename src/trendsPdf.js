// "Save as PDF" for the Trends page.
// Draws each page on a canvas (so every language and its fonts work, Arabic and Chinese included), turns the pages
// into JPEG pictures, and wraps them in a small PDF file. Nothing leaves the device: the file is made here and handed
// to the phone's share sheet (iPhone), Downloads (Android) or the browser's download (website).

import { tr, currentLang } from "./i18n.js";

const enc = new TextEncoder();
const clean = (s) => String(s || "").replace(/[⁦-⁩‎‏]/g, "").replace(/\s+/g, " ").trim();

// ---------- A minimal PDF writer: one full-page JPEG picture per page ----------
export function pdfFromJpegs(pages, ptW, ptH) {
  const parts = [];
  const offsets = [];
  let size = 0;
  const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); size += b.length; };
  const obj = (n, body) => { offsets[n] = size; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const n = pages.length;
  // 1 catalog, 2 page list, then for each page: page, content, picture.
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  pages.forEach((p, i) => {
    const pg = 3 + i * 3;
    obj(pg, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im${i} ${pg + 2} 0 R >> >> /Contents ${pg + 1} 0 R >>`));
    const stream = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im${i} Do Q`;
    obj(pg + 1, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    obj(pg + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push("\nendstream");
    });
  });
  const count = 3 + n * 3;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(size);
  let o = 0;
  parts.forEach((b) => { out.set(b, o); o += b.length; });
  return out;
}

// ---------- A chart (SVG on the screen) as a picture ----------
const STYLE_PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin",
  "opacity", "fill-opacity", "stroke-opacity", "font-size", "font-family", "font-weight", "paint-order", "visibility", "display"];
function svgImage(svg) {
  const rect = svg.getBoundingClientRect();
  const copy = svg.cloneNode(true);
  const from = [svg, ...svg.querySelectorAll("*")];
  const to = [copy, ...copy.querySelectorAll("*")];
  from.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";");
    to[i].setAttribute("style", style);
  });
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", Math.round(rect.width));
  copy.setAttribute("height", Math.round(rect.height));
  if (!copy.getAttribute("viewBox")) copy.setAttribute("viewBox", `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ img, w: rect.width, h: rect.height });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// What's on the Trends page, in order: section headings and chart cards (title, latest value, chart, spoken summary).
async function collect(root) {
  const items = [];
  const nodes = root.querySelectorAll("[data-pdf-heading], section");
  for (const node of nodes) {
    if (node.hasAttribute("data-pdf-heading")) {
      items.push({ kind: "heading", text: clean(node.textContent) });
      continue;
    }
    const svgs = [...node.querySelectorAll("svg[role=img]")];
    if (!svgs.length) continue;
    const h = node.querySelector("h3, h2");
    let title = "";
    if (h) {
      const c = h.cloneNode(true);
      c.querySelectorAll("button, [aria-hidden=true]").forEach((b) => b.remove());
      title = clean(c.textContent);
    }
    const valueEl = node.querySelector(".text-right");
    // The latest value: the number and unit on one line, then any smaller lines ("Down from 3.9").
    const value = [];
    if (valueEl) {
      let first = "";
      [...valueEl.childNodes].forEach((x) => {
        const t = clean(x.textContent);
        if (!t) return;
        if (x.nodeName === "DIV") value.push(t); else first = first ? `${first} ${t}` : t;
      });
      if (first) value.unshift(first);
    }
    const charts = [];
    for (const s of svgs) {
      const pic = await svgImage(s);
      if (pic) charts.push({ ...pic, summary: clean(s.getAttribute("aria-label")) });
    }
    if (charts.length) items.push({ kind: "card", title, value, charts });
  }
  // Drop headings with no charts under them.
  return items.filter((it, i) => it.kind === "card" || (items[i + 1] && items[i + 1].kind === "card"));
}

// ---------- Laying out the pages ----------
export async function makeTrendsPdf(root, info) {
  const letter = info.paper === "letter";
  const ptW = letter ? 612 : 595;
  const ptH = letter ? 792 : 842;
  const W = letter ? 1275 : 1240; // 150 dots per inch
  const H = letter ? 1650 : 1754;
  const M = 72;
  const CW = W - M * 2;
  const rtl = currentLang() === "ar";
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const INK = "#0F1B2D";
  const MUTED = "#4A5568";
  const LINE = "#C9D3DE";
  const ACCENT = "#0D6F8A";

  const items = await collect(root);
  const pages = [];
  let ctx;
  let y;

  const setFont = (px, weight = 400) => { ctx.font = `${weight} ${px}px ${font}`; };
  const text = (s, x, yy, align = "left") => {
    ctx.direction = rtl ? "rtl" : "ltr";
    const a = rtl ? (align === "left" ? "right" : align === "right" ? "left" : align) : align;
    const xx = rtl ? W - x : x;
    ctx.textAlign = a;
    ctx.fillText(s, xx, yy);
  };
  // Splits text into lines that fit; works word by word, or character by character for Chinese.
  const wrap = (s, width) => {
    const words = /[　-鿿]/.test(s) ? [...s] : s.split(" ");
    const joiner = /[　-鿿]/.test(s) ? "" : " ";
    const lines = [];
    let line = "";
    words.forEach((w) => {
      const next = line ? line + joiner + w : w;
      if (ctx.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next;
    });
    if (line) lines.push(line);
    return lines;
  };
  const newPage = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    ctx = c.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic";
    pages.push(c);
    y = M;
  };
  const room = (h) => { if (y + h > H - M - 40) newPage(); };

  // First page: who and what this is.
  newPage();
  if (info.logo) {
    try { ctx.drawImage(info.logo, rtl ? W - M - 84 : M, y, 84, 84); } catch (e) { /* no logo */ }
  }
  ctx.fillStyle = INK;
  setFont(40, 700);
  text(tr("Trends report"), M + 104, y + 40);
  setFont(24, 400);
  ctx.fillStyle = ACCENT;
  text("My Rare Disease Tracker", M + 104, y + 76);
  y += 120;
  ctx.fillStyle = INK;
  setFont(26, 700);
  wrap([info.name, info.condition].filter(Boolean).join(" · "), CW).forEach((l) => { text(l, M, y); y += 34; });
  setFont(22, 400);
  ctx.fillStyle = MUTED;
  (info.lines || []).forEach((s) => wrap(s, CW).forEach((l) => { text(l, M, y); y += 30; }));
  y += 8;
  if (info.treatments && info.treatments.length) {
    ctx.fillStyle = INK;
    setFont(24, 700);
    text(tr("Current treatments"), M, y + 6);
    y += 40;
    setFont(22, 400);
    info.treatments.forEach((s) => wrap(`• ${s}`, CW).forEach((l) => { room(30); ctx.fillStyle = INK; setFont(22, 400); text(l, M, y); y += 30; }));
  }
  y += 16;
  ctx.fillStyle = LINE;
  ctx.fillRect(M, y, CW, 2);
  y += 30;

  // The charts.
  for (const it of items) {
    if (it.kind === "heading") {
      room(70 + 300);
      ctx.fillStyle = ACCENT;
      ctx.fillRect(rtl ? W - M - 8 : M, y, 8, 40);
      ctx.fillStyle = INK;
      setFont(30, 700);
      text(it.text, M + 22, y + 31);
      y += 64;
      continue;
    }
    for (const [ci, ch] of it.charts.entries()) {
      const scale = CW / ch.w;
      const chartH = ch.h * scale;
      setFont(20, 400);
      const sumLines = ch.summary ? wrap(ch.summary, CW) : [];
      const head = ci === 0 ? 48 + (it.value.length > 1 ? 26 : 0) : 0;
      const need = head + chartH + 12 + sumLines.length * 27 + 34;
      room(Math.min(need, H - M * 2 - 60));
      if (ci === 0) {
        ctx.fillStyle = INK;
        setFont(26, 700);
        const valW = it.value[0] ? (setFont(24, 700), ctx.measureText(it.value[0]).width) : 0;
        setFont(26, 700);
        const titleLines = wrap(it.title, CW - valW - 30);
        text(titleLines[0] || "", M, y + 28);
        if (it.value[0]) { setFont(24, 700); text(it.value[0], W - M, y + 28, "right"); }
        if (it.value[1]) { setFont(19, 400); ctx.fillStyle = MUTED; text(it.value[1], W - M, y + 56, "right"); }
        y += head;
      }
      ctx.drawImage(ch.img, M, y, CW, chartH);
      y += chartH + 12;
      ctx.fillStyle = MUTED;
      setFont(20, 400);
      sumLines.forEach((l) => { room(27); ctx.fillStyle = MUTED; setFont(20, 400); text(l, M, y + 20); y += 27; });
      y += 14;
      ctx.fillStyle = LINE;
      ctx.fillRect(M, y, CW, 1);
      y += 24;
    }
  }

  // Footer on every page.
  const total = pages.length;
  pages.forEach((c, i) => {
    ctx = c.getContext("2d");
    ctx.fillStyle = MUTED;
    setFont(17, 400);
    const foot = `${tr("Made by the patient from their own records. Not a medical record.")}  ·  ${info.made}`;
    wrap(foot, CW - 160).forEach((l, k) => text(l, M, H - 46 + k * 22));
    text(tr(`Page ${i + 1} of ${total}`), W - M, H - 46, "right");
  });

  const jpegs = pages.map((c) => {
    const b64 = c.toDataURL("image/jpeg", 0.86).split(",")[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { jpeg: bytes, w: W, h: H };
  });
  return pdfFromJpegs(jpegs, ptW, ptH);
}
