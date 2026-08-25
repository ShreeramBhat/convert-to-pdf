/* global CTP */
var CTP = window.CTP || {};
window.CTP = CTP;

CTP.md = (function () {
  var TOKEN = "\x00%d\x00";

  function inline(text) {
    var stash = [];
    function keep(s) {
      stash.push(s);
      return TOKEN.replace("%d", String(stash.length - 1));
    }
    text = String(text || "");
    text = text.replace(/`([^`]+)`/g, function (_, code) {
      return keep("<code>" + CTP.util.escapeHtml(code) + "</code>");
    });
    text = CTP.util.escapeHtml(text);
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, url) {
      return keep(
        '<img src="' +
          CTP.util.escapeHtml(url) +
          '" alt="' +
          alt +
          '">'
      );
    });
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      return keep(
        '<a href="' + CTP.util.escapeHtml(url) + '">' + label + "</a>"
      );
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(?<![\*\w])\*([^*\n]+)\*(?!\w)/g, "<em>$1</em>");
    stash.forEach(function (s, i) {
      text = text.replace(TOKEN.replace("%d", String(i)), s);
    });
    return text;
  }

  function isTableSep(s) {
    return /^\|?[\s:]*-+[\s:|-]*\|[\s:|-]*$/.test(s) || /^[\s|:-]+$/.test(s) && s.indexOf("|") !== -1 && /-/.test(s);
  }

  function splitRow(s) {
    var t = s.trim();
    if (t.charAt(0) === "|") t = t.slice(1);
    if (t.charAt(t.length - 1) === "|") t = t.slice(0, -1);
    return t.split("|").map(function (c) {
      return c.trim();
    });
  }

  function renderBlocks(lines) {
    var out = [];
    var i = 0;
    var n = lines.length;
    var para = [];
    var ul = [];
    var ol = [];
    var quote = [];

    function flush() {
      if (para.length) {
        out.push("<p>" + inline(para.join(" ").trim()) + "</p>");
        para = [];
      }
      if (ul.length) {
        out.push(
          "<ul>" +
            ul
              .map(function (x) {
                return "<li>" + inline(x) + "</li>";
              })
              .join("") +
            "</ul>"
        );
        ul = [];
      }
      if (ol.length) {
        out.push(
          "<ol>" +
            ol
              .map(function (x) {
                return "<li>" + inline(x) + "</li>";
              })
              .join("") +
            "</ol>"
        );
        ol = [];
      }
      if (quote.length) {
        out.push("<blockquote>" + inline(quote.join(" ")) + "</blockquote>");
        quote = [];
      }
    }

    while (i < n) {
      var ln = lines[i];
      var s = ln.trim();

      if (s.indexOf("```") === 0) {
        var lang = s.slice(3).trim();
        i += 1;
        var buf = [];
        while (i < n && lines[i].trim().indexOf("```") !== 0) {
          buf.push(lines[i]);
          i += 1;
        }
        i += 1;
        flush();
        var code = buf.join("\n").replace(/\n$/, "");
        var tall = code.split("\n").length > 22 ? " tall" : "";
        var label = lang
          ? '<div class="lang">' + CTP.util.escapeHtml(lang) + "</div>"
          : "";
        out.push(
          '<div class="codewrap' +
            tall +
            '">' +
            label +
            "<pre><code>" +
            CTP.util.escapeHtml(code) +
            "</code></pre></div>"
        );
        continue;
      }

      if (s.indexOf("::: tool ") === 0) {
        flush();
        out.push('<div class="tool">' + inline(s.slice(9).trim()) + "</div>");
        i += 1;
        continue;
      }

      if (!s) {
        flush();
        i += 1;
        continue;
      }

      if (s.indexOf("|") !== -1 && i + 1 < n && isTableSep(lines[i + 1].trim())) {
        flush();
        var headers = splitRow(s);
        i += 2;
        var rows = [headers];
        while (i < n && lines[i].indexOf("|") !== -1 && lines[i].trim()) {
          rows.push(splitRow(lines[i]));
          i += 1;
        }
        var thead =
          "<thead><tr>" +
          headers
            .map(function (h) {
              return "<th>" + inline(h) + "</th>";
            })
            .join("") +
          "</tr></thead>";
        var tbody =
          "<tbody>" +
          rows
            .slice(1)
            .map(function (r) {
              return (
                "<tr>" +
                headers
                  .map(function (_h, ci) {
                    return "<td>" + inline(r[ci] || "") + "</td>";
                  })
                  .join("") +
                "</tr>"
              );
            })
            .join("") +
          "</tbody>";
        out.push('<table class="md">' + thead + tbody + "</table>");
        continue;
      }

      var hm = s.match(/^(#{1,4})\s+(.*)$/);
      if (hm) {
        flush();
        var lvl = hm[1].length;
        out.push("<h" + lvl + ">" + inline(hm[2]) + "</h" + lvl + ">");
        i += 1;
        continue;
      }

      if (/^(-{3,}|\*{3,})$/.test(s)) {
        flush();
        out.push("<hr>");
        i += 1;
        continue;
      }

      var onlyImg = s.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (onlyImg) {
        flush();
        out.push(
          '<figure class="att"><img src="' +
            CTP.util.escapeHtml(onlyImg[2]) +
            '" alt="' +
            CTP.util.escapeHtml(onlyImg[1]) +
            '"></figure>'
        );
        i += 1;
        continue;
      }

      if (s.indexOf("> ") === 0) {
        if (para.length || ul.length || ol.length) flush();
        quote.push(s.slice(2));
        i += 1;
        continue;
      }
      if (quote.length) flush();

      var um = s.match(/^[-*]\s+(.*)$/);
      if (um) {
        if (para.length || ol.length) flush();
        ul.push(um[1]);
        i += 1;
        continue;
      }
      if (ul.length) flush();

      var om = s.match(/^\d+[.)]\s+(.*)$/);
      if (om) {
        if (para.length || ul.length) flush();
        ol.push(om[1]);
        i += 1;
        continue;
      }
      if (ol.length) flush();

      para.push(s);
      i += 1;
    }
    flush();
    return out.join("");
  }

  function render(text) {
    return renderBlocks(String(text || "").split("\n"));
  }

  function partToMd(part) {
    if (!part) return "";
    if (part.type === "markdown") return part.text || "";
    if (part.type === "code") {
      var fence = CTP.util.pickFence(part.text || "");
      var title = part.title ? "<!-- " + part.title + " -->\n" : "";
      return title + fence + (part.lang || "") + "\n" + (part.text || "") + "\n" + fence;
    }
    if (part.type === "image") {
      var src = part.href || part.src || "";
      return "![" + (part.alt || part.caption || "image") + "](" + src + ")";
    }
    if (part.type === "tool") return "::: tool " + (part.label || "Tool");
    if (part.type === "thinking") {
      return (
        "<details><summary>Thinking</summary>\n\n" +
        (part.text || "") +
        "\n\n</details>"
      );
    }
    if (part.type === "file") {
      return "*Attachment: " + (part.name || "file") + (part.extra ? " · " + part.extra : "") + "*";
    }
    if (part.type === "html") return "";
    if (part.type === "sources") {
      return (part.items || [])
        .map(function (it, i) {
          return (i + 1) + ". [" + (it.title || it.url || "source") + "](" + (it.url || "") + ")";
        })
        .join("\n");
    }
    return "";
  }

  function transcript(model) {
    var lines = ["---"];
    if (model.title) lines.push("title: " + model.title);
    if (model.eyebrow) lines.push("eyebrow: " + model.eyebrow);
    if (model.meta) lines.push("meta: " + model.meta);
    if (model.source) lines.push("source: " + model.source);
    if (model.disclaimer) lines.push("disclaimer: " + model.disclaimer);
    lines.push("---", "");
    (model.turns || []).forEach(function (t) {
      lines.push("::: turn " + t.role + " | " + t.who + (t.ts ? " | " + t.ts : ""));
      if (t.heading) lines.push("## " + t.heading, "");
      (t.parts || []).forEach(function (p) {
        var chunk = partToMd(p);
        if (chunk) lines.push(chunk, "");
      });
      lines.push(":::", "");
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n");
  }

  return { inline: inline, render: render, transcript: transcript, partToMd: partToMd };
})();
