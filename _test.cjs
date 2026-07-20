const http = require("http");

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

async function main() {
  // Test launcher served via HTTP
  const { body } = await get("/launcher.html");

  console.log("=== launcher.html 关键检查 ===");

  // 1. btn-play has id and href
  const playMatch = body.match(/id="btn-play"[^>]*href="([^"]*)"/);
  console.log("btn-play static href:", playMatch ? playMatch[1] : "NOT FOUND");

  // 2. protocol detection code
  console.log("file:// detection:", body.includes("window.location.protocol"));
  console.log("base variable:", body.includes("var base = isFile"));

  // 3. CHAPTER cards use base
  console.log("chapter cards use base:", body.includes('card.href = base + "/?chapter="'));

  // 4. Demo cards use base
  console.log("demo cards use base:", body.includes('card.href = base + d.href'));

  // 5. "开始游戏" button update
  console.log("playBtn rewrite:", body.includes('playBtn.href = base + "/"'));
  console.log("getElementById btn-play:", body.includes('getElementById("btn-play")'));

  // 6. Auto redirect
  console.log("auto redirect:", body.includes('window.location.replace(base + "/launcher.html")'));

  // 7. Keyboard shortcuts
  console.log("keyboard base:", body.includes('window.location.assign(base + "/?chapter="'));
  console.log("enter key base:", body.includes('window.location.assign(base + "/")'));

  // 8. What happens when base="" (HTTP protocol)
  // If base is "", then `base + "/"` = "/" -> CORRECT relative URL
  // If base is "", then `base + "/?chapter=2"` = "/?chapter=2" -> CORRECT
  console.log("\n=== HTTP 协议下链接行为 ===");
  console.log("base 为空 => 所有链接为相对路径 => 正确指向 localhost:3000");
}

main().catch((e) => console.error("Test failed:", e.message));
