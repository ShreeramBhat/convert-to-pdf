/* global CTP */
var CTP = window.CTP || {};
window.CTP = CTP;

CTP.util = {
  imgCache: new Map(),

  escapeHtml: function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  pickFence: function (text) {
    var max = 2;
    var re = /`+/g;
    var m;
    while ((m = re.exec(text))) max = Math.max(max, m[0].length);
    return "`".repeat(max + 1);
  },

  sanitizeFilename: function (name) {
    return (
      String(name || "conversation")
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120) || "conversation"
    );
  },

  formatWhen: function (iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  },

  exportedStamp: function () {
    return new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  },

  isRecord: function (x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  },

  safeStringify: function (x) {
    try {
      return JSON.stringify(x, null, 2) || String(x);
    } catch (e) {
      return String(x);
    }
  },

  blobToDataUrl: function (blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(r.result);
      };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  },

  /* claude.ai hands back file URLs relative to the origin ("/api/<org>/files/…").
     Every check below wants an absolute URL, so resolve first — otherwise an
     uploaded image is rejected before anyone tries to fetch it. */
  absUrl: function (url) {
    var u = String(url == null ? "" : url);
    if (!u) return "";
    if (/^(data:|blob:)/i.test(u)) return u;
    try {
      return new URL(u, location.origin).href;
    } catch (e) {
      return u;
    }
  },

  looksLikeImageUrl: function (raw) {
    if (!raw || typeof raw !== "string") return false;
    var url = CTP.util.absUrl(raw);
    if (url.indexOf("data:image/") === 0) return true;
    if (url.indexOf("blob:") === 0) return true;
    if (!/^https?:\/\//i.test(url)) return false;
    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg)(\?|#|$)/i.test(url)) return true;
    if (/\/api\/.*(?:files|images).*preview/i.test(url)) return true;
    if (/claude\.ai\/api\/.+\/(?:preview|thumbnail)/i.test(url)) return true;
    return false;
  },

  canInlineImage: function (raw) {
    if (!raw || typeof raw !== "string") return false;
    var url = CTP.util.absUrl(raw);
    if (url.indexOf("data:image/") === 0 || url.indexOf("blob:") === 0) return true;
    if (CTP.util.looksLikeImageUrl(url)) return true;
    return /https:\/\/([^/]+\.)?(claude\.ai|anthropic\.com|claudemcpcontent\.com)\//i.test(url);
  },

  toImageDataUrl: async function (raw) {
    var url = CTP.util.absUrl(raw);
    if (!url) return "";
    if (url.indexOf("data:image/") === 0) return url;
    if (url.indexOf("data:") === 0) return "";
    if (!CTP.util.canInlineImage(url)) return "";
    if (CTP.util.imgCache.has(url)) return CTP.util.imgCache.get(url);
    try {
      var res = await fetch(url, { credentials: "include" });
      if (!res.ok) return "";
      var blob = await res.blob();
      if (!blob || !blob.size) return "";
      var type = (blob.type || "").toLowerCase();
      if (
        type &&
        type.indexOf("image/") !== 0 &&
        type !== "application/octet-stream"
      ) {
        return "";
      }
      if (type === "application/octet-stream" && !CTP.util.looksLikeImageUrl(url)) {
        return "";
      }
      var data = await CTP.util.blobToDataUrl(blob);
      if (!data || data.indexOf("data:image/") !== 0) {
        if (type === "application/octet-stream" && data.indexOf("data:") === 0) {
          data = data.replace(/^data:[^;]+/, "data:image/png");
        } else {
          return "";
        }
      }
      CTP.util.imgCache.set(url, data);
      return data;
    } catch (e) {
      return "";
    }
  },

  progress: function (text, extra) {
    extra = extra || null;
    try {
      chrome.runtime.sendMessage({ type: "CTP_PROGRESS", text: text, extra: extra });
    } catch (e) {
      /* popup may be closed */
    }
    if (CTP.ui && typeof CTP.ui.setProgress === "function") {
      CTP.ui.setProgress(text, extra);
    }
  },

  downloadText: function (text, filename, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  },

  toolLabel: function (name) {
    var n = String(name || "").toLowerCase();
    var map = {
      web_search: "Searched the web",
      web_fetch: "Read a page",
      fetch: "Read a page",
      bash: "Ran a command",
      bash_tool: "Ran a command",
      bash_code_execution: "Ran code",
      code_execution: "Ran code",
      repl: "Ran code",
      artifacts: "Artifact",
      create_file: "Created a file",
      str_replace_based_edit_tool: "Edited a file",
      text_editor_code_execution: "Edited a file",
      computer: "Used computer",
      computer_use: "Used computer",
      generate_image: "Generated an image",
      image_generation: "Generated an image",
      chart_display_v0: "Drew a chart",
      step_card_display_v0: "Listed steps",
      visualize: "Showed a widget",
      "visualize:show_widget": "Showed a widget",
      memory: "Memory",
      memory_search: "Memory",
      conversation_search: "Memory",
      recalled_memory: "Recalled memory",
    };
    if (map[n]) return map[n];
    if (n.indexOf("search") !== -1) return "Searched the web";
    if (n.indexOf("image") !== -1) return "Image";
    if (n.indexOf("chart") !== -1) return "Drew a chart";
    if (n.indexOf("visualize") !== -1) return "Showed a widget";
    if (n.indexOf("memory") !== -1) return "Memory";
    if (!n) return "Tool";
    return n.replace(/[_:]+/g, " ").replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  },
};
