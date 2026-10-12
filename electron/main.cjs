const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const net = require("net");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");

// npm start memakai server Vite; npm run electron:run memakai hasil build dist.
// Flag ini sengaja dipakai agar mode run dari dist tetap bisa dijalankan sebelum packaging.
const isDev = !app.isPackaged && process.env.ELECTRON_DIST !== "1";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "MAMLAH - SOLUSI KELAPARAN",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#f1f5f9",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: false,
    },
  });

  if (isDev || process.env.ELECTRON_DIST_SERVER === "1") {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("Gagal load halaman:", code, desc);
  });
}

ipcMain.handle("get-printers", async (e) => {
  try {
    return await e.sender.getPrintersAsync();
  } catch {
    return [];
  }
});

ipcMain.handle("scan-bluetooth", async () => {
  if (process.platform !== "win32") return { ok: false, reason: "Scan Bluetooth tersedia di Windows", devices: [] };
  return new Promise((resolve) => {
    const script = `Get-PnpDevice -Class Bluetooth -PresentOnly | Select-Object FriendlyName,Status,InstanceId | ConvertTo-Json -Compress`;
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return resolve({ ok: false, reason: stderr || error.message, devices: [] });
      try { const parsed = stdout.trim() ? JSON.parse(stdout) : []; const list = Array.isArray(parsed) ? parsed : [parsed]; resolve({ ok: true, devices: list.map((d) => ({ name: d.FriendlyName || "Bluetooth device", status: d.Status || "Unknown", id: d.InstanceId || "" })) }); }
      catch (err) { resolve({ ok: false, reason: err.message, devices: [] }); }
    });
  });
});

ipcMain.handle("open-bluetooth-settings", async () => {
  if (process.platform !== "win32") return { ok: false, reason: "Hanya tersedia di Windows" };
  return new Promise((resolve) => execFile("cmd.exe", ["/c", "start", "ms-settings:bluetooth"], { windowsHide: true }, (error) => resolve(error ? { ok: false, reason: error.message } : { ok: true })));
});

ipcMain.handle("get-serial-ports", async () => {
  if (process.platform !== "win32") return { ok: false, reason: "COM port tersedia di Windows", ports: [] };
  return new Promise((resolve) => {
    const script = `Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Description | ConvertTo-Json -Compress`;
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return resolve({ ok: false, reason: stderr || error.message, ports: [] });
      try { const parsed = stdout.trim() ? JSON.parse(stdout) : []; const list = Array.isArray(parsed) ? parsed : [parsed]; resolve({ ok: true, ports: list.map((p) => ({ port: p.DeviceID, name: p.Name || p.Description || p.DeviceID })) }); }
      catch (err) { resolve({ ok: false, reason: err.message, ports: [] }); }
    });
  });
});

function psQuote(value) { return String(value || "").replace(/'/g, "''"); }

function printWindowsRaw(printerName, data) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve({ ok: false, reason: "USB RAW hanya tersedia di Windows" });
    const tmp = path.join(os.tmpdir(), `mamlah-${Date.now()}.bin`);
    fs.writeFileSync(tmp, data);
    const script = `$p='${psQuote(printerName)}';if([string]::IsNullOrWhiteSpace($p)){$p=(Get-CimInstance Win32_Printer | Where-Object {$_.Default} | Select-Object -First 1 -ExpandProperty Name)};$f='${psQuote(tmp)}';Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class RawPrint { [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct DOC_INFO_1 { public string pDocName; public string pOutputFile; public string pDataType; } [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d); [DllImport("winspool.drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr h); [DllImport("winspool.drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr h); [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr h); [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr h); [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern int StartDocPrinter(IntPtr h,int l,ref DOC_INFO_1 d); [DllImport("winspool.drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr h,byte[] b,int n,out int w); }
'@;$h=[IntPtr]::Zero;if(![RawPrint]::OpenPrinter($p,[ref]$h,[IntPtr]::Zero)){throw "Tidak dapat membuka printer: $p"};try{$d=[IO.File]::ReadAllBytes($f);$di=New-Object RawPrint+DOC_INFO_1;$di.pDocName='KASIR MAMLAH ESC/POS';$di.pDataType='RAW';$di.pOutputFile=$null;$job=[RawPrint]::StartDocPrinter($h,1,[ref]$di);if($job -le 0){throw 'StartDocPrinter RAW gagal'};if(![RawPrint]::StartPagePrinter($h)){throw 'StartPagePrinter gagal'};$w=0;if(![RawPrint]::WritePrinter($h,$d,$d.Length,[ref]$w) -or $w -ne $d.Length){throw "WritePrinter gagal ($w/$($d.Length))"};[RawPrint]::EndPagePrinter($h)|Out-Null;[RawPrint]::EndDocPrinter($h)|Out-Null}finally{[RawPrint]::ClosePrinter($h)|Out-Null;Remove-Item -Force $f}`;
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], { windowsHide: true }, (error, _out, stderr) => resolve(error ? { ok: false, reason: stderr || error.message } : { ok: true }));
  });
}

function printTcp(host, port, data) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) || 9100 });
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };
    socket.setTimeout(8000, () => { socket.destroy(); done({ ok: false, reason: "Timeout printer LAN" }); });
    socket.once("connect", () => socket.end(data));
    socket.once("close", (hadError) => done(hadError ? { ok: false, reason: "Koneksi printer LAN gagal" } : { ok: true }));
    socket.once("error", (err) => done({ ok: false, reason: err.message }));
  });
}

function printCom(comPort, data, baudRate = 9600) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve({ ok: false, reason: "COM Bluetooth hanya tersedia di Windows" });
    const normalized = String(comPort || "").trim().toUpperCase();
    if (!/^COM\d+$/.test(normalized)) return resolve({ ok: false, reason: `Port Bluetooth tidak valid: ${comPort}` });
    const tmp = path.join(os.tmpdir(), `mamlah-${Date.now()}.bin`);
    fs.writeFileSync(tmp, data);
    const safeBaud = Number(baudRate) || 9600;
    const script = `$p='${psQuote(normalized)}';$f='${psQuote(tmp)}';$b=[IO.File]::ReadAllBytes($f);$s=New-Object System.IO.Ports.SerialPort($p,${safeBaud},[IO.Ports.Parity]::None,8,[IO.Ports.StopBits]::One);$s.ReadTimeout=3000;$s.WriteTimeout=30000;$s.DtrEnable=$true;$s.RtsEnable=$true;$s.Handshake=[IO.Ports.Handshake]::None;try{$s.Open();for($i=0;$i -lt $b.Length;$i+=64){$n=[Math]::Min(64,$b.Length-$i);$s.Write($b,$i,$n);Start-Sleep -Milliseconds 10};$s.BaseStream.Flush();Start-Sleep -Milliseconds 500}finally{if($s.IsOpen){$s.Close()};Remove-Item -Force $f}`;
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], { windowsHide: true }, (error, _out, stderr) => resolve(error ? { ok: false, reason: `COM ${comPort}: ${stderr || error.message}` } : { ok: true }));
  });
}

ipcMain.handle("print-raw", async (_e, { data, connection = "usb", printerName = "", host = "", port = 9100, comPort = "", baudRate = 9600 }) => {
  try {
    const bytes = Buffer.from(data || [], "base64");
    if (!bytes.length) return { ok: false, reason: "Data ESC/POS kosong" };
    if (connection === "lan") return printTcp(host, port, bytes);
    if (connection === "bluetooth") return printCom(comPort, bytes, baudRate);
    return printWindowsRaw(printerName, bytes);
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  }
});

// Cetak HTML struk ke printer thermal. widthMm = lebar kertas, pageHeightMm opsional (label dapur).
ipcMain.handle("print-html", async (_e, { html, widthMm = 58, pageHeightMm, deviceName = "", silent = true }) => {
  const pxWidth = Math.round((widthMm / 25.4) * 96);
  const win = new BrowserWindow({
    // Dialog printer tidak akan tampil dengan benar jika parent window tersembunyi.
    // Mode Soft Font membutuhkan jendela cetak yang terlihat dan aktif.
    show: !silent,
    width: pxWidth,
    height: 800,
    title: "Pratinjau Cetak MAMLAH",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    await new Promise((r) => setTimeout(r, 200));
    let heightMm = pageHeightMm;
    if (!heightMm) {
      const px = await win.webContents.executeJavaScript("document.body.scrollHeight");
      heightMm = Math.ceil((px * 25.4) / 96) + 2;
    }
    const result = await new Promise((resolve) => {
      if (!silent && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
      win.webContents.print(
        {
          silent,
          printBackground: true,
          color: false,
          deviceName: deviceName || undefined,
          margins: { marginType: "custom", top: 0, bottom: 0, left: 0, right: 0 },
          pageSize: { width: Math.round(widthMm * 1000), height: Math.round(heightMm * 1000) },
        },
        (ok, reason) => resolve({ ok, reason: ok ? "" : reason || "Printer tidak merespon" })
      );
    });
    return result;
  } catch (err) {
    return { ok: false, reason: String(err && err.message ? err.message : err) };
  } finally {
    setTimeout(() => {
      if (!win.isDestroyed()) win.close();
    }, 500);
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
