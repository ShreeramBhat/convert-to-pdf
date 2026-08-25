/* global CTP */
var CTP = window.CTP || {};
window.CTP = CTP;

CTP.test = {
  inventory: function (data) {
    var counts = {
      messages: 0,
      human: 0,
      assistant: 0,
      files: 0,
      attachments: 0,
      images: 0,
      artifacts: 0,
      widgets: 0,
      citations: 0,
      tables: 0,
      code: 0,
      thinking: 0,
      sources: 0,
      documents: 0,
      blocks: {},
      tools: {},
    };
    var msgs = CTP.api.selectBranch(data);
    counts.messages = msgs.length;
    msgs.forEach(function (m) {
      if (m.sender === "human") counts.human += 1;
      else counts.assistant += 1;
      counts.files += (m.files || []).length;
      counts.attachments += (m.attachments || []).length;
      (m.files || []).forEach(function (f) {
        if ((f.file_kind || f.kind) === "image") counts.images += 1;
      });
      (m.content || []).forEach(function (b) {
        var type = (b && b.type) || "unknown";
        counts.blocks[type] = (counts.blocks[type] || 0) + 1;
        if (type === "image") counts.images += 1;
        if (type === "thinking") counts.thinking += 1;
        if (type === "document") counts.documents += 1;
        if (type === "code" || type === "code_block") counts.code += 1;
        if (type === "text" && b.text) {
          if (/```/.test(b.text)) counts.code += 1;
          if (/^\|.+\|/m.test(b.text)) counts.tables += 1;
          if (Array.isArray(b.citations) && b.citations.length) counts.citations += 1;
        }
        if (type === "tool_use") {
          var name = b.name || "tool";
          counts.tools[name] = (counts.tools[name] || 0) + 1;
          if (name === "artifacts") counts.artifacts += 1;
          if (String(name).indexOf("visualize") !== -1) counts.widgets += 1;
        }
      });
    });
    counts.assetKinds = [
      counts.files && "files",
      counts.attachments && "attachments",
      counts.images && "images",
      counts.artifacts && "artifacts",
      counts.widgets && "widgets",
      counts.citations && "citations",
      counts.tables && "tables",
      counts.code && "code",
      counts.thinking && "thinking",
      counts.documents && "documents",
    ].filter(Boolean);
    counts.richness = counts.assetKinds.length + Math.min(4, Math.floor(counts.messages / 10));
    return counts;
  },

  runOne: async function (uuid, name) {
    var started = Date.now();
    var row = { uuid: uuid, name: name || uuid, ok: false, ms: 0 };
    try {
      var data = await CTP.api.fetchConversationById(uuid);
      if (!data || !Array.isArray(data.chat_messages)) {
        throw new Error("No chat_messages");
      }
      row.inventory = CTP.test.inventory(data);
      var model = await CTP.html.prepare(data, { kind: "chat", id: uuid, url: "https://claude.ai/chat/" + uuid }, {
        includeThinking: true,
        includeToolResults: false,
        skipDomImages: true,
        appearance: "dark",
        theme: "dark",
      });
      var payload = CTP.html.buildPayload(model, { theme: "dark", appearance: "dark", autoPrint: false });
      row.turns = (model.turns || []).length;
      row.htmlBytes = (payload.body || "").length;
      row.partTypes = {};
      (model.turns || []).forEach(function (t) {
        (t.parts || []).forEach(function (p) {
          row.partTypes[p.type] = (row.partTypes[p.type] || 0) + 1;
        });
      });
      if (!row.turns) throw new Error("Renderer produced 0 turns");
      if (row.htmlBytes < 80) throw new Error("HTML too small");
      row.ok = true;
    } catch (e) {
      row.ok = false;
      row.error = (e && e.message) || String(e);
    }
    row.ms = Date.now() - started;
    return row;
  },

  run: async function (opts) {
    opts = opts || {};
    var limit = opts.limit || 50;
    CTP.ui && CTP.ui.show("Testing " + limit + " conversations");
    CTP.util.progress("Listing conversations…");
    var list = await CTP.api.listConversations(limit);
    if (!list.length) throw new Error("Conversation list was empty.");
    var results = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var uuid = item.uuid || item.id || item.chat_uuid;
      var name = item.name || item.title || uuid;
      if (!uuid) {
        results.push({ ok: false, name: name, error: "Missing uuid" });
        continue;
      }
      CTP.util.progress("Testing “" + String(name).slice(0, 48) + "” (" + (i + 1) + "/" + list.length + ")", {
        current: i + 1,
        total: list.length,
      });
      results.push(await CTP.test.runOne(uuid, name));
    }
    var passed = results.filter(function (r) { return r.ok; }).length;
    var failed = results.filter(function (r) { return !r.ok; }).length;
    var kinds = {};
    results.forEach(function (r) {
      ((r.inventory && r.inventory.assetKinds) || []).forEach(function (k) {
        kinds[k] = (kinds[k] || 0) + 1;
      });
      Object.keys((r.inventory && r.inventory.tools) || {}).forEach(function (t) {
        kinds["tool:" + t] = (kinds["tool:" + t] || 0) + 1;
      });
    });
    var report = {
      when: new Date().toISOString(),
      limit: limit,
      listed: list.length,
      passed: passed,
      failed: failed,
      kinds: kinds,
      results: results,
    };
    CTP.util.downloadText(JSON.stringify(report, null, 2), "claude-to-pdf-test-report.json", "application/json");
    CTP.ui && CTP.ui.hide();
    return report;
  },
};
