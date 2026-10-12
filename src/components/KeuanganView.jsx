import React, { useState, useEffect, useCallback } from "react";
import axios from "../lib/localApi";
import { Wallet, Plus, Trash2, TrendingDown, TrendingUp, ShoppingCart, Receipt } from "lucide-react";
import { formatRp } from "../utils/thermalPrinter";

const EXPENSE_CATEGORIES = ["Belanja Bahan", "Gaji & Upah", "Sewa Tempat", "Listrik & Air", "Gas", "Kemasan", "Marketing", "Perawatan Alat", "Lainnya"];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function KeuanganView({ showToast, API, ingredients, setIngredients }) {
  const [date, setDate] = useState(todayStr());
  const [finance, setFinance] = useState(null);
  const [expensesToday, setExpensesToday] = useState([]);

  const [category, setCategory] = useState("Belanja Bahan");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [qtyAdded, setQtyAdded] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [fRes, eRes] = await Promise.all([
        axios.get(`${API}/reports/finance?from=${date}&to=${date}`),
        axios.get(`${API}/expenses?date=${date}`),
      ]);
      setFinance(fRes.data);
      setExpensesToday(eRes.data || []);
    } catch (e) { console.error(e); }
  }, [date, API]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isBahan = category === "Belanja Bahan";
  const selectedIng = ingredients.find((i) => i.id === ingredientId);

  // Jika belanja bahan & isi qty, hitung otomatis nilai belanja dari harga bahan.
  useEffect(() => {
    if (isBahan && selectedIng && qtyAdded) {
      setAmount(String(Math.round((Number(selectedIng.pricePerUnit) || 0) * (Number(qtyAdded) || 0))));
    }
  }, [ingredientId, qtyAdded, isBahan]);

  const addExpense = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) { showToast("Masukkan nominal pengeluaran"); return; }
    const entry = {
      date, category,
      description: description.trim() || (isBahan && selectedIng ? `Beli ${selectedIng.name}` : category),
      amount: amt,
    };
    if (isBahan && ingredientId && Number(qtyAdded) > 0) {
      entry.ingredientId = ingredientId;
      entry.qtyAdded = Number(qtyAdded);
    }
    try {
      await axios.post(`${API}/expenses`, entry);
      // stok bahan bertambah di backend; refresh ingredients lokal
      if (entry.ingredientId) {
        const res = await axios.get(`${API}/ingredients`);
        setIngredients(res.data || []);
      }
      showToast("Pengeluaran tercatat");
      setDescription(""); setAmount(""); setQtyAdded(""); setIngredientId("");
      fetchData();
    } catch (e) { console.error(e); showToast("Gagal mencatat pengeluaran"); }
  };

  const remove = async (id) => {
    try { await axios.delete(`${API}/expenses/${id}`); fetchData(); showToast("Pengeluaran dihapus"); }
    catch (e) { console.error(e); }
  };

  const net = finance?.netProfit || 0;

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl shadow-soft border border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><Wallet size={18} /></div>
          <div>
            <h2 className="font-display font-bold text-base text-slate-900" data-testid="keuangan-title">Keuangan & Laba Rugi</h2>
            <p className="text-xs text-slate-500">Catat pengeluaran (beli bahan, operasional) untuk tahu untung/rugi bersih.</p>
          </div>
        </div>
        <input data-testid="input-finance-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50" />
      </div>

      {/* Ringkasan Laba Rugi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft"><div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><ShoppingCart size={13} className="text-orange-500" />Omzet Total (All)</div><div className="text-lg font-black text-slate-900 mt-1" data-testid="finance-grand-omzet">{formatRp(finance?.grandOmzet || 0)}</div><div className="text-[10px] text-slate-400 mt-0.5">Kasir {formatRp(finance?.posOmzet || 0)} + Merchant {formatRp(finance?.merchantGross || 0)}</div></div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft"><div className="text-xs font-semibold text-slate-500">Modal (HPP) + Komisi</div><div className="text-lg font-black text-slate-800 mt-1">-{formatRp((finance?.posModal || 0) + (finance?.posCommission || 0))}</div><div className="text-[10px] text-slate-400 mt-0.5">HPP {formatRp(finance?.posModal || 0)}</div></div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft"><div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><TrendingDown size={13} className="text-red-500" />Pengeluaran</div><div className="text-lg font-black text-red-600 mt-1" data-testid="finance-total-expense">-{formatRp(finance?.totalExpense || 0)}</div></div>
        <div className={`p-4 rounded-2xl border shadow-soft ${net >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">{net >= 0 ? <TrendingUp size={13} className="text-emerald-600" /> : <TrendingDown size={13} className="text-red-600" />}Laba Bersih</div>
          <div className={`text-xl font-black mt-1 ${net >= 0 ? "text-emerald-700" : "text-red-600"}`} data-testid="finance-net-profit">{formatRp(net)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{net < 0 ? "Rugi! cek pengeluaran & harga" : "Laba kasir + merchant − pengeluaran"}</div>
        </div>
      </div>

      {/* Form Pengeluaran */}
      <div className="bg-white rounded-2xl p-5 shadow-soft border border-slate-200 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><Receipt size={15} className="text-violet-600" />Catat Pengeluaran</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Kategori</label>
            <select data-testid="input-expense-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {isBahan && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bahan (stok +)</label>
                <select data-testid="input-expense-ingredient" value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2">
                  <option value="">— tanpa update stok —</option>
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Jumlah Beli {selectedIng ? `(${selectedIng.unit})` : ""}</label>
                <input data-testid="input-expense-qty" type="number" value={qtyAdded} onChange={(e) => setQtyAdded(e.target.value)} placeholder="5000" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
              </div>
            </>
          )}
          {!isBahan && (
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Keterangan</label>
              <input data-testid="input-expense-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="cth: bayar listrik bulan ini" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nominal (Rp)</label>
            <input data-testid="input-expense-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250000" className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2" />
          </div>
        </div>
        {isBahan && (
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Keterangan (opsional)</label>
            <input data-testid="input-expense-desc-bahan" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="cth: belanja ke pasar pagi" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
          </div>
        )}
        <div className="flex justify-end">
          <button data-testid="btn-add-expense" onClick={addExpense} className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black shadow transition"><Plus size={14} /> Simpan Pengeluaran</button>
        </div>
        {isBahan && selectedIng && Number(qtyAdded) > 0 && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">Stok <b>{selectedIng.name}</b> akan bertambah <b>{Number(qtyAdded).toLocaleString("id-ID")} {selectedIng.unit}</b> setelah disimpan.</p>
        )}
      </div>

      {/* Daftar Pengeluaran */}
      <div className="bg-white rounded-2xl p-5 shadow-soft border border-slate-200">
        <h3 className="font-bold text-sm text-slate-900 mb-3">Pengeluaran {date}</h3>
        {expensesToday.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-xl">Belum ada pengeluaran pada tanggal ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr><th className="p-3">Kategori</th><th className="p-3">Keterangan</th><th className="p-3 text-right">Nominal</th><th className="p-3 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expensesToday.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50" data-testid={`expense-row-${e.id}`}>
                    <td className="p-3"><span className="bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-violet-200">{e.category}</span></td>
                    <td className="p-3 text-slate-700">{e.description}{e.ingredientId && <span className="text-emerald-600 font-semibold"> · stok +{Number(e.qtyAdded).toLocaleString("id-ID")}</span>}</td>
                    <td className="p-3 text-right font-black text-red-600">-{formatRp(e.amount)}</td>
                    <td className="p-3 text-right"><button onClick={() => remove(e.id)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
