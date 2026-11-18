import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const LAN_MODE = process.argv.includes("--lan");
const HOST = process.env.HOST || (LAN_MODE ? "0.0.0.0" : "127.0.0.1");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }

    const filePath = path.resolve(ROOT, `.${pathname}`);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new Error("Not a file");
    }

    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": type,
      "Content-Length": content.length,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(content);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<h1>404</h1><p>这一页没有找到。</p>");
  }
});

function localAddresses() {
  const addresses = [];
  const interfaces = networkInterfaces();
  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    });
  });
  return addresses;
}

server.listen(PORT, HOST, () => {
  console.log("东方幻存神签已启动。");
  if (HOST === "0.0.0.0") {
    console.log("同一 Wi-Fi / 局域网内的手机可打开：");
    localAddresses().forEach((address) => {
      console.log(`  http://${address}:${PORT}`);
    });
    console.log("如果打不开，请允许 Windows 防火墙中的 Node.js 入站访问。");
  } else {
    console.log(`本机访问：http://127.0.0.1:${PORT}`);
    console.log("手机访问请使用：npm run start:lan");
  }
  console.log("按 Ctrl+C 停止服务。");
});
