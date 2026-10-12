// MESIN CETAK THERMAL — KASIR MAMLAH
// Prinsip: 1 baris = 1 teks polos (monospace, white-space: pre). Tidak ada flex/tabel/merge.
// Kolom kanan dibuat dengan spasi (padding), jadi tidak mungkin pecah ke 2 baris.
// Electron: cetak langsung (silent) ke printer pilihan. Browser: fallback iframe + dialog print.

export function formatRp(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

export const LABEL_DEFAULTS = { labelWidthMm: 35, labelHeightMm: 15, labelGapMm: 7 };

const FONT = `Arial, Helvetica, sans-serif`;
const CHAR_W = 0.52; // perkiraan lebar karakter Arial untuk pembatasan teks thermal
const MM_PX = 96 / 25.4;

function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function nowParts() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return {
    date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

function fmtDate(iso) {
  if (!iso) return nowParts().date;
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function sourceLabel(tx) {
  const type = tx.orderType || "DINE IN";
  if (type === "DINE IN") return tx.tableName || tx.source || "Meja";
  return type;
}

function headLine(tx) {
  const type = tx.orderType || "DINE IN";
  return type === "DINE IN" ? `${type} - ${sourceLabel(tx)}` : type;
}

function storeNameOnly(settings = {}) {
  return String(settings.storeName || "MAMLAH").split(/\s+-\s+/)[0].trim() || "MAMLAH";
}

// Jumlah karakter yang muat dalam lebar (mm) pada ukuran font (px)
function colsFor(widthMm, fontPx) {
  return Math.floor((widthMm * MM_PX) / (fontPx * CHAR_W));
}

function cut(str, n) {
  const s = String(str || "");
  if (s.length <= n) return s;
  if (n <= 3) return ".".repeat(Math.max(1, n));
  return s.slice(0, n - 3).trimEnd() + "...";
}

function wrapFull(str, cols) {
  const max = Math.max(1, Number(cols) || 1);
  const words = String(str || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (word.length > max) {
      if (current) { lines.push(current); current = ""; }
      for (let i = 0; i < word.length; i += max) lines.push(word.slice(i, i + max));
    } else if (!current) current = word;
    else if ((current + " " + word).length <= max) current += " " + word;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function itemPromoLines(item, prefix = "  ") {
  const lines = [];
  const base = Number(item?.basePrice) || 0;
  const sale = Number(item?.baseUnitPrice ?? item?.price) || 0;
  const pct = Number(item?.promoPercent) || 0;
  if (pct > 0 && base > sale) {
    lines.push(`${prefix}Harga normal: ${formatRp(base)}`);
    lines.push(`${prefix}Promo ${pct}%: -${formatRp(base - sale)}`);
    lines.push(`${prefix}Harga promo: ${formatRp(sale)}`);
  }
  const modifier = Number(item?.modifierTotal) || 0;
  if (modifier > 0) lines.push(`${prefix}Tambahan varian: +${formatRp(modifier)}`);
  return lines;
}

// Satu baris: teks kiri rata kiri, nominal rata kanan (dipisah spasi penuh).
// Ini membuat quantity & harga selalu sejajar dan jelas terbaca.
function lr(left, right, cols) {
  const r = String(right || "");
  const maxLeft = Math.max(1, cols - r.length - 1);
  const l = cut(left, maxLeft);
  const pad = Math.max(1, cols - l.length - r.length);
  return l + " ".repeat(pad) + r;
}

function center(str, cols) {
  const s = cut(str, cols);
  const pad = Math.floor((cols - s.length) / 2);
  return " ".repeat(Math.max(0, pad)) + s;
}

// Pecah kalimat panjang jadi beberapa baris (per kata), tiap baris <= cols
function optionLines(item, prefix = "  ") {
  const options = Array.isArray(item?.options) ? item.options : [];
  const lines = options.map((o) => `${prefix}${o.groupName ? `${o.groupName}: ` : ""}${o.name}${Number(o.price) > 0 ? ` (+${formatRp(o.price)})` : ""}`);
  if (item?.note) lines.push(`${prefix}Catatan: ${item.note}`);
  return lines;
}

function wrap(str, cols) {
  const words = String(str || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = cut(w, cols);
    else if ((cur + " " + w).length <= cols) cur += " " + w;
    else {
      lines.push(cur);
      cur = cut(w, cols);
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// Satu blok PRE = satu baris fisik struk. Ini lebih stabil pada driver thermal
// dibanding div, span, grid, flex, atau kombinasi kolom berbasis HTML.
const line = (txt, cls = "") => `<pre class="${cls} receipt-line">${esc(txt)}</pre>`;

// Printer thermal lebih stabil jika menerima satu baris monospace polos.
const row = (left, right, cols, cls = "") => line(lr(left, right, cols), cls);

function baseCss(widthMm, fontPx, contentMm = widthMm) {
  const sidePaddingMm = Math.max(0, (widthMm - contentMm) / 2);
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    body {
      width: ${widthMm}mm; max-width: ${widthMm}mm; margin: 0 auto; padding: 0 ${sidePaddingMm}mm 2mm;
      font-family: ${FONT}; font-weight: 700; font-size: ${fontPx}px; line-height: 1.15; color: #000; white-space: pre; text-align: left;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .receipt-line {
      display: block; width: 100%; height: auto; min-height: 1em; margin: 0; padding: 0;
      white-space: pre; overflow: hidden; text-overflow: clip; font-family: inherit; font-weight: inherit;
    }
  `;
}

export function buildReceiptHtml(tx, settings = {}) {
  const is80 = settings.paperSize === "80mm";
  const paperMm = is80 ? 80 : 58;
  // Area aman printer: kertas 58mm umumnya hanya mencetak sekitar 48mm.
  const w = is80 ? 70 : 48;
  const base = is80 ? 12 : 10;
  const sm = is80 ? 11 : 10;
  const lg = is80 ? 18 : 16;
  const C = colsFor(w, base);
  const Cs = colsFor(w, sm);
  const Cl = colsFor(w, lg);
  const dash = "-".repeat(C);

  const store = storeNameOnly(settings);
  const tagline = settings.tagline || "Solusi Kelaparan";
  const cust = tx.customerName && tx.customerName !== "-" ? tx.customerName : "";
  const cash = tx.paymentMethod === "TUNAI";
  const out = [];

  // SOP struk restoran: header → transaksi → item → ringkasan pembayaran → footer.
  if (settings.logoUrl) out.push(`<img class="logo" src="${esc(settings.logoUrl)}" />`);
  out.push(line(center(store, Cl), "lg"));
  out.push(line(center(tagline, Cs), "tagline"));
  if (Number(tx.receiptPrintCount) > 1) out.push(line(center("#Reprint", C), "reprint"));
  if (tx.paymentStatus) out.push(line(center(tx.paymentStatus, C), "sm"));
  if (settings.address) out.push(line(center(cut(settings.address, Cs), Cs), "sm"));
  if (settings.phone) out.push(line(center(cut(`Telp ${settings.phone}`, Cs), Cs), "sm"));
  out.push(line(dash));
  out.push(line(center(`[ ${headLine(tx)} ]`, C)));
  if (cust) out.push(line(center(cust, C)));
  out.push(row(`${fmtDate(tx.date)} ${tx.time || nowParts().time}`, tx.cashierName || "-", Cs, "sm"));
  out.push(line(dash));
  for (const it of tx.items || []) {
    const qty = it.qty || 1;
    const sub = it.subtotal || (it.price || 0) * qty;
    const nameLines = wrapFull(`${qty}x ${it.name}`, Math.max(1, Cs - formatRp(sub).length - 1));
    nameLines.forEach((nameLine, lineIndex) => {
      if (lineIndex === nameLines.length - 1) out.push(row(nameLine, formatRp(sub), Cs, "sm"));
      else out.push(line(nameLine, "sm"));
    });
    for (const detail of [...itemPromoLines(it), ...optionLines(it, "  ")]) out.push(line(detail, "sm"));
  }
  out.push(line(dash));
  out.push(row("Subtotal", formatRp(tx.subtotal), C));
  if (tx.discountAmount > 0) out.push(row(`Diskon ${tx.discountPercent || 0}%`, "-" + formatRp(tx.discountAmount), C));
  out.push(row("TOTAL", formatRp(tx.total), Cl, "lg"));
  out.push(row(tx.paymentMethod || "TUNAI", formatRp(cash ? tx.cash : tx.total), C));
  if (cash) out.push(row("Kembali", formatRp(tx.change || 0), C));
  if (tx.note) {
    out.push(line(dash));
    out.push(line(cut(`Catatan: ${tx.note}`, Cs), "sm"));
  }
  out.push(line(dash));
  out.push(line(center("TERIMA KASIH", C)));
  if (settings.footerNote) out.push(line(center(cut(settings.footerNote, Cs), Cs), "sm"));
  if (settings.barcodeUrl) out.push(`<img class="qr" src="${esc(settings.barcodeUrl)}" />`);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Struk</title><style>
    @page { size: ${paperMm}mm auto; margin: 0; }
    ${baseCss(paperMm, base, w)}
    .sm { font-size: ${sm}px; }
    .tagline { font-size: ${sm}px; font-weight: 400; }
    .reprint { font-size: ${sm + 2}px; font-weight: 900; }
    .lg { font-size: ${lg}px; }
    .lg { font-size: ${lg}px; font-weight: 700; text-align: center; }
    .total-row { font-size: ${lg}px; font-weight: 700; text-align: center; }
    img.logo { max-width: 40mm; max-height: 18mm; display: block; margin: 0 auto 2px; }
    img.qr { max-width: 30mm; max-height: 30mm; display: block; margin: 3px auto 0; }
  </style></head><body>${out.join("")}</body></html>`;
}

export function labelSize(settings = {}) {
  const w = Number(settings.labelWidthMm) || LABEL_DEFAULTS.labelWidthMm;
  const h = Number(settings.labelHeightMm) || LABEL_DEFAULTS.labelHeightMm;
  const gap = Number.isFinite(Number(settings.labelGapMm)) ? Math.max(0, Number(settings.labelGapMm)) : LABEL_DEFAULTS.labelGapMm;
  return { w, h, gap };
}

// 1 stiker per porsi (qty 3 = 3 stiker). Label hanya berisi nama menu.
export function buildKitchenLabelsHtml(order, settings = {}) {
  const { w, h, gap } = labelSize(settings);
  const inner = Math.max(10, w - 2); // margin 1mm kiri kanan
  const namePx = h >= 12 ? 12 : 10;
  const nameCols = colsFor(inner, namePx);

  const units = [];
  for (const it of order.items || []) for (let i = 0; i < (it.qty || 1); i++) units.push(it);
  const total = units.length;

  const labels = units
    .map((it) => `<div class="label"><span class="name">${esc(cut(it.name, nameCols))}</span></div>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label Dapur</title><style>
    @page { size: ${w}mm ${h + gap}mm; margin: 0; }
    ${baseCss(w, namePx, inner)}
    body { width: ${w}mm; max-width: ${w}mm; padding: 0; white-space: pre; }
    .label { width: ${w}mm; height: ${h}mm; padding: 0 1mm; display: block; overflow: hidden;
      page-break-after: always; break-after: page; margin-bottom: ${gap}mm; }
    .label:last-child { page-break-after: auto; break-after: auto; }
    .name { display: block; width: ${inner}mm; height: ${h}mm; padding-top: ${(h - namePx / MM_PX) / 2}mm;
      white-space: pre; overflow: hidden; text-align: center; font-size: ${namePx}px; line-height: 1; font-weight: 400; }
  </style></head><body>${labels}</body></html>`;
}

// Struk dapur: format sama seperti struk kasir, tetapi tanpa harga.
export function buildKitchenReceiptHtml(order, settings = {}) {
  const paperMm = settings.paperSize === "80mm" ? 80 : 58;
  const w = settings.paperSize === "80mm" ? 70 : 48;
  const base = settings.paperSize === "80mm" ? 12 : 10;
  const sm = settings.paperSize === "80mm" ? 11 : 10;
  const C = colsFor(w, base);
  const Cs = colsFor(w, sm);
  const dash = "-".repeat(C);
  const out = [];
  const store = storeNameOnly(settings);
  out.push(line(center(store, C), "lg"));
  out.push(line(center(settings.tagline || "Solusi Kelaparan", Cs), "tagline"));
  if (Number(order?.kitchenPrintCount) > 1) out.push(line(center("#Reprint", C), "reprint"));
  out.push(line(dash));
  out.push(line(center(`[ ${headLine(order)} ]`, C)));
  if (order.customerName && order.customerName !== "-") out.push(line(center(order.customerName, C)));
  out.push(line(center(`${fmtDate(order.date)} ${order.time || nowParts().time}`, Cs), "sm"));
  out.push(line(dash));
  for (const item of order.items || []) {
    out.push(line(`${item.qty || 1}x ${item.name}`, "sm"));
    for (const option of item.options || []) out.push(line(`  ${option.groupName ? option.groupName + ": " : ""}${option.name}`, "sm"));
    if (item.note) out.push(line(`  Catatan: ${item.note}`, "sm"));
  }
  if (order.note) out.push(line(`Catatan pesanan: ${order.note}`, "sm"));
  out.push(line(dash));
  out.push(line(center("UNTUK DAPUR", C), "lg"));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Struk Dapur</title><style>@page { size: ${paperMm}mm auto; margin: 0; } ${baseCss(paperMm, base, w)} .sm { font-size: ${sm}px; } .tagline { font-size: ${sm}px; font-weight: 400; } .lg { font-size: ${base + 5}px; font-weight: 700; text-align: center; } .reprint { font-size: ${base + 2}px; font-weight: 900; }</style></head><body>${out.join("")}</body></html>`;
}

// Rekap shift kasir untuk dicetak ke thermal
export function buildShiftReportHtml(report, settings = {}) {
  const is80 = settings.paperSize === "80mm";
  const paperMm = is80 ? 80 : 58;
  const w = is80 ? 72 : 50;
  const base = is80 ? 12 : 11;
  const sm = is80 ? 11 : 10;
  const C = colsFor(w, base);
  const Cs = colsFor(w, sm);
  const dash = "-".repeat(C);
  const out = [];
  out.push(line(center(settings.storeName || "KASIR MAMLAH", C), "lg"));
  out.push(line(center("REKAP SHIFT KASIR", C)));
  out.push(line(center(`${fmtDate(report.date)}  cetak ${nowParts().time}`, Cs), "sm"));
  for (const r of report.shiftRows || []) {
    out.push(line(dash));
    out.push(line(cut(`${r.cashierName}${r.shift ? " (" + r.shift + ")" : ""}`, C)));
    out.push(line(lr("Transaksi", `${r.count}`, C)));
    out.push(line(lr("Tunai", formatRp(r.TUNAI), C)));
    out.push(line(lr("QRIS", formatRp(r.QRIS), C)));
    out.push(line(lr("Debit", formatRp(r.DEBIT), C)));
    out.push(line(lr("Online Food", formatRp(r.ONLINE), C)));
    out.push(line(lr("TOTAL", formatRp(r.total), C)));
  }
  out.push(line(dash));
  out.push(line(lr("TOTAL HARI INI", formatRp(report.totalOmzet), C)));
  out.push(line(lr("Total transaksi", `${report.totalTransactions}`, C)));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rekap Shift</title><style>
    @page { size: ${paperMm}mm auto; margin: 0; }
    ${baseCss(w, base)}
    .sm { font-size: ${sm}px; } .lg { font-size: ${is80 ? 15 : 13}px; }
  </style></head><body>${out.join("")}</body></html>`;
}

function printViaIframe(html) {
  const old = document.getElementById("mamlah-thermal-print-frame");
  if (old) old.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "mamlah-thermal-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  return new Promise((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        resolve({ ok: true });
      } catch (e) {
        resolve({ ok: false, reason: String(e) });
      }
    };
    iframe.onload = () => setTimeout(go, 250);
    setTimeout(go, 700);
  });
}

function dispatch(html, { widthMm, pageHeightMm, deviceName, silent }) {
  if (window.electronAPI?.printHtml) {
    return window.electronAPI.printHtml({ html, widthMm, pageHeightMm, deviceName: deviceName || "", silent });
  }
  return printViaIframe(html);
}

function escPosBytes(tx, settings = {}, report = null) {
  const cols = settings.paperSize === "80mm" ? 48 : 32;
  const enc = new TextEncoder();
  const chunks = [];
  const cmd = (...bytes) => chunks.push(Uint8Array.from(bytes));
  const add = (s) => chunks.push(enc.encode(`${String(s || "").slice(0, cols)}\n`));
  // Saat mode ESC a=1 aktif, printer sendiri yang menghitung posisi tengah.
  // Jangan menambahkan spasi padding dari aplikasi karena font besar bisa terbelah.
  const centerRaw = (s) => cut(s, cols);
  const rule = () => { cmd(0x1b, 0x61, 0x01); add("-".repeat(cols)); };
  const centered = (s) => { cmd(0x1b, 0x61, 0x01); add(centerRaw(s)); };
  const centeredWrapped = (s) => { wrapFull(s, cols).forEach((part) => centered(part)); };
  // Baris detail selalu kiri/kanan sejajar. Nominal dipertahankan utuh di kanan.
  const rowRaw = (l, r) => { const right = String(r || ""); const left = cut(l, Math.max(1, cols - right.length - 1)); cmd(0x1b, 0x61, 0x00); add(left + " ".repeat(Math.max(1, cols - left.length - right.length)) + right); };
  const leftRaw = (s) => { cmd(0x1b, 0x61, 0x00); wrapFull(s, cols).forEach((part) => add(part)); };
  cmd(0x1b, 0x40, 0x1b, 0x45, 0x01);
  cmd(0x1b, 0x61, 0x01, 0x1d, 0x21, 0x11);
  centered(storeNameOnly(settings));
  cmd(0x1d, 0x21, 0x00);
  centered(settings.tagline || "Solusi Kelaparan");
  if (report) {
    centered("REKAP SHIFT KASIR"); centered(`${fmtDate(report.date)} ${nowParts().time}`);
    for (const r of report.shiftRows || []) { rule(); centered(`${r.cashierName}${r.shift ? ` (${r.shift})` : ""}`); rowRaw("Transaksi", r.count); rowRaw("Tunai", formatRp(r.TUNAI)); rowRaw("QRIS", formatRp(r.QRIS)); rowRaw("Debit", formatRp(r.DEBIT)); rowRaw("Online", formatRp(r.ONLINE)); rowRaw("TOTAL", formatRp(r.total)); }
    rule(); rowRaw("TOTAL HARI INI", formatRp(report.totalOmzet)); rowRaw("Total transaksi", report.totalTransactions);
  } else {
    if (Number(tx?.receiptPrintCount) > 1) { cmd(0x1b, 0x45, 0x01); centered("#Reprint"); cmd(0x1b, 0x45, 0x00); }
    if (tx?.paymentStatus) centered(tx.paymentStatus);
    if (settings.address) centeredWrapped(settings.address); if (settings.phone) centered(`Telp ${settings.phone}`);
    rule(); centered(`[ ${headLine(tx)} ]`); if (tx.customerName && tx.customerName !== "-") centeredWrapped(tx.customerName);
    centered(`${fmtDate(tx.date)} ${tx.time || nowParts().time}`); centered(tx.cashierName || "-"); rule();
    for (const it of tx.items || []) {
      const amount = formatRp(it.subtotal || (it.price || 0) * (it.qty || 1));
      const nameLines = wrapFull(`${it.qty || 1}x ${it.name}`, Math.max(1, cols - amount.length - 1));
      nameLines.forEach((nameLine, idx) => idx === nameLines.length - 1 ? rowRaw(nameLine, amount) : leftRaw(nameLine));
      for (const detail of [...itemPromoLines(it), ...optionLines(it, "  ")]) leftRaw(detail);
    }
    rule(); rowRaw("Subtotal", formatRp(tx.subtotal));
    if (tx.itemDiscountAmount > 0) rowRaw("Diskon item", `-${formatRp(tx.itemDiscountAmount)}`);
    if (tx.discountAmount > 0) rowRaw(`Diskon struk ${tx.discountPercent || 0}%`, `-${formatRp(tx.discountAmount)}`);
    cmd(0x1d, 0x21, 0x11); rowRaw("TOTAL", formatRp(tx.total)); cmd(0x1d, 0x21, 0x00);
    rowRaw(tx.paymentMethod || "TUNAI", formatRp(tx.paymentMethod === "TUNAI" ? tx.cash : tx.total)); if (tx.paymentMethod === "TUNAI") rowRaw("Kembali", formatRp(tx.change || 0));
    if (tx.note) { rule(); centeredWrapped(`Catatan: ${tx.note}`); }
    rule(); centered("TERIMA KASIH"); if (settings.footerNote) centeredWrapped(settings.footerNote);
  }
  cmd(0x1b, 0x64, 0x03, 0x1d, 0x56, 0x00);
  const merged = new Uint8Array(chunks.reduce((n, a) => n + a.length, 0)); let offset = 0; for (const a of chunks) { merged.set(a, offset); offset += a.length; }
  let binary = ""; for (const b of merged) binary += String.fromCharCode(b); return btoa(binary);
}

function printRaw(payload, settings = {}, printerName = settings.printerName) {
  if (!window.electronAPI?.printRaw) return Promise.resolve({ ok: false, reason: "ESC/POS hanya tersedia di Electron" });
  return window.electronAPI.printRaw({ data: payload, connection: settings.rawConnection || "usb", printerName: printerName || "", host: settings.rawHost || "", port: settings.rawPort || 9100, comPort: settings.rawComPort || "", baudRate: settings.rawComBaud || settings.labelRawBaud || 9600 });
}

function escPosKitchenBytes(order, settings = {}) {
  const cols = settings.paperSize === "80mm" ? 48 : 32;
  const enc = new TextEncoder();
  const chunks = [];
  const cmd = (...bytes) => chunks.push(Uint8Array.from(bytes));
  const add = (text) => chunks.push(enc.encode(`${String(text || "").slice(0, cols)}\n`));
  const centered = (text) => { cmd(0x1b, 0x61, 0x01); add(text); };
  const wrapped = (text) => wrapFull(text, cols).forEach(centered);
  const rule = () => centered("-".repeat(cols));
  cmd(0x1b, 0x40);
  cmd(0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11);
  centered(storeNameOnly(settings));
  cmd(0x1b, 0x45, 0x00, 0x1d, 0x21, 0x00);
  centered(settings.tagline || "Solusi Kelaparan");
  if (Number(order?.kitchenPrintCount) > 1) { cmd(0x1b, 0x45, 0x01); centered("#Reprint"); cmd(0x1b, 0x45, 0x00); }
  rule();
  wrapped(`[ ${headLine(order)} ]`);
  if (order.customerName && order.customerName !== "-") wrapped(order.customerName);
  centered(`${fmtDate(order.date)} ${order.time || nowParts().time}`);
  rule();
  for (const item of order.items || []) {
    wrapped(`${item.qty || 1}x ${item.name}`);
    for (const option of item.options || []) wrapped(`  ${option.groupName ? option.groupName + ": " : ""}${option.name}`);
    if (item.note) wrapped(`  Catatan: ${item.note}`);
  }
  if (order.note) wrapped(`Catatan pesanan: ${order.note}`);
  rule();
  cmd(0x1b, 0x45, 0x01); centered("UNTUK DAPUR"); cmd(0x1b, 0x45, 0x00);
  cmd(0x1b, 0x64, 0x03, 0x1d, 0x56, 0x00);
  const merged = new Uint8Array(chunks.reduce((n, a) => n + a.length, 0));
  let offset = 0; for (const a of chunks) { merged.set(a, offset); offset += a.length; }
  let binary = ""; for (const b of merged) binary += String.fromCharCode(b);
  return btoa(binary);
}

const receiptOpts = (settings) => ({
  widthMm: settings.paperSize === "80mm" ? 80 : 58,
  deviceName: settings.printerName,
  // Dialog wajib ditampilkan supaya driver printer dapat dipilih ke "Print as Soft Font".
  silent: false,
});

export function printThermalReceipt(tx, settings = {}) {
  if ((settings.printMode || "escpos") === "escpos") return printRaw(escPosBytes(tx, settings), settings);
  return dispatch(buildReceiptHtml(tx, settings), receiptOpts(settings));
}

export function printShiftReport(report, settings = {}) {
  if ((settings.printMode || "escpos") === "escpos") return printRaw(escPosBytes(null, settings, report), settings);
  return dispatch(buildShiftReportHtml(report, settings), receiptOpts(settings));
}

export function printKitchenLabels(order, settings = {}) {
  if (!order?.items?.length) return Promise.resolve({ ok: false, reason: "Pesanan kosong" });
  const labelSettings = {
    ...settings,
    printMode: settings.labelPrintMode || "escpos",
    rawConnection: settings.labelRawConnection || settings.rawConnection || "bluetooth",
    rawHost: settings.labelRawHost || settings.rawHost || "",
    rawPort: settings.labelRawPort || settings.rawPort || 9100,
    rawComPort: settings.labelRawComPort || settings.rawComPort || "COM9",
  };
  if (labelSettings.printMode === "escpos") {
    return printRaw(escPosKitchenBytes(order, labelSettings), labelSettings, settings.labelPrinterName || settings.printerName);
  }
  return dispatch(buildKitchenReceiptHtml(order, settings), {
    widthMm: settings.paperSize === "80mm" ? 80 : 58,
    deviceName: settings.printerName,
    silent: false,
  });
}

export function generateReceiptText(tx, settings = {}) {  const lines = [
    `*${storeNameOnly(settings)}*`,
    settings.tagline || "Solusi Kelaparan",
    headLine(tx),
    tx.customerName && tx.customerName !== "-" ? `Cust: ${tx.customerName}` : null,
    `${fmtDate(tx.date)} ${tx.time || ""}`,
    `------------------------`,
    ...(tx.items || []).flatMap((i) => [`${i.qty}x ${i.name}  ${formatRp(i.subtotal)}`, ...itemPromoLines(i, "  "), ...optionLines(i)]),
    `------------------------`,
    `Subtotal: ${formatRp(tx.subtotal)}`,
    tx.itemDiscountAmount > 0 ? `Diskon item: -${formatRp(tx.itemDiscountAmount)}` : null,
    tx.discountAmount > 0 ? `Diskon ${tx.discountPercent}%: -${formatRp(tx.discountAmount)}` : null,
    `*TOTAL: ${formatRp(tx.total)}*`,
    `${tx.paymentMethod}: ${formatRp(tx.paymentMethod === "TUNAI" ? tx.cash : tx.total)}`,
    tx.paymentMethod === "TUNAI" ? `Kembali: ${formatRp(tx.change || 0)}` : null,
    tx.note ? `Catatan: ${tx.note}` : null,
    `------------------------`,
    `TERIMA KASIH`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

// ====== LAPORAN CLOSING (ALL PRINT) ======
// Rekap lengkap: penjualan kasir per channel + omzet merchant + pengeluaran + laba bersih.
export function buildClosingReportHtml(report, settings = {}) {
  const is80 = settings.paperSize === "80mm";
  const paperMm = is80 ? 80 : 58;
  const w = is80 ? 72 : 48;
  const base = is80 ? 12 : 11;
  const sm = is80 ? 11 : 10;
  const lg = is80 ? 16 : 14;
  const C = colsFor(w, base);
  const Cs = colsFor(w, sm);
  const Cl = colsFor(w, lg);
  const dash = "-".repeat(C);
  const o = [];
  o.push(line(center(storeNameOnly(settings), Cl), "lg"));
  o.push(line(center("LAPORAN CLOSING HARIAN", C)));
  o.push(line(center(`${fmtDate(report.date)}  cetak ${nowParts().time}`, Cs), "sm"));
  o.push(line(dash));
  o.push(line("PENJUALAN KASIR"));
  const cb = report.channelBreakdown || {};
  const chRow = (label, key) => o.push(row(`${label} (${cb[key]?.count || 0})`, formatRp(cb[key]?.total || 0), C, "sm"));
  chRow("Dine In", "DINE IN");
  chRow("Take Away", "TAKE AWAY");
  o.push(row("Omzet Kasir", formatRp(report.totalOmzet || 0), C));
  o.push(line(dash));
  o.push(line("OMZET MERCHANT ONLINE"));
  const mb = report.merchantBreakdown || {};
  const mRow = (label, key) => {
    const d = mb[key] || { gross: 0, net: 0 };
    o.push(row(`${label} kotor`, formatRp(d.gross || 0), C, "sm"));
    o.push(row(`${label} bersih`, formatRp(d.net || 0), C, "sm"));
  };
  mRow("GoFood", "GOFOOD");
  mRow("GrabFood", "GRABFOOD");
  mRow("ShopeeFood", "SHOPEEFOOD");
  o.push(row("Merchant Kotor", formatRp(report.merchantGross || 0), C));
  o.push(row("Merchant Bersih", formatRp(report.merchantNet || 0), C));
  o.push(line(dash));
  o.push(row("OMZET TOTAL (All)", formatRp(report.grandOmzet || 0), C));
  o.push(line(dash));
  o.push(row("Modal / HPP Kasir", "-" + formatRp(report.totalModal || 0), C, "sm"));
  o.push(row("Komisi Online Kasir", "-" + formatRp(report.totalCommission || 0), C, "sm"));
  o.push(row("Pengeluaran", "-" + formatRp(report.totalExpense || 0), C, "sm"));
  if (report.expenseByCat) {
    for (const [cat, amt] of Object.entries(report.expenseByCat)) o.push(row(`  ${cat}`, "-" + formatRp(amt), Cs, "sm"));
  }
  o.push(line(dash));
  o.push(row("LABA BERSIH", formatRp(report.netProfit || 0), Cl, "lg"));
  o.push(line(dash));
  o.push(line(center("Total transaksi kasir: " + (report.totalTransactions || 0), Cs), "sm"));
  o.push(line(center("-- MAMLAH CLOSING --", Cs), "sm"));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Closing</title><style>
    @page { size: ${paperMm}mm auto; margin: 0; }
    ${baseCss(paperMm, base, w)}
    .sm { font-size: ${sm}px; } .lg { font-size: ${lg}px; }
  </style></head><body>${o.join("")}</body></html>`;
}

function escPosClosingBytes(report, settings = {}) {
  const cols = settings.paperSize === "80mm" ? 48 : 32;
  const enc = new TextEncoder();
  const chunks = [];
  const cmd = (...bytes) => chunks.push(Uint8Array.from(bytes));
  const add = (s) => chunks.push(enc.encode(`${String(s || "").slice(0, cols)}\n`));
  const centered = (s) => { cmd(0x1b, 0x61, 0x01); add(cut(s, cols)); };
  const leftAdd = (s) => { cmd(0x1b, 0x61, 0x00); add(s); };
  const rowRaw = (l, r) => { const right = String(r || ""); const left = cut(l, Math.max(1, cols - right.length - 1)); cmd(0x1b, 0x61, 0x00); add(left + " ".repeat(Math.max(1, cols - left.length - right.length)) + right); };
  const rule = () => { cmd(0x1b, 0x61, 0x00); add("-".repeat(cols)); };
  cmd(0x1b, 0x40, 0x1b, 0x61, 0x01, 0x1d, 0x21, 0x11);
  centered(storeNameOnly(settings));
  cmd(0x1d, 0x21, 0x00);
  centered("LAPORAN CLOSING HARIAN");
  centered(`${fmtDate(report.date)} ${nowParts().time}`);
  rule();
  leftAdd("PENJUALAN KASIR");
  const cb = report.channelBreakdown || {};
  rowRaw(`Dine In (${cb["DINE IN"]?.count || 0})`, formatRp(cb["DINE IN"]?.total || 0));
  rowRaw(`Take Away (${cb["TAKE AWAY"]?.count || 0})`, formatRp(cb["TAKE AWAY"]?.total || 0));
  rowRaw("Omzet Kasir", formatRp(report.totalOmzet || 0));
  rule();
  leftAdd("OMZET MERCHANT ONLINE");
  const mb = report.merchantBreakdown || {};
  const mRow = (label, key) => { const d = mb[key] || {}; rowRaw(`${label} kotor`, formatRp(d.gross || 0)); rowRaw(`${label} bersih`, formatRp(d.net || 0)); };
  mRow("GoFood", "GOFOOD"); mRow("GrabFood", "GRABFOOD"); mRow("ShopeeFood", "SHOPEEFOOD");
  rowRaw("Merchant Kotor", formatRp(report.merchantGross || 0));
  rowRaw("Merchant Bersih", formatRp(report.merchantNet || 0));
  rule();
  cmd(0x1d, 0x21, 0x01); rowRaw("OMZET TOTAL", formatRp(report.grandOmzet || 0)); cmd(0x1d, 0x21, 0x00);
  rule();
  rowRaw("Modal/HPP Kasir", "-" + formatRp(report.totalModal || 0));
  rowRaw("Komisi Online", "-" + formatRp(report.totalCommission || 0));
  rowRaw("Pengeluaran", "-" + formatRp(report.totalExpense || 0));
  rule();
  cmd(0x1d, 0x21, 0x11); rowRaw("LABA BERSIH", formatRp(report.netProfit || 0)); cmd(0x1d, 0x21, 0x00);
  rule();
  centered(`Transaksi kasir: ${report.totalTransactions || 0}`);
  centered("-- MAMLAH CLOSING --");
  cmd(0x1b, 0x64, 0x03, 0x1d, 0x56, 0x00);
  const merged = new Uint8Array(chunks.reduce((n, a) => n + a.length, 0)); let offset = 0; for (const a of chunks) { merged.set(a, offset); offset += a.length; }
  let binary = ""; for (const b of merged) binary += String.fromCharCode(b); return btoa(binary);
}

export function printClosingReport(report, settings = {}) {
  if ((settings.printMode || "escpos") === "escpos") return printRaw(escPosClosingBytes(report, settings), settings);
  return dispatch(buildClosingReportHtml(report, settings), receiptOpts(settings));
}
