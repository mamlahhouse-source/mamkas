import React, { useState, useMemo, useRef } from "react";
import axios from "../lib/localApi";
import { menuCostFromRecipe } from "../lib/localApi";
import { Plus, Search, Settings, Trash2, RefreshCw, Copy, TrendingUp, Upload, AlertTriangle, X, Image as ImageIcon, Tags, FlaskConical } from "lucide-react";
import { formatRp } from "../utils/thermalPrinter";

// Channel menu. Dine In & Take Away memakai menu "reguler" yang sama (tanpa pajak merchant).
const CHANNEL_TABS = [
  { id: "reguler", label: "Dine In & Take Away", short: "Reguler", hint: "Tanpa pajak merchant" },
  { id: "gofood", label: "GoFood", short: "GoFood", hint: "Ada komisi merchant" },
  { id: "grabfood", label: "GrabFood", short: "GrabFood", hint: "Ada komisi merchant" },
  { id: "shopeefood", label: "ShopeeFood", short: "ShopeeFood", hint: "Ada komisi merchant" },
];

const emptyForm = (categories) => ({
  name: "",
  price: "",
  cost: "",
  stock: "50",
  category: categories[0]?.name || "Ricebox",
  discount: "0",
  description: "",
  image: "",
  optionGroups: [],
  recipe: [],
});

export default function MenuManagerView({
  menus,
  setMenus,
  channelMenus,
  setChannelMenus,
  categories,
  setCategories,
  onRefresh,
  showToast,
  API,
  itemPrice,
  settings,
  ingredients = [],
}) {
  const [channel, setChannel] = useState("reguler");
  const [editingMenu, setEditingMenu] = useState(null);
  const [menuForm, setMenuForm] = useState(emptyForm(categories));
  const [searchQuery, setSearchQuery] = useState("");
  const [copySource, setCopySource] = useState("reguler");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showCategory, setShowCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const formRef = useRef(null);

  // Daftar menu untuk channel yang sedang aktif.
  const activeMenus = channel === "reguler" ? menus : channelMenus[channel] || [];

  // Persen komisi merchant untuk channel aktif (0 untuk reguler).
  const commissionPct = useMemo(() => {
    if (channel === "gofood") return Number(settings?.gofoodCommission) || 0;
    if (channel === "grabfood") return Number(settings?.grabfoodCommission) || 0;
    if (channel === "shopeefood") return Number(settings?.shopeefoodCommission) || 0;
    return 0;
  }, [channel, settings]);

  // Keuntungan bersih = harga jual (setelah diskon) - komisi merchant - modal (HPP).
  const netProfit = (m) => {
    const gross = itemPrice(m);
    const commission = Math.round((gross * commissionPct) / 100);
    const cost = Number(m.cost) || 0;
    return gross - commission - cost;
  };

  // Persist perubahan menu ke channel yang aktif saja (tidak mempengaruhi channel lain).
  const persist = async (updated) => {
    if (channel === "reguler") setMenus(updated);
    else setChannelMenus((prev) => ({ ...prev, [channel]: updated }));
    try {
      const url = channel === "reguler" ? `${API}/menu` : `${API}/menu?channel=${channel}`;
      await axios.post(url, updated);
      showToast("Menu berhasil disimpan!");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan menu. Periksa storage browser dan coba lagi.");
    }
  };

  // Resize gambar upload -> dataURL kecil (maks 320px) agar hemat penyimpanan lokal.
  const handleImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const max = 320;
        let w = img.width, h = img.height;
        if (w > h && w > max) { h = Math.round((h * max) / w); w = max; }
        else if (h > max) { w = Math.round((w * max) / h); h = max; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        setMenuForm((f) => ({ ...f, image: canvas.toDataURL("image/jpeg", 0.72) }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Tambah / hapus kategori (berlaku global untuk semua channel).
  const persistCategories = async (updated) => {
    setCategories(updated);
    try { await axios.post(`${API}/categories`, updated); } catch (e) { console.error(e); }
  };
  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { showToast("Kategori sudah ada"); return; }
    const palette = ["#ea580c", "#0284c7", "#16a34a", "#9333ea", "#dc2626", "#d97706", "#0891b2"];
    const cat = { id: "cat_" + Date.now(), name, color: palette[categories.length % palette.length], icon: "Utensils" };
    await persistCategories([...categories, cat]);
    setNewCatName("");
    showToast(`Kategori "${name}" ditambahkan`);
  };
  const deleteCategory = async (id) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    if (!window.confirm(`Hapus kategori "${cat.name}"? Menu yang memakai kategori ini tidak ikut terhapus, hanya label kategorinya yang hilang.`)) return;
    await persistCategories(categories.filter((c) => c.id !== id));
    showToast(`Kategori "${cat.name}" dihapus`);
  };

  const startNew = () => {
    setEditingMenu("new");
    setMenuForm(emptyForm(categories));
    setCopySource(channel === "reguler" ? "gofood" : "reguler");
    scrollToEditor();
  };

  const startEdit = (m) => {
    setEditingMenu(m.id);
    setMenuForm({
      name: m.name,
      price: String(m.price),
      cost: String(m.cost || 0),
      stock: String(m.stock),
      category: m.category,
      discount: String(m.discount || 0),
      description: m.description || "",
      image: m.image || "",
      optionGroups: Array.isArray(m.optionGroups) ? JSON.parse(JSON.stringify(m.optionGroups)) : [],
      recipe: Array.isArray(m.recipe) ? m.recipe.map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty) || 0 })) : [],
    });
    scrollToEditor();
  };

  // Salin data 1 menu dari channel lain ke dalam form (independen setelah disimpan).
  const copyMenuIntoForm = (m) => {
    setMenuForm({
      name: m.name,
      price: String(m.price),
      cost: String(m.cost || 0),
      stock: String(m.stock ?? 50),
      category: m.category,
      discount: String(m.discount || 0),
      description: m.description || "",
      image: m.image || "",
      optionGroups: Array.isArray(m.optionGroups) ? JSON.parse(JSON.stringify(m.optionGroups)) : [],
      recipe: Array.isArray(m.recipe) ? m.recipe.map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty) || 0 })) : [],
    });
    showToast(`Data "${m.name}" disalin ke form — silakan sesuaikan harga`);
  };

  const scrollToEditor = () => setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  // ===== Editor Resep (bahan baku) untuk HPP otomatis =====
  const recipeCost = useMemo(() => menuCostFromRecipe({ recipe: menuForm.recipe, cost: Number(menuForm.cost || 0) }, ingredients), [menuForm.recipe, menuForm.cost, ingredients]);
  const hasRecipe = (menuForm.recipe || []).length > 0;
  const effectiveCost = hasRecipe ? recipeCost : Number(menuForm.cost || 0);
  const ingName = (id) => ingredients.find((i) => i.id === id)?.name || "Bahan";
  const ingUnit = (id) => ingredients.find((i) => i.id === id)?.unit || "";
  const ingPrice = (id) => Number(ingredients.find((i) => i.id === id)?.pricePerUnit) || 0;
  const addRecipeRow = () => setMenuForm((f) => ({ ...f, recipe: [...(f.recipe || []), { ingredientId: ingredients[0]?.id || "", qty: 0 }] }));
  const updateRecipeRow = (idx, patch) => setMenuForm((f) => ({ ...f, recipe: (f.recipe || []).map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
  const removeRecipeRow = (idx) => setMenuForm((f) => ({ ...f, recipe: (f.recipe || []).filter((_, i) => i !== idx) }));
  const addOptionGroup = () => setMenuForm((f) => ({ ...f, optionGroups: [...(f.optionGroups || []), { id: `og_${Date.now()}`, name: "Pilihan Baru", required: false, options: [{ id: `opt_${Date.now()}`, name: "Pilihan 1", price: 0 }] }] }));
  const updateOptionGroup = (gi, patch) => setMenuForm((f) => ({ ...f, optionGroups: (f.optionGroups || []).map((g, i) => i === gi ? { ...g, ...patch } : g) }));
  const removeOptionGroup = (gi) => setMenuForm((f) => ({ ...f, optionGroups: (f.optionGroups || []).filter((_, i) => i !== gi) }));
  const addOption = (gi) => setMenuForm((f) => ({ ...f, optionGroups: (f.optionGroups || []).map((g, i) => i === gi ? { ...g, options: [...(g.options || []), { id: `opt_${Date.now()}`, name: "Pilihan Baru", price: 0 }] } : g) }));
  const updateOption = (gi, oi, patch) => setMenuForm((f) => ({ ...f, optionGroups: (f.optionGroups || []).map((g, i) => i === gi ? { ...g, options: (g.options || []).map((o, j) => j === oi ? { ...o, ...patch } : o) } : g) }));
  const removeOption = (gi, oi) => setMenuForm((f) => ({ ...f, optionGroups: (f.optionGroups || []).map((g, i) => i === gi ? { ...g, options: (g.options || []).filter((_, j) => j !== oi) } : g) }));

  const saveMenu = async () => {
    if (!menuForm.name.trim() || menuForm.price === "") return;
    const price = Number(menuForm.price);
    const recipe = (menuForm.recipe || []).filter((r) => r.ingredientId && Number(r.qty) > 0).map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty) || 0 }));
    // HPP otomatis dari resep bila ada; jika tidak, pakai input manual.
    const cost = recipe.length > 0 ? menuCostFromRecipe({ recipe }, ingredients) : Number(menuForm.cost || 0);
    const stock = Number(menuForm.stock);
    const discount = Number(menuForm.discount || 0);

    let updated = [];
    if (editingMenu === "new") {
      const newM = {
        id: (channel === "reguler" ? "m" : channel + "_m") + Date.now(),
        name: menuForm.name.trim(),
        price,
        cost,
        stock,
        category: menuForm.category,
        discount,
        description: menuForm.description,
        image: menuForm.image || "",
        optionGroups: menuForm.optionGroups || [],
        recipe,
      };
      updated = [...activeMenus, newM];
    } else {
      updated = activeMenus.map((m) =>
        m.id === editingMenu
          ? { ...m, name: menuForm.name.trim(), price, cost, stock, category: menuForm.category, discount, description: menuForm.description, image: menuForm.image || "", optionGroups: menuForm.optionGroups || [], recipe }
          : m
      );
    }
    await persist(updated);
    setEditingMenu(null);
  };

  const deleteMenu = async (id) => {
    await persist(activeMenus.filter((m) => m.id !== id));
    showToast("Menu dihapus");
  };

  // Salin SELURUH menu dari channel lain menjadi salinan mandiri di channel aktif.
  const bulkCopyFrom = async (sourceChannel) => {
    const source = sourceChannel === "reguler" ? menus : channelMenus[sourceChannel] || [];
    if (!source.length) {
      showToast("Channel sumber masih kosong");
      return;
    }
    if (!window.confirm(`Salin semua ${source.length} menu dari "${labelOf(sourceChannel)}" ke "${labelOf(channel)}"? Menu yang ada sekarang akan diganti dan bisa diedit bebas tanpa mempengaruhi channel asal.`)) return;
    const copied = source.map((m, i) => ({
      ...m,
      id: (channel === "reguler" ? "m" : channel + "_m") + Date.now() + "_" + i,
    }));
    await persist(copied);
    showToast(`Semua menu disalin ke ${labelOf(channel)}`);
  };

  const resetChannelDefault = async () => {
    const msg = channel === "reguler"
      ? "Muat ulang seluruh paket menu katsu default lengkap?"
      : `Muat ulang menu default untuk ${labelOf(channel)}? Menu channel ini akan diganti default.`;
    if (!window.confirm(msg)) return;
    try {
      const url = channel === "reguler" ? `${API}/menu/seed-katsu` : `${API}/menu/seed-katsu?channel=${channel}`;
      await axios.post(url);
      onRefresh();
      showToast("Menu default berhasil dimuat!");
    } catch (e) {
      console.error(e);
    }
  };

  // Impor massal: tempel dari Excel (tab) atau ketik pisah koma. Ditambahkan ke channel aktif saja.
  const runBulkImport = async () => {
    const lines = bulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { showToast("Tidak ada data untuk diimpor"); return; }
    const num = (v, def = 0) => {
      const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
      return isNaN(n) ? def : n;
    };
    const added = [];
    let skipped = 0;
    lines.forEach((line, idx) => {
      const cols = (line.includes("\t") ? line.split("\t") : line.split(/\s*[,;|]\s*/)).map((c) => c.trim());
      const name = cols[0];
      const price = num(cols[1], NaN);
      if (!name || !price || isNaN(price)) { skipped++; return; }
      added.push({
        id: (channel === "reguler" ? "m" : channel + "_m") + Date.now() + "_" + idx,
        name,
        price,
        cost: num(cols[2], 0),
        stock: num(cols[3], 50),
        category: cols[4] || categories[0]?.name || "Ricebox",
        discount: num(cols[5], 0),
        description: cols[6] || "",
      });
    });
    if (!added.length) { showToast("Format tidak dikenali. Pastikan minimal Nama & Harga."); return; }
    await persist([...activeMenus, ...added]);
    setBulkText("");
    setShowBulk(false);
    showToast(`${added.length} menu ditambahkan ke ${labelOf(channel)}${skipped ? `, ${skipped} baris dilewati` : ""}`);
  };

  const labelOf = (id) => CHANNEL_TABS.find((c) => c.id === id)?.short || id;
  const copyChoices = CHANNEL_TABS.filter((c) => c.id !== channel);
  const sourceMenus = copySource === "reguler" ? menus : channelMenus[copySource] || [];
  const filtered = activeMenus.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Preview keuntungan di dalam form.
  const formGross = Math.round(Number(menuForm.price || 0) * (1 - Number(menuForm.discount || 0) / 100));
  const formCommission = Math.round((formGross * commissionPct) / 100);
  const formProfit = formGross - formCommission - effectiveCost;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-base text-slate-900" data-testid="menu-manager-title">Kelola Menu & Harga per Channel</h2>
          <p className="text-xs text-slate-500">Tiap channel punya menu & harga sendiri. Dine In & Take Away memakai harga Reguler yang sama.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="btn-reset-channel-default"
            onClick={resetChannelDefault}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition"
          >
            <RefreshCw size={13} /> Muat Default
          </button>
          <button
            data-testid="btn-manage-category"
            onClick={() => { setShowCategory((s) => !s); setEditingMenu(null); setShowBulk(false); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-800 rounded-xl text-xs font-bold border border-violet-200 transition"
          >
            <Tags size={13} /> Kelola Kategori
          </button>
          <button
            data-testid="btn-bulk-import"
            onClick={() => { setShowBulk((s) => !s); setEditingMenu(null); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold border border-sky-200 transition"
          >
            <Upload size={13} /> Impor Massal
          </button>
          <button
            data-testid="btn-add-new-menu"
            onClick={startNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition"
          >
            <Plus size={14} /> Tambah Menu Baru
          </button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CHANNEL_TABS.map((c) => {
          const active = channel === c.id;
          return (
            <button
              key={c.id}
              data-testid={`menu-channel-tab-${c.id}`}
              onClick={() => { setChannel(c.id); setEditingMenu(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition text-left ${
                active ? "bg-orange-600 text-white border-orange-600 shadow" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div>{c.label}</div>
              <div className={`text-[10px] font-medium ${active ? "text-orange-100" : "text-slate-400"}`}>{c.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Info komisi + bulk copy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <div className="text-xs text-slate-600">
          {channel === "reguler" ? (
            <span>Channel <b className="text-slate-800">Reguler</b> — tanpa pajak/komisi merchant. Keuntungan = harga jual − modal.</span>
          ) : (
            <span>Komisi <b className="text-slate-800">{labelOf(channel)}</b> saat ini <b className="text-orange-600" data-testid="channel-commission-value">{commissionPct}%</b> (ubah di menu Pengaturan). Keuntungan bersih = harga jual − komisi − modal.</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <select
            data-testid="bulk-copy-source"
            value={copySource}
            onChange={(e) => setCopySource(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1.5"
          >
            {copyChoices.map((c) => (
              <option key={c.id} value={c.id}>{c.short}</option>
            ))}
          </select>
          <button
            data-testid="btn-bulk-copy"
            onClick={() => bulkCopyFrom(copySource)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-200 transition whitespace-nowrap"
          >
            <Copy size={13} /> Salin semua ke {labelOf(channel)}
          </button>
        </div>
      </div>

      {/* Kelola Kategori */}
      {showCategory && (
        <div className="p-4 bg-violet-50/70 border border-violet-200 rounded-2xl space-y-3" data-testid="category-panel">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-violet-900 flex items-center gap-1.5"><Tags size={13} /> Kelola Kategori Menu</h3>
            <button onClick={() => setShowCategory(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={15} /></button>
          </div>
          <p className="text-[11px] text-slate-500">Kategori adalah jenis makanan (contoh: Ricebox, Miebox, Minuman). Varian diatur di dalam form setiap menu.</p>
          <div className="flex items-center gap-2">
            <input
              data-testid="input-new-category"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
              placeholder="cth: Snack, Drink, Dessert"
              className="flex-1 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
            />
            <button
              data-testid="btn-add-category"
              onClick={addCategory}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow transition whitespace-nowrap"
            >
              <Plus size={14} /> Tambah
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span
                key={c.id}
                data-testid={`category-chip-${c.id}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || "#94a3b8" }} />
                {c.name}
                <button
                  data-testid={`btn-delete-category-${c.id}`}
                  onClick={() => deleteCategory(c.id)}
                  className="ml-0.5 text-slate-400 hover:text-red-600"
                  title="Hapus kategori"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {categories.length === 0 && <span className="text-[11px] text-slate-400">Belum ada kategori.</span>}
          </div>
        </div>
      )}

      {/* Impor Massal */}
      {showBulk && (
        <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-3" data-testid="bulk-import-panel">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-sky-900 flex items-center gap-1.5"><Upload size={13} /> Impor Massal Menu — {labelOf(channel)}</h3>
            <button onClick={() => setShowBulk(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={15} /></button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Tempel langsung dari Excel (antar kolom otomatis terpisah), atau ketik 1 menu per baris dengan pemisah koma. Urutan kolom:
            <b className="text-slate-700"> Nama, Harga, Modal, Stok, Kategori, Diskon(%), Deskripsi</b>. Hanya <b>Nama</b> & <b>Harga</b> yang wajib. Menu ditambahkan ke channel <b>{labelOf(channel)}</b> ini saja.
          </p>
          <textarea
            data-testid="bulk-import-textarea"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={7}
            placeholder={"Chicken Katsu Curry Rice, 35000, 14000, 40, Paket Katsu Spesial, 0, Kari gurih\nBeef Katsu Original, 42000, 20000"}
            className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowBulk(false); setBulkText(""); }} className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Batal</button>
            <button data-testid="btn-run-bulk-import" onClick={runBulkImport} className="px-5 py-1.5 text-xs font-black bg-sky-600 text-white rounded-xl shadow hover:bg-sky-700">Tambahkan ke {labelOf(channel)}</button>
          </div>
        </div>
      )}

      {/* Form */}
      {editingMenu && (
        <div ref={formRef} className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-xs text-orange-900">
              {editingMenu === "new" ? `Tambah Menu Baru — ${labelOf(channel)}` : `Edit Menu — ${labelOf(channel)}`}
            </h3>
            {editingMenu === "new" && copyChoices.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Salin dari:</span>
                <select
                  data-testid="copy-from-channel-select"
                  value={copySource}
                  onChange={(e) => setCopySource(e.target.value)}
                  className="text-[11px] bg-white border border-slate-300 rounded-lg px-2 py-1"
                >
                  {copyChoices.map((c) => (
                    <option key={c.id} value={c.id}>{c.short}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Pemilih menu untuk disalin ke form */}
          {editingMenu === "new" && sourceMenus.length > 0 && (
            <div className="bg-white/70 border border-orange-200 rounded-xl p-2.5">
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Copy size={12} /> Klik menu {labelOf(copySource)} untuk mengisi form (bisa diedit bebas setelahnya)
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {sourceMenus.map((m) => (
                  <button
                    key={m.id}
                    data-testid={`copy-menu-chip-${m.id}`}
                    onClick={() => copyMenuIntoForm(m)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50 font-semibold text-slate-700"
                  >
                    {m.name} · {formatRp(m.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nama Menu</label>
              <input
                data-testid="input-menu-name"
                value={menuForm.name}
                onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                placeholder="cth: Chicken Katsu Curry Rice"
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Kategori</label>
              <select
                data-testid="input-menu-category"
                value={menuForm.category}
                onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Harga Jual (Rp)</label>
              <input
                data-testid="input-menu-price"
                type="number"
                value={menuForm.price}
                onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                placeholder="28000"
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Modal / HPP (Rp) {hasRecipe && <span className="text-emerald-600 font-bold">auto resep</span>}</label>
              <input
                data-testid="input-menu-cost"
                type="number"
                value={hasRecipe ? recipeCost : menuForm.cost}
                disabled={hasRecipe}
                onChange={(e) => setMenuForm({ ...menuForm, cost: e.target.value })}
                placeholder="14000"
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 disabled:bg-emerald-50 disabled:text-emerald-700 disabled:font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Stok Porsi</label>
              <input
                data-testid="input-menu-stock"
                type="number"
                value={menuForm.stock}
                onChange={(e) => setMenuForm({ ...menuForm, stock: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Diskon (%)</label>
              <input
                data-testid="input-menu-discount"
                type="number"
                min="0"
                max="100"
                value={menuForm.discount}
                onChange={(e) => setMenuForm({ ...menuForm, discount: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Deskripsi / Topping</label>
              <input
                data-testid="input-menu-desc"
                value={menuForm.description}
                onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                placeholder="Katsu ayam krispi + saus kari gurih"
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Foto Menu (opsional)</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {menuForm.image ? <img src={menuForm.image} alt="preview" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-100">
                    <input data-testid="input-menu-image" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFile(e.target.files?.[0])} />
                    Pilih Gambar
                  </label>
                  {menuForm.image && (
                    <button type="button" data-testid="btn-remove-menu-image" onClick={() => setMenuForm((f) => ({ ...f, image: "" }))} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-[11px] font-bold hover:bg-red-50">Hapus Foto</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Editor Varian & Tambahan */}
          <div className="sm:col-span-3 bg-white border-2 border-orange-200 rounded-2xl p-4 space-y-3" data-testid="menu-option-groups">
            <div className="flex items-center justify-between gap-3">
              <div><h4 className="text-sm font-black text-slate-800">Varian & Tambahan</h4><p className="text-[11px] text-slate-500">Kategori adalah jenis makanan. Pilihan di bawah ini muncul setelah kasir klik menu, seperti ShopeeFood.</p></div>
              <button type="button" onClick={addOptionGroup} className="shrink-0 px-3 py-2 bg-orange-600 text-white rounded-xl text-xs font-black">+ Grup Pilihan</button>
            </div>
            {(menuForm.optionGroups || []).map((group, gi) => (
              <div key={group.id || gi} className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={group.name || ""} onChange={(e) => updateOptionGroup(gi, { name: e.target.value })} className="flex-1 text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-2" placeholder="Contoh: Varian Sambal / Level Pedas" />
                  <label className="flex items-center gap-1 text-[10px] font-bold whitespace-nowrap"><input type="checkbox" checked={Boolean(group.required)} onChange={(e) => updateOptionGroup(gi, { required: e.target.checked })} /> Wajib</label>
                  <button type="button" onClick={() => removeOptionGroup(gi)} className="text-red-500 text-[11px] font-bold">Hapus</button>
                </div>
                {(group.options || []).map((option, oi) => (
                  <div key={option.id || oi} className="flex items-center gap-2 pl-2">
                    <input value={option.name || ""} onChange={(e) => updateOption(gi, oi, { name: e.target.value })} className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-2" placeholder="Contoh: Sambal Matah" />
                    <input type="number" min="0" value={option.price || 0} onChange={(e) => updateOption(gi, oi, { price: Number(e.target.value) || 0 })} className="w-28 text-xs border border-slate-300 rounded-lg px-2.5 py-2" placeholder="Harga tambahan" />
                    <span className="text-[10px] text-slate-400 w-10">{Number(option.price) > 0 ? "Tambah" : "Gratis"}</span>
                    <button type="button" onClick={() => removeOption(gi, oi)} className="text-slate-400 hover:text-red-500 font-bold">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addOption(gi)} className="text-xs font-bold text-orange-700 pl-2">+ Tambah pilihan</button>
              </div>
            ))}
            {!(menuForm.optionGroups || []).length && <div className="rounded-xl bg-slate-50 border border-dashed border-slate-300 p-3 text-xs text-slate-500">Belum ada varian. Klik <b>+ Grup Pilihan</b> untuk membuat pilihan seperti Miebox Reguler → Level Pedas atau Ricebox → Varian Sambal.</div>}
          </div>

          {/* Editor Resep / HPP Bahan Baku */}
          <div className="sm:col-span-3 bg-white border-2 border-emerald-200 rounded-2xl p-4 space-y-3" data-testid="menu-recipe-editor">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><FlaskConical size={16} /></div>
                <div><h4 className="text-sm font-black text-slate-800">Resep & HPP Otomatis</h4><p className="text-[11px] text-slate-500">Tambahkan bahan baku + takaran. HPP dihitung otomatis dari harga bahan di Master Bahan Baku.</p></div>
              </div>
              <button type="button" onClick={addRecipeRow} disabled={!ingredients.length} className="shrink-0 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black disabled:opacity-40">+ Bahan</button>
            </div>
            {!ingredients.length && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">Belum ada bahan baku. Tambahkan dulu di menu <b>Bahan Baku</b> agar bisa menyusun resep.</div>}
            {(menuForm.recipe || []).map((r, idx) => (
              <div key={idx} className="flex items-center gap-2" data-testid={`recipe-row-${idx}`}>
                <select value={r.ingredientId} onChange={(e) => updateRecipeRow(idx, { ingredientId: e.target.value })} className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-2">
                  {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name} — {formatRp(ing.pricePerUnit)}/{ing.unit}</option>)}
                </select>
                <input type="number" step="any" min="0" value={r.qty} onChange={(e) => updateRecipeRow(idx, { qty: Number(e.target.value) || 0 })} className="w-24 text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-right" placeholder="takaran" />
                <span className="text-[10px] text-slate-400 w-10">{ingUnit(r.ingredientId)}</span>
                <span className="text-[11px] font-bold text-slate-600 w-20 text-right">{formatRp(ingPrice(r.ingredientId) * (Number(r.qty) || 0))}</span>
                <button type="button" onClick={() => removeRecipeRow(idx)} className="text-slate-400 hover:text-red-500 font-bold">×</button>
              </div>
            ))}
            {hasRecipe && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-slate-700">Total HPP dari resep</span>
                <span className="text-sm font-black text-emerald-700" data-testid="recipe-total-hpp">{formatRp(recipeCost)}</span>
              </div>
            )}
          </div>

          {/* Preview keuntungan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="form-profit-preview">
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
              <div className="text-[10px] text-slate-400 font-semibold">Harga Jual (setelah diskon)</div>
              <div className="text-xs font-black text-slate-800">{formatRp(formGross)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
              <div className="text-[10px] text-slate-400 font-semibold">Komisi {commissionPct}%</div>
              <div className="text-xs font-black text-red-600">-{formatRp(formCommission)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
              <div className="text-[10px] text-slate-400 font-semibold">Modal / HPP</div>
              <div className="text-xs font-black text-slate-800">-{formatRp(Number(menuForm.cost || 0))}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${formProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1"><TrendingUp size={11} /> Untung Bersih</div>
              <div className={`text-xs font-black ${formProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatRp(formProfit)}</div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setEditingMenu(null)} className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Batal</button>
            <button
              data-testid="btn-save-menu-item"
              onClick={saveMenu}
              className="px-5 py-1.5 text-xs font-black bg-orange-600 text-white rounded-xl shadow hover:bg-orange-700"
            >
              Simpan Menu
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter nama menu..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3">Foto</th>
              <th className="p-3">Nama Menu</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Harga Jual</th>
              <th className="p-3">Modal</th>
              {commissionPct > 0 && <th className="p-3">Komisi {commissionPct}%</th>}
              <th className="p-3">Untung Bersih</th>
              <th className="p-3">Stok</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={commissionPct > 0 ? 9 : 8} className="p-6 text-center text-slate-400">
                  Belum ada menu di channel {labelOf(channel)}. Tambah manual atau salin dari channel lain.
                </td>
              </tr>
            )}
            {filtered.map((m) => {
              const gross = itemPrice(m);
              const commission = Math.round((gross * commissionPct) / 100);
              const profit = netProfit(m);
              return (
                <tr key={m.id} className={`hover:bg-slate-50 ${profit < 0 ? "bg-red-50/60" : ""}`} data-testid={`menu-row-${m.id}`}>
                  <td className="p-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {m.image ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-slate-300" />}
                    </div>
                  </td>
                  <td className="p-3 font-bold text-slate-900">
                    <div>{m.name}</div>
                    {m.description && <div className="text-[10px] text-slate-400 font-normal">{m.description}</div>}
                  </td>
                  <td className="p-3">
                    <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-orange-200">{m.category}</span>
                  </td>
                  <td className="p-3 font-black text-orange-600">
                    {formatRp(gross)}
                    {m.discount > 0 && <div className="text-[10px] text-slate-400 line-through font-normal">{formatRp(m.price)}</div>}
                  </td>
                  <td className="p-3 text-slate-600">{formatRp(m.cost || 0)}</td>
                  {commissionPct > 0 && <td className="p-3 text-red-600 font-semibold">-{formatRp(commission)}</td>}
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 font-black ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`} data-testid={`menu-profit-${m.id}`}>
                      {profit < 0 && <AlertTriangle size={12} />}{formatRp(profit)}
                    </span>
                    {profit < 0 && <div className="text-[10px] text-red-500 font-bold" data-testid={`menu-loss-warning-${m.id}`}>Rugi! naikkan harga jual</div>}
                  </td>
                  <td className="p-3">
                    <span className={`font-bold ${m.stock <= 5 ? "text-red-600" : "text-slate-700"}`}>{m.stock}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => startEdit(m)} data-testid={`btn-edit-menu-${m.id}`} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">
                        <Settings size={14} />
                      </button>
                      <button onClick={() => deleteMenu(m.id)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
