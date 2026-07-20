#!/usr/bin/env node
/**
 * 铜声·识洛 — 一键启动脚本
 * 双击 start.bat 或运行: node start.cjs
 */
const { spawn } = require("child_process");
const http = require("http");

const PORT = 3000;
const URL = `http://localhost:${PORT}/launcher.html`;

const C = { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m" };

function log(msg) { console.log(`  ${C.dim}[铜声·识洛]${C.reset} ${msg}`); }

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => { res.resume(); resolve(true); });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

function openBrowser(url) {
  const cmd = process.platform === "win32"
    ? spawn("cmd", ["/c", "start", url], { detached: true, stdio: "ignore" })
    : process.platform === "darwin"
      ? spawn("open", [url], { detached: true, stdio: "ignore" })
      : spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  cmd.unref();
}

function waitForServer(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      http.get(`http://localhost:${port}/`, (res) => { res.resume(); resolve(true); })
        .on("error", () => {
          if (Date.now() - start > (timeoutMs || 30000)) reject(new Error("timeout"));
          else setTimeout(poll, 500);
        });
    })();
  });
}

async function main() {
  console.log(`\n  ${C.cyan}铜声·识洛 — 启动器${C.reset}\n`);

  log("检查服务器...");
  const running = await checkPort(PORT);

  if (running) {
    log(`${C.green}服务器已在运行 (port ${PORT})${C.reset}`);
    log("打开启动器...");
    openBrowser(URL);
    console.log(`  ${C.green}✓ 已在浏览器中打开！${C.reset}\n`);
    return;
  }

  log("启动 Vite 开发服务器...");
  const vite = spawn("npx", ["vite", "--port", String(PORT), "--host", "0.0.0.0"], {
    cwd: __dirname,
    stdio: "pipe",
    shell: true,
  });

  vite.stdout.on("data", () => {});
  vite.stderr.on("data", () => {});
  vite.on("error", (err) => { console.error(`  ${C.yellow}✗ ${err.message}${C.reset}`); process.exit(1); });

  try {
    log("等待服务器就绪...");
    await waitForServer(PORT);
    log(`${C.green}✓ 就绪${C.reset}`);
  } catch {
    console.error(`  ${C.yellow}✗ 启动超时${C.reset}`);
    vite.kill();
    process.exit(1);
  }

  log("打开启动器...");
  openBrowser(URL);

  console.log(`\n  ${C.green}┌──────────────────────────┐${C.reset}`);
  console.log(`  ${C.green}│${C.reset}  启动器已在浏览器中打开  ${C.green}│${C.reset}`);
  console.log(`  ${C.green}│${C.reset}  ${C.dim}${URL}${C.reset}  ${C.green}│${C.reset}`);
  console.log(`  ${C.green}└──────────────────────────┘${C.reset}\n`);

  process.on("SIGINT", () => { console.log(""); log("停止..."); vite.kill(); process.exit(0); });
}

main().catch((err) => { console.error(`启动失败: ${err.message}`); process.exit(1); });
