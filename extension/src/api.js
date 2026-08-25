/* global CTP */
var CTP = window.CTP || {};
window.CTP = CTP;

CTP.api = {
  detectPage: function (url) {
    try {
      var u = new URL(url || location.href);
    } catch (e) {
      return { kind: "unknown" };
    }
    if (u.hostname !== "claude.ai" && !u.hostname.endsWith(".claude.ai")) {
      return { kind: "unknown" };
    }
    var share = u.pathname.match(/\/share\/([0-9a-f-]{36})/i);
    if (share) return { kind: "share", id: share[1], url: u.href };
    var chat = u.pathname.match(/\/chat\/([0-9a-f-]{36})/i);
    if (chat) return { kind: "chat", id: chat[1], url: u.href };
    return { kind: "unknown", url: u.href };
  },

  pageAppearance: function () {
    function lum(el) {
      if (!el) return null;
      var bg = "";
      try {
        bg = getComputedStyle(el).backgroundColor || "";
      } catch (e) {
        return null;
      }
      var m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (!m) return null;
      return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
    }
    var root = document.documentElement;
    var body = document.body;
    var main = document.querySelector("main") || body;
    var L = lum(main);
    if (L == null) L = lum(body);
    if (L == null) L = lum(root);
    if (L != null) return L < 0.5 ? "dark" : "light";

    var hay = [
      root.className,
      body && body.className,
      root.getAttribute("data-theme"),
      root.getAttribute("data-mode"),
      root.getAttribute("data-color-mode"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (/\bdark\b/.test(hay) && !/\blight\b/.test(hay)) return "dark";
    if (/\blight\b/.test(hay) && !/\bdark\b/.test(hay)) return "light";
    try {
      var cs = getComputedStyle(root).colorScheme || "";
      if (/\bdark\b/.test(cs) && !/\blight\b/.test(cs)) return "dark";
    } catch (e) {}
    return "light";
  },

  pageTitle: function () {
    var el =
      document.querySelector('[data-testid="chat-title-button"]') ||
      document.querySelector("button[data-testid='chat-title-button'] .truncate") ||
      document.querySelector("main h1") ||
      document.querySelector("h1");
    var t = (el && el.textContent || "").trim();
    if (t && !/^claude$/i.test(t) && !/^new conversation$/i.test(t)) return t;
    var doc = (document.title || "").replace(/\s*[—–|\-]\s*Claude.*$/i, "").trim();
    return doc || "Claude conversation";
  },

  listConversations: async function (limit) {
    limit = limit || 50;
    var org = await CTP.api.getOrgId();
    var items = [];
    var offset = 0;
    var guard = 0;
    while (items.length < limit && guard < 8) {
      guard += 1;
      var pageSize = Math.min(30, limit - items.length);
      var path =
        "/api/organizations/" +
        org +
        "/chat_conversations?limit=" +
        pageSize +
        "&offset=" +
        offset +
        "&starred=false";
      var page = await CTP.api.fetchJSON(path);
      var batch = [];
      if (Array.isArray(page)) batch = page;
      else if (page && Array.isArray(page.data)) batch = page.data;
      else if (page && Array.isArray(page.chat_conversations)) batch = page.chat_conversations;
      else if (page && Array.isArray(page.conversations)) batch = page.conversations;
      if (!batch.length) break;
      items = items.concat(batch);
      offset += batch.length;
      if (batch.length < pageSize) break;
    }
    return items.slice(0, limit);
  },

  fetchConversationById: async function (uuid) {
    var org = await CTP.api.getOrgId();
    return CTP.api.fetchJSON(
      "/api/organizations/" +
        org +
        "/chat_conversations/" +
        uuid +
        "?tree=true&rendering_mode=messages&render_all_tools=true"
    );
  },

  getOrgId: async function () {
    var m = document.cookie.match(/lastActiveOrg=([^;]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    var orgs = await CTP.api.fetchJSON("/api/organizations");
    if (Array.isArray(orgs) && orgs[0] && orgs[0].uuid) return orgs[0].uuid;
    throw new Error("Could not find your Claude organization. Are you signed in?");
  },

  fetchJSON: async function (path) {
    var url = path.indexOf("http") === 0 ? path : path;
    var res = await fetch(url, {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      var err = new Error("GET " + path + " failed: " + res.status + " " + res.statusText);
      err.status = res.status;
      throw err;
    }
    return res.json();
  },

  fetchConversation: async function (page) {
    if (page.kind === "share") {
      return CTP.api.fetchJSON(
        "/api/chat_snapshots/" +
          page.id +
          "?rendering_mode=messages&render_all_tools=true"
      );
    }
    if (page.kind === "chat") {
      var org = await CTP.api.getOrgId();
      return CTP.api.fetchJSON(
        "/api/organizations/" +
          org +
          "/chat_conversations/" +
          page.id +
          "?tree=true&rendering_mode=messages&render_all_tools=true"
      );
    }
    throw new Error("Open a Claude chat or share page first.");
  },

  selectBranch: function (data) {
    var messages = (data && data.chat_messages) || [];
    var leaf = data && data.current_leaf_message_uuid;
    if (!leaf) {
      return messages.slice().sort(function (a, b) {
        return (a.index || 0) - (b.index || 0);
      });
    }
    var byUuid = new Map();
    messages.forEach(function (m) {
      if (m && m.uuid) byUuid.set(m.uuid, m);
    });
    var path = [];
    var cursor = leaf;
    var seen = new Set();
    while (cursor && byUuid.has(cursor) && !seen.has(cursor)) {
      seen.add(cursor);
      var msg = byUuid.get(cursor);
      path.push(msg);
      cursor = msg.parent_message_uuid || null;
    }
    path.reverse();
    return path.length ? path : messages;
  },

  userName: function (data) {
    if (!data) return "You";
    if (typeof data.created_by === "string" && data.created_by.trim()) return data.created_by.trim();
    var c = data.creator;
    if (c && typeof c === "object") {
      return c.full_name || c.display_name || c.name || c.email || "You";
    }
    if (typeof c === "string" && c.trim()) return c.trim();
    return "You";
  },

  lastArtifactAt: function (messages) {
    var last = new Map();
    messages.forEach(function (m, mi) {
      (m.content || []).forEach(function (b, bi) {
        if (b && b.type === "tool_use" && b.name === "artifacts" && b.input && b.input.id) {
          last.set(b.input.id, mi + ":" + bi);
        }
      });
    });
    return last;
  },

  foldArtifacts: function (messages) {
    var arts = new Map();
    messages.forEach(function (m) {
      (m.content || []).forEach(function (b) {
        if (!b || b.type !== "tool_use" || b.name !== "artifacts" || !CTP.util.isRecord(b.input)) return;
        var input = b.input;
        var id = input.id;
        if (!id) return;
        var cur = arts.get(id) || {
          id: id,
          title: input.title || "Artifact",
          language: input.language || "",
          type: input.type || "",
          content: "",
        };
        if (input.title) cur.title = input.title;
        if (input.language) cur.language = input.language;
        if (input.type) cur.type = input.type;
        var cmd = input.command;
        if (cmd === "create" || cmd === "rewrite" || (!cmd && input.content)) {
          cur.content = input.content || "";
        } else if (cmd === "update" && input.old_str != null) {
          cur.content = String(cur.content || "").replace(input.old_str, function () {
            return input.new_str || "";
          });
        }
        arts.set(id, cur);
      });
    });
    return arts;
  },

  langOf: function (pre) {
    var cls = pre.className || "";
    var m = cls.match(/language-([\w+-]+)/);
    if (m) return m[1];
    var attr = pre.getAttribute("data-language") || pre.getAttribute("data-lang") || "";
    if (attr) return attr;
    var label = pre.parentElement && pre.parentElement.querySelector("[class*='lang'], .text-xs");
    if (label && label.textContent && label.textContent.length < 20) return label.textContent.trim();
    return "";
  },

  partsFromEl: function (el) {
    if (!el) return [];
    var clone = el.cloneNode(true);
    clone.querySelectorAll("button, svg, [aria-hidden='true']").forEach(function (n) {
      n.remove();
    });
    var marks = [];
    clone.querySelectorAll("pre, img").forEach(function (n) {
      var token = document.createTextNode("\n\n%%CTP" + marks.length + "%%\n\n");
      if (n.tagName === "PRE") {
        marks.push({
          type: "code",
          lang: CTP.api.langOf(n),
          text: n.textContent.replace(/\n$/, ""),
        });
      } else {
        var src = n.currentSrc || n.src || n.getAttribute("src") || "";
        marks.push({ type: "image", src: src, alt: n.alt || "", href: src });
      }
      n.parentNode.replaceChild(token, n);
    });
    var raw = clone.innerText || "";
    var parts = [];
    var re = /%%CTP(\d+)%%/g;
    var last = 0;
    var m;
    while ((m = re.exec(raw))) {
      var chunk = raw.slice(last, m.index).trim();
      if (chunk) parts.push({ type: "markdown", text: chunk });
      if (marks[+m[1]]) parts.push(marks[+m[1]]);
      last = m.index + m[0].length;
    }
    var tail = raw.slice(last).trim();
    if (tail) parts.push({ type: "markdown", text: tail });
    return parts.filter(function (p) {
      return p && (p.text || p.src);
    });
  },

  fromDom: function (page) {
    var title = CTP.api.pageTitle();
    var messages = [];
    var h2s = document.querySelectorAll("main h2");
    if (h2s.length) {
      h2s.forEach(function (h, i) {
        var heading = (h.textContent || "").trim();
        var role = /you said|^you\b/i.test(heading) ? "human" : "assistant";
        var container = h.closest("section, article") || h.parentElement;
        var next = h2s[i + 1];
        var rangeRoot = document.createElement("div");
        if (container && (!next || !container.contains(next))) {
          rangeRoot = container.cloneNode(true);
        } else {
          var node = h.nextElementSibling;
          while (node && node.tagName !== "H2" && node !== (next && next.parentElement)) {
            if (next && node.contains(next)) break;
            rangeRoot.appendChild(node.cloneNode(true));
            node = node.nextElementSibling;
          }
        }
        var parts = CTP.api.partsFromEl(rangeRoot);
        if (!parts.length) return;
        messages.push({
          uuid: "dom-" + i,
          sender: role,
          created_at: null,
          content: [],
          _parts: parts,
          text: heading.replace(/^(You said|Claude responded):\s*/i, ""),
        });
      });
    }
    if (!messages.length) {
      var main = document.querySelector("main") || document.body;
      messages.push({
        uuid: "dom-0",
        sender: "assistant",
        content: [],
        _parts: CTP.api.partsFromEl(main),
      });
    }
    return {
      name: title,
      snapshot_name: title,
      chat_messages: messages,
      _fromDom: true,
      _page: page,
    };
  },
};
