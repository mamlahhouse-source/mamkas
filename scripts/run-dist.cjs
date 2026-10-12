const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const viteEntry = require.resolve("vite/bin/vite.js");
const electronBinary = require("electron");

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on("error", retry);
      req.setTimeout(1000, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error(`Server Vite tidak siap: ${url}`));
      setTimeout(check, 200);
    };
    check();
  });
}

const vite = spawn(process.execPath, [viteEntry, "preview", "--host", "127.0.0.1", "--port", "5173"], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

let electronProcess;
(async () => {
  try {
    await waitForServer("http://127.0.0.1:5173");
    electronProcess = spawn(electronBinary, [projectRoot], {
      cwd: projectRoot,
      env: { ...process.env, ELECTRON_DIST: "1", ELECTRON_DIST_SERVER: "1" },
      stdio: "inherit",
    });
    electronProcess.on("exit", (code, signal) => {
      if (signal) process.kill(process.pid, signal);
      vite.kill();
      process.exit(code ?? 0);
    });
    electronProcess.on("error", (error) => {
      console.error("Gagal menjalankan Electron dari dist:", error.message);
      vite.kill();
      process.exit(1);
    });
  } catch (error) {
    console.error(error.message);
    vite.kill();
    process.exit(1);
  }
})();

const stop = () => {
  if (electronProcess && !electronProcess.killed) electronProcess.kill();
  if (!vite.killed) vite.kill();
};
process.on("SIGINT", () => { stop(); process.exit(0); });
process.on("SIGTERM", () => { stop(); process.exit(0); });
