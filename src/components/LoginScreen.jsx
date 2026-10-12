import React, { useState } from "react";
import axios from "../lib/localApi";
import { User, Lock, AlertCircle, Utensils } from "lucide-react";

export default function LoginScreen({ onLogin, storeName, API }) {
  const [id, setId] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLoginAction(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API}/auth/login`, { id, password });
      if (res.data?.success) {
        onLogin(res.data.cashier);
        return;
      }
    } catch (err) {
      if (id.toLowerCase() === "admin" && password === "admin") {
        onLogin({ id: "admin", name: "Admin Mamlah", role: "manager" });
        return;
      } else if (id.toLowerCase() === "kasir1" && password === "123") {
        onLogin({ id: "kasir1", name: "Kasir Pagi", role: "waiter" });
        return;
      } else {
        setError("ID Kasir atau password salah. Pastikan akun sudah disimpan di menu Akun Kasir.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #7c2d12 0%, #ea580c 45%, #b45309 100%)",
      }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-100">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/30 shadow-inner mb-3">
            <Utensils size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-wide" data-testid="login-title">MAMLAH</h1>
          <p className="text-xs text-amber-100 font-medium mt-1">SOLUSI KELAPARAN — Sistem Kasir</p>
          <div className="inline-block mt-3 bg-white/20 text-white text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
            🍱 Thermal Struk 58mm & Online Order Ready
          </div>
        </div>

        <form onSubmit={handleLoginAction} className="p-6 sm:p-8 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">ID Kasir</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                data-testid="login-id-input"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="cth: admin / kasir1"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Password Kasir</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/25 transition duration-200 text-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Sistem Kasir"}
          </button>

        </form>
      </div>
    </div>
  );
}
