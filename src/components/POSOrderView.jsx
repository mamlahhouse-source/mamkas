import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Minus, ArrowLeft, Search, Percent, StickyNote, UserRound, ChefHat, Printer, AlertCircle, Utensils, X, Check
} from "lucide-react";
import { formatRp } from "../utils/thermalPrinter";

const ONLINE_FOOD_TYPES = ["GOFOOD", "GRABFOOD", "SHOPEEFOOD"];
const MENU_CHANNEL_BY_TYPE = {
  "DINE IN": "reguler",
  "TAKE AWAY": "reguler",
  GOFOOD: "gofood",
  GRABFOOD: "grabfood",
  SHOPEEFOOD: "shopeefood",
};

export default function POSOrderView({
  order,
  setOrder,
  getMenusForType,
  categories,
  tables,
  onBack,
  onSaveOrder,
  onPay,
  onPrintReceipt,
  onPrintKitchen,
  itemPrice,
  computeTotals,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [customerName, setCustomerName] = useState(order.customerName || "");
  const [selectedTable, setSelectedTable] = useState(order.tableName || (tables[0]?.name || "Meja 1"));
  const [orderType, setOrderType] = useState(order.orderType || "DINE IN");
  const [orderNote, setOrderNote] = useState(order.note || "");
  const [discountPercent, setDiscountPercent] = useState(order.discountPercent || 0);
  const [validationError, setValidationError] = useState("");
  const [pickerMenu, setPickerMenu] = useState(null);
  const [pickerSelections, setPickerSelections] = useState({});
  const [pickerNote, setPickerNote] = useState("");
  const [pickerError, setPickerError] = useState("");

  const isOnlineFood = ONLINE_FOOD_TYPES.includes(orderType);
  const custNameMissing = isOnlineFood && !customerName.trim();

  // Menu mengikuti channel dari tipe pesanan yang dipilih.
  const menuChannel = MENU_CHANNEL_BY_TYPE[orderType] || "reguler";
  const menus = getMenusForType(orderType);

  // Bila channel menu berganti (mis. Take Away -> GoFood), kosongkan keranjang
  // karena tiap channel punya menu & harga sendiri.
  const prevChannelRef = useRef(menuChannel);
  useEffect(() => {
    if (prevChannelRef.current !== menuChannel) {
      prevChannelRef.current = menuChannel;
      setOrder((prev) => ({ ...prev, items: [] }));
    }
  }, [menuChannel, setOrder]);

  const validateBeforeAction = () => {
    if (custNameMissing) {
      setValidationError(`Nama Customer WAJIB diisi untuk pesanan ${orderType}. Nama akan dicetak di struk.`);
      return false;
    }
    setValidationError("");
    return true;
  };

  const handlePayClick = () => {
    if (!validateBeforeAction()) return;
    onPay();
  };

  const handleSaveClick = () => {
    if (!validateBeforeAction()) return;
    onSaveOrder(order);
  };

  const handlePrintKitchenClick = () => {
    if (!validateBeforeAction()) return;
    onPrintKitchen();
  };

  const handlePrintReceiptClick = () => {
    if (!validateBeforeAction()) return;
    onPrintReceipt();
  };

  useEffect(() => {
    setOrder((prev) => ({
      ...prev,
      customerName,
      tableName: orderType === "DINE IN" ? selectedTable : "",
      orderType,
      note: orderNote,
      discountPercent,
    }));
  }, [customerName, selectedTable, orderType, orderNote, discountPercent, setOrder]);

  const filteredMenus = menus.filter((m) => {
    const matchCat = selectedCategory === "ALL" || m.category === selectedCategory;
    const matchQuery = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const addConfiguredItem = (menu, selectedOptions = [], note = "") => {
    if (!menu || menu.stock <= 0) return;
    const modifierTotal = selectedOptions.reduce((sum, option) => sum + (Number(option.price) || 0), 0);
    const promoPercent = Number(menu.discount) || 0;
    const basePrice = Number(menu.price) || 0;
    const discountedBasePrice = itemPrice(menu);
    const promoAmountPerUnit = Math.max(0, basePrice - discountedBasePrice);
    const unitPrice = discountedBasePrice + modifierTotal;
    const optionKey = selectedOptions.map((o) => o.id).sort().join(",");
    const lineId = `${menu.id}|${optionKey}|${String(note || "").trim()}`;
    setOrder((prev) => {
      const items = prev.items || [];
      const existing = items.find((i) => (i.lineId || i.menuId) === lineId);
      if (existing) {
        if (existing.qty >= menu.stock) return prev;
        return { ...prev, items: items.map((i) => (i.lineId || i.menuId) === lineId ? { ...i, qty: i.qty + 1, subtotal: unitPrice * (i.qty + 1) } : i) };
      }
      return {
        ...prev,
        items: [...items, {
          lineId, menuId: menu.id, name: menu.name, price: unitPrice, unitPrice, qty: 1,
          basePrice, baseUnitPrice: discountedBasePrice, promoPercent, promoAmountPerUnit,
          subtotal: unitPrice, note: String(note || "").trim(), modifierTotal,
          options: selectedOptions.map((o) => ({ id: o.id, groupName: o.groupName, name: o.name, price: Number(o.price) || 0 })),
          itemDiscountPercent: 0,
        }],
      };
    });
  };

  const addItem = (menu) => {
    if (menu.stock <= 0) return;
    const groups = (menu.optionGroups || []).filter((g) => (g.options || []).length > 0);
    if (!groups.length) addConfiguredItem(menu);
    else {
      setPickerMenu(menu);
      setPickerSelections({});
      setPickerNote("");
      setPickerError("");
    }
  };

  const confirmPicker = () => {
    if (!pickerMenu) return;
    const groups = (pickerMenu.optionGroups || []).filter((g) => (g.options || []).length > 0);
    const missing = groups.find((g) => g.required && !pickerSelections[g.id]);
    if (missing) {
      setPickerError(`Silakan pilih ${missing.name} terlebih dahulu.`);
      return;
    }
    const selectedOptions = groups.flatMap((g) => {
      const selected = pickerSelections[g.id];
      if (!selected) return [];
      const option = (g.options || []).find((o) => o.id === selected);
      return option ? [{ ...option, groupName: g.name }] : [];
    });
    addConfiguredItem(pickerMenu, selectedOptions, pickerNote);
    setPickerMenu(null);
  };

  const setItemDiscount = (lineId, value) => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    setOrder((prev) => ({
      ...prev,
      items: (prev.items || []).map((item) => (item.lineId || item.menuId) === lineId ? { ...item, itemDiscountPercent: pct } : item),
    }));
  };

  const changeQty = (lineId, delta) => {
    setOrder((prev) => {
      const items = prev.items || [];
      const updated = items
        .map((i) => {
          if ((i.lineId || i.menuId) !== lineId) return i;
          const menu = menus.find((m) => m.id === i.menuId);
          const newQty = i.qty + delta;
          if (delta > 0 && menu && newQty > menu.stock) return i;
          return { ...i, qty: newQty, subtotal: Number(i.unitPrice ?? i.price ?? (menu ? itemPrice(menu) : 0)) * newQty };
        })
        .filter((i) => i.qty > 0);
      return { ...prev, items: updated };
    });
  };

  const totals = computeTotals(order, menus);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* KATSU MENU CATALOG */}
      <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              data-testid="btn-back-to-floor"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="font-bold text-base text-slate-900">Pilih Menu</h2>
              <p className="text-xs text-slate-500">
                Tipe: <span className="font-bold text-orange-600">{orderType}</span> {orderType === "DINE IN" && `(${selectedTable})`}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="input-search-menu"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button
            data-testid="cat-filter-all"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-orange-600 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua Menu
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              data-testid={`cat-filter-${c.id}`}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.name
                  ? "bg-orange-600 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[58vh] overflow-y-auto pr-1">
          {filteredMenus.map((menu) => {
            const hasDisc = (menu.discount || 0) > 0;
            const finalP = itemPrice(menu);
            const inCart = (order.items || []).filter((i) => i.menuId === menu.id).reduce((sum, i) => sum + (i.qty || 0), 0);

            return (
              <button
                key={menu.id}
                data-testid={`menu-item-card-${menu.id}`}
                onClick={() => addItem(menu)}
                disabled={menu.stock <= 0}
                className={`text-left p-3 rounded-2xl border-2 transition relative flex flex-col justify-between group ${
                  menu.stock <= 0
                    ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                    : inCart
                    ? "bg-orange-50/50 border-orange-500 shadow-sm"
                    : "bg-white border-slate-200 hover:border-orange-400 hover:shadow-md"
                }`}
              >
                {hasDisc && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    -{menu.discount}%
                  </span>
                )}

                <div>
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-2 flex items-center justify-center">
                    {menu.image ? (
                      <img src={menu.image} alt={menu.name} className="w-full h-full object-cover" />
                    ) : (
                      <Utensils size={22} className="text-slate-300" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {menu.name}
                  </div>
                  {(menu.optionGroups || []).some((g) => (g.options || []).length > 0) && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-1.5 py-0.5">
                      Pilih varian & tambahan
                    </div>
                  )}
                  {menu.description && (
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{menu.description}</p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {hasDisc ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 line-through">{formatRp(menu.price)}</span>
                        <span className="text-xs font-black text-orange-600">{formatRp(finalP)}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-slate-800">{formatRp(finalP)}</span>
                    )}
                  </div>
                  {inCart > 0 ? (
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">
                      {inCart}
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-orange-100 group-hover:text-orange-600 text-slate-400 text-xs font-bold flex items-center justify-center transition">
                      +
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ORDER CART SUMMARY */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Tipe Pesanan & Info</span>
            <span className="text-[10px] bg-orange-600 text-white font-black px-2 py-0.5 rounded-full">
              {orderType}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {["DINE IN", "TAKE AWAY", "GOFOOD", "GRABFOOD", "SHOPEEFOOD"].map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`select-ordertype-${t.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setOrderType(t)}
                className={`py-1 text-[10px] font-bold rounded-lg border transition ${
                  orderType === t
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {orderType === "DINE IN" && (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nomor Meja</label>
              <select
                data-testid="select-table-dropdown"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <UserRound size={12} className="text-orange-600" />
              <span>
                Nama Customer{" "}
                {isOnlineFood ? (
                  <span className="text-red-600 font-black">*WAJIB ({orderType})</span>
                ) : (
                  <span className="text-slate-400">(opsional)</span>
                )}
              </span>
            </label>
            <input
              data-testid="input-customer-name"
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (validationError) setValidationError("");
              }}
              placeholder={isOnlineFood ? "Wajib: cth. Driver Andi / Order #123" : "cth: Budi / Kak Sarah"}
              className={`w-full text-xs bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 border ${
                custNameMissing ? "border-red-500 bg-red-50" : "border-slate-300"
              }`}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <StickyNote size={12} className="text-orange-600" />
              <span>Catatan Pesanan / Dapur</span>
            </label>
            <input
              data-testid="input-order-note"
              type="text"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="cth: Kuah kari dipisah, extra pedas"
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
          <div className="text-xs font-bold text-slate-700 flex justify-between">
            <span>Daftar Pesanan ({order.items?.length || 0})</span>
            {order.items?.length > 0 && (
              <button
                onClick={() => setOrder((prev) => ({ ...prev, items: [] }))}
                className="text-red-500 text-[11px] hover:underline"
              >
                Kosongkan
              </button>
            )}
          </div>

          {(!order.items || order.items.length === 0) && (
            <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-xl">
              Keranjang masih kosong. Klik menu di samping.
            </div>
          )}

          {(order.items || []).map((item) => (
            <div
              key={item.lineId || item.menuId}
              className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 break-words">{item.name}</div>
                {(item.options || []).map((option, oi) => (
                  <div key={oi} className="text-[10px] text-slate-500">{option.groupName ? `${option.groupName}: ` : ""}{option.name}{option.price ? ` (+${formatRp(option.price)})` : ""}</div>
                ))}
                {item.note && <div className="text-[10px] text-slate-500 italic">Catatan: {item.note}</div>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">Diskon item</span>
                  <div className="flex items-center gap-1"><input type="number" min="0" max="100" value={item.itemDiscountPercent || 0} onChange={(e) => setItemDiscount(item.lineId || item.menuId, e.target.value)} className="w-14 text-[10px] text-right border border-slate-300 rounded px-1.5 py-1" /><span className="text-[10px] text-slate-500">%</span></div>
                </div>
                <div className="text-[11px] text-orange-600 font-bold">{item.qty} × {formatRp(item.unitPrice ?? item.price)} = {formatRp(Math.max(0, (item.unitPrice ?? item.price) * item.qty - Math.round(((item.unitPrice ?? item.price) * item.qty * (Number(item.itemDiscountPercent) || 0)) / 100)))}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  data-testid={`qty-minus-${item.lineId || item.menuId}`}
                  onClick={() => changeQty(item.lineId || item.menuId, -1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs"
                >
                  <Minus size={12} />
                </button>
                <span className="w-5 text-center text-xs font-bold">{item.qty}</span>
                <button
                  data-testid={`qty-plus-${item.lineId || item.menuId}`}
                  onClick={() => changeQty(item.lineId || item.menuId, 1)}
                  className="w-6 h-6 rounded-lg bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-orange-700 text-xs"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Discount */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1"><Percent size={12} /> Diskon seluruh struk (%)</span>
            <input data-testid="input-discount-percent" type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-16 text-right font-bold text-xs border border-slate-300 rounded px-2 py-1" />
          </div>
          <div className="text-[10px] text-slate-400">Diskon item diatur langsung pada masing-masing baris menu. Diskon struk diterapkan setelah diskon item.</div>
        </div>

        {/* Totals */}
        <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold">{formatRp(totals.subtotal)}</span>
          </div>
          {totals.itemDiscountAmount > 0 && <div className="flex justify-between text-red-600 font-semibold"><span>Diskon item</span><span>-{formatRp(totals.itemDiscountAmount)}</span></div>}
          {totals.discountAmount > 0 && <div className="flex justify-between text-red-600 font-semibold"><span>Diskon struk ({totals.discountPercent}%)</span><span>-{formatRp(totals.discountAmount)}</span></div>}
          <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
            <span>TOTAL BAYAR</span>
            <span className="text-orange-600">{formatRp(totals.total)}</span>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div
            data-testid="order-validation-error"
            className="p-2.5 bg-red-50 border border-red-300 text-red-700 text-[11px] rounded-xl flex items-center gap-2 font-semibold"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            data-testid="btn-pay-order"
            onClick={handlePayClick}
            disabled={!order.items || order.items.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Bayar Sekarang ({formatRp(totals.total)})
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid="btn-save-order"
              onClick={handleSaveClick}
              disabled={!order.items || order.items.length === 0}
              className="py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition disabled:opacity-40"
            >
              Simpan ke Antrean
            </button>
            <button
              data-testid="btn-print-kitchen-ticket"
              onClick={handlePrintKitchenClick}
              disabled={!order.items || order.items.length === 0}
              className="py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-1 transition disabled:opacity-40"
            >
              <ChefHat size={14} />
              <span>Struk Dapur</span>
            </button>
          </div>
          <button
            data-testid="btn-print-unpaid-receipt"
            onClick={handlePrintReceiptClick}
            disabled={!order.items || order.items.length === 0}
            className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition disabled:opacity-40"
          >
            <Printer size={14} /> Cetak Struk Kasir — BELUM BAYAR
          </button>
        </div>
      </div>

      {pickerMenu && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="menu-option-picker">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div><h3 className="font-black text-base text-slate-900">Pilih {pickerMenu.name}</h3><p className="text-xs text-slate-500">Atur varian dan tambahan sebelum masuk keranjang.</p></div>
              <button onClick={() => setPickerMenu(null)} className="p-1 text-slate-400 hover:text-slate-700"><X size={17} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-[11px] text-orange-800 font-semibold">Pilih varian seperti di ShopeeFood. Pilihan bertanda <b>Wajib pilih</b> harus diisi sebelum ditambahkan.</div>
              {(pickerMenu.optionGroups || []).filter((g) => (g.options || []).length > 0).map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between"><div className="text-xs font-black text-slate-800">{group.name}</div><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.required ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>{group.required ? "Wajib pilih" : "Opsional"}</span></div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(group.options || []).map((option) => {
                      const active = pickerSelections[group.id] === option.id;
                      return <button type="button" key={option.id} onClick={() => setPickerSelections((prev) => ({ ...prev, [group.id]: option.id }))} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 text-left text-xs transition ${active ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 hover:border-orange-300"}`}><span className="font-bold">{active ? "✓ " : ""}{option.name}</span><span className="font-black">{Number(option.price) > 0 ? `+${formatRp(option.price)}` : "Gratis"}</span></button>;
                    })}
                  </div>
                </div>
              ))}
              {pickerError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-[11px] font-bold">{pickerError}</div>}
              <div><label className="text-xs font-bold text-slate-700 block mb-1">Catatan item (opsional)</label><input value={pickerNote} onChange={(e) => setPickerNote(e.target.value)} placeholder="Contoh: sambal dipisah" className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2" /></div>
            </div>
            <div className="flex gap-2 mt-5"><button onClick={() => setPickerMenu(null)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600">Batal</button><button onClick={confirmPicker} className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black flex items-center justify-center gap-1.5"><Check size={14} /> Tambah ke Pesanan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
