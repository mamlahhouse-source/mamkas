import React, { useState } from "react";
import { Banknote, QrCode, CreditCard, Smartphone, AlertCircle, X } from "lucide-react";
import { formatRp } from "../utils/thermalPrinter";

const QUICK_CASH_AMOUNTS = [10000, 20000, 50000, 100000, 150000, 200000];

export default function PaymentProcessModal({ order, menus, settings, onClose, onConfirm, computeTotals }) {
  const totals = computeTotals(order, menus);
  const [method, setMethod] = useState("TUNAI");
  const [cashReceived, setCashReceived] = useState(totals.total);
  const [error, setError] = useState("");

  const change = Math.max(0, Number(cashReceived || 0) - totals.total);

  const handlePay = () => {
    if (method === "TUNAI") {
      if (Number(cashReceived) < totals.total) {
        setError("Uang yang diterima kurang dari total pembayaran!");
        return;
      }
    }
    onConfirm({
      method,
      cash: method === "TUNAI" ? Number(cashReceived) : totals.total,
      change: method === "TUNAI" ? change : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-base text-slate-900" data-testid="payment-modal-title">Pembayaran Transaksi</h3>
            <p className="text-xs text-slate-500">
              {order.orderType} {order.tableName && `\u2022 ${order.tableName}`} {order.customerName && `\u2022 ${order.customerName}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Total Display */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 rounded-2xl text-white text-center mb-4 shadow-md">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-100">Total Tagihan Katsu</span>
          <div className="text-2xl font-black mt-0.5" data-testid="modal-total-amount">{formatRp(totals.total)}</div>
        </div>

        {/* Methods */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {[
            { id: "TUNAI", label: "Tunai", icon: Banknote },
            { id: "QRIS", label: "QRIS", icon: QrCode },
            { id: "DEBIT", label: "Debit/EDC", icon: CreditCard },
            { id: "ONLINE", label: "Online App", icon: Smartphone },
          ].map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                data-testid={`pay-method-${m.id.toLowerCase()}`}
                onClick={() => {
                  setMethod(m.id);
                  setError("");
                }}
                className={`py-2 px-1 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition ${
                  active
                    ? "bg-orange-50 border-orange-500 text-orange-700 font-black shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                }`}
              >
                <Icon size={16} />
                <span className="text-[10px]">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cash */}
        {method === "TUNAI" && (
          <div className="space-y-3 mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Uang Diterima (Rp)</label>
              <input
                data-testid="input-cash-received"
                type="number"
                value={cashReceived}
                onChange={(e) => {
                  setCashReceived(e.target.value);
                  setError("");
                }}
                placeholder="0"
                className="w-full text-base font-black text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                data-testid="quick-cash-pas"
                onClick={() => setCashReceived(totals.total)}
                className="py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-black text-slate-700"
              >
                Uang Pas
              </button>
              {QUICK_CASH_AMOUNTS.filter((amt) => amt >= totals.total).slice(0, 5).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  data-testid={`quick-cash-${amt}`}
                  onClick={() => setCashReceived(amt)}
                  className="py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-700"
                >
                  {formatRp(amt)}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-600">Kembalian:</span>
              <span
                data-testid="display-change-amount"
                className={`text-sm font-black ${
                  Number(cashReceived) < totals.total ? "text-red-500" : "text-emerald-600"
                }`}
              >
                {Number(cashReceived) < totals.total
                  ? "Uang Kurang"
                  : formatRp(change)}
              </span>
            </div>
          </div>
        )}

        {method === "QRIS" && (
          <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
            <div className="w-32 h-32 bg-white border-2 border-slate-300 rounded-xl mx-auto flex items-center justify-center p-2 mb-2 shadow-inner">
              <QrCode size={96} className="text-slate-800" />
            </div>
            <p className="text-xs font-bold text-slate-700">Scan QRIS KASIR MAMLAH</p>
            <p className="text-[11px] text-slate-400">Gopay, OVO, Dana, ShopeePay, BCA, Mandiri</p>
          </div>
        )}

        {method === "DEBIT" && (
          <div className="text-center py-5 bg-slate-50 rounded-2xl border border-slate-200 mb-4 space-y-1">
            <CreditCard size={36} className="mx-auto text-orange-600 mb-2" />
            <p className="text-xs font-bold text-slate-800">Gesek / Masukkan Kartu di Mesin EDC</p>
            <p className="text-[11px] text-slate-400">Pastikan status transaksi di EDC telah BERHASIL</p>
          </div>
        )}

        {method === "ONLINE" && (
          <div className="text-center py-5 bg-slate-50 rounded-2xl border border-slate-200 mb-4 space-y-1">
            <Smartphone size={36} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-bold text-slate-800">Penyelesaian Otomatis Aplikasi Online</p>
            <p className="text-[11px] text-slate-400">Pembayaran langsung dipotong dari saldo GoFood/Grab/Shopee</p>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          data-testid="btn-confirm-complete-payment"
          onClick={handlePay}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition duration-150"
        >
          Konfirmasi Pembayaran & Cetak Struk
        </button>
      </div>
    </div>
  );
}
