import React, { useState, useEffect, useCallback } from "react";
import axios from "../lib/localApi";
import { Bike, Plus, Trash2, Store, TrendingUp } from "lucide-react";
import { formatRp } from "../utils/thermalPrinter";

const MERCHANTS = [
  { id: "GOFOOD", label: "GoFood", color: "#0f9d58", commissionKey: "gofoodCommission" },
  { id: "GRABFOOD", label: "GrabFood", color: "#00b14f", commissionKey: "grabfoodCommission" },
  { id: "SHOPEEFOOD", label: "ShopeeFood", color: "#ee4d2d", commissionKey: "shopeefoodCommission" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OmzetMerchantView({ showToast, API, settings }) {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [merchant, setMerchant] = useState("GOFOOD");
  const [gross, setGross] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [orderCount, setOrderCount] = useState("");
  const [note, setNote] = useState("");

  const commissionFor = (m) => {
    const key = MERCHANTS.find((x) => x.id === m)?.commissionKey;
    return Number(settings?.[key]) || 0;
  };

  useEffect(() => { setCommissionPct(String(commissionFor(merchant))); }, [merchant, settings]);

  const fetchRows = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/merchant-sales?date=${date}`);
      setRows(res.data || []);
    } catch (e) { console.error(e); }
  }, [date, API]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const grossNum = Number(gross) || 0;
  const pctNum = Math.max(0, Math.min(100, Number(commissionPct) || 0));
  const netPreview = Math.round(grossNum * (1 - pctNum / 100));

  const addEntry = async () => {
    if (grossNum <= 0) { showToast("Masukkan omzet kotor merchant"); return; }
    const entry = {
      date, merchant,
      gross: grossNum,
      commissionPct: pctNum,
      net: netPreview,
      orderCount: Number(orderCount) || 0,
      note: note.trim(),
    };
    try {
      await axios.post(`${API}/merchant-sales`, entry);
      showToast(`Omzet ${merchant} tersimpan`);
      setGross(""); setOrderCount(""); setNote("");
      fetchRows();
    } catch (e) { console.error(e); showToast("Gagal menyimpan"); }
  };

  const remove = async (id) => {
    try { await axios.delete(`${API}/merchant-sales/${id}`); fetchRows(); showToast("Entri dihapus"); }
    catch (e) { console.error(e); }
  };

  const totalGross = rows.reduce((s, r) => s + (Number(r.gross) || 0), 0);
  const totalNet = rows.reduce((s, r) => s + (Number(r.net) || 0), 0);
  const totalComm = totalGross - totalNet;

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl shadow-soft border border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Bike size={18} /></div>
          <div>
            <h2 className="font-display font-bold text-base text-slate-900" data-testid="omzet-merchant-title">Omzet Merchant Online</h2>
            <p className="text-xs text-slate-500">Input omzet GoFood, GrabFood & ShopeeFood (tidak perlu diinput per order di kasir).</p>
          </div>
        </div>
        <input data-testid="input-merchant-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft"><div className="text-xs font-semibold text-slate-500">Omzet Kotor Merchant</div><div className="text-xl font-black text-slate-900 mt-1" data-testid="merchant-total-gross">{formatRp(totalGross)}</div></div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft"><div className="text-xs font-semibold text-slate-500">Total Komisi Dipotong</div><div className="text-xl font-black text-red-600 mt-1">-{formatRp(totalComm)}</div></div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-soft"><div className="text-xs font-semibold text-slate-600 flex items-center gap-1"><TrendingUp size={13} className="text-emerald-600" />Omzet Bersih Merchant</div><div className="text-xl font-black text-emerald-700 mt-1" data-testid="merchant-total-net">{formatRp(totalNet)}</div></div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-soft border border-slate-200 space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Tambah Omzet Merchant</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MERCHANTS.map((m) => (
            <button key={m.id} data-testid={`merchant-pick-${m.id}`} onClick={() => setMerchant(m.id)}
              className={`py-2.5 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition ${merchant === m.id ? "text-white shadow" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              style={merchant === m.id ? { backgroundColor: m.color, borderColor: m.color } : {}}>
              <Store size={14} /> {m.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Omzet Kotor (Rp)</label>
            <input data-testid="input-merchant-gross" type="number" value={gross} onChange={(e) => setGross(e.target.value)} placeholder="1500000" className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Komisi Merchant (%)</label>
            <input data-testid="input-merchant-commission" type="number" min="0" max="100" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Jumlah Order (opsional)</label>
            <input data-testid="input-merchant-ordercount" type="number" value={orderCount} onChange={(e) => setOrderCount(e.target.value)} placeholder="25" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Catatan</label>
            <input data-testid="input-merchant-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="cth: promo akhir pekan" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs text-slate-600">Penghasilan bersih setelah komisi {pctNum}%: <b className="text-emerald-700" data-testid="merchant-net-preview">{formatRp(netPreview)}</b></div>
          <button data-testid="btn-add-merchant-sale" onClick={addEntry} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition"><Plus size={14} /> Simpan Omzet</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-soft border border-slate-200">
        <h3 className="font-bold text-sm text-slate-900 mb-3">Daftar Omzet Merchant {date}</h3>
        {rows.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-xl">Belum ada omzet merchant pada tanggal ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr><th className="p-3">Merchant</th><th className="p-3 text-right">Order</th><th className="p-3 text-right">Kotor</th><th className="p-3 text-right">Komisi</th><th className="p-3 text-right">Bersih</th><th className="p-3">Catatan</th><th className="p-3 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const m = MERCHANTS.find((x) => x.id === r.merchant);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50" data-testid={`merchant-row-${r.id}`}>
                      <td className="p-3"><span className="font-black px-2 py-0.5 rounded-full text-[10px] text-white" style={{ backgroundColor: m?.color || "#64748b" }}>{m?.label || r.merchant}</span></td>
                      <td className="p-3 text-right">{r.orderCount || "-"}</td>
                      <td className="p-3 text-right font-bold">{formatRp(r.gross)}</td>
                      <td className="p-3 text-right text-red-600">-{formatRp((Number(r.gross) || 0) - (Number(r.net) || 0))} <span className="text-slate-400">({r.commissionPct || 0}%)</span></td>
                      <td className="p-3 text-right font-black text-emerald-700">{formatRp(r.net)}</td>
                      <td className="p-3 text-slate-500">{r.note || "-"}</td>
                      <td className="p-3 text-right"><button data-testid={`btn-delete-merchant-${r.id}`} onClick={() => remove(r.id)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
