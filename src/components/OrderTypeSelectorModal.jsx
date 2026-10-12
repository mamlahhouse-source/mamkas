import React, { useState } from "react";
import { Store, ShoppingBag, Bike, Smartphone, CheckCircle2, X, AlertCircle, UserRound } from "lucide-react";

const ONLINE_FOOD_TYPES = ["GOFOOD", "GRABFOOD", "SHOPEEFOOD"];

export default function OrderTypeSelectorModal({ tables, onClose, onSelect }) {
  const [selectedType, setSelectedType] = useState("DINE IN");
  const [selectedTable, setSelectedTable] = useState(tables[0]?.name || "Meja 1");
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("");

  const isOnlineFood = ONLINE_FOOD_TYPES.includes(selectedType);

  const types = [
    { id: "DINE IN", label: "Dine In (Makan di Tempat)", desc: "Pilih nomor meja pelanggan", icon: Store, color: "from-orange-500 to-amber-600" },
    { id: "TAKE AWAY", label: "Take Away (Bungkus)", desc: "Bawa pulang / takeaway", icon: ShoppingBag, color: "from-amber-500 to-yellow-600" },
    { id: "GOFOOD", label: "GoFood", desc: "Wajib isi nama customer / driver", icon: Bike, color: "from-emerald-600 to-teal-700" },
    { id: "GRABFOOD", label: "GrabFood", desc: "Wajib isi nama customer / driver", icon: Bike, color: "from-green-600 to-emerald-700" },
    { id: "SHOPEEFOOD", label: "ShopeeFood", desc: "Wajib isi nama customer / driver", icon: Smartphone, color: "from-orange-600 to-red-600" },
  ];

  const handleContinue = () => {
    if (isOnlineFood && !customerName.trim()) {
      setError(`Nama Customer WAJIB diisi untuk ${selectedType}. Nama ini akan tercetak di struk.`);
      return;
    }
    setError("");
    const tName = selectedType === "DINE IN" ? selectedTable : "";
    onSelect(selectedType, tName, customerName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-base text-slate-900" data-testid="order-type-modal-title">Pilih Tipe Pesanan</h3>
            <p className="text-xs text-slate-500">Tipe & nama customer akan tercetak pada struk</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {types.map((item) => {
            const Icon = item.icon;
            const active = selectedType === item.id;
            return (
              <button
                key={item.id}
                data-testid={`btn-select-type-${item.id.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => {
                  setSelectedType(item.id);
                  setError("");
                }}
                className={`w-full p-3 rounded-2xl border-2 text-left flex items-center gap-3.5 transition ${
                  active
                    ? "border-orange-500 bg-orange-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0 shadow`}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xs text-slate-900">{item.label}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
                {active && <CheckCircle2 size={18} className="text-orange-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {selectedType === "DINE IN" && (
          <div className="mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Meja</label>
            <select
              data-testid="modal-select-table"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Customer Name — WAJIB untuk online food, opsional untuk Dine In / Take Away */}
        <div className="mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
            <UserRound size={13} className="text-orange-600" />
            <span>
              Nama Customer{" "}
              {isOnlineFood ? (
                <span className="text-red-600 font-black">*WAJIB</span>
              ) : (
                <span className="text-slate-400 font-normal">(opsional)</span>
              )}
            </span>
          </label>
          <input
            data-testid="modal-input-customer-name"
            type="text"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              if (error) setError("");
            }}
            placeholder={isOnlineFood ? "Wajib: cth. Driver Andi / Order #123" : "cth. Kak Budi / Meja 5"}
            className={`w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 border ${
              isOnlineFood && !customerName.trim() ? "border-red-400 bg-red-50" : "border-slate-300"
            }`}
          />
          <p className="text-[10px] text-slate-400 mt-1">Nama ini akan tercetak pada struk.</p>
        </div>

        {error && (
          <div
            data-testid="modal-order-type-error"
            className="mb-3 p-2.5 bg-red-50 border border-red-300 text-red-700 text-[11px] rounded-xl flex items-center gap-2 font-semibold"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          data-testid="modal-continue-order-btn"
          onClick={handleContinue}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-lg shadow-orange-500/25 transition"
        >
          Lanjut ke Menu &rarr;
        </button>
      </div>
    </div>
  );
}
