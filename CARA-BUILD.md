# Cara Build MAMLAH - SOLUSI KELAPARAN (Electron) di PC Kamu

Aplikasi ini **Electron + React (Vite)**. Semua data disimpan **lokal di komputer** (localStorage) — tanpa server/internet. Cocok untuk kasir offline.

## 1. Persyaratan
- **Node.js LTS** (v18 atau v20) — unduh di https://nodejs.org
- **Yarn** (opsional, bisa pakai npm): `npm install -g yarn`

## 2. Install dependency
Buka terminal di folder project ini, lalu jalankan salah satu:
```
yarn install
```
atau
```
npm install
```

## 3. Jalankan mode desktop (development)
```
npm run app
```
Perintah ini menyalakan Vite (port 5173) + membuka jendela aplikasi Electron otomatis.

> Ingin coba di browser saja? Jalankan `npm run dev` lalu buka http://localhost:3000

## 4. Build installer Windows (.exe)
```
npm run electron:build:win
```
Hasil installer ada di folder **`release/`** (mis. `MAMLAH - SOLUSI KELAPARAN Setup 3.0.0.exe`).
Untuk semua platform default: `npm run electron:build`.

> Build hanya jalan di OS target (Windows untuk .exe). Jalankan perintah ini di PC Windows kamu.

## 5. Jalankan dari hasil build tanpa installer
```
npm run electron:run
```

---

## Login Default
- **admin / admin** → Manager (akses penuh)
- **kasir1 / 123** → Kasir
Ganti/hapus akun ini di menu **Akun Kasir** sebelum dipakai di toko.

## Fitur Baru Versi 3.0 (PRO)
- **HPP Detail berbasis Bahan Baku**: menu Bahan Baku untuk daftar bahan (nama, satuan, harga beli, stok). Di Kelola Menu ada editor **Resep** — HPP dihitung otomatis dari bahan, stok bahan berkurang otomatis saat ada penjualan.
- **Omzet Merchant Online**: input omzet GoFood/GrabFood/ShopeeFood per hari (kotor & bersih setelah komisi). Tidak perlu input order merchant satu per satu di kasir.
- **Keuangan & Laba Rugi**: catat pengeluaran (belanja bahan, gaji, listrik, dll). Belanja bahan otomatis menambah stok. Ringkasan laba/rugi bersih real-time.
- **Laporan Closing (All Print)**: satu tombol cetak rekap lengkap — penjualan Dine In, Take Away, dan omzet Grab/Shopee/GoFood (kotor & bersih), modal, pengeluaran, sampai laba bersih.
- **Struk diperbaiki**: layout **rata kiri**, quantity dan harga sejajar & jelas terbaca.

## Catatan Printer
- Cetak struk thermal (ESC/POS) hanya jalan di aplikasi Electron (hasil build atau `npm run app`), bukan di preview browser.
- Atur printer struk & printer label dapur di menu **Pengaturan**.
