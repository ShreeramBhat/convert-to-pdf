/* global CTP */
(function () {
  window.__ctpVersion = "1.0.6";

  var overlay = null;
  var overlayStarted = 0;
  var overlayTimer = null;

  function overlayStyle() {
    var dark = CTP.api.pageAppearance() === "dark";
    var paper = dark ? "#1c1b19" : "#ffffff";
    var ink = dark ? "#f3efe9" : "#1c1a17";
    var mute = dark ? "#a8a29c" : "#6b6560";
    var chip = dark ? "#32302c" : "#f1ede7";
    var line = dark ? "#3f3d39" : "#e0dad1";
    var accent = "#c96442";
    var shade = dark ? "rgba(0,0,0,.55)" : "rgba(28,26,23,.38)";
    return (
      "#ctp-export-overlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:" +
      shade +
      ";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}" +
      "#ctp-export-overlay .ctp-card{display:flex;gap:14px;align-items:flex-start;min-width:280px;max-width:420px;padding:18px 20px;border-radius:14px;background:" +
      paper +
      ";color:" +
      ink +
      ";border:1px solid " +
      line +
      ";box-shadow:0 18px 50px rgba(0,0,0,.28)}" +
      "#ctp-export-overlay .ctp-spin{width:22px;height:22px;margin-top:2px;border:2.5px solid " +
      chip +
      ";border-top-color:" +
      accent +
      ";border-radius:50%;animation:ctp-spin .7s linear infinite;flex:0 0 auto}" +
      "#ctp-export-overlay .ctp-title{font-size:14px;font-weight:700;margin:0 0 4px}" +
      "#ctp-export-overlay .ctp-msg,#ctp-export-overlay .ctp-time{margin:0;font-size:12px;color:" +
      mute +
      "}" +
      "#ctp-export-overlay .ctp-time{margin:8px 0;font-variant-numeric:tabular-nums}" +
      "#ctp-export-overlay .ctp-bar{height:6px;background:" +
      chip +
      ";border-radius:99px;overflow:hidden}" +
      "#ctp-export-overlay .ctp-bar i{display:block;height:100%;width:36%;background:" +
      accent +
      ";border-radius:99px}" +
      "#ctp-export-overlay .ctp-bar.indeterminate i{animation:ctp-indeterminate 1.1s ease-in-out infinite}" +
      "@keyframes ctp-spin{to{transform:rotate(360deg)}}" +
      "@keyframes ctp-indeterminate{0%{transform:translateX(-80%)}100%{transform:translateX(280%)}}"
    );
  }

  function ensureOverlay() {
    if (overlay && overlay.isConnected) return overlay;
    overlay = document.createElement("div");
    overlay.id = "ctp-export-overlay";
    overlay.setAttribute("role", "status");
    overlay.innerHTML =
      '<style>' +
      overlayStyle() +
      "</style>" +
      '<div class="ctp-card"><div class="ctp-spin" aria-hidden="true"></div><div>' +
      '<p class="ctp-title">Exporting conversation</p>' +
      '<p class="ctp-msg">Starting…</p>' +
      '<p class="ctp-time">0s elapsed</p>' +
      '<div class="ctp-bar indeterminate"><i></i></div>' +
      "</div></div>";
    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  function formatElapsed(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return s + "s elapsed";
    return Math.floor(s / 60) + "m " + (s % 60) + "s elapsed";
  }

  CTP.ui = {
    show: function (title) {
      var el = ensureOverlay();
      el.style.display = "flex";
      el.querySelector(".ctp-title").textContent = title || "Exporting conversation";
      el.querySelector(".ctp-msg").textContent = "This can take a minute for long chats.";
      var bar = el.querySelector(".ctp-bar");
      bar.classList.add("indeterminate");
      bar.querySelector("i").style.width = "";
      bar.querySelector("i").style.transform = "";
      overlayStarted = Date.now();
      el.querySelector(".ctp-time").textContent = "0s elapsed";
      if (overlayTimer) clearInterval(overlayTimer);
      overlayTimer = setInterval(function () {
        if (!overlay || !overlay.isConnected) return;
        overlay.querySelector(".ctp-time").textContent = formatElapsed(Date.now() - overlayStarted);
      }, 250);
    },
    setProgress: function (text, extra) {
      if (!overlay || overlay.style.display === "none") return;
      if (text) overlay.querySelector(".ctp-msg").textContent = text;
      if (extra && extra.total) {
        var bar = overlay.querySelector(".ctp-bar");
        var pct = Math.max(4, Math.min(100, Math.round((100 * (extra.current || 0)) / extra.total)));
        bar.classList.remove("indeterminate");
        var i = bar.querySelector("i");
        i.style.width = pct + "%";
        i.style.transform = "none";
      }
    },
    hide: function () {
      if (overlayTimer) {
        clearInterval(overlayTimer);
        overlayTimer = null;
      }
      if (overlay) overlay.style.display = "none";
    },
  };

  function info() {
    var page = CTP.api.detectPage();
    return {
      ok: page.kind !== "unknown",
      kind: page.kind,
      id: page.id || null,
      title: CTP.api.pageTitle(),
      url: location.href,
      appearance: CTP.api.pageAppearance(),
    };
  }

  /* The chart count rides back to the popup: a chart that silently failed to
     capture is otherwise invisible until someone reads the PDF. */
  function summary(format, model) {
    return {
      ok: true,
      format: format,
      turns: model.turns.length,
      title: model.title,
      charts: model.charts || 0,
      chartErrors: model.chartErrors || [],
      messagesInPage: model.messagesInPage || 0,
    };
  }

  async function runExport(opts) {
    opts = opts || {};
    var page = CTP.api.detectPage();
    if (page.kind === "unknown") {
      throw new Error("Open a Claude chat (/chat/…) or share link (/share/…) first.");
    }

    var title =
      opts.format === "html"
        ? "Preparing HTML"
        : opts.format === "md"
          ? "Preparing Markdown"
          : "Exporting PDF";
    CTP.ui.show(title);
    try {
    CTP.util.progress("Loading conversation…");
    var data;
    var usedDom = false;
    try {
      data = await CTP.api.fetchConversation(page);
      if (!data || !Array.isArray(data.chat_messages)) {
        throw new Error("Unexpected API shape");
      }
    } catch (e) {
      CTP.util.progress("API unavailable, reading the page…");
      data = CTP.api.fromDom(page);
      usedDom = true;
    }

    /* Charts are captured against the page's own colours, so the target theme
       has to be settled before prepare() runs. */
    opts.appearance = opts.appearance || CTP.api.pageAppearance();
    opts.theme = CTP.html.resolveTheme(opts.theme, opts.appearance);

    CTP.util.progress("Inlining images and code…");
    var model = await CTP.html.prepare(data, page, opts);
    if (!model.turns.length) {
      throw new Error("No messages found to export.");
    }
    if (usedDom) {
      model.meta += " | Captured from the page";
    }

    var base = CTP.util.sanitizeFilename(model.title);
    var format = opts.format || "pdf";

    if (format === "md") {
      CTP.util.downloadText(CTP.md.transcript(model), base + ".md", "text/markdown;charset=utf-8");
      return summary("md", model);
    }

    var payload = CTP.html.buildPayload(model, opts);
    if (format === "html") {
      var doc =
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" +
        CTP.util.escapeHtml(payload.title) +
        "</title><style>" +
        payload.css +
        "</style></head><body>" +
        payload.body +
        "</body></html>";
      CTP.util.downloadText(doc, base + ".html", "text/html;charset=utf-8");
      return summary("html", model);
    }

    CTP.util.progress("Opening print preview…");
    await chrome.storage.local.set({
      ctpPayload: payload,
      ctpSavedAt: Date.now(),
    });
    await chrome.runtime.sendMessage({ type: "OPEN_VIEWER" });
    return summary("pdf", model);
    } finally {
      CTP.ui.hide();
    }
  }

  window.CTP_info = info;
  window.CTP_runExport = runExport;

  if (!window.__ctpListening) {
    window.__ctpListening = true;
    chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
      if (!msg || !msg.type) return;
      if (msg.type === "CTP_PING" || msg.type === "GET_INFO") {
        sendResponse(window.CTP_info());
        return;
      }
      if (msg.type === "CTP_EXPORT") {
        window.CTP_runExport(msg.opts || {})
          .then(function (r) {
            sendResponse(r);
          })
          .catch(function (e) {
            sendResponse({ ok: false, error: (e && e.message) || String(e) });
          });
        return true;
      }
      if (msg.type === "CTP_TEST_SUITE") {
        CTP.test
          .run({ limit: (msg.opts && msg.opts.limit) || 50 })
          .then(function (r) {
            sendResponse({ ok: true, report: r });
          })
          .catch(function (e) {
            CTP.ui && CTP.ui.hide();
            sendResponse({ ok: false, error: (e && e.message) || String(e) });
          });
        return true;
      }
    });
  }
})();
