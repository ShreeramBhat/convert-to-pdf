const FILES = [
  "src/util.js",
  "src/api.js",
  "src/markdown.js",
  "src/html.js",
  "src/test-suite.js",
  "src/content.js",
];

const pageLine = document.getElementById("page-line");
const notClaude = document.getElementById("not-claude");
const controls = document.getElementById("controls");
const statusEl = document.getElementById("status");
const pdfBtn = document.getElementById("pdf");
const htmlBtn = document.getElementById("html");
const mdBtn = document.getElementById("md");
const testBtn = document.getElementById("test");
const themeSelect = document.getElementById("theme");
const themeHint = document.getElementById("theme-hint");
const loaderEl = document.getElementById("loader");
const loaderTitle = document.getElementById("loader-title");
const loaderText = document.getElementById("loader-text");
const loaderTime = document.getElementById("loader-time");
const loaderBar = document.getElementById("loader-bar");
let pageAppearance = "light";
let tickTimer = null;
let startedAt = 0;

function updateThemeHint() {
  var sel = themeSelect.value;
  if (sel === "auto") {
    themeHint.textContent =
      pageAppearance === "dark"
        ? "This Claude tab is dark, so the PDF will be dark."
        : "This Claude tab is light, so the PDF will be light.";
  } else if (sel === "dark") {
    themeHint.textContent = "PDF will use a dark page, even if Claude is light.";
  } else {
    themeHint.textContent = "PDF will use a light page, even if Claude is dark.";
  }
}

function setStatus(text, kind) {
  statusEl.textContent = text || "";
  statusEl.className = kind || "";
}

function opts(format) {
  return {
    format: format,
    theme: themeSelect.value,
    appearance: pageAppearance,
    page: document.getElementById("page").value,
    includeThinking: document.getElementById("thinking").checked,
    includeToolResults: document.getElementById("tools").checked,
    autoPrint: document.getElementById("autoprint").checked,
  };
}

function send(tabId, message) {
  return new Promise(function (resolve, reject) {
    chrome.tabs.sendMessage(tabId, message, function (res) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(res);
    });
  });
}

async function ensureContent(tabId) {
  await chrome.scripting.executeScript({ target: { tabId: tabId }, files: FILES });
  return send(tabId, { type: "CTP_PING" });
}

function formatElapsed(ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return s + "s elapsed";
  var m = Math.floor(s / 60);
  var r = s % 60;
  return m + "m " + r + "s elapsed";
}

function setLoaderProgress(text, extra) {
  if (text) loaderText.textContent = text;
  var barWrap = loaderBar.parentElement;
  if (extra && extra.total) {
    var pct = Math.max(4, Math.min(100, Math.round((100 * (extra.current || 0)) / extra.total)));
    barWrap.classList.remove("indeterminate");
    loaderBar.style.width = pct + "%";
    loaderBar.style.transform = "none";
  }
}

function busy(on, title) {
  [pdfBtn, htmlBtn, mdBtn, testBtn].forEach(function (b) {
    b.disabled = on;
  });
  document.querySelectorAll("#controls select, #controls input").forEach(function (el) {
    el.disabled = on;
  });
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  if (on) {
    loaderEl.classList.remove("hidden");
    loaderTitle.textContent = title || "Exporting…";
    loaderText.textContent = "Starting…";
    loaderTime.textContent = "0s elapsed";
    loaderBar.parentElement.classList.add("indeterminate");
    loaderBar.style.width = "";
    loaderBar.style.transform = "";
    startedAt = Date.now();
    tickTimer = setInterval(function () {
      loaderTime.textContent = formatElapsed(Date.now() - startedAt);
    }, 250);
  } else {
    loaderEl.classList.add("hidden");
  }
}

async function run(format) {
  var title =
    format === "pdf" ? "Exporting PDF…" : format === "html" ? "Preparing HTML…" : "Preparing Markdown…";
  setStatus("");
  busy(true, title);
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab || !tab.id) throw new Error("No active tab.");
    await ensureContent(tab.id);
    var res = await send(tab.id, { type: "CTP_EXPORT", opts: opts(format) });
    if (!res || !res.ok) throw new Error((res && res.error) || "Export failed.");
    if (format === "pdf") {
      setStatus("Print preview opened · " + res.turns + " turns. Choose Save as PDF.", "ok");
    } else {
      setStatus("Downloaded " + res.format.toUpperCase() + " · " + res.turns + " turns.", "ok");
    }
  } catch (e) {
    setStatus(e.message || String(e), "error");
  } finally {
    busy(false);
  }
}

chrome.runtime.onMessage.addListener(function (msg) {
  if (msg && msg.type === "CTP_PROGRESS") {
    setLoaderProgress(msg.text, msg.extra);
    if (msg.text) setStatus(msg.text);
  }
});

themeSelect.addEventListener("change", function () {
  updateThemeHint();
  chrome.storage.local.set({ ctpThemePref: themeSelect.value });
});

pdfBtn.addEventListener("click", function () {
  run("pdf");
});
htmlBtn.addEventListener("click", function () {
  run("html");
});
mdBtn.addEventListener("click", function () {
  run("md");
});
testBtn.addEventListener("click", async function () {
  busy(true, "Testing 50 conversations…");
  setStatus("");
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab || !tab.id) throw new Error("No active tab.");
    await ensureContent(tab.id);
    var res = await send(tab.id, { type: "CTP_TEST_SUITE", opts: { limit: 50 } });
    if (!res || !res.ok) throw new Error((res && res.error) || "Test suite failed.");
    var r = res.report;
    var kinds = Object.keys(r.kinds || {}).length;
    setStatus(
      "Passed " + r.passed + " / " + r.listed + (r.failed ? " · " + r.failed + " failed" : "") + " · asset kinds " + kinds + ". Report downloaded.",
      r.failed ? "error" : "ok"
    );
  } catch (e) {
    setStatus(e.message || String(e), "error");
  } finally {
    busy(false);
  }
});

(async function init() {
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    var url = (tab && tab.url) || "";
    if (!/https:\/\/(www\.)?claude\.ai\//i.test(url)) {
      notClaude.classList.remove("hidden");
      pageLine.textContent = "Not a Claude tab";
      return;
    }
    var info = await ensureContent(tab.id);
    controls.classList.remove("hidden");
    if (!info || !info.ok) {
      pageLine.textContent = "Claude tab · open a chat to export, or test 50 from here";
    } else {
      var kind = info.kind === "share" ? "Share link" : "Live chat";
      pageLine.textContent = kind + (info.title ? " · " + info.title : "");
    }
    pageAppearance = info.appearance === "dark" ? "dark" : "light";
    var stored = await chrome.storage.local.get(["ctpThemePref"]);
    if (stored.ctpThemePref) themeSelect.value = stored.ctpThemePref;
    updateThemeHint();
  } catch (e) {
    notClaude.classList.remove("hidden");
    pageLine.textContent = "Could not read this tab";
    setStatus(e.message || String(e), "error");
  }
})();
