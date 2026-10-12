import React, { useState, useEffect, useCallback } from "react";
import axios from "./lib/localApi";
import { Utensils, Store, FileSpreadsheet, Users, SlidersHorizontal, LogOut, CheckCircle2, Boxes, Bike, Wallet } from "lucide-react";
import { printThermalReceipt, printKitchenLabels } from "./utils/thermalPrinter";
import { DEFAULT_SETTINGS } from "./lib/localApi";

import LoginScreen from "./components/LoginScreen";
import FloorAndQueueView from "./components/FloorAndQueueView";
import POSOrderView from "./components/POSOrderView";
import OrderTypeSelectorModal from "./components/OrderTypeSelectorModal";
import PaymentProcessModal from "./components/PaymentProcessModal";
import ReceiptPreviewModal from "./components/ReceiptPreviewModal";
import MenuManagerView from "./components/MenuManagerView";
import LaporanSalesView from "./components/LaporanSalesView";
import AkunKasirView from "./components/AkunKasirView";
import PengaturanStrukView from "./components/PengaturanStrukView";
import BahanBakuView from "./components/BahanBakuView";
import OmzetMerchantView from "./components/OmzetMerchantView";
import KeuanganView from "./components/KeuanganView";

const API = "/api";

function emptyOrder(type = "DINE IN", tableName = "", customerName = "") {
  return {
    id: "ord-" + Date.now(),
    orderType: type,
    tableName: tableName,
    customerName: customerName,
    items: [],
    discountPercent: 0,
    note: "",
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowHM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function itemPrice(menu) {
  if (!menu) return 0;
  const disc = menu.discount || 0;
  return Math.round(menu.price * (1 - disc / 100));
}

function computeTotals(order, menus) {
  const items = order?.items || [];
  const lineSummary = items.map((i) => {
    const m = menus?.find((mm) => mm.id === i.menuId);
    const modifierTotal = Number(i.modifierTotal) || 0;
    const basePrice = Number(i.basePrice ?? m?.price ?? 0);
    const baseUnitPrice = Number(i.baseUnitPrice ?? (m ? itemPrice(m) : i.unitPrice ?? i.price ?? 0));
    const unitPrice = Number(i.unitPrice ?? (baseUnitPrice + modifierTotal));
    const qty = Number(i.qty) || 0;
    const gross = unitPrice * qty;
    const promoPercent = Number(i.promoPercent ?? m?.discount ?? 0) || 0;
    const promoAmount = Math.max(0, basePrice - baseUnitPrice) * qty;
    const itemDiscountPercent = Math.max(0, Math.min(100, Number(i.itemDiscountPercent) || 0));
    const itemDiscountAmount = Math.round((gross * itemDiscountPercent) / 100);
    return { ...i, unitPrice, basePrice, baseUnitPrice, modifierTotal, promoPercent, promoAmount, gross, itemDiscountPercent, itemDiscountAmount, net: Math.max(0, gross - itemDiscountAmount) };
  });
  const grossSubtotal = lineSummary.reduce((sum, i) => sum + i.gross, 0);
  const netSubtotal = lineSummary.reduce((sum, i) => sum + i.net, 0);
  const itemDiscountAmount = lineSummary.reduce((sum, i) => sum + i.itemDiscountAmount, 0);
  const discountPercent = Math.max(0, Math.min(100, Number(order?.discountPercent) || 0));
  const discountAmount = Math.round((netSubtotal * discountPercent) / 100);
  const total = Math.max(0, netSubtotal - discountAmount);
  return { subtotal: grossSubtotal, netSubtotal, itemDiscountAmount, discountPercent, discountAmount, total, lineSummary };
}

// Pemetaan tipe pesanan -> channel menu. Dine In & Take Away berbagi menu "reguler".
const MENU_CHANNEL_BY_TYPE = {
  "DINE IN": "reguler",
  "TAKE AWAY": "reguler",
  GOFOOD: "gofood",
  GRABFOOD: "grabfood",
  SHOPEEFOOD: "shopeefood",
};

function menuChannelForType(type) {
  return MENU_CHANNEL_BY_TYPE[type] || "reguler";
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("mamlah_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSetSession = (newSession) => {
    setSession(newSession);
    if (newSession) {
      localStorage.setItem("mamlah_session", JSON.stringify(newSession));
    } else {
      localStorage.removeItem("mamlah_session");
    }
  };

  const [cashiers, setCashiers] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    axios.get(`${API}/settings`).then((res) => {
      if (res.data) setSettings(res.data);
    }).catch(() => console.log("Using default settings"));

    axios.get(`${API}/cashiers`).then((res) => {
      if (res.data) setCashiers(res.data);
    }).catch(() => console.log("Using default cashiers"));
  }, []);

  if (!session) {
    return <LoginScreen onLogin={handleSetSession} storeName={settings.storeName} API={API} />;
  }

  return (
    <MainKasirApp
      session={session}
      onLogout={() => handleSetSession(null)}
      settings={settings}
      setSettings={setSettings}
      cashiers={cashiers}
      setCashiers={setCashiers}
    />
  );
}

function MainKasirApp({ session, onLogout, settings, setSettings, cashiers, setCashiers }) {
  const isManager = session.role === "manager";
  const [view, setView] = useState("kasir");
  const [menus, setMenus] = useState([]);
  const [channelMenus, setChannelMenus] = useState({ gofood: [], grabfood: [], shopeefood: [] });
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState("ALL");
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receiptTx, setReceiptTx] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [editFloorLayout, setEditFloorLayout] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [mRes, cRes, tRes, oRes, goRes, grabRes, spRes, ingRes] = await Promise.all([
        axios.get(`${API}/menu`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/tables`),
        axios.get(`${API}/orders/active`),
        axios.get(`${API}/menu?channel=gofood`),
        axios.get(`${API}/menu?channel=grabfood`),
        axios.get(`${API}/menu?channel=shopeefood`),
        axios.get(`${API}/ingredients`),
      ]);
      if (mRes.data) setMenus(mRes.data);
      if (cRes.data) setCategories(cRes.data);
      if (tRes.data) setTables(tRes.data);
      if (oRes.data) setActiveOrders(oRes.data);
      if (ingRes.data) setIngredients(ingRes.data);
      setChannelMenus({
        gofood: goRes.data || [],
        grabfood: grabRes.data || [],
        shopeefood: spRes.data || [],
      });
    } catch (e) {
      console.log("Offline data");
    }
  }, []);

  // Menu yang dipakai untuk sebuah tipe pesanan (channel-specific).
  const getMenusForType = useCallback(
    (type) => {
      const ch = menuChannelForType(type);
      return ch === "reguler" ? menus : channelMenus[ch] || [];
    },
    [menus, channelMenus]
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  };

  const handlePrintResult = (label) => (res) => {
    if (res && res.ok === false) showToast(`Gagal cetak ${label}: ${res.reason || "cek printer"}`);
    else if (window.electronAPI) showToast(`${label} terkirim ke printer`);
  };
  const buildReceiptTx = (order, paymentStatus = "BELUM BAYAR") => {
    const orderMenus = getMenusForType(order.orderType);
    const totals = computeTotals(order, orderMenus);
    const now = new Date();
    return {
      ...order,
      id: order.id || `ord-${Date.now()}`,
      date: todayStr(),
      time: nowHM(),
      source: order.tableName || order.orderType,
      cashierName: session.name,
      customerName: order.customerName || "-",
      items: (order.items || []).map((it) => {
        const m = orderMenus.find((mm) => mm.id === it.menuId);
        const p = Number(it.unitPrice ?? it.price ?? (m ? itemPrice(m) : 0));
        return { ...it, price: p, unitPrice: p, basePrice: Number(it.basePrice ?? m?.price ?? p), baseUnitPrice: Number(it.baseUnitPrice ?? (m ? itemPrice(m) : p)), promoPercent: Number(it.promoPercent ?? m?.discount ?? 0), modifierTotal: Number(it.modifierTotal) || 0, subtotal: p * (it.qty || 1), options: Array.isArray(it.options) ? it.options : [] };
      }),
      subtotal: totals.subtotal,
      itemDiscountAmount: totals.itemDiscountAmount,
      discountPercent: totals.discountPercent,
      discountAmount: totals.discountAmount,
      total: totals.total,
      paymentStatus,
      paymentMethod: paymentStatus === "LUNAS" ? order.paymentMethod : "BELUM BAYAR",
    };
  };

  const doPrintReceipt = (tx) => {
    const printed = { ...tx, receiptPrintCount: Number(tx.receiptPrintCount || 0) + 1 };
    setReceiptTx(printed);
    return printThermalReceipt(printed, settings).then(handlePrintResult("struk"));
  };
  const doPrintKitchen = (order) => {
    const printed = { ...order, kitchenPrintCount: Number(order.kitchenPrintCount || 0) + 1 };
    if (currentOrder?.id === order?.id) setCurrentOrder(printed);
    if (receiptTx?.id === order?.id) setReceiptTx(printed);
    return printKitchenLabels(printed, settings).then(handlePrintResult("struk dapur"));
  };

  const handleStartOrder = (type, tableName = "", customerName = "") => {
    const newOrd = emptyOrder(type, tableName, customerName);
    setCurrentOrder(newOrd);
    setShowOrderTypeModal(false);
    setView("order");
  };

  const handleOpenTable = (table) => {
    if (editFloorLayout) return;
    const existing = activeOrders.find(
      (o) => o.orderType === "DINE IN" && (o.tableName === table.name || o.id === table.id)
    );
    if (existing) {
      setCurrentOrder(existing);
    } else {
      setCurrentOrder(emptyOrder("DINE IN", table.name));
    }
    setView("order");
  };

  const handleOpenOrder = (order) => {
    setCurrentOrder(order);
    setView("order");
  };

  const handleSaveOrder = async (orderToSave) => {
    if (!orderToSave.items || orderToSave.items.length === 0) {
      showToast("Pesanan kosong, tidak ada item untuk disimpan");
      return;
    }
    try {
      await axios.post(`${API}/orders/active`, orderToSave);
    } catch (e) {
      console.error(e);
    }
    setActiveOrders((prev) => {
      const filtered = prev.filter((o) => o.id !== orderToSave.id);
      return [...filtered, orderToSave];
    });
    showToast(`Pesanan [${orderToSave.orderType}] berhasil disimpan ke antrean`);
    setView("kasir");
    setCurrentOrder(null);
  };

  const handleCompletePayment = async (paymentData) => {
    const now = new Date();
    const dateStr = todayStr();
    const timeStr = nowHM();
    const orderMenus = getMenusForType(currentOrder.orderType);
    const totals = computeTotals(currentOrder, orderMenus);

    let sourceName = currentOrder.tableName || currentOrder.orderType;
    if (currentOrder.orderType === "DINE IN") {
      sourceName = currentOrder.tableName || "Meja";
    } else if (currentOrder.orderType === "TAKE AWAY") {
      sourceName = currentOrder.customerName ? `Take Away - ${currentOrder.customerName}` : "Take Away";
    } else {
      sourceName = `${currentOrder.orderType} #${(currentOrder.id || "").slice(-4).toUpperCase()}`;
    }

    const tx = {
      id: "tx-" + Date.now(),
      date: dateStr,
      time: timeStr,
      orderType: currentOrder.orderType,
      source: sourceName,
      cashierName: session.name,
      customerName: currentOrder.customerName || "-",
      items: currentOrder.items.map((it) => {
        const m = orderMenus.find((mm) => mm.id === it.menuId);
        const p = Number(it.unitPrice ?? it.price ?? (m ? itemPrice(m) : 0));
        return {
          menuId: it.menuId,
          lineId: it.lineId || it.menuId,
          name: it.name,
          price: p,
          unitPrice: p,
          basePrice: Number(it.basePrice ?? m?.price ?? p),
          baseUnitPrice: Number(it.baseUnitPrice ?? (m ? itemPrice(m) : p)),
          promoPercent: Number(it.promoPercent ?? m?.discount ?? 0) || 0,
          promoAmount: Number(it.promoAmount ?? 0) || 0,
          modifierTotal: Number(it.modifierTotal) || 0,
          qty: it.qty,
          subtotal: p * it.qty,
          cost: m ? Number(m.cost) || 0 : it.cost || 0,
          note: it.note || "",
          options: Array.isArray(it.options) ? it.options : [],
          itemDiscountPercent: Number(it.itemDiscountPercent) || 0,
          itemDiscountAmount: Math.round(((Number(it.unitPrice ?? it.price) || 0) * (Number(it.qty) || 0) * (Number(it.itemDiscountPercent) || 0)) / 100),
        };
      }),
      subtotal: totals.subtotal,
      itemDiscountAmount: totals.itemDiscountAmount,
      discountPercent: totals.discountPercent,
      discountAmount: totals.discountAmount,
      taxAmount: 0,
      total: totals.total,
      paymentMethod: paymentData.method,
      cash: paymentData.cash,
      change: paymentData.change,
      paymentStatus: "LUNAS",
      receiptPrintCount: 0,
      kitchenPrintCount: Number(currentOrder.kitchenPrintCount) || 0,
      note: currentOrder.note || "",
    };

    try {
      await axios.post(`${API}/transactions`, tx);
      await axios.delete(`${API}/orders/active/${currentOrder.id}`);
    } catch (e) {
      console.error(e);
    }

    setActiveOrders((prev) => prev.filter((o) => o.id !== currentOrder.id));
    const decrement = (list) =>
      list.map((m) => {
        const it = currentOrder.items.find((i) => i.menuId === m.id);
        return it ? { ...m, stock: Math.max(0, (m.stock || 0) - it.qty) } : m;
      });
    setMenus((prev) => decrement(prev));
    setChannelMenus((prev) => ({
      gofood: decrement(prev.gofood || []),
      grabfood: decrement(prev.grabfood || []),
      shopeefood: decrement(prev.shopeefood || []),
    }));

    setShowPaymentModal(false);
    setView("kasir");
    setCurrentOrder(null);
    setReceiptTx(tx);
    showToast("Pembayaran Berhasil!");

    doPrintReceipt(tx);
  };

  const navTabs = [
    { id: "kasir", label: "Kasir & Meja", icon: Store },
    ...(isManager
      ? [
          { id: "menu", label: "Menu & HPP", icon: Utensils },
          { id: "bahan", label: "Bahan Baku", icon: Boxes },
          { id: "merchant", label: "Omzet Merchant", icon: Bike },
          { id: "keuangan", label: "Keuangan", icon: Wallet },
          { id: "laporan", label: "Laporan & Closing", icon: FileSpreadsheet },
          { id: "akun", label: "Akun Kasir", icon: Users },
          { id: "pengaturan", label: "Pengaturan", icon: SlidersHorizontal },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f6f7fb] flex flex-col font-sans text-slate-800">
      <header className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white shadow-lg sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Utensils size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-wide uppercase" data-testid="app-brand-name">
                  {settings.storeName || "MAMLAH - SOLUSI KELAPARAN"}
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium">{settings.tagline || "Solusi Kelaparan"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl backdrop-blur-sm flex-wrap">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = view === tab.id || (tab.id === "kasir" && view === "order");
              return (
                <button
                  key={tab.id}
                  data-testid={`nav-tab-${tab.id}`}
                  onClick={() => {
                    setView(tab.id);
                    if (tab.id !== "order") setCurrentOrder(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                    active ? "bg-white text-orange-600 shadow-md" : "text-amber-100 hover:bg-white/10"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 border-l border-white/20 pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold">{session.name}</div>
              <div className="text-[10px] text-amber-200 uppercase">{isManager ? "Manager (Full)" : "Kasir"}</div>
            </div>
            <button
              data-testid="logout-button"
              onClick={onLogout}
              title="Keluar"
              className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 transition text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center shadow flex items-center justify-center gap-2 sticky top-[58px] z-50">
          <CheckCircle2 size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-[1500px] w-full mx-auto p-3 sm:p-5">
        {view === "kasir" && (
          <FloorAndQueueView
            tables={tables}
            setTables={setTables}
            activeOrders={activeOrders}
            menus={menus}
            onOpenTable={handleOpenTable}
            onOpenOrder={handleOpenOrder}
            onStartNewOrder={() => setShowOrderTypeModal(true)}
            canEdit={isManager}
            editLayout={editFloorLayout}
            setEditLayout={setEditFloorLayout}
            selectedChannel={selectedChannelFilter}
            setSelectedChannel={setSelectedChannelFilter}
            computeTotals={computeTotals}
            API={API}
          />
        )}

        {view === "order" && currentOrder && (
          <POSOrderView
            order={currentOrder}
            setOrder={setCurrentOrder}
            getMenusForType={getMenusForType}
            categories={categories}
            tables={tables}
            onBack={() => {
              setView("kasir");
              setCurrentOrder(null);
            }}
            onSaveOrder={handleSaveOrder}
            onPay={() => setShowPaymentModal(true)}
            onPrintReceipt={() => doPrintReceipt(buildReceiptTx(currentOrder))}
            onPrintKitchen={() => doPrintKitchen(currentOrder)}
            itemPrice={itemPrice}
            computeTotals={computeTotals}
          />
        )}

        {view === "menu" && isManager && (
          <MenuManagerView
            menus={menus}
            setMenus={setMenus}
            channelMenus={channelMenus}
            setChannelMenus={setChannelMenus}
            categories={categories}
            setCategories={setCategories}
            onRefresh={refreshData}
            showToast={showToast}
            API={API}
            itemPrice={itemPrice}
            settings={settings}
            ingredients={ingredients}
          />
        )}

        {view === "laporan" && isManager && (
          <LaporanSalesView
            showToast={showToast}
            onReprintReceipt={(tx) => setReceiptTx(tx)}
            API={API}
            todayStr={todayStr}
            settings={settings}
          />
        )}

        {view === "bahan" && isManager && (
          <BahanBakuView
            ingredients={ingredients}
            setIngredients={setIngredients}
            showToast={showToast}
            API={API}
          />
        )}

        {view === "merchant" && isManager && (
          <OmzetMerchantView
            showToast={showToast}
            API={API}
            settings={settings}
          />
        )}

        {view === "keuangan" && isManager && (
          <KeuanganView
            showToast={showToast}
            API={API}
            ingredients={ingredients}
            setIngredients={setIngredients}
          />
        )}

        {view === "akun" && isManager && (
          <AkunKasirView
            cashiers={cashiers}
            setCashiers={setCashiers}
            currentId={session.id}
            showToast={showToast}
            API={API}
          />
        )}

        {view === "pengaturan" && isManager && (
          <PengaturanStrukView
            settings={settings}
            setSettings={setSettings}
            showToast={showToast}
            API={API}
          />
        )}
      </main>

      {showOrderTypeModal && (
        <OrderTypeSelectorModal
          tables={tables}
          onClose={() => setShowOrderTypeModal(false)}
          onSelect={(type, tableName, customerName) => handleStartOrder(type, tableName, customerName)}
        />
      )}

      {showPaymentModal && currentOrder && (
        <PaymentProcessModal
          order={currentOrder}
          menus={getMenusForType(currentOrder.orderType)}
          settings={settings}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleCompletePayment}
          computeTotals={computeTotals}
        />
      )}

      {receiptTx && (
        <ReceiptPreviewModal
          tx={receiptTx}
          settings={settings}
          onClose={() => setReceiptTx(null)}
          onPrintAgain={() => doPrintReceipt(receiptTx)}
          onPrintKitchen={() => doPrintKitchen(receiptTx)}
        />
      )}
    </div>
  );
}
