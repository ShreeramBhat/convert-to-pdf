/*
 * Loads the extension's real source files under Node, behind the smallest
 * browser surface they actually touch, so the renderer can be exercised
 * without Chrome. Fixture shapes are copied from live claude.ai API responses.
 *
 *   node test/e2e.js                 # current working tree
 *   CTP_SRC=/path/to/old/src node test/e2e.js   # any other revision
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const SRC = process.env.CTP_SRC || path.join(__dirname, "..", "src");

const ORIGIN = "https://claude.ai";

/* ---- minimal browser surface ---- */
let DOM = {};                    // selector -> [elements]
const fetchLog = [];
let fetchImpl = async () => ({ ok: false });

function nodeList(arr) { const a = arr.slice(); a.forEach = Array.prototype.forEach.bind(a); return a; }

const documentStub = {
  title: "Fixture",
  documentElement: { className: "", getAttribute: () => null },
  body: { className: "" },
  cookie: "",
  querySelectorAll: (sel) => nodeList(DOM[sel] || []),
  querySelector: (sel) => (DOM[sel] || [])[0] || null,
  createElement: () => ({ setAttribute(){}, removeAttribute(){}, style:{}, click(){}, appendChild(){},
                          querySelectorAll: () => nodeList([]), querySelector: () => null, attributes: [] }),
};

class FileReaderStub {
  readAsDataURL(blob) {
    const b64 = Buffer.from(blob._bytes || []).toString("base64");
    this.result = `data:${blob.type || "application/octet-stream"};base64,${b64}`;
    if (this.onload) this.onload();
  }
}

const sandbox = {
  window: {}, console, Map, Set, Promise, URL, Date, Math, JSON, RegExp, Array, Object, String, Number, Boolean,
  setTimeout, clearTimeout, requestAnimationFrame: (cb) => setTimeout(cb, 0),
  document: documentStub,
  location: { href: ORIGIN + "/chat/x", origin: ORIGIN },
  navigator: { userAgent: "node" },
  FileReader: FileReaderStub,
  Blob: class { constructor(parts, opts) { this.type = (opts || {}).type || ""; this._bytes = []; this.size = 1; } },
  getComputedStyle: () => ({ getPropertyValue: () => "", backgroundColor: "rgb(28,27,25)", overflowY: "visible",
                             overflowX: "visible", display: "block", visibility: "visible", gridTemplateRows: "none",
                             colorScheme: "dark" }),
  XMLSerializer: class { serializeToString() { return ""; } },
  chrome: { runtime: { sendMessage(){} } },
  fetch: async (...a) => { fetchLog.push(a[0]); return fetchImpl(...a); },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ["util.js", "api.js", "markdown.js", "figure.js", "html.js"]) {
  vm.runInContext(fs.readFileSync(path.join(SRC, f), "utf8"), sandbox, { filename: f });
}
const CTP = sandbox.CTP;

module.exports = {
  CTP, sandbox,
  setDom: (d) => { DOM = d; },
  setFetch: (fn) => { fetchImpl = fn; },
  fetchLog,
  nodeList,
  imageResponse: (type = "image/webp", bytes = [1,2,3,4]) => async () => ({
    ok: true,
    blob: async () => ({ type, size: bytes.length, _bytes: bytes }),
  }),
  failingFetch: () => async () => ({ ok: false, status: 404, blob: async () => ({ type: "", size: 0, _bytes: [] }) }),
};
