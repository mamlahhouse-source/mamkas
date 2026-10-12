import React, { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import axios from "../lib/localApi";
import { printThermalReceipt, printKitchenLabels } from "../utils/thermalPrinter";

const SAMPLE_TX = {
  id: "tx-test01",
  orderType: "GOFOOD",
  source: "GOFOOD #TEST",
  customerName: "Budi Santoso",
  cashierName: "Admin",
  date: new Date().toISOString().slice(0, 10),
  time: "12:30",
  items: [
    { name: "Chicken Katsu Curry Rice", qty: 2, price: 28000, subtotal: 56000, note: "Pedas" },
    { name: "Es Teh Manis", qty: 1, price: 5000, subtotal: 5000 },
  ],
  subtotal: 61000,
  discountPercent: 0,
  discountAmount: 0,
  total: 61000,
  paymentMethod: "GOFOOD",
  cash: 61000,
  change: 0,
};

export default function PengaturanStrukView({ settings, setSettings, showToast, API }) {
  const [form, setForm] = useState(settings);
  const [printers, setPrinters] = useState([]);
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [scanningBluetooth, setScanningBluetooth] = useState(false);
  const [serialPorts, setSerialPorts] = useState([]);
  const isElectron = Boolean(window.electronAPI);

  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getPrinters().then((list) => setPrinters(list || []));
      window.electronAPI.getSerialPorts?.().then((result) => {
        const ports = result?.ports || [];
        setSerialPorts(ports);
        if (ports.length && !ports.some((p) => p.port === form.labelRawComPort)) setForm((current) => ({ ...current, labelRawComPort: ports[0].port }));
      });
    }
  }, [isElectron]);

  const report = (label) => (res) => {
    if (res && res.ok === false) showToast(`Gagal cetak ${label}: ${res.reason}`);
    else showToast(`${label} tes dikirim ke printer`);
  };

  const scanBluetooth = async () => {
    if (!window.electronAPI?.scanBluetooth) return;
    setScanningBluetooth(true);
    const result = await window.electronAPI.scanBluetooth();
    setScanningBluetooth(false);
    if (result?.ok) setBluetoothDevices(result.devices || []);
    else showToast(`Scan Bluetooth gagal: ${result?.reason || "cek Bluetooth Windows"}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/settings`, form);
      setSettings(form);
      showToast("Pengaturan struk & printer berhasil diperbarui!");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 max-w-2xl space-y-5">
      <div>
        <h2 className="font-bold text-base text-slate-900" data-testid="settings-title">Pengaturan Struk & Thermal Printer</h2>
        <p className="text-xs text-slate-500">Konfigurasi nama toko KASIR MAMLAH, ukuran kertas 58mm/80mm, dan catatan struk</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Toko (Header Struk)</label>
          <input
            data-testid="input-setting-store-name"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Slogan / Tagline Toko</label>
          <input
            data-testid="input-setting-tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Alamat Lengkap</label>
          <input
            data-testid="input-setting-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">No. Telepon / WhatsApp</label>
          <input
            data-testid="input-setting-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
          />
        </div>

        {/* Paper Size Selector (58mm vs 80mm) */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Ukuran Kertas Thermal</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="btn-paper-58mm"
              onClick={() => setForm({ ...form, paperSize: "58mm" })}
              className={`p-3 rounded-xl border-2 text-left transition ${
                form.paperSize === "58mm"
                  ? "border-orange-500 bg-orange-50 text-orange-900 font-bold"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <div className="text-xs font-black">58mm (Standar / Bluetooth)</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Printer kasir portabel kecil</div>
            </button>
            <button
              type="button"
              data-testid="btn-paper-80mm"
              onClick={() => setForm({ ...form, paperSize: "80mm" })}
              className={`p-3 rounded-xl border-2 text-left transition ${
                form.paperSize === "80mm"
                  ? "border-orange-500 bg-orange-50 text-orange-900 font-bold"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <div className="text-xs font-black">80mm (Desktop POS)</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Printer kasir kabel USB / LAN</div>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-orange-50/50 p-4 space-y-3">
          <div>
            <h3 className="text-xs font-black text-slate-800">Komisi / Pajak Merchant per Channel (%)</h3>
            <p className="text-[11px] text-slate-500">Dipakai untuk menghitung keuntungan bersih di Kelola Menu. Dine In & Take Away tidak kena komisi.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">GoFood (%)</label>
              <input
                data-testid="input-commission-gofood"
                type="number"
                min="0"
                max="100"
                value={form.gofoodCommission ?? 20}
                onChange={(e) => setForm({ ...form, gofoodCommission: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">GrabFood (%)</label>
              <input
                data-testid="input-commission-grabfood"
                type="number"
                min="0"
                max="100"
                value={form.grabfoodCommission ?? 20}
                onChange={(e) => setForm({ ...form, grabfoodCommission: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">ShopeeFood (%)</label>
              <input
                data-testid="input-commission-shopeefood"
                type="number"
                min="0"
                max="100"
                value={form.shopeefoodCommission ?? 25}
                onChange={(e) => setForm({ ...form, shopeefoodCommission: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-orange-600" />
            <span className="text-xs font-black text-slate-800">Printer Thermal</span>
          </div>
          {isElectron ? (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Pilih Printer</label>
                <select
                  data-testid="select-printer"
                  value={form.printerName || ""}
                  onChange={(e) => setForm({ ...form, printerName: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                >
                  <option value="">Printer default Windows</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? " (default)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="border-y border-slate-200 py-3 space-y-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mode Cetak Struk</label>
                <select data-testid="select-print-mode" value={form.printMode || "escpos"} onChange={(e) => setForm({ ...form, printMode: e.target.value })} className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2">
                  <option value="escpos">ESC/POS Langsung (native printer)</option>
                  <option value="html">HTML / Driver (cadangan)</option>
                </select>
                {(form.printMode || "escpos") === "escpos" && <>
                  <select data-testid="select-raw-connection" value={form.rawConnection || "usb"} onChange={(e) => setForm({ ...form, rawConnection: e.target.value })} className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2">
                    <option value="usb">USB Windows RAW</option><option value="bluetooth">Bluetooth / COM</option><option value="lan">LAN / Wi-Fi (port 9100)</option>
                  </select>
                  {form.rawConnection === "bluetooth" && <input value={form.rawComPort || "COM3"} onChange={(e) => setForm({ ...form, rawComPort: e.target.value })} placeholder="COM3" className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" />}
                  {form.rawConnection === "lan" && <div className="grid grid-cols-2 gap-2"><input value={form.rawHost || ""} onChange={(e) => setForm({ ...form, rawHost: e.target.value })} placeholder="IP printer" className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" /><input type="number" value={form.rawPort || 9100} onChange={(e) => setForm({ ...form, rawPort: Number(e.target.value) })} className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" /></div>}
                  <p className="text-[11px] text-slate-500">ESC/POS mengirim teks mentah ke font bawaan printer, tanpa gambar atau driver raster.</p>
                </>}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  data-testid="toggle-silent-print"
                  type="checkbox"
                  checked={false}
                  readOnly
                  disabled
                  className="w-4 h-4 accent-orange-600"
                />
                Tampilkan dialog printer (pilih Print as Soft Font)
              </label>
              <div className="border-t border-slate-200 pt-3">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Printer Label Dapur (stiker)</label>
                <select
                  data-testid="select-label-printer"
                  value={form.labelPrinterName || ""}
                  onChange={(e) => setForm({ ...form, labelPrinterName: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                >
                  <option value="">Sama dengan printer struk</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                  ))}
                </select>
                <label className="text-xs font-semibold text-slate-600 block mt-2 mb-1">Mode Cetak Dapur</label>
                <select data-testid="select-label-print-mode" value={form.labelPrintMode || "escpos"} onChange={(e) => setForm({ ...form, labelPrintMode: e.target.value })} className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2">
                  <option value="escpos">ESC/POS Langsung (native printer)</option>
                  <option value="html">HTML / Driver (cadangan)</option>
                </select>
                {(form.labelPrintMode || "escpos") === "escpos" && <>
                  <div className="flex items-center justify-between gap-2 mt-2"><span className="text-[11px] text-slate-500">Scan perangkat Bluetooth dari Electron</span><div className="flex gap-1.5"><button type="button" onClick={() => window.electronAPI?.openBluetoothSettings()} className="px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-[11px] font-bold">Pair Windows</button><button type="button" data-testid="btn-scan-bluetooth" onClick={scanBluetooth} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold">{scanningBluetooth ? "Mencari..." : "Scan Bluetooth"}</button></div></div>
                  {bluetoothDevices.length > 0 && <div className="rounded-lg bg-white border border-slate-200 p-2 text-[11px] space-y-1">{bluetoothDevices.map((device) => <div key={device.id || device.name} className="flex justify-between gap-2"><span className="font-bold">{device.name}</span><span className="text-slate-500">{device.status}</span></div>)}</div>}
                  <select data-testid="select-label-raw-connection" value={form.labelRawConnection || "bluetooth"} onChange={(e) => setForm({ ...form, labelRawConnection: e.target.value })} className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 mt-2">
                    <option value="usb">USB Windows RAW</option><option value="bluetooth">Bluetooth / COM</option><option value="lan">LAN / Wi-Fi (port 9100)</option>
                  </select>
                  {(form.labelRawConnection || "bluetooth") === "bluetooth" && <div className="grid grid-cols-2 gap-2 mt-2"><select data-testid="select-label-com-port" value={form.labelRawComPort || ""} onChange={(e) => setForm({ ...form, labelRawComPort: e.target.value })} className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"><option value="">Pilih COM aktif</option>{serialPorts.map((p) => <option key={p.port} value={p.port}>{p.port} — {p.name}</option>)}</select><select data-testid="select-label-baud" value={form.labelRawBaud || 9600} onChange={(e) => setForm({ ...form, labelRawBaud: Number(e.target.value) })} className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"><option value="9600">9600 baud</option><option value="19200">19200 baud</option><option value="38400">38400 baud</option><option value="115200">115200 baud</option></select></div>}
                  {form.labelRawConnection === "lan" && <div className="grid grid-cols-2 gap-2 mt-2"><input value={form.labelRawHost || ""} onChange={(e) => setForm({ ...form, labelRawHost: e.target.value })} placeholder="IP printer" className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" /><input type="number" value={form.labelRawPort || 9100} onChange={(e) => setForm({ ...form, labelRawPort: Number(e.target.value) })} className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2" /></div>}
                </>}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-slate-500">Mode browser: cetak akan memunculkan dialog print. Pilih printer thermal, kertas {form.paperSize}, margin None.</p>
          )}
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Lebar stiker (mm)</label>
              <input
                data-testid="input-label-width"
                type="number"
                min="10"
                max="80"
                value={form.labelWidthMm ?? 35}
                onChange={(e) => setForm({ ...form, labelWidthMm: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tinggi stiker (mm)</label>
              <input
                data-testid="input-label-height"
                type="number"
                min="8"
                max="100"
                value={form.labelHeightMm ?? 15}
                onChange={(e) => setForm({ ...form, labelHeightMm: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Jarak antarstiker (mm)</label>
              <input
                data-testid="input-label-gap"
                type="number"
                min="0"
                max="20"
                value={form.labelGapMm ?? 7}
                onChange={(e) => setForm({ ...form, labelGapMm: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">DPI printer label</label>
              <select
                data-testid="select-label-dpi"
                value={form.labelDpi ?? 203}
                onChange={(e) => setForm({ ...form, labelDpi: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              >
                <option value="203">203 DPI</option>
                <option value="300">300 DPI</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Geser ke kanan (mm)</label>
              <input
                data-testid="input-label-offset"
                type="number"
                min="0"
                max="40"
                value={form.labelOffsetMm ?? 23}
                onChange={(e) => setForm({ ...form, labelOffsetMm: Number(e.target.value) })}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Struk dapur memakai format struk 58/80 mm yang sama seperti kasir, tetapi tanpa harga. Varian dan catatan tetap dicetak lengkap.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="btn-test-print-receipt"
              onClick={() => printThermalReceipt(SAMPLE_TX, form).then(report("Struk"))}
              className="py-2 rounded-xl border border-orange-300 text-orange-700 bg-white text-xs font-bold hover:bg-orange-50"
            >
              Tes Cetak Struk
            </button>
            <button
              type="button"
              data-testid="btn-test-print-kitchen"
              onClick={() => printKitchenLabels(SAMPLE_TX, form).then(report("Struk dapur"))}
              className="py-2 rounded-xl border border-slate-300 text-slate-700 bg-white text-xs font-bold hover:bg-slate-100"
            >
              Tes Struk Dapur (tanpa harga)
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Pesan Footer Struk</label>
          <textarea
            data-testid="input-setting-footer"
            rows={2}
            value={form.footerNote}
            onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
            className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 resize-none"
          />
        </div>

        <button
          data-testid="btn-save-settings"
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-500/25 transition"
        >
          Simpan Pengaturan Struk
        </button>
      </form>
    </div>
  );
}
