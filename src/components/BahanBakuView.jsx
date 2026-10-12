import React, { useState, useMemo } from "react";
import axios from "../lib/localApi";
import { Boxes, Plus, Trash2, Search, AlertTriangle, PackagePlus } from "lucide-react";
import { formatRp } from "../utils/thermalPrinter";

const UNITS = ["gram", "ml", "butir", "buah", "porsi", "pcs", "botol", "sachet", "kg", "liter"];

const emptyForm = () => ({ name: "", unit: "gram", pricePerUnit: "", stock: "", minStock: "" });

export default function BahanBakuView({ ingredients, setIngredients, showToast, API }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [query, setQuery] = useState("");

  const persist = async (updated) => {
    setIngredients(updated);
    try {
      await axios.post(`${API}/ingredients`, updated);
      showToast("Bahan baku tersimpan");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan bahan baku");
    }
  };

  const startNew = () => { setEditing("new"); setForm(emptyForm()); };
  const startEdit = (ing) => {
    setEditing(ing.id);
    setForm({ name: ing.name, unit: ing.unit, pricePerUnit: String(ing.pricePerUnit), stock: String(ing.stock), minStock: String(ing.minStock || 0) });
  };

  const save = async () => {
    if (!form.name.trim() || form.pricePerUnit === "") { showToast("Nama & harga per unit wajib diisi"); return; }
    const payload = {
      name: form.name.trim(), unit: form.unit,
      pricePerUnit: Number(form.pricePerUnit) || 0,
      stock: Number(form.stock) || 0, minStock: Number(form.minStock) || 0,
    };
    let updated;
    if (editing === "new") updated = [...ingredients, { id: "ing_" + Date.now(), ...payload }];
    else updated = ingredients.map((i) => (i.id === editing ? { ...i, ...payload } : i));
    await persist(updated);
    setEditing(null);
  };

  const remove = async (id) => {
    if (!window.confirm("Hapus bahan baku ini? Resep menu yang memakainya akan mengabaikan bahan ini.")) return;
    await persist(ingredients.filter((i) => i.id !== id));
  };

  const filtered = ingredients.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));
  const lowStock = useMemo(() => ingredients.filter((i) => Number(i.stock) <= Number(i.minStock || 0)), [ingredients]);
  const totalValue = ingredients.reduce((s, i) => s + (Number(i.pricePerUnit) || 0) * (Number(i.stock) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Jenis Bahan Baku" value={`${ingredients.length} item`} tone="slate" />
        <StatCard label="Nilai Stok Gudang" value={formatRp(totalValue)} tone="emerald" />
        <StatCard label="Stok Menipis" value={`${lowStock.length} bahan`} tone={lowStock.length ? "red" : "slate"} icon={lowStock.length ? AlertTriangle : null} />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-soft border border-slate-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center"><Boxes size={18} /></div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900" data-testid="bahan-baku-title">Master Bahan Baku</h2>
              <p className="text-xs text-slate-500">Harga beli per satuan dipakai untuk menghitung HPP resep secara otomatis.</p>
            </div>
          </div>
          <button data-testid="btn-add-ingredient" onClick={startNew} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition">
            <Plus size={14} /> Tambah Bahan
          </button>
        </div>

        {editing && (
          <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl grid grid-cols-1 sm:grid-cols-5 gap-3" data-testid="ingredient-form">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nama Bahan</label>
              <input data-testid="input-ingredient-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: Fillet Ayam" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Satuan</label>
              <select data-testid="input-ingredient-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Harga / {form.unit} (Rp)</label>
              <input data-testid="input-ingredient-price" type="number" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} placeholder="55" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Stok ({form.unit})</label>
              <input data-testid="input-ingredient-stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="20000" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Stok Minimum</label>
              <input data-testid="input-ingredient-minstock" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="3000" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div className="sm:col-span-4 flex items-end gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Batal</button>
              <button data-testid="btn-save-ingredient" onClick={save} className="px-5 py-2 text-xs font-black bg-orange-600 text-white rounded-xl shadow hover:bg-orange-700">Simpan Bahan</button>
            </div>
          </div>
        )}

        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari bahan baku..." className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Bahan</th>
                <th className="p-3">Satuan</th>
                <th className="p-3 text-right">Harga / Unit</th>
                <th className="p-3 text-right">Stok</th>
                <th className="p-3 text-right">Nilai Stok</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Belum ada bahan baku.</td></tr>}
              {filtered.map((i) => {
                const low = Number(i.stock) <= Number(i.minStock || 0);
                return (
                  <tr key={i.id} className={`hover:bg-slate-50 ${low ? "bg-red-50/60" : ""}`} data-testid={`ingredient-row-${i.id}`}>
                    <td className="p-3 font-bold text-slate-900">{i.name}</td>
                    <td className="p-3 text-slate-500">{i.unit}</td>
                    <td className="p-3 text-right">{formatRp(i.pricePerUnit)}</td>
                    <td className="p-3 text-right">
                      <span className={`font-bold ${low ? "text-red-600" : "text-slate-700"}`}>{Number(i.stock).toLocaleString("id-ID")}</span>
                      {low && <div className="text-[10px] text-red-500 font-bold flex items-center justify-end gap-0.5"><AlertTriangle size={10} />Stok menipis</div>}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-700">{formatRp((Number(i.pricePerUnit) || 0) * (Number(i.stock) || 0))}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => startEdit(i)} data-testid={`btn-edit-ingredient-${i.id}`} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"><PackagePlus size={14} /></button>
                        <button onClick={() => remove(i.id)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400">Catat pembelian bahan di menu <b>Keuangan</b> agar stok bertambah otomatis & tercatat sebagai pengeluaran.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "slate", icon: Icon }) {
  const tones = {
    slate: "text-slate-900", emerald: "text-emerald-600", red: "text-red-600",
  };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">{Icon && <Icon size={13} className="text-red-500" />}{label}</div>
      <div className={`text-xl font-black mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  );
}
