// Penyimpanan lokal (localStorage) — pengganti backend. API meniru axios: get/post/delete -> Promise<{ data }>.
const KEY = "mamlah_db_v3";

export const DEFAULT_SETTINGS = {
  storeName: "MAMLAH - SOLUSI KELAPARAN",
  tagline: "Solusi Kelaparan",
  address: "Jl. Katsu Nusantara No. 88, Pusat Kuliner",
  phone: "0812-3456-7890",
  paperSize: "58mm",
  footerNote: "TERIMA KASIH TELAH BERKUNJUNG!",
  taxPercent: 0,
  servicePercent: 0,
  // Komisi / pajak merchant per channel online (persen). Bisa diubah di Pengaturan.
  gofoodCommission: 20,
  grabfoodCommission: 20,
  shopeefoodCommission: 25,
  logoUrl: null,
  barcodeUrl: null,
  printerName: "",
  printMode: "escpos",
  rawConnection: "usb",
  rawHost: "",
  rawPort: 9100,
  rawComPort: "COM3",
  labelPrinterName: "",
  labelPrintMode: "escpos",
  labelRawConnection: "bluetooth",
  labelRawHost: "",
  labelRawPort: 9100,
  labelRawComPort: "COM9",
  labelRawBaud: 9600,
  labelWidthMm: 35,
  labelHeightMm: 15,
  labelGapMm: 7,
  labelDpi: 203,
  labelOffsetMm: 23,
  silentPrint: false,
};

// Channel menu yang tersedia. "reguler" dipakai bersama Dine In + Take Away (tanpa pajak merchant).
export const MENU_CHANNELS = ["reguler", "gofood", "grabfood", "shopeefood"];
const DEFAULT_CHANNEL_COMMISSION = { gofood: 20, grabfood: 20, shopeefood: 25 };

const DEFAULT_CASHIERS = [
  { id: "admin", name: "Admin Mamlah", password: "admin", role: "manager", shiftStart: "", shiftEnd: "" },
  { id: "kasir1", name: "Kasir Pagi", password: "123", role: "waiter", shiftStart: "", shiftEnd: "" },
];

const DEFAULT_CATEGORIES = [
  { id: "cat_ricebox", name: "Ricebox", color: "#ea580c", icon: "Utensils" },
  { id: "cat_miebox", name: "Miebox", color: "#d97706", icon: "Flame" },
  { id: "cat_katsu_spesial", name: "Paket Katsu Spesial", color: "#f97316", icon: "Utensils" },
  { id: "cat_katsu_alacarte", name: "Katsu Ala Carte", color: "#ca8a04", icon: "Flame" },
  { id: "cat_snack", name: "Side Dish & Snack", color: "#ca8a04", icon: "Cookie" },
  { id: "cat_beverage", name: "Minuman Segar", color: "#0284c7", icon: "CupSoda" },
  { id: "cat_extra", name: "Ekstra Saus & Topping", color: "#dc2626", icon: "Sparkles" },
];

// Bahan baku default (untuk perhitungan HPP detail berbasis resep).
// unit: satuan beli/pakai, pricePerUnit: harga per 1 unit, stock: stok tersedia.
const DEFAULT_INGREDIENTS = [
  { id: "ing_ayam", name: "Fillet Ayam", unit: "gram", pricePerUnit: 55, stock: 20000, minStock: 3000 },
  { id: "ing_sapi", name: "Daging Sapi", unit: "gram", pricePerUnit: 120, stock: 8000, minStock: 2000 },
  { id: "ing_tepung_panko", name: "Tepung Panko", unit: "gram", pricePerUnit: 25, stock: 10000, minStock: 1500 },
  { id: "ing_beras", name: "Beras", unit: "gram", pricePerUnit: 13, stock: 50000, minStock: 5000 },
  { id: "ing_mie", name: "Mie Telur", unit: "gram", pricePerUnit: 18, stock: 12000, minStock: 2000 },
  { id: "ing_telur", name: "Telur", unit: "butir", pricePerUnit: 2500, stock: 200, minStock: 30 },
  { id: "ing_minyak", name: "Minyak Goreng", unit: "ml", pricePerUnit: 18, stock: 15000, minStock: 2000 },
  { id: "ing_keju", name: "Cheese Sauce", unit: "gram", pricePerUnit: 60, stock: 4000, minStock: 800 },
  { id: "ing_saus_kari", name: "Saus Kari Jepang", unit: "gram", pricePerUnit: 40, stock: 5000, minStock: 800 },
  { id: "ing_sambal_matah", name: "Sambal Matah", unit: "gram", pricePerUnit: 35, stock: 3000, minStock: 500 },
  { id: "ing_kentang", name: "Kentang Beku", unit: "gram", pricePerUnit: 22, stock: 8000, minStock: 1500 },
  { id: "ing_teh", name: "Teh / Ocha", unit: "porsi", pricePerUnit: 1200, stock: 300, minStock: 40 },
  { id: "ing_matcha", name: "Bubuk Matcha", unit: "gram", pricePerUnit: 350, stock: 1500, minStock: 300 },
  { id: "ing_susu", name: "Susu", unit: "ml", pricePerUnit: 15, stock: 10000, minStock: 1500 },
  { id: "ing_lemon", name: "Lemon", unit: "buah", pricePerUnit: 2000, stock: 100, minStock: 20 },
  { id: "ing_gula", name: "Gula", unit: "gram", pricePerUnit: 14, stock: 12000, minStock: 2000 },
  { id: "ing_box", name: "Box / Kemasan", unit: "pcs", pricePerUnit: 1500, stock: 500, minStock: 80 },
  { id: "ing_air", name: "Air Mineral Botol", unit: "botol", pricePerUnit: 1500, stock: 300, minStock: 50 },
];

// Resep default per menu: menautkan menu ke bahan baku beserta takarannya.
// HPP otomatis dihitung dari resep ini.
const DEFAULT_RECIPES = {
  m_ricebox_katsu: [
    { ingredientId: "ing_ayam", qty: 120 }, { ingredientId: "ing_tepung_panko", qty: 40 },
    { ingredientId: "ing_beras", qty: 180 }, { ingredientId: "ing_minyak", qty: 50 },
    { ingredientId: "ing_telur", qty: 0.3 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_miebox_reguler: [
    { ingredientId: "ing_mie", qty: 120 }, { ingredientId: "ing_minyak", qty: 30 },
    { ingredientId: "ing_telur", qty: 0.5 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_ck_curry: [
    { ingredientId: "ing_ayam", qty: 130 }, { ingredientId: "ing_tepung_panko", qty: 45 },
    { ingredientId: "ing_beras", qty: 200 }, { ingredientId: "ing_saus_kari", qty: 80 },
    { ingredientId: "ing_minyak", qty: 50 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_bf_curry: [
    { ingredientId: "ing_sapi", qty: 130 }, { ingredientId: "ing_tepung_panko", qty: 45 },
    { ingredientId: "ing_beras", qty: 200 }, { ingredientId: "ing_saus_kari", qty: 80 },
    { ingredientId: "ing_minyak", qty: 50 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_ck_don: [
    { ingredientId: "ing_ayam", qty: 120 }, { ingredientId: "ing_tepung_panko", qty: 40 },
    { ingredientId: "ing_beras", qty: 200 }, { ingredientId: "ing_telur", qty: 1 },
    { ingredientId: "ing_minyak", qty: 45 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_ck_matah: [
    { ingredientId: "ing_ayam", qty: 120 }, { ingredientId: "ing_tepung_panko", qty: 40 },
    { ingredientId: "ing_beras", qty: 200 }, { ingredientId: "ing_sambal_matah", qty: 40 },
    { ingredientId: "ing_minyak", qty: 45 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_ck_cheese: [
    { ingredientId: "ing_ayam", qty: 130 }, { ingredientId: "ing_tepung_panko", qty: 45 },
    { ingredientId: "ing_beras", qty: 200 }, { ingredientId: "ing_keju", qty: 60 },
    { ingredientId: "ing_minyak", qty: 50 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_ck_original: [
    { ingredientId: "ing_ayam", qty: 120 }, { ingredientId: "ing_tepung_panko", qty: 40 },
    { ingredientId: "ing_minyak", qty: 45 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_bf_original: [
    { ingredientId: "ing_sapi", qty: 120 }, { ingredientId: "ing_tepung_panko", qty: 40 },
    { ingredientId: "ing_minyak", qty: 45 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_tori_karaage: [
    { ingredientId: "ing_ayam", qty: 100 }, { ingredientId: "ing_tepung_panko", qty: 30 },
    { ingredientId: "ing_minyak", qty: 40 }, { ingredientId: "ing_box", qty: 1 },
  ],
  m_nugget_bites: [{ ingredientId: "ing_ayam", qty: 80 }, { ingredientId: "ing_tepung_panko", qty: 25 }, { ingredientId: "ing_minyak", qty: 30 }, { ingredientId: "ing_box", qty: 1 }],
  m_french_fries: [{ ingredientId: "ing_kentang", qty: 150 }, { ingredientId: "ing_minyak", qty: 40 }, { ingredientId: "ing_box", qty: 1 }],
  m_nasi_putih: [{ ingredientId: "ing_beras", qty: 150 }],
  m_salad_wafu: [{ ingredientId: "ing_box", qty: 1 }],
  m_ocha: [{ ingredientId: "ing_teh", qty: 1 }],
  m_es_teh: [{ ingredientId: "ing_teh", qty: 1 }, { ingredientId: "ing_gula", qty: 15 }],
  m_matcha_latte: [{ ingredientId: "ing_matcha", qty: 8 }, { ingredientId: "ing_susu", qty: 150 }, { ingredientId: "ing_gula", qty: 12 }],
  m_lemon_tea: [{ ingredientId: "ing_teh", qty: 1 }, { ingredientId: "ing_lemon", qty: 0.3 }, { ingredientId: "ing_gula", qty: 15 }],
  m_air_mineral: [{ ingredientId: "ing_air", qty: 1 }],
  m_extra_curry: [{ ingredientId: "ing_saus_kari", qty: 60 }],
  m_extra_mozzarella: [{ ingredientId: "ing_keju", qty: 50 }],
  m_extra_matah: [{ ingredientId: "ing_sambal_matah", qty: 35 }],
};

const DEFAULT_MENUS = [
  { id: "m_ricebox_katsu", name: "Ricebox Ayam Katsu", price: 22000, cost: 11000, stock: 50, category: "Ricebox", discount: 0, description: "Ricebox ayam katsu dengan pilihan sambal", optionGroups: [
    { id: "og_sambal", name: "Varian Sambal", required: true, options: [
      { id: "sambal_mamlah", name: "Sambal Mamlah", price: 0 },
      { id: "sambal_matah", name: "Sambal Matah", price: 0 },
      { id: "sambal_geprek", name: "Sambal Geprek", price: 0 },
    ] },
    { id: "og_topping", name: "Tambahan", required: false, options: [
      { id: "cheese_sauce", name: "Cheese Sauce", price: 8000 },
    ] },
  ] },
  { id: "m_miebox_reguler", name: "Miebox Reguler", price: 18000, cost: 8500, stock: 50, category: "Miebox", discount: 0, description: "Miebox dengan pilihan level pedas dan topping", optionGroups: [
    { id: "og_level_mie", name: "Level Pedas", required: true, options: [
      { id: "level_1", name: "Tidak Pedas", price: 0 },
      { id: "level_2", name: "Sedang", price: 0 },
      { id: "level_3", name: "Pedas", price: 0 },
    ] },
    { id: "og_topping_mie", name: "Topping Tambahan", required: false, options: [
      { id: "telur_mie", name: "Telur", price: 4000 },
      { id: "cheese_mie", name: "Cheese Sauce", price: 8000 },
    ] },
  ] },
  { id: "m_ck_curry", name: "Chicken Katsu Curry Rice", price: 28000, cost: 14000, stock: 40, category: "Paket Katsu Spesial", discount: 0, description: "Nasi pulen hangat dengan chicken katsu renyah dan kuah kari jepang" },
  { id: "m_bf_curry", name: "Beef Katsu Curry Rice", price: 35000, cost: 20000, stock: 30, category: "Paket Katsu Spesial", discount: 0, description: "Daging sapi pilihan berbalut tepung panko krispi dengan kari khas jepang" },
  { id: "m_ck_don", name: "Chicken Katsu Donburi", price: 26000, cost: 13000, stock: 35, category: "Paket Katsu Spesial", discount: 0, description: "Rice bowl chicken katsu dengan siraman telur lembut" },
  { id: "m_ck_matah", name: "Katsu Sambal Matah Rice", price: 27000, cost: 13500, stock: 35, category: "Paket Katsu Spesial", discount: 5, description: "Chicken katsu dengan taburan sambal matah segar" },
  { id: "m_ck_cheese", name: "Spicy Cheese Katsu Bento", price: 32000, cost: 17000, stock: 25, category: "Paket Katsu Spesial", discount: 0, description: "Paket bento komplit dengan melted cheese melimpah" },
  { id: "m_ck_original", name: "Chicken Katsu Original", price: 20000, cost: 10000, stock: 50, category: "Katsu Ala Carte", discount: 0, description: "Dada ayam fillet krispi dengan saus tonkatsu" },
  { id: "m_bf_original", name: "Beef Katsu Original", price: 28000, cost: 16000, stock: 30, category: "Katsu Ala Carte", discount: 0, description: "Daging sapi premium krispi gurih juicy" },
  { id: "m_tori_karaage", name: "Tori Karaage Crispy", price: 18000, cost: 9000, stock: 40, category: "Katsu Ala Carte", discount: 0, description: "Ayam goreng potongan khas jepang berbumbu gurih" },
  { id: "m_nugget_bites", name: "Katsu Nugget Bites", price: 14000, cost: 7000, stock: 45, category: "Side Dish & Snack", discount: 0, description: "Nugget ayam katsu potongan kecil renyah" },
  { id: "m_french_fries", name: "Crispy French Fries", price: 12000, cost: 5000, stock: 50, category: "Side Dish & Snack", discount: 0, description: "Kentang goreng gurih renyah" },
  { id: "m_nasi_putih", name: "Nasi Putih Pulen", price: 5000, cost: 2000, stock: 100, category: "Side Dish & Snack", discount: 0, description: "Nasi jepang pulen wangi" },
  { id: "m_salad_wafu", name: "Salad Katsu Wafu", price: 8000, cost: 3500, stock: 30, category: "Side Dish & Snack", discount: 0, description: "Irisan kol dan wortel segar dengan dressing wafu" },
  { id: "m_ocha", name: "Ocha Dingin", price: 6000, cost: 2000, stock: 100, category: "Minuman Segar", discount: 0, description: "Teh hijau khas jepang dingin segar" },
  { id: "m_es_teh", name: "Es Teh Manis", price: 5000, cost: 1500, stock: 100, category: "Minuman Segar", discount: 0, description: "Teh wangi manis segar" },
  { id: "m_matcha_latte", name: "Matcha Latte Creamy", price: 15000, cost: 6000, stock: 40, category: "Minuman Segar", discount: 0, description: "Minuman matcha susu creamy premium" },
  { id: "m_lemon_tea", name: "Lemon Tea Segar", price: 9000, cost: 3000, stock: 50, category: "Minuman Segar", discount: 0, description: "Teh segar dengan ekstrak lemon asli" },
  { id: "m_air_mineral", name: "Air Mineral Dingin", price: 4000, cost: 1500, stock: 80, category: "Minuman Segar", discount: 0, description: "Air mineral botol 600ml" },
  { id: "m_extra_curry", name: "Ekstra Kuah Kari", price: 7000, cost: 2500, stock: 50, category: "Ekstra Saus & Topping", discount: 0, description: "Saus kari kental gurih porsi ekstra" },
  { id: "m_extra_mozzarella", name: "Ekstra Keju Mozzarella", price: 6000, cost: 2500, stock: 40, category: "Ekstra Saus & Topping", discount: 0, description: "Keju mozzarella leleh melimpah" },
  { id: "m_extra_matah", name: "Ekstra Sambal Matah", price: 4000, cost: 1500, stock: 50, category: "Ekstra Saus & Topping", discount: 0, description: "Sambal matah segar pedas gurih" },
].map((m) => ({ ...m, recipe: DEFAULT_RECIPES[m.id] || [] }));

// HPP (modal) menu: jika punya resep, hitung dari bahan baku; jika tidak, pakai field cost manual.
export function menuCostFromRecipe(menu, ingredients) {
  if (!menu || !Array.isArray(menu.recipe) || menu.recipe.length === 0) return Number(menu?.cost) || 0;
  const map = {};
  for (const ing of ingredients || []) map[ing.id] = ing;
  return Math.round(
    menu.recipe.reduce((sum, r) => {
      const ing = map[r.ingredientId];
      return sum + (ing ? (Number(ing.pricePerUnit) || 0) * (Number(r.qty) || 0) : 0);
    }, 0)
  );
}

// Menu channel online diseed sebagai salinan mandiri dari menu reguler.
function seedChannel(channel) {
  const comm = DEFAULT_CHANNEL_COMMISSION[channel] || 0;
  const factor = comm > 0 && comm < 100 ? 1 / (1 - comm / 100) : 1;
  return DEFAULT_MENUS.map((m) => ({
    ...m,
    id: `${channel}_${m.id}`,
    price: comm > 0 ? Math.round((m.price * factor) / 500) * 500 : m.price,
    recipe: Array.isArray(m.recipe) ? m.recipe.map((r) => ({ ...r })) : [],
  }));
}

function freshChannelMenus() {
  return {
    gofood: seedChannel("gofood"),
    grabfood: seedChannel("grabfood"),
    shopeefood: seedChannel("shopeefood"),
  };
}

const DEFAULT_TABLES = [
  { id: "t1", name: "Meja 1", x: 18, y: 25, w: 96, h: 70, color: "#ea580c", shape: "rounded" },
  { id: "t2", name: "Meja 2", x: 50, y: 25, w: 96, h: 70, color: "#ea580c", shape: "rounded" },
  { id: "t3", name: "Meja 3", x: 82, y: 25, w: 96, h: 70, color: "#ea580c", shape: "rounded" },
  { id: "t4", name: "Meja 4 (VIP)", x: 30, y: 70, w: 110, h: 75, color: "#0284c7", shape: "rounded" },
  { id: "t5", name: "Meja 5 (VIP)", x: 70, y: 70, w: 110, h: 75, color: "#0284c7", shape: "rounded" },
];

function freshDb() {
  return {
    cashiers: DEFAULT_CASHIERS,
    categories: DEFAULT_CATEGORIES,
    menus: DEFAULT_MENUS,
    channelMenus: freshChannelMenus(),
    ingredients: DEFAULT_INGREDIENTS,
    tables: DEFAULT_TABLES,
    activeOrders: [],
    transactions: [],
    merchantSales: [],
    expenses: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function normalizeMenu(m) {
  return {
    ...m,
    recipe: Array.isArray(m.recipe) ? m.recipe.map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty) || 0 })) : [],
    optionGroups: Array.isArray(m.optionGroups) ? m.optionGroups.map((g, gi) => ({
      id: g.id || `og_${gi}_${Date.now()}`,
      name: g.name || `Pilihan ${gi + 1}`,
      required: Boolean(g.required),
      options: Array.isArray(g.options) ? g.options.map((o, oi) => ({
        id: o.id || `opt_${oi}_${Date.now()}`,
        name: o.name || `Pilihan ${oi + 1}`,
        price: Number(o.price) || 0,
      })) : [],
    })) : [],
  };
}

function normalizeDbMenus(db) {
  db.menus = (db.menus || []).map(normalizeMenu);
  for (const ch of Object.keys(db.channelMenus || {})) {
    db.channelMenus[ch] = (db.channelMenus[ch] || []).map(normalizeMenu);
  }
  return db;
}

function normalizeCashier(cashier) {
  return {
    ...cashier,
    id: String(cashier?.id || "").trim().toLowerCase(),
    name: String(cashier?.name || "").trim(),
    password: String(cashier?.password || ""),
    role: cashier?.role === "manager" ? "manager" : "waiter",
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = freshDb();
      save(initial);
      return initial;
    }
    const db = { ...freshDb(), ...JSON.parse(raw) };
    db.cashiers = (db.cashiers || []).map(normalizeCashier);
    db.channelMenus = { ...freshChannelMenus(), ...(db.channelMenus || {}) };
    if (!Array.isArray(db.ingredients) || db.ingredients.length === 0) db.ingredients = DEFAULT_INGREDIENTS;
    if (!Array.isArray(db.merchantSales)) db.merchantSales = [];
    if (!Array.isArray(db.expenses)) db.expenses = [];
    const normalized = normalizeDbMenus(db);
    const existingCategories = new Set((normalized.categories || []).map((c) => String(c.name).toLowerCase()));
    for (const category of DEFAULT_CATEGORIES) {
      if (!existingCategories.has(category.name.toLowerCase())) normalized.categories.push(category);
    }
    save(normalized);
    return normalized;
  } catch {
    try {
      const broken = localStorage.getItem(KEY);
      if (broken) localStorage.setItem(`${KEY}_backup_${Date.now()}`, broken);
      const initial = freshDb();
      save(initial);
      return initial;
    } catch {
      return freshDb();
    }
  }
}

function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function parse(url) {
  const clean = String(url).replace(/^.*?\/api/, "");
  const [path, qs = ""] = clean.split("?");
  const query = Object.fromEntries(new URLSearchParams(qs));
  return { path: path.replace(/\/$/, ""), query };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// HPP sebuah item transaksi: utamakan cost yang tersimpan di tx, fallback ke resep menu.
function txItemCost(it) {
  return Number(it.cost) || 0;
}

function dailyReport(db, date) {
  const txs = db.transactions
    .filter((t) => t.date === date)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const channels = {
    "DINE IN": { count: 0, total: 0 },
    "TAKE AWAY": { count: 0, total: 0 },
    GOFOOD: { count: 0, total: 0 },
    GRABFOOD: { count: 0, total: 0 },
    SHOPEEFOOD: { count: 0, total: 0 },
  };
  const payments = {};
  const menuMap = {};
  const COMM = {
    GOFOOD: Number(db.settings?.gofoodCommission) || 0,
    GRABFOOD: Number(db.settings?.grabfoodCommission) || 0,
    SHOPEEFOOD: Number(db.settings?.shopeefoodCommission) || 0,
  };
  let totalModal = 0;
  let totalCommission = 0;
  const enriched = [];
  for (const t of txs) {
    const ch = (t.orderType || "DINE IN").toUpperCase();
    if (!channels[ch]) channels[ch] = { count: 0, total: 0 };
    channels[ch].count += 1;
    channels[ch].total += t.total || 0;
    const pm = t.paymentMethod || "TUNAI";
    payments[pm] = (payments[pm] || 0) + (t.total || 0);
    for (const it of t.items || []) {
      if (!menuMap[it.name]) menuMap[it.name] = { qty: 0, total: 0 };
      menuMap[it.name].qty += it.qty || 0;
      menuMap[it.name].total += it.subtotal || 0;
    }
    const pct = COMM[ch] || 0;
    const modalTotal = (t.items || []).reduce((s, i) => s + txItemCost(i) * (i.qty || 0), 0);
    const commissionAmount = Math.round(((t.total || 0) * pct) / 100);
    const netProfit = (t.total || 0) - commissionAmount - modalTotal;
    totalModal += modalTotal;
    totalCommission += commissionAmount;
    enriched.push({ ...t, modalTotal, commissionPct: pct, commissionAmount, netProfit });
  }
  const menuSales = Object.entries(menuMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty);
  const shiftMap = {};
  for (const t of txs) {
    const name = t.cashierName || "-";
    if (!shiftMap[name]) {
      const c = db.cashiers.find((x) => x.name === name);
      const shift = c && c.shiftStart && c.shiftEnd ? `${c.shiftStart}-${c.shiftEnd}` : "";
      shiftMap[name] = { cashierName: name, shift, count: 0, TUNAI: 0, QRIS: 0, DEBIT: 0, ONLINE: 0, total: 0 };
    }
    const r = shiftMap[name];
    const pm = ["TUNAI", "QRIS", "DEBIT"].includes(t.paymentMethod) ? t.paymentMethod : "ONLINE";
    r.count += 1;
    r[pm] += t.total || 0;
    r.total += t.total || 0;
  }
  const shiftRows = Object.values(shiftMap).sort((a, b) => b.total - a.total);
  return {
    date,
    totalOmzet: txs.reduce((s, t) => s + (t.total || 0), 0),
    totalModal,
    totalCommission,
    totalProfit: enriched.reduce((s, t) => s + t.netProfit, 0),
    totalTransactions: txs.length,
    channelBreakdown: channels,
    paymentBreakdown: payments,
    menuSales,
    shiftRows,
    transactions: enriched,
  };
}

// Laporan closing lengkap: penjualan kasir + omzet merchant (manual) + pengeluaran + laba bersih.
function closingReport(db, date) {
  const base = dailyReport(db, date);
  const merchantSales = (db.merchantSales || []).filter((m) => m.date === date);
  const merchantMap = {
    GOFOOD: { gross: 0, net: 0, commission: 0, count: 0 },
    GRABFOOD: { gross: 0, net: 0, commission: 0, count: 0 },
    SHOPEEFOOD: { gross: 0, net: 0, commission: 0, count: 0 },
  };
  for (const m of merchantSales) {
    const key = (m.merchant || "GOFOOD").toUpperCase();
    if (!merchantMap[key]) merchantMap[key] = { gross: 0, net: 0, commission: 0, count: 0 };
    merchantMap[key].gross += Number(m.gross) || 0;
    merchantMap[key].net += Number(m.net) || 0;
    merchantMap[key].commission += (Number(m.gross) || 0) - (Number(m.net) || 0);
    merchantMap[key].count += 1;
  }
  const merchantGross = merchantSales.reduce((s, m) => s + (Number(m.gross) || 0), 0);
  const merchantNet = merchantSales.reduce((s, m) => s + (Number(m.net) || 0), 0);
  const merchantCommission = merchantGross - merchantNet;

  const expenses = (db.expenses || []).filter((e) => e.date === date);
  const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const expenseByCat = {};
  for (const e of expenses) {
    const c = e.category || "Lainnya";
    expenseByCat[c] = (expenseByCat[c] || 0) + (Number(e.amount) || 0);
  }

  // Omzet total = kasir + merchant kotor. Laba kotor kasir = omzet kasir - modal HPP.
  const grossProfitPos = base.totalOmzet - base.totalModal - base.totalCommission;
  // Laba bersih = laba kasir (sdh dikurangi komisi online yg diinput) + omzet bersih merchant - pengeluaran.
  const netProfit = grossProfitPos + merchantNet - totalExpense;

  return {
    ...base,
    merchantSales,
    merchantBreakdown: merchantMap,
    merchantGross,
    merchantNet,
    merchantCommission,
    expenses,
    expenseByCat,
    totalExpense,
    grandOmzet: base.totalOmzet + merchantGross,
    grossProfitPos,
    netProfit,
  };
}

// Ringkasan keuangan rentang tanggal (untuk halaman Keuangan).
function financeReport(db, from, to) {
  const inRange = (d) => (!from || d >= from) && (!to || d <= to);
  const txs = (db.transactions || []).filter((t) => inRange(t.date));
  const COMM = {
    GOFOOD: Number(db.settings?.gofoodCommission) || 0,
    GRABFOOD: Number(db.settings?.grabfoodCommission) || 0,
    SHOPEEFOOD: Number(db.settings?.shopeefoodCommission) || 0,
  };
  let posOmzet = 0, posModal = 0, posCommission = 0;
  for (const t of txs) {
    posOmzet += t.total || 0;
    posModal += (t.items || []).reduce((s, i) => s + txItemCost(i) * (i.qty || 0), 0);
    posCommission += Math.round(((t.total || 0) * (COMM[(t.orderType || "").toUpperCase()] || 0)) / 100);
  }
  const merchants = (db.merchantSales || []).filter((m) => inRange(m.date));
  const merchantGross = merchants.reduce((s, m) => s + (Number(m.gross) || 0), 0);
  const merchantNet = merchants.reduce((s, m) => s + (Number(m.net) || 0), 0);
  const expenses = (db.expenses || []).filter((e) => inRange(e.date));
  const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const expenseByCat = {};
  for (const e of expenses) {
    const c = e.category || "Lainnya";
    expenseByCat[c] = (expenseByCat[c] || 0) + (Number(e.amount) || 0);
  }
  const grossProfitPos = posOmzet - posModal - posCommission;
  const netProfit = grossProfitPos + merchantNet - totalExpense;
  return {
    from, to,
    posOmzet, posModal, posCommission,
    merchantGross, merchantNet,
    totalExpense, expenseByCat,
    grandOmzet: posOmzet + merchantGross,
    grossProfitPos, netProfit,
    expenses: expenses.slice().sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)),
    transactionCount: txs.length,
  };
}

const ok = (data) => Promise.resolve({ data });
const fail = (status, detail) => Promise.reject({ response: { status, data: { detail } } });

const localApi = {
  get(url) {
    const { path, query } = parse(url);
    const db = load();
    if (path === "/cashiers") return ok(db.cashiers);
    if (path === "/menu") {
      const ch = query.channel || "reguler";
      if (ch === "reguler") return ok(db.menus);
      return ok((db.channelMenus && db.channelMenus[ch]) || []);
    }
    if (path === "/categories") return ok(db.categories);
    if (path === "/ingredients") return ok(db.ingredients || []);
    if (path === "/tables") return ok(db.tables);
    if (path === "/orders/active") return ok(db.activeOrders);
    if (path === "/transactions") return ok(query.date ? db.transactions.filter((t) => t.date === query.date) : db.transactions);
    if (path === "/merchant-sales") return ok(query.date ? (db.merchantSales || []).filter((m) => m.date === query.date) : (db.merchantSales || []));
    if (path === "/expenses") return ok(query.date ? (db.expenses || []).filter((e) => e.date === query.date) : (db.expenses || []));
    if (path === "/reports/daily") return ok(dailyReport(db, query.date || todayStr()));
    if (path === "/reports/closing") return ok(closingReport(db, query.date || todayStr()));
    if (path === "/reports/finance") return ok(financeReport(db, query.from || query.date || todayStr(), query.to || query.date || todayStr()));
    if (path === "/settings") {
      const settings = { ...DEFAULT_SETTINGS, ...db.settings };
      return ok(settings);
    }
    return fail(404, "Not found");
  },

  post(url, body) {
    const { path, query } = parse(url);
    const db = load();
    if (path === "/auth/login") {
      const loginId = String(body.id || "").trim().toLowerCase();
      const loginPassword = String(body.password || "");
      const c = db.cashiers.find((x) => String(x.id || "").trim().toLowerCase() === loginId);
      if (!c || String(c.password) !== loginPassword) return fail(401, "ID Kasir atau password salah");
      const { password, ...cashier } = c;
      return ok({ success: true, cashier });
    }
    if (path === "/cashiers") {
      const seen = new Set();
      db.cashiers = (Array.isArray(body) ? body : []).map(normalizeCashier).filter((c) => {
        if (!c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    }
    else if (path === "/menu") {
      const ch = query.channel || "reguler";
      if (ch === "reguler") db.menus = (body || []).map(normalizeMenu);
      else db.channelMenus = { ...(db.channelMenus || {}), [ch]: (body || []).map(normalizeMenu) };
    } else if (path === "/categories") db.categories = body;
    else if (path === "/ingredients") db.ingredients = (body || []).map((i) => ({ ...i, pricePerUnit: Number(i.pricePerUnit) || 0, stock: Number(i.stock) || 0, minStock: Number(i.minStock) || 0 }));
    else if (path === "/tables") db.tables = body;
    else if (path === "/settings") db.settings = { ...DEFAULT_SETTINGS, ...body };
    else if (path === "/merchant-sales") {
      const entry = { id: body.id || "ms-" + Date.now(), createdAt: new Date().toISOString(), ...body };
      db.merchantSales = [entry, ...(db.merchantSales || []).filter((m) => m.id !== entry.id)];
    } else if (path === "/expenses") {
      const entry = { id: body.id || "exp-" + Date.now(), createdAt: new Date().toISOString(), ...body };
      db.expenses = [entry, ...(db.expenses || []).filter((e) => e.id !== entry.id)];
      // Jika pengeluaran menambah stok bahan baku, tambahkan stoknya.
      if (entry.ingredientId && Number(entry.qtyAdded) > 0) {
        db.ingredients = (db.ingredients || []).map((ing) =>
          ing.id === entry.ingredientId ? { ...ing, stock: (Number(ing.stock) || 0) + Number(entry.qtyAdded) } : ing
        );
      }
    } else if (path === "/menu/seed-katsu") {
      const ch = query.channel || "reguler";
      if (ch === "reguler") {
        db.menus = DEFAULT_MENUS;
        db.categories = DEFAULT_CATEGORIES;
        db.ingredients = DEFAULT_INGREDIENTS;
      } else {
        db.channelMenus = { ...(db.channelMenus || {}), [ch]: seedChannel(ch) };
      }
    } else if (path === "/orders/active") {
      const order = { createdAt: new Date().toISOString(), ...body };
      db.activeOrders = [...db.activeOrders.filter((o) => o.id !== order.id), order];
    } else if (path === "/transactions") {
      const tx = { createdAt: new Date().toISOString(), ...body };
      db.transactions = [tx, ...db.transactions];
      // Kurangi stok porsi menu + stok bahan baku sesuai resep.
      const ingMap = {};
      for (const ing of db.ingredients || []) ingMap[ing.id] = { ...ing };
      const findMenu = (id) => db.menus.find((m) => m.id === id) || Object.values(db.channelMenus || {}).flat().find((m) => m.id === id);
      for (const it of tx.items || []) {
        db.menus = db.menus.map((m) => (m.id === it.menuId ? { ...m, stock: Math.max(0, (m.stock || 0) - it.qty) } : m));
        if (db.channelMenus) {
          for (const ch of Object.keys(db.channelMenus)) {
            db.channelMenus[ch] = (db.channelMenus[ch] || []).map((m) => (m.id === it.menuId ? { ...m, stock: Math.max(0, (m.stock || 0) - it.qty) } : m));
          }
        }
        const menu = findMenu(it.menuId);
        if (menu && Array.isArray(menu.recipe)) {
          for (const r of menu.recipe) {
            if (ingMap[r.ingredientId]) {
              ingMap[r.ingredientId].stock = Math.max(0, (Number(ingMap[r.ingredientId].stock) || 0) - (Number(r.qty) || 0) * (it.qty || 0));
            }
          }
        }
      }
      db.ingredients = (db.ingredients || []).map((ing) => ingMap[ing.id] || ing);
    } else return fail(404, "Not found");
    save(db);
    return ok({ success: true });
  },

  delete(url) {
    const { path } = parse(url);
    const db = load();
    let m;
    if ((m = path.match(/^\/orders\/active\/(.+)$/))) {
      db.activeOrders = db.activeOrders.filter((o) => o.id !== decodeURIComponent(m[1]));
    } else if ((m = path.match(/^\/transactions\/(.+)$/))) {
      db.transactions = db.transactions.filter((t) => t.id !== decodeURIComponent(m[1]));
    } else if ((m = path.match(/^\/merchant-sales\/(.+)$/))) {
      db.merchantSales = (db.merchantSales || []).filter((x) => x.id !== decodeURIComponent(m[1]));
    } else if ((m = path.match(/^\/expenses\/(.+)$/))) {
      db.expenses = (db.expenses || []).filter((x) => x.id !== decodeURIComponent(m[1]));
    } else return fail(404, "Not found");
    save(db);
    return ok({ success: true });
  },
};

export default localApi;
