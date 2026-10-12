import React, { useRef } from "react";
import axios from "../lib/localApi";
import {
  Plus, X, Settings, GripVertical, Store, ShoppingBag, Bike,
  Smartphone, Utensils, LayoutGrid
} from "lucide-react";
import { formatRp } from "../utils/thermalPrinter";

const ORDER_CHANNELS = [
  { id: "ALL", label: "Semua", icon: LayoutGrid },
  { id: "DINE IN", label: "Dine In", icon: Store },
  { id: "TAKE AWAY", label: "Take Away", icon: ShoppingBag },
  { id: "GOFOOD", label: "GoFood", icon: Bike },
  { id: "GRABFOOD", label: "GrabFood", icon: Bike },
  { id: "SHOPEEFOOD", label: "ShopeeFood", icon: Smartphone },
];

export default function FloorAndQueueView({
  tables,
  setTables,
  activeOrders,
  menus,
  onOpenTable,
  onOpenOrder,
  onStartNewOrder,
  canEdit,
  editLayout,
  setEditLayout,
  selectedChannel,
  setSelectedChannel,
  computeTotals,
  API,
}) {
  const floorRef = useRef(null);
  const dragState = useRef(null);

  const filteredOrders = activeOrders.filter((o) => {
    if (selectedChannel === "ALL") return true;
    return o.orderType === selectedChannel;
  });

  const startMoveTable = (e, id) => {
    if (!editLayout) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { id };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp);
  };

  const onDragMove = (e) => {
    if (!dragState.current || !floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));
    setTables((prev) => prev.map((t) => (t.id === dragState.current.id ? { ...t, x, y } : t)));
  };

  const onDragUp = () => {
    dragState.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
    axios.post(`${API}/tables`, tables).catch(() => console.log("Saved local"));
  };

  const addTable = () => {
    const num = tables.length + 1;
    const newT = {
      id: "t" + Date.now(),
      name: `Meja ${num}`,
      x: 50,
      y: 50,
      w: 96,
      h: 70,
      color: "#ea580c",
      shape: "rounded",
    };
    const updated = [...tables, newT];
    setTables(updated);
    axios.post(`${API}/tables`, updated).catch(() => console.log("error"));
  };

  const deleteTable = (id) => {
    const updated = tables.filter((t) => t.id !== id);
    setTables(updated);
    axios.post(`${API}/tables`, updated).catch(() => console.log("error"));
  };

  return (
    <div className="space-y-6">
      {/* Channel Badges & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {ORDER_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const active = selectedChannel === ch.id;
            const count =
              ch.id === "ALL"
                ? activeOrders.length
                : activeOrders.filter((o) => o.orderType === ch.id).length;
            return (
              <button
                key={ch.id}
                data-testid={`channel-filter-${ch.id.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setSelectedChannel(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? "bg-orange-600 text-white shadow-md shadow-orange-500/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icon size={14} />
                <span>{ch.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      active ? "bg-white text-orange-600" : "bg-orange-600 text-white"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          data-testid="btn-pesanan-baru"
          onClick={onStartNewOrder}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 transition"
        >
          <Plus size={16} />
          <span>+ Buat Pesanan Baru</span>
        </button>
      </div>

      {/* DINE IN FLOOR PLAN */}
      {(selectedChannel === "ALL" || selectedChannel === "DINE IN") && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-orange-600" />
              <h2 className="font-bold text-sm text-slate-800">Denah Meja (Dine In)</h2>
              <span className="text-xs text-slate-500">Klik meja untuk pesan / lihat tagihan</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                {editLayout && (
                  <button
                    onClick={addTable}
                    data-testid="add-table-button"
                    className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100"
                  >
                    <Plus size={13} /> Tambah Meja
                  </button>
                )}
                <button
                  data-testid="toggle-edit-layout-button"
                  onClick={() => setEditLayout(!editLayout)}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                    editLayout
                      ? "bg-orange-600 text-white border-orange-600"
                      : "text-slate-600 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <Settings size={13} />
                  <span>{editLayout ? "Selesai Atur" : "Atur Denah"}</span>
                </button>
              </div>
            )}
          </div>

          <div
            ref={floorRef}
            className="relative rounded-xl border border-dashed border-slate-300 w-full min-h-[300px] h-[48vh] max-h-[420px] bg-slate-50 overflow-hidden"
            style={{
              backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)",
              backgroundSize: "20px 20px",
              touchAction: "none",
            }}
          >
            {tables.map((table) => {
              const activeOrder = activeOrders.find(
                (o) => o.orderType === "DINE IN" && (o.tableName === table.name || o.id === table.id)
              );
              const isOccupied = activeOrder && activeOrder.items?.length > 0;
              const totals = isOccupied ? computeTotals(activeOrder, menus) : null;

              return (
                <div
                  key={table.id}
                  style={{
                    position: "absolute",
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: `${table.w || 96}px`,
                    zIndex: 10,
                  }}
                >
                  {editLayout ? (
                    <div className="bg-white border-2 border-orange-500 rounded-xl p-2 shadow-md text-center">
                      <div className="flex items-center justify-between text-orange-600 mb-1">
                        <div
                          onPointerDown={(e) => startMoveTable(e, table.id)}
                          className="cursor-grab active:cursor-grabbing p-1"
                        >
                          <GripVertical size={14} />
                        </div>
                        <button
                          onClick={() => deleteTable(table.id)}
                          className="text-red-500 hover:text-red-700 p-0.5"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        value={table.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTables((prev) =>
                            prev.map((t) => (t.id === table.id ? { ...t, name: val } : t))
                          );
                        }}
                        className="w-full text-xs font-bold text-center border border-slate-200 rounded px-1 py-0.5"
                      />
                    </div>
                  ) : (
                    <button
                      data-testid={`table-btn-${table.id}`}
                      onClick={() => onOpenTable(table)}
                      className={`w-full h-[76px] rounded-2xl border-2 p-2 flex flex-col items-center justify-center transition transform hover:scale-105 shadow-sm text-center ${
                        isOccupied
                          ? "bg-amber-50 border-orange-500 shadow-orange-500/20"
                          : "bg-white border-slate-200 hover:border-orange-300"
                      }`}
                    >
                      <span className="text-xs font-black text-slate-800 truncate w-full">{table.name}</span>
                      {isOccupied ? (
                        <>
                          <span className="text-[10px] text-orange-600 font-bold truncate max-w-full">
                            {activeOrder.customerName ? `Cust: ${activeOrder.customerName}` : "Terisi"}
                          </span>
                          <span className="text-[11px] font-black text-slate-900 mt-0.5">
                            {formatRp(totals.total)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Kosong</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE ORDER CARDS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-orange-600" />
            <h2 className="font-bold text-sm text-slate-800">
              Antrean & Pesanan Berjalan ({filteredOrders.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Pilih untuk edit / selesaikan pembayaran</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
            <Utensils size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">Belum ada pesanan aktif</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Klik "+ Buat Pesanan Baru" atau klik Meja untuk memulai transaksi
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredOrders.map((ord) => {
              const totals = computeTotals(ord, menus);
              const itemCount = (ord.items || []).reduce((s, i) => s + i.qty, 0);

              let badgeColor = "bg-orange-100 text-orange-700 border-orange-200";
              if (ord.orderType === "GOFOOD") badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
              if (ord.orderType === "GRABFOOD") badgeColor = "bg-green-100 text-green-700 border-green-200";
              if (ord.orderType === "SHOPEEFOOD") badgeColor = "bg-amber-100 text-amber-800 border-amber-200";

              return (
                <button
                  key={ord.id}
                  data-testid={`active-order-card-${ord.id}`}
                  onClick={() => onOpenOrder(ord)}
                  className="bg-white border-2 border-slate-200 hover:border-orange-500 rounded-2xl p-3.5 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {ord.orderType}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {ord.tableName ? ord.tableName : `#${(ord.id || "").slice(-4)}`}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-800 truncate">
                      {ord.customerName ? ord.customerName : "Pelanggan Tanpa Nama"}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {(ord.items || []).map((i) => `${i.name} (${i.qty})`).join(", ")}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">{itemCount} item</span>
                    <span className="text-sm font-black text-orange-600">{formatRp(totals.total)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
