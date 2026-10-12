import React, { useState } from "react";
import axios from "../lib/localApi";
import { Plus, Settings, Trash2 } from "lucide-react";

export default function AkunKasirView({ cashiers, setCashiers, currentId, showToast, API }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ id: "", name: "", password: "", role: "waiter" });

  const startNew = () => {
    setEditing("new");
    setForm({ id: "", name: "", password: "", role: "waiter" });
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setForm({ id: c.id, name: c.name, password: c.password, role: c.role || "waiter" });
  };

  const save = async () => {
    const normalizedId = form.id.trim().toLowerCase();
    const normalizedName = form.name.trim();
    const normalizedPassword = form.password.trim();
    if (!normalizedId || !normalizedName || !normalizedPassword) {
      showToast("ID, nama, dan password wajib diisi");
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(normalizedId)) {
      showToast("ID hanya boleh berisi huruf, angka, titik, strip, atau underscore");
      return;
    }
    if (editing === "new" && cashiers.some((c) => String(c.id).trim().toLowerCase() === normalizedId)) {
      showToast("ID kasir sudah digunakan");
      return;
    }
    const cashier = { ...form, id: normalizedId, name: normalizedName, password: normalizedPassword };
    let updated = [];
    if (editing === "new") {
      updated = [...cashiers, cashier];
    } else {
      updated = cashiers.map((c) => (c.id === editing ? cashier : c));
    }
    setCashiers(updated);
    try {
      await axios.post(`${API}/cashiers`, updated);
      showToast("Akun kasir berhasil disimpan");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan akun kasir");
    }
    setEditing(null);
  };

  const remove = async (id) => {
    if (id === currentId || cashiers.length <= 1) return;
    const updated = cashiers.filter((c) => c.id !== id);
    setCashiers(updated);
    try {
      await axios.post(`${API}/cashiers`, updated);
      showToast("Akun kasir dihapus");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus akun kasir");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base text-slate-900" data-testid="akun-manager-title">Kelola Akun Kasir</h2>
          <p className="text-xs text-slate-500">Daftar pengguna dan hak akses kasir</p>
        </div>
        <button
          data-testid="btn-add-cashier"
          onClick={startNew}
          className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow"
        >
          <Plus size={14} /> Tambah Akun
        </button>
      </div>

      {editing && (
        <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3">
          <h3 className="font-bold text-xs text-orange-900">{editing === "new" ? "Akun Baru" : "Edit Akun"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">ID Kasir (Login)</label>
              <input
                data-testid="input-cashier-id"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                disabled={editing !== "new"}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nama Kasir</label>
              <input
                data-testid="input-cashier-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Password</label>
              <input
                data-testid="input-cashier-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Peran / Role</label>
              <select
                data-testid="input-cashier-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
              >
                <option value="waiter">Kasir Standar (Waiter)</option>
                <option value="manager">Manager (Akses Penuh)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-slate-600">
              Batal
            </button>
            <button
              data-testid="btn-save-cashier"
              onClick={save}
              className="px-4 py-1.5 text-xs font-bold bg-orange-600 text-white rounded-xl shadow"
            >
              Simpan Akun
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {cashiers.map((c) => (
          <div
            key={c.id}
            className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
          >
            <div>
              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <span>{c.name}</span>
                <span className="text-slate-400 font-normal">({c.id})</span>
                {c.role === "manager" && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    Manager
                  </span>
                )}
                {c.id === currentId && (
                  <span className="text-[10px] text-orange-600 border border-orange-200 px-1.5 rounded-full">
                    Akun Anda
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">Password: ••••••••</div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => startEdit(c)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={() => remove(c.id)}
                disabled={c.id === currentId || cashiers.length <= 1}
                className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
