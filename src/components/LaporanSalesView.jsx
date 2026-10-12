import React, { useState, useEffect, useCallback } from "react";
import axios from "../lib/localApi";
import * as XLSX from "xlsx";
import { Calendar, Download, Printer, Users, TrendingUp, AlertTriangle, Bike, Wallet } from "lucide-react";
import { formatRp, printShiftReport, printClosingReport } from "../utils/thermalPrinter";

export default function LaporanSalesView({ showToast, onReprintReceipt, API, todayStr, settings }) {
  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/reports/closing?date=${date}`);
      if (res.data) setReport(res.data);
    } catch (e) {
      console.error(e);
    }
  }, [date, API]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const downloadExcel = () => {
    if (!report || !report.transactions || report.transactions.length === 0) {
      showToast("Tidak ada transaksi untuk diunduh");
      return;
    }

    const txRows = report.transactions.map((t) => ({
      Waktu: t.time,
      Tipe: t.orderType,
      Sumber: t.source,
      Customer: t.customerName || "-",
      Kasir: t.cashierName || "-",
      Menu: (t.items || []).map((i) => `${i.name} (x${i.qty})`).join(", "),
      Subtotal: t.subtotal,
      "Diskon (Rp)": t.discountAmount || 0,
      Total: t.total,
      "Modal (Rp)": t.modalTotal || 0,
      "Komisi (Rp)": t.commissionAmount || 0,
      "Untung Bersih (Rp)": t.netProfit || 0,
      Metode: t.paymentMethod,
      Tunai: t.cash || t.total,
      Kembali: t.change || 0,
    }));

    const menuRows = (report.menuSales || []).map((m) => ({
      "Menu": m.name,
      "Porsi Terjual": m.qty,
      "Total Penjualan": m.total,
    }));

    const shiftRows = (report.shiftRows || []).map((r) => ({
      Kasir: r.cashierName,
      Shift: r.shift || "-",
      Transaksi: r.count,
      Tunai: r.TUNAI,
      QRIS: r.QRIS,
      Debit: r.DEBIT,
      "Online Food": r.ONLINE,
      Total: r.total,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), "Transaksi");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuRows), "Rekap Menu");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shiftRows), "Rekap Shift Kasir");
    XLSX.writeFile(wb, `Kasir-Mamlah-Laporan-${date}.xlsx`);
    showToast("Laporan Excel berhasil diunduh!");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-orange-600" />
          <div>
            <h2 className="font-bold text-sm text-slate-900" data-testid="laporan-title">Laporan Penjualan KASIR MAMLAH</h2>
            <p className="text-xs text-slate-500">Pilih tanggal untuk melihat rincian omzet dan transaksi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            data-testid="input-laporan-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50"
          />
          <button
            data-testid="btn-print-closing"
            onClick={() =>
              printClosingReport(report || { date }, settings || {}).then((r) => {
                if (r && r.ok === false) showToast(`Gagal cetak closing: ${r.reason}`);
                else showToast("Laporan closing dikirim ke printer");
              })
            }
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow transition"
          >
            <Printer size={14} /> Cetak Closing (All Print)
          </button>
          <button
            data-testid="btn-download-excel"
            onClick={downloadExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
          >
            <Download size={14} /> Unduh Excel (.xlsx)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Omzet Harian</div>
          <div className="text-xl font-black text-orange-600 mt-1" data-testid="laporan-total-omzet">
            {formatRp(report?.totalOmzet || 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Transaksi</div>
          <div className="text-xl font-black text-slate-900 mt-1" data-testid="laporan-total-tx">
            {report?.totalTransactions || 0} Transaksi
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Dine In vs Online</div>
          <div className="text-xs font-bold text-slate-700 mt-2 space-y-0.5">
            <div>Dine In: {report?.channelBreakdown?.["DINE IN"]?.count || 0} ({formatRp(report?.channelBreakdown?.["DINE IN"]?.total || 0)})</div>
            <div>Take Away: {report?.channelBreakdown?.["TAKE AWAY"]?.count || 0}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Online Channels</div>
          <div className="text-xs font-bold text-slate-700 mt-2 space-y-0.5">
            <div>GoFood: {report?.channelBreakdown?.["GOFOOD"]?.count || 0}</div>
            <div>GrabFood: {report?.channelBreakdown?.["GRABFOOD"]?.count || 0}</div>
            <div>ShopeeFood: {report?.channelBreakdown?.["SHOPEEFOOD"]?.count || 0}</div>
          </div>
        </div>
      </div>

      {/* Ringkasan Keuntungan Bersih Harian */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="laporan-profit-summary">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Modal (HPP)</div>
          <div className="text-xl font-black text-slate-800 mt-1" data-testid="laporan-total-modal">{formatRp(report?.totalModal || 0)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Komisi Merchant</div>
          <div className="text-xl font-black text-red-600 mt-1" data-testid="laporan-total-commission">-{formatRp(report?.totalCommission || 0)}</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${(report?.totalProfit || 0) >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {(report?.totalProfit || 0) < 0 ? <AlertTriangle size={13} className="text-red-600" /> : <TrendingUp size={13} className="text-emerald-600" />}
            Keuntungan Bersih Harian
          </div>
          <div className={`text-2xl font-black mt-1 ${(report?.totalProfit || 0) >= 0 ? "text-emerald-700" : "text-red-600"}`} data-testid="laporan-total-profit">{formatRp(report?.totalProfit || 0)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Omzet − Modal − Komisi</div>
        </div>
      </div>

      {/* Ringkasan Closing: Merchant + Omzet Total + Laba Bersih */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="laporan-closing-summary">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Bike size={13} className="text-emerald-600" />Omzet Merchant (Kotor)</div>
          <div className="text-lg font-black text-slate-900 mt-1" data-testid="laporan-merchant-gross">{formatRp(report?.merchantGross || 0)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bersih: {formatRp(report?.merchantNet || 0)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Omzet Total (All)</div>
          <div className="text-lg font-black text-orange-600 mt-1" data-testid="laporan-grand-omzet">{formatRp(report?.grandOmzet || 0)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Kasir + Merchant</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Wallet size={13} className="text-violet-600" />Pengeluaran</div>
          <div className="text-lg font-black text-red-600 mt-1" data-testid="laporan-total-expense">-{formatRp(report?.totalExpense || 0)}</div>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${(report?.netProfit || 0) >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            {(report?.netProfit || 0) < 0 ? <AlertTriangle size={13} className="text-red-600" /> : <TrendingUp size={13} className="text-emerald-600" />}
            Laba Bersih Closing
          </div>
          <div className={`text-2xl font-black mt-1 ${(report?.netProfit || 0) >= 0 ? "text-emerald-700" : "text-red-600"}`} data-testid="laporan-net-profit-closing">{formatRp(report?.netProfit || 0)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Laba kasir + merchant − pengeluaran</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-orange-600" />
            <h3 className="font-bold text-sm text-slate-900" data-testid="shift-report-title">Rekap Shift Kasir</h3>
          </div>
          <button
            data-testid="btn-print-shift-report"
            onClick={() =>
              printShiftReport(report || { date, shiftRows: [], totalOmzet: 0, totalTransactions: 0 }, settings || {}).then((r) => {
                if (r && r.ok === false) showToast(`Gagal cetak rekap: ${r.reason}`);
                else showToast("Rekap shift dikirim ke printer");
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            <Printer size={13} /> Cetak Rekap Shift
          </button>
        </div>
        {(!report?.shiftRows || report.shiftRows.length === 0) ? (
          <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-xl">Belum ada transaksi kasir</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700" data-testid="shift-report-table">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Kasir</th>
                  <th className="p-2.5">Shift</th>
                  <th className="p-2.5 text-right">Trx</th>
                  <th className="p-2.5 text-right">Tunai</th>
                  <th className="p-2.5 text-right">QRIS</th>
                  <th className="p-2.5 text-right">Debit</th>
                  <th className="p-2.5 text-right">Online Food</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.shiftRows.map((r) => (
                  <tr key={r.cashierName} data-testid={`shift-row-${r.cashierName}`}>
                    <td className="p-2.5 font-bold text-slate-800">{r.cashierName}</td>
                    <td className="p-2.5 text-slate-500">{r.shift || "-"}</td>
                    <td className="p-2.5 text-right font-bold">{r.count}</td>
                    <td className="p-2.5 text-right">{formatRp(r.TUNAI)}</td>
                    <td className="p-2.5 text-right">{formatRp(r.QRIS)}</td>
                    <td className="p-2.5 text-right">{formatRp(r.DEBIT)}</td>
                    <td className="p-2.5 text-right">{formatRp(r.ONLINE)}</td>
                    <td className="p-2.5 text-right font-black text-orange-600">{formatRp(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-bold text-sm text-slate-900 mb-3">Rincian Transaksi Tanggal {date}</h3>
        {(!report?.transactions || report.transactions.length === 0) ? (
          <div className="text-center py-10 text-slate-400 text-xs border border-dashed rounded-xl">
            Belum ada transaksi pada tanggal ini
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Tipe / Sumber</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Item Pesanan</th>
                  <th className="p-3">Metode</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Untung Bersih</th>
                  <th className="p-3 text-right">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-500">{tx.time}</td>
                    <td className="p-3">
                      <span className="bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {tx.orderType}
                      </span>
                      <div className="text-[11px] font-bold text-slate-800 mt-0.5">{tx.source}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{tx.customerName || "-"}</td>
                    <td className="p-3 max-w-xs truncate">
                      {(tx.items || []).map((i) => `${i.name} (x${i.qty})`).join(", ")}
                    </td>
                    <td className="p-3 font-bold text-slate-600">{tx.paymentMethod}</td>
                    <td className="p-3 font-black text-orange-600">{formatRp(tx.total)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 font-black ${(tx.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`} data-testid={`tx-profit-${tx.id}`}>
                        {(tx.netProfit || 0) < 0 && <AlertTriangle size={12} />}{formatRp(tx.netProfit || 0)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onReprintReceipt(tx)}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                        title="Lihat / Cetak Struk"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
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
