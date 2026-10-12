import React, { useState } from "react";
import { Printer, Copy, X, Tags } from "lucide-react";
import { generateReceiptText, formatRp } from "../utils/thermalPrinter";

export default function ReceiptPreviewModal({ tx, settings, onClose, onPrintAgain, onPrintKitchen }) {
  const [copied, setCopied] = useState(false);

  const handleCopyText = async () => {
    const text = generateReceiptText(tx, settings);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCash = tx.paymentMethod === "TUNAI";
  const head = tx.orderType === "DINE IN" ? `DINE IN - ${tx.source || "Meja"}` : tx.orderType;
  const cust = tx.customerName && tx.customerName !== "-" ? tx.customerName : "";
  const labelCount = (tx.items || []).reduce((s, i) => s + (i.qty || 1), 0);
  const storeName = String(settings.storeName || "MAMLAH").split(/\s+-\s+/)[0].trim() || "MAMLAH";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Printer size={16} className="text-orange-600" />
            <h3 className="font-black text-sm text-slate-900" data-testid="receipt-modal-title">Struk Transaksi Selesai</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700" data-testid="btn-close-receipt">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 rounded-2xl border border-slate-200 font-mono font-bold text-[11px] text-black leading-snug">
          <div className="text-center">
            <div className="text-base font-black" data-testid="receipt-store-name">{storeName}</div>
            <div className="text-[10px] font-normal">{settings.tagline || "Solusi Kelaparan"}</div>
            {Number(tx.receiptPrintCount) > 1 && <div className="text-xs font-black">#Reprint</div>}
            {tx.paymentStatus && <div className="text-[10px]">{tx.paymentStatus}</div>}
            {settings.address && <div className="text-[10px]">{settings.address}</div>}
            {settings.phone && <div className="text-[10px]">Telp {settings.phone}</div>}
          </div>
          <div className="border-t border-dashed border-slate-500 my-1" />
          <div className="text-center" data-testid="receipt-order-type">[ {head} ]</div>
          {cust && <div className="text-center truncate" data-testid="receipt-customer-name">{cust}</div>}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-[10px]">
            <span className="break-words">{tx.date} {tx.time}</span>
            <span className="text-right break-words">{tx.cashierName}</span>
          </div>
          <div className="border-t border-dashed border-slate-500 my-1" />
          {(tx.items || []).map((it, idx) => (
            <div key={idx} className="my-1">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start">
                <span className="min-w-0 break-words">{it.qty}x {it.name}</span>
                <span className="whitespace-nowrap">{formatRp(it.subtotal)}</span>
              </div>
              {(it.options || []).map((option, oi) => (
                <div key={oi} className="pl-3 text-[10px] break-words">{option.groupName ? `${option.groupName}: ` : ""}{option.name}{Number(option.price) > 0 ? ` (+${formatRp(option.price)})` : ""}</div>
              ))}
              {Number(it.promoPercent) > 0 && Number(it.basePrice) > Number(it.baseUnitPrice ?? it.price) && <><div className="pl-3 text-[10px] break-words">Harga normal: {formatRp(it.basePrice)}</div><div className="pl-3 text-[10px] break-words">Promo {it.promoPercent}%: -{formatRp(Number(it.basePrice) - Number(it.baseUnitPrice ?? it.price))}</div><div className="pl-3 text-[10px] break-words">Harga promo: {formatRp(it.baseUnitPrice ?? it.price)}</div></>}
              {Number(it.modifierTotal) > 0 && <div className="pl-3 text-[10px] break-words">Tambahan varian: +{formatRp(it.modifierTotal)}</div>}
              {it.note && <div className="pl-3 text-[10px] break-words">Catatan: {it.note}</div>}
            </div>
          ))}
          <div className="border-t border-dashed border-slate-500 my-1" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><span>Subtotal</span><span className="whitespace-nowrap">{formatRp(tx.subtotal)}</span></div>
          {tx.itemDiscountAmount > 0 && <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><span>Diskon item</span><span className="whitespace-nowrap">-{formatRp(tx.itemDiscountAmount)}</span></div>}
          {tx.discountAmount > 0 && <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><span>Diskon struk {tx.discountPercent}%</span><span className="whitespace-nowrap">-{formatRp(tx.discountAmount)}</span></div>}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 font-bold text-sm"><span>TOTAL</span><span className="whitespace-nowrap">{formatRp(tx.total)}</span></div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><span>{tx.paymentMethod}</span><span className="whitespace-nowrap">{formatRp(isCash ? tx.cash : tx.total)}</span></div>
          {isCash && <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><span>Kembali</span><span className="whitespace-nowrap">{formatRp(tx.change || 0)}</span></div>}
          {tx.note && (
            <>
              <div className="border-t border-dashed border-slate-500 my-1.5" />
              <div className="text-[10px] break-words">Catatan: {tx.note}</div>
            </>
          )}
          <div className="border-t border-dashed border-slate-500 my-1.5" />
          <div className="text-center font-bold">TERIMA KASIH</div>
          {settings.footerNote && <div className="text-center text-[10px]">{settings.footerNote}</div>}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-slate-100">
          <button
            data-testid="btn-print-receipt-again"
            onClick={onPrintAgain}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md transition"
          >
            <Printer size={14} />
            <span>Cetak Struk ({settings.paperSize || "58mm"})</span>
          </button>
          <button
            data-testid="btn-print-kitchen-labels"
            onClick={onPrintKitchen}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md transition"
          >
            <Tags size={14} />
            <span>Struk Dapur ({labelCount})</span>
          </button>
          <button
            data-testid="btn-copy-receipt-text"
            onClick={handleCopyText}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
          >
            <Copy size={14} />
            <span>{copied ? "Tersalin!" : "Salin Teks Struk (WA)"}</span>
          </button>
        </div>

        <button onClick={onClose} className="w-full mt-2 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold" data-testid="btn-receipt-done">
          Tutup & Transaksi Baru
        </button>
      </div>
    </div>
  );
}
