/* global CTP */
var CTP = window.CTP || {};
window.CTP = CTP;

CTP.html = (function () {
  var THEMES = {
    warm: {
      paper: "#ffffff",
      accent: "#c96442",
      rule: "#e6e1da",
      tint: "#faf7f4",
      chip: "#f1ede7",
      ink: "#1c1a17",
      mute: "#6b6560",
      line: "#e0dad1",
      quote: "#f5f2ee",
    },
    slate: {
      paper: "#ffffff",
      accent: "#3b6ea5",
      rule: "#e2e5e9",
      tint: "#f6f8fa",
      chip: "#eef1f4",
      ink: "#15181c",
      mute: "#626a72",
      line: "#dde1e6",
      quote: "#f2f5f8",
    },
    dark: {
      paper: "#1c1b19",
      accent: "#d47855",
      rule: "#3d3b38",
      tint: "#2a2825",
      chip: "#32302c",
      ink: "#f3efe9",
      mute: "#a8a29c",
      line: "#3f3d39",
      quote: "#262421",
    },
  };

  function themeVars(t) {
    return (
      "--paper:" + t.paper +
      ";--accent:" + t.accent +
      ";--rule:" + t.rule +
      ";--tint:" + t.tint +
      ";--chip:" + t.chip +
      ";--ink:" + t.ink +
      ";--mute:" + t.mute +
      ";--line:" + t.line +
      ";--quote:" + t.quote
    );
  }

  function resolveTheme(name, appearance) {
    if (!name || name === "auto" || name === "match") {
      return appearance === "dark" ? "dark" : "warm";
    }
    if (name === "light") return "warm";
    if (THEMES[name]) return name;
    return "warm";
  }

  function css(themeName, page) {
    var pageSize = page || "A4";
    var resolved = THEMES[themeName] ? themeName : "warm";
    return (
      "@page { size: " +
      pageSize +
      "; margin: 16mm 14mm 18mm 14mm; }\n" +
      "html { " +
      themeVars(THEMES[resolved]) +
      "; }\n" +
      "html.theme-warm, html.theme-light { " +
      themeVars(THEMES.warm) +
      "; color-scheme: light; }\n" +
      "html.theme-slate { " +
      themeVars(THEMES.slate) +
      "; color-scheme: light; }\n" +
      "html.theme-dark { " +
      themeVars(THEMES.dark) +
      "; color-scheme: dark; }\n" +
      "* { box-sizing: border-box; }\n" +
      "html, body, #doc { margin: 0; padding: 0; background: var(--paper); color: var(--ink); }\n" +
      "body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.4pt; line-height: 1.55; min-height: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n" +
      ".doc { max-width: 780px; margin: 0 auto; padding: 8px 4px 48px; background: var(--paper); }\n" +
      ".doc-header { border-bottom: 2px solid var(--accent); padding-bottom: 14px; margin-bottom: 26px; }\n" +
      ".eyebrow { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; text-transform: uppercase; letter-spacing: .12em; font-size: 7.6pt; color: var(--accent); font-weight: 700; }\n" +
      "h1 { font-size: 21pt; line-height: 1.2; margin: 8px 0 10px; font-weight: 700; letter-spacing: -.01em; color: var(--ink); }\n" +
      ".meta, .src { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 8.4pt; color: var(--mute); }\n" +
      ".src { margin-top: 4px; }\n" +
      ".url { font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 7.8pt; color: var(--mute); word-break: break-all; }\n" +
      ".disclaimer { font-size: 8.2pt; color: var(--mute); font-style: italic; margin: 12px 0 0; line-height: 1.45; }\n" +
      ".turn { margin: 0 0 30px; padding-left: 14px; border-left: 3px solid var(--rule); }\n" +
      ".turn.user { border-left-color: var(--accent); background: var(--tint); padding: 12px 14px 4px; margin-left: -6px; }\n" +
      ".who { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 8.6pt; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--mute); margin-bottom: 6px; }\n" +
      ".turn.user .who { color: var(--accent); }\n" +
      ".ts { font-weight: 400; text-transform: none; letter-spacing: 0; opacity: .75; margin-left: 8px; }\n" +
      "h2 { font-size: 12.6pt; margin: 4px 0 10px; line-height: 1.3; font-weight: 700; break-after: avoid; color: var(--ink); }\n" +
      "h3 { font-size: 11pt; margin: 20px 0 8px; font-weight: 700; break-after: avoid; color: var(--ink); }\n" +
      "h4 { font-size: 10pt; margin: 16px 0 6px; font-weight: 700; break-after: avoid; color: var(--ink); }\n" +
      "p { margin: 0 0 10px; }\n" +
      "ul, ol { margin: 0 0 10px; padding-left: 20px; }\n" +
      "li { margin-bottom: 5px; }\n" +
      "blockquote { margin: 12px 0; padding: 9px 14px; background: var(--quote); border-left: 3px solid var(--line); font-size: 9.8pt; }\n" +
      "code { font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 8.8pt; background: var(--chip); padding: 1px 4px; border-radius: 3px; }\n" +
      ".tool { display: inline-block; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 7.6pt; color: var(--mute); background: var(--chip); border: 1px solid var(--line); border-radius: 10px; padding: 2px 9px; margin: 0 6px 10px 0; }\n" +
      ".codewrap { margin: 12px 0 14px; border: 1px solid var(--line); border-radius: 5px; overflow: hidden; background: var(--tint); break-inside: avoid; }\n" +
      ".codewrap.tall { break-inside: auto; }\n" +
      ".lang { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 7.4pt; text-transform: uppercase; letter-spacing: .1em; color: var(--mute); background: var(--chip); border-bottom: 1px solid var(--line); padding: 3px 10px; }\n" +
      "pre { margin: 0; padding: 10px 12px; }\n" +
      "pre code { font-size: 7.7pt; line-height: 1.45; background: none; padding: 0; white-space: pre-wrap; word-break: break-word; display: block; color: var(--ink); }\n" +
      "a { color: var(--accent); text-decoration: none; word-break: break-word; }\n" +
      "hr { border: 0; border-top: 1px solid var(--line); margin: 22px 0; }\n" +
      "figure.att { margin: 12px 0 14px; }\n" +
      "figure.att img, img.shot { max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 5px; display: block; background: var(--paper); }\n" +
      "figure.att.diagram { background: var(--tint); padding: 10px; border: 1px solid var(--line); border-radius: 8px; }\n" +
      "figure.att.diagram img { background: transparent; border: 0; }\n" +
      figureCss(resolved) +
      "figcaption { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 8pt; color: var(--mute); margin-top: 5px; }\n" +
      "table.md { border-collapse: collapse; width: 100%; margin: 12px 0 14px; font-size: 9.5pt; }\n" +
      "table.md th, table.md td { border: 1px solid var(--line); padding: 6px 8px; vertical-align: top; }\n" +
      "table.md th { background: var(--chip); text-align: left; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 8.2pt; }\n" +
      "details.thinking { margin: 10px 0 14px; border: 1px solid var(--line); border-radius: 5px; background: var(--quote); padding: 8px 12px; }\n" +
      "details.thinking summary { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 8pt; color: var(--mute); cursor: pointer; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }\n" +
      "details.thinking pre { margin-top: 8px; }\n" +
      ".filechip { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 8.4pt; color: var(--ink); background: var(--chip); border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; margin: 0 0 12px; }\n" +
      ".filechip .k { color: var(--mute); font-size: 7.4pt; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }\n" +
      ".sources { margin: 12px 0 14px; border: 1px solid var(--line); border-radius: 5px; overflow: hidden; background: var(--tint); }\n" +
      ".sources ol { margin: 8px 12px 10px; padding-left: 18px; font-size: 8.6pt; }\n" +
      ".sources li { margin-bottom: 4px; }\n" +
      "@media print { html, body, #doc, .doc { background: var(--paper) !important; color: var(--ink) !important; } }\n"
    );
  }

  /*
   * A captured chart arrives as live HTML carrying frozen inline styles. The
   * document's own typography (Georgia, 10.4pt, line-height 1.55, list and
   * paragraph margins) would otherwise leak into it, so every node inside is
   * reverted to the user-agent default first; the inline styles, which beat any
   * stylesheet rule, then paint the chart exactly as the page drew it.
   */
  function figureCss(resolved) {
    var dark = resolved === "dark";
    return (
      ".ctpfig { margin: 14px 0 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--tint); break-inside: avoid; page-break-inside: avoid; }\n" +
      /* A widget showing its table view is taller than a page; forcing it to
         stay whole would push it off the sheet instead. */
      ".ctpfig.tall { break-inside: auto; page-break-inside: auto; }\n" +
      ".ctpfig table { border-collapse: collapse; }\n" +
      ".ctpfig tr { break-inside: avoid; page-break-inside: avoid; }\n" +
      /* Reset only the HTML chrome around the drawing. `all` must never reach
         the SVG: in Chrome d/x/y/width/height/r are real CSS properties, and a
         stylesheet rule outranks the presentation attributes the chart uses to
         carry its geometry, so reverting them erases every path. Everything
         inside the <svg> already carries its own frozen styles. */
      ".ctpfig *:not(svg, svg *) { all: revert; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n" +
      ".ctpfig, .ctpfig * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n" +
      ".ctpfig .ctpfig-v { display: none; margin: 0; padding: 0; }\n" +
      ".ctpfig .ctpfig-v[data-variant=\"" + (dark ? "dark" : "light") + "\"] { display: block; }\n" +
      "html.theme-warm .ctpfig .ctpfig-v, html.theme-light .ctpfig .ctpfig-v, html.theme-slate .ctpfig .ctpfig-v, html.theme-dark .ctpfig .ctpfig-v { display: none; }\n" +
      "html.theme-warm .ctpfig .ctpfig-v[data-variant=\"light\"], html.theme-light .ctpfig .ctpfig-v[data-variant=\"light\"], html.theme-slate .ctpfig .ctpfig-v[data-variant=\"light\"] { display: block; }\n" +
      "html.theme-dark .ctpfig .ctpfig-v[data-variant=\"dark\"] { display: block; }\n" +
      ".ctpfig svg { max-width: 100%; height: auto; }\n" +
      "details.chartdata { margin: 10px 0 14px; }\n" +
      "details.chartdata summary { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 8pt; color: var(--mute); cursor: pointer; letter-spacing: .04em; text-transform: uppercase; font-weight: 700; }\n" +
      "details.chartdata table.md { font-size: 8pt; margin-top: 8px; }\n"
    );
  }

  function codeBlock(lang, text, title) {
    var code = String(text || "").replace(/\n$/, "");
    var tall = code.split("\n").length > 22 ? " tall" : "";
    var bits = [];
    if (title) bits.push('<div class="lang">' + CTP.util.escapeHtml(title) + "</div>");
    else if (lang) bits.push('<div class="lang">' + CTP.util.escapeHtml(lang) + "</div>");
    bits.push("<pre><code>" + CTP.util.escapeHtml(code) + "</code></pre>");
    return '<div class="codewrap' + tall + '">' + bits.join("") + "</div>";
  }

  function renderPart(part) {
    if (!part) return "";
    if (part.type === "markdown") return CTP.md.render(part.text || "");
    if (part.type === "code") return codeBlock(part.lang, part.text, part.title);
    if (part.type === "image") {
      var src = part.src || part.href || "";
      if (!src) return "";
      var cap = part.caption || part.alt || "";
      var figClass = part.diagram ? "att diagram" : "att";
      return (
        '<figure class="' +
        figClass +
        '"><img src="' +
        CTP.util.escapeHtml(src) +
        '" alt="' +
        CTP.util.escapeHtml(part.alt || "") +
        '">' +
        (cap ? "<figcaption>" + CTP.util.escapeHtml(cap) + "</figcaption>" : "") +
        "</figure>"
      );
    }
    if (part.type === "tool") {
      return '<div class="tool">' + CTP.md.inline(part.label || "Tool") + "</div>";
    }
    if (part.type === "thinking") {
      return (
        '<details class="thinking"><summary>Thinking</summary><pre><code>' +
        CTP.util.escapeHtml(part.text || "") +
        "</code></pre></details>"
      );
    }
    if (part.type === "file") {
      return (
        '<div class="filechip"><div class="k">Attachment</div>' +
        CTP.util.escapeHtml(part.name || "file") +
        (part.extra ? " · " + CTP.util.escapeHtml(part.extra) : "") +
        "</div>"
      );
    }
    if (part.type === "html") return part.html || "";
    if (part.type === "sources") {
      var items = (part.items || [])
        .map(function (it) {
          var label = CTP.util.escapeHtml(it.title || it.url || "Source");
          if (it.url) {
            return (
              "<li><a href=\"" +
              CTP.util.escapeHtml(it.url) +
              "\">" +
              label +
              "</a></li>"
            );
          }
          return "<li>" + label + "</li>";
        })
        .join("");
      if (!items) return "";
      return '<div class="sources"><div class="lang">Sources</div><ol>' + items + "</ol></div>";
    }
    return "";
  }

  function headerHtml(model) {
    var bits = [];
    if (model.eyebrow) bits.push('<div class="eyebrow">' + CTP.md.inline(model.eyebrow) + "</div>");
    if (model.title) bits.push("<h1>" + CTP.md.inline(model.title) + "</h1>");
    if (model.meta) {
      var cells = model.meta.split("|").map(function (x) {
        return CTP.md.inline(x.trim());
      });
      bits.push('<div class="meta">' + cells.join(" &nbsp;&nbsp;·&nbsp;&nbsp; ") + "</div>");
    }
    if (model.source) {
      bits.push(
        '<div class="src">Source: <span class="url">' +
          CTP.util.escapeHtml(model.source) +
          "</span></div>"
      );
    }
    if (model.disclaimer) {
      bits.push('<p class="disclaimer">' + CTP.md.inline(model.disclaimer) + "</p>");
    }
    return bits.length ? '<div class="doc-header">' + bits.join("") + "</div>" : "";
  }

  function bodyHtml(model) {
    var turns = (model.turns || [])
      .map(function (t) {
        var inner = (t.parts || []).map(renderPart).join("");
        var stamp = t.ts ? '<span class="ts">' + CTP.util.escapeHtml(t.ts) + "</span>" : "";
        var heading = t.heading ? "<h2>" + CTP.md.inline(t.heading) + "</h2>" : "";
        return (
          '<section class="turn ' +
          CTP.util.escapeHtml(t.role) +
          '"><div class="who">' +
          CTP.md.inline(t.who) +
          stamp +
          "</div>" +
          heading +
          inner +
          "</section>"
        );
      })
      .join("");
    return headerHtml(model) + turns;
  }

  function stringifyToolResult(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map(function (c) {
          if (typeof c === "string") return c;
          if (CTP.util.isRecord(c) && typeof c.text === "string") return c.text;
          return CTP.util.safeStringify(c);
        })
        .join("\n");
    }
    return CTP.util.safeStringify(content);
  }

  var IMAGE_ONLY_KEYS = {
    preview_url: true,
    thumbnail_url: true,
    image_url: true,
    thumbnail: true,
  };

  function isImageBlock(obj) {
    if (!CTP.util.isRecord(obj)) return false;
    if (obj.type === "image" || obj.kind === "image" || obj.file_kind === "image") return true;
    var mt = obj.media_type || obj.mime_type || obj.file_type || "";
    return typeof mt === "string" && mt.indexOf("image/") === 0;
  }

  function imageUrlsFromUnknown(obj, acc) {
    acc = acc || [];
    if (!obj) return acc;
    if (typeof obj === "string") {
      if (CTP.util.looksLikeImageUrl(obj)) acc.push(obj);
      return acc;
    }
    if (Array.isArray(obj)) {
      obj.forEach(function (x) {
        imageUrlsFromUnknown(x, acc);
      });
      return acc;
    }
    if (!CTP.util.isRecord(obj)) return acc;

    Object.keys(IMAGE_ONLY_KEYS).forEach(function (k) {
      if (typeof obj[k] === "string" && CTP.util.canInlineImage(obj[k])) {
        acc.push(obj[k]);
      }
    });

    if (isImageBlock(obj)) {
      ["url", "src", "href"].forEach(function (k) {
        if (typeof obj[k] === "string" && CTP.util.canInlineImage(obj[k])) acc.push(obj[k]);
      });
    } else {
      ["url", "src"].forEach(function (k) {
        if (typeof obj[k] === "string" && CTP.util.looksLikeImageUrl(obj[k])) acc.push(obj[k]);
      });
    }

    if (obj.source && typeof obj.source.url === "string" && isImageBlock(obj)) {
      acc.push(obj.source.url);
    }
    if (obj.source && obj.source.type === "base64" && obj.source.data) {
      var mt = obj.source.media_type || "image/png";
      if (String(mt).indexOf("image/") === 0) {
        acc.push("data:" + mt + ";base64," + obj.source.data);
      }
    }
    Object.keys(obj).forEach(function (k) {
      if (k === "source") return;
      if (typeof obj[k] === "object") imageUrlsFromUnknown(obj[k], acc);
    });
    return acc;
  }

  async function imagePart(url, caption, alt) {
    if (!url) return null;
    var src = await CTP.util.toImageDataUrl(url);
    if (!src) return null;
    return { type: "image", src: src, href: url, caption: caption || "", alt: alt || caption || "" };
  }

  var NON_IMAGE_TOOLS = {
    web_search: true,
    web_fetch: true,
    fetch: true,
    bash: true,
    bash_code_execution: true,
    code_execution: true,
    repl: true,
    artifacts: true,
    create_file: true,
    str_replace_based_edit_tool: true,
    text_editor_code_execution: true,
    visualize: true,
    "visualize:show_widget": true,
    chart_display_v0: true,
    memory: true,
    memory_search: true,
    conversation_search: true,
  };

  var WIDGET_CSS =
    "svg{background:#f4f1ec;color:#1c1a17}" +
    "text{fill:#1c1a17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
    ".ts{fill:#6b6560;font-size:12px}" +
    ".th{fill:#1c1a17;font-size:13px;font-weight:650}" +
    ".c-gray rect,.c-purple rect,.c-teal rect,.c-blue rect,.c-green rect,.c-orange rect,.c-red rect,.c-yellow rect,.c-pink rect{stroke:#00000022}" +
    ".c-gray .th,.c-purple .th,.c-teal .th,.c-blue .th,.c-green .th,.c-orange .th,.c-red .th,.c-yellow .th,.c-pink .th{fill:#fff}" +
    ".c-gray .ts,.c-purple .ts,.c-teal .ts,.c-blue .ts,.c-green .ts,.c-orange .ts,.c-red .ts,.c-yellow .ts,.c-pink .ts{fill:#ffffffcc}" +
    ".c-gray rect{fill:#8f8b85}" +
    ".c-purple rect{fill:#6d4cae}" +
    ".c-teal rect{fill:#1e8a66}" +
    ".c-blue rect{fill:#3b6ea5}" +
    ".c-green rect{fill:#2f6b3a}" +
    ".c-orange rect{fill:#c96442}" +
    ".c-red rect{fill:#b54a4a}" +
    ".c-yellow rect{fill:#c9a227}" +
    ".c-pink rect{fill:#b44a7a}" +
    ".arr{stroke:#8a8680;fill:none}" +
    ".leader{stroke:#8a8680}";

  function extractSvg(markup) {
    if (!markup || typeof markup !== "string") return "";
    var m = markup.match(/<svg\b[\s\S]*?<\/svg>/i);
    return m ? m[0] : "";
  }

  function isRenderableSvg(svg) {
    if (!svg || svg.length < 80) return false;
    if (/MUST carry|Do not wrap the SVG|load-bearing|viewBox height/i.test(svg)) return false;
    var vb = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
    if (vb && /[A-Za-z]/.test(vb[1].replace(/[eE]-?\d+/g, ""))) return false;
    if (!/<(rect|path|circle|ellipse|line|polygon|polyline|text|g)\b/i.test(svg)) return false;
    return true;
  }

  function prepareSvg(markup) {
    var svg = extractSvg(markup);
    if (!isRenderableSvg(svg)) return "";
    var styles = [];
    String(markup || "").replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, function (_, css) {
      styles.push(css);
      return "";
    });
    if (!/\sxmlns=/.test(svg)) {
      svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    var vb = svg.match(/viewBox\s*=\s*"\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    if (vb) {
      if (/width="100%"/i.test(svg)) {
        svg = svg.replace(/width="100%"/i, 'width="' + vb[3] + '"');
      }
      if (!/\sheight=/i.test(svg)) {
        svg = svg.replace(/<svg\b/i, '<svg height="' + vb[4] + '" ');
      }
    }
    var css = WIDGET_CSS + (styles.length ? "\n" + styles.join("\n") : "");
    if (/<style[\s>]/i.test(svg)) {
      svg = svg.replace(/<style[^>]*>/i, function (open) {
        return open + css + "\n";
      });
    } else {
      svg = svg.replace(/<svg([^>]*)>/i, "<svg$1><style>" + css + "</style>");
    }
    return svg;
  }

  function svgDataUrl(svg) {
    if (!svg) return "";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function visualParts(title, content, mime) {
    var parts = [];
    var text = typeof content === "string" ? content : "";
    mime = String(mime || "");
    var svg = prepareSvg(text);
    if (svg || (mime === "image/svg+xml" && isRenderableSvg(text))) {
      var url = svgDataUrl(svg || prepareSvg(text));
      if (url) {
        parts.push({
          type: "image",
          src: url,
          href: url,
          caption: title || "",
          alt: title || "diagram",
          diagram: true,
        });
        return parts;
      }
    }
    if (
      mime.indexOf("mermaid") !== -1 ||
      /^\s*(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|pie|gantt|mindmap|stateDiagram)\b/m.test(text)
    ) {
      parts.push({ type: "code", lang: "mermaid", title: title || "Mermaid", text: text });
      return parts;
    }
    if (!text) return parts;
    var lang = "text";
    if (mime.indexOf("react") !== -1) lang = "jsx";
    else if (mime.indexOf("html") !== -1) lang = "html";
    else if (mime.indexOf("markdown") !== -1) lang = "markdown";
    else if (mime.indexOf("svg") !== -1) lang = "svg";
    else if (mime.indexOf("code") !== -1) lang = "";
    parts.push({ type: "code", lang: lang, title: title || "", text: text });
    return parts;
  }

  /*
   * chart_display_v0 carries the chart as data: {title, x_axis:{data:[]},
   * y_axis:{title}, series:[{name, values:[]}]}. The picture itself is captured
   * from the page (figure.js); this turns the same input into a table so the
   * numbers are still in the PDF if the capture could not run.
   */
  function chartTable(input) {
    if (!CTP.util.isRecord(input)) return null;
    var xAxis = CTP.util.isRecord(input.x_axis) ? input.x_axis : {};
    var labels = Array.isArray(xAxis.data) ? xAxis.data : [];
    var series = Array.isArray(input.series) ? input.series : [];
    if (!labels.length || !series.length) return null;
    var yTitle = (CTP.util.isRecord(input.y_axis) && input.y_axis.title) || "";
    var head = ["<tr><th>" + CTP.util.escapeHtml(xAxis.title || "")+ "</th>"];
    series.forEach(function (sr) {
      head.push("<th>" + CTP.util.escapeHtml((sr && sr.name) || "Series") + "</th>");
    });
    head.push("</tr>");
    var rows = [];
    for (var i = 0; i < labels.length; i++) {
      var cells = ["<tr><th>" + CTP.util.escapeHtml(String(labels[i])) + "</th>"];
      for (var j = 0; j < series.length; j++) {
        var vals = (series[j] && series[j].values) || [];
        var v = vals[i];
        cells.push("<td>" + (v == null ? "" : CTP.util.escapeHtml(String(v))) + "</td>");
      }
      cells.push("</tr>");
      rows.push(cells.join(""));
    }
    var caption = [input.title, yTitle].filter(Boolean).join(" · ");
    var mdRows = ["| " + (xAxis.title || "") + " | " + series.map(function (sr) {
      return (sr && sr.name) || "Series";
    }).join(" | ") + " |"];
    mdRows.push("|" + Array(series.length + 2).join("---|") + "---|");
    for (var r = 0; r < labels.length; r++) {
      mdRows.push(
        "| " + labels[r] + " | " +
        series.map(function (sr) {
          var v = ((sr && sr.values) || [])[r];
          return v == null ? "" : String(v);
        }).join(" | ") + " |"
      );
    }
    return {
      type: "html",
      chartData: true,
      md: (caption ? "**" + caption + "**\n\n" : "") + mdRows.join("\n"),
      html:
        '<details class="chartdata"><summary>' +
        CTP.util.escapeHtml(caption || "Chart data") +
        "</summary><table class=\"md\"><thead>" +
        head.join("") +
        "</thead><tbody>" +
        rows.join("") +
        "</tbody></table></details>",
    };
  }

  function citationItems(block) {
    var list = (block && (block.citations || block.sources)) || [];
    if (!Array.isArray(list)) return [];
    return list
      .map(function (c) {
        if (!c) return null;
        var url = c.url || c.source || (c.location && c.location.url) || "";
        var title = c.title || c.cited_text || url || "";
        if (!url && !title) return null;
        return { title: String(title).slice(0, 180), url: url };
      })
      .filter(Boolean);
  }

  function searchSources(content) {
    var out = [];
    var seen = new Set();
    function walk(x) {
      if (!x) return;
      if (Array.isArray(x)) {
        x.forEach(walk);
        return;
      }
      if (!CTP.util.isRecord(x)) return;
      var url = typeof x.url === "string" ? x.url : "";
      var title = x.title || x.name || "";
      var isHit =
        x.type === "web_search_result" ||
        x.type === "search_result" ||
        (url && title && /^https?:\/\//i.test(url) && !CTP.util.looksLikeImageUrl(url));
      if (isHit && url && !seen.has(url)) {
        seen.add(url);
        out.push({ title: String(title || url).slice(0, 180), url: url });
      }
      Object.keys(x).forEach(function (k) {
        if (typeof x[k] === "object") walk(x[k]);
      });
    }
    walk(content);
    return out;
  }

  function dedupeSources(items) {
    var seen = new Set();
    return (items || []).filter(function (it) {
      var key = (it.url || "") + "|" + (it.title || "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fileParts(file) {
    var parts = [];
    if (!file) return parts;
    var name = file.file_name || file.filename || "file";
    var kind = file.file_kind || file.kind || "";
    var preview =
      file.preview_url ||
      (file.preview_asset && file.preview_asset.url) ||
      (file.document_asset && file.document_asset.url) ||
      file.thumbnail_url;
    if (kind === "image" || (preview && /^image\//.test(file.file_type || ""))) {
      var img = await imagePart(preview, name, name);
      if (img) parts.push(img);
      return parts;
    }
    if (preview && kind === "document") {
      var shot = await imagePart(preview, name + (file.page_count ? " · " + file.page_count + " pages" : ""), name);
      if (shot) parts.push(shot);
    } else {
      var extra = [];
      if (file.page_count) extra.push(file.page_count + " pages");
      if (file.file_size) extra.push(Math.round(file.file_size / 1024) + " KB");
      parts.push({ type: "file", name: name, extra: extra.join(" · ") });
    }
    return parts;
  }

  function attachmentParts(att) {
    var parts = [];
    if (!att) return parts;
    var name = att.file_name || "attachment";
    var extra = att.file_type || "";
    parts.push({ type: "file", name: name, extra: extra });
    if (att.extracted_content) {
      parts.push({ type: "markdown", text: att.extracted_content });
    }
    return parts;
  }

  async function extraImagesFromDom(used) {
    var extras = [];
    var seen = new Set(used);
    document.querySelectorAll("main img, article img").forEach(function (img) {
      var src = img.currentSrc || img.src || "";
      if (!src || src.indexOf("data:image/svg") === 0) return;
      if (!CTP.util.canInlineImage(src)) return;
      var blob = src.toLowerCase();
      if (/avatar|favicon|sprite|logo|icon[-_/]|profile-picture/.test(blob)) return;
      var w = img.naturalWidth || img.width || 0;
      var h = img.naturalHeight || img.height || 0;
      if (w && h && (w < 64 || h < 64)) return;
      if (seen.has(src)) return;
      seen.add(src);
      extras.push({ type: "image", src: src, href: src, alt: img.alt || "", caption: img.alt || "" });
    });
    /* Charts and diagrams are captured as live HTML by CTP.figure, not
       serialised to a data: URL — see figure.js. */
    document.querySelectorAll("main canvas, article canvas").forEach(function (canvas) {
      if (canvas.width < 64 || canvas.height < 64) return;
      try {
        var url = canvas.toDataURL("image/png");
        if (!url || seen.has(url)) return;
        seen.add(url);
        extras.push({ type: "image", src: url, href: url, alt: "figure", caption: "" });
      } catch (e) {}
    });
    var out = [];
    for (var i = 0; i < extras.length; i++) {
      var data = await CTP.util.toImageDataUrl(extras[i].href);
      if (!data) continue;
      extras[i].src = data;
      out.push(extras[i]);
    }
    return out;
  }

  /* How many charts the conversation should have, so the page only gets
     scrolled when one of them is missing from the DOM. */
  function countChartTools(messages) {
    var n = 0;
    messages.forEach(function (m) {
      (Array.isArray(m.content) ? m.content : []).forEach(function (b) {
        if (!b || b.type !== "tool_use") return;
        var name = String(b.name || "");
        if (name.indexOf("chart") !== -1 || name.indexOf("visualize") !== -1) n += 1;
      });
    });
    return n;
  }

  /*
   * Hand a message the charts captured from its own rendered copy. Counting
   * assistant messages does not work — claude.ai keeps only a few mounted — so
   * the match is made on the message's own words, which survive the trip from
   * markdown to rendered text once punctuation and casing are dropped.
   */
  function claimFigures(items, msg, parts) {
    if (!items || !items.length || !CTP.figure) return [];
    var sample = "";
    (Array.isArray(msg.content) ? msg.content : []).forEach(function (b) {
      if (sample.length >= 120) return;
      if (b && b.type === "text" && b.text) sample += " " + b.text;
    });
    if (!sample) {
      parts.forEach(function (p) {
        if (sample.length < 120 && p && p.type === "markdown" && p.text) sample += " " + p.text;
      });
    }
    var key = CTP.figure.textKey(sample).slice(0, 60);
    if (key.length < 24) return [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].used) continue;
      if (items[i].key.indexOf(key) === -1) continue;
      items[i].used = true;
      return items[i].parts;
    }
    return [];
  }

  async function prepare(data, page, opts) {
    opts = opts || {};
    var messages = CTP.api.selectBranch(data);
    var arts = CTP.api.foldArtifacts(messages);
    var lastArt = CTP.api.lastArtifactAt(messages);
    var whoUser = opts.userName || CTP.api.userName(data);
    var usedUrls = [];
    var turns = [];

    /* The theme decides how a captured chart's neutral colours are flipped, so
       it has to be settled before anything is captured. */
    var appearance = opts.appearance || CTP.api.pageAppearance();
    opts.appearance = appearance;

    /* Charts live in the page, not in the API payload: the API gives us the
       widget's source, the page gives us what the reader actually saw. Capture
       per assistant message so each chart lands back in its own turn. */
    var figScan = { items: [], errors: [], messagesSeen: 0 };
    if (!opts.skipDomFigures && !data._fromDom && CTP.figure) {
      try {
        CTP.util.progress("Loading the whole conversation…");
        figScan = await CTP.figure.scanAll(
          appearance,
          function (n) {
            CTP.util.progress("Capturing charts… " + n + " found");
          },
          countChartTools(messages)
        );
      } catch (e) {
        figScan = { items: [], errors: [(e && e.message) || String(e)], messagesSeen: 0 };
      }
    }
    var figureErrors = figScan.errors || [];
    var figuresFound = 0;
    (figScan.items || []).forEach(function (it) {
      figuresFound += it.parts.length;
    });

    for (var mi = 0; mi < messages.length; mi++) {
      if (mi === 0 || (mi + 1) % 2 === 0 || mi + 1 === messages.length) {
        CTP.util.progress(
          "Building transcript… " + (mi + 1) + " / " + messages.length,
          { current: mi + 1, total: messages.length }
        );
      }
      var msg = messages[mi];
      var parts = [];

      if (msg._parts && msg._parts.length) {
        for (var pi = 0; pi < msg._parts.length; pi++) {
          var p = msg._parts[pi];
          if (p.type === "image" && p.src) {
            usedUrls.push(p.href || p.src);
            p.src = await CTP.util.toImageDataUrl(p.src);
            if (!p.src) continue;
          }
          parts.push(p);
        }
      } else {
        var files = msg.files || [];
        for (var fi = 0; fi < files.length; fi++) {
          var fp = await fileParts(files[fi]);
          fp.forEach(function (x) {
            if (x.href) usedUrls.push(x.href);
          });
          parts = parts.concat(fp);
        }
        (msg.attachments || []).forEach(function (a) {
          parts = parts.concat(attachmentParts(a));
        });

        var blocks = Array.isArray(msg.content) ? msg.content : [];
        if (!blocks.length && msg.text) {
          parts.push({ type: "markdown", text: msg.text });
        }

        for (var bi = 0; bi < blocks.length; bi++) {
          var b = blocks[bi] || {};
          var type = b.type;

          if (type === "text" && b.text) {
            parts.push({ type: "markdown", text: b.text });
            var cites = citationItems(b);
            if (cites.length) parts.push({ type: "sources", items: cites });
            continue;
          }

          if (type === "thinking") {
            if (!opts.includeThinking) continue;
            var th = b.thinking || b.text || "";
            if (th) parts.push({ type: "thinking", text: th });
            continue;
          }

          if (type === "image") {
            var urls = imageUrlsFromUnknown(b);
            for (var ui = 0; ui < urls.length; ui++) {
              usedUrls.push(urls[ui]);
              var ip = await imagePart(urls[ui], b.title || "", b.alt || "");
              if (ip) parts.push(ip);
            }
            continue;
          }

          if (type === "tool_use") {
            var name = b.name || "tool";
            var input = CTP.util.isRecord(b.input) ? b.input : {};
            parts.push({ type: "tool", label: CTP.util.toolLabel(name) });

            if (name === "artifacts" && input.id) {
              var key = mi + ":" + bi;
              if (lastArt.get(input.id) === key) {
                var art = arts.get(input.id);
                if (art && art.content) {
                  var artTitle = (art.title || "Artifact") + (art.language ? " · " + art.language : "");
                  parts = parts.concat(visualParts(artTitle, art.content, art.type));
                }
              }
              continue;
            }

            if (name === "create_file" && (input.file_text || input.content)) {
              parts.push({
                type: "code",
                lang: (input.path || "").split(".").pop() || "",
                title: "File: " + (input.path || input.description || "created file"),
                text: input.file_text || input.content,
              });
              continue;
            }

            if (name === "chart_display_v0" || name.indexOf("chart_display") === 0) {
              var chartPart = chartTable(input);
              if (chartPart) parts.push(chartPart);
              continue;
            }

            if (
              name === "visualize:show_widget" ||
              name === "visualize" ||
              name.indexOf("visualize") === 0
            ) {
              var vis = input.widget_code || input.content || input.svg || "";
              if (vis) {
                parts = parts.concat(visualParts(input.title || "Widget", vis, input.type || ""));
              }
              continue;
            }

            if (!NON_IMAGE_TOOLS[name]) {
              var toolImgs = imageUrlsFromUnknown(input);
              for (var ti = 0; ti < toolImgs.length; ti++) {
                usedUrls.push(toolImgs[ti]);
                var tip = await imagePart(toolImgs[ti], "", "");
                if (tip) parts.push(tip);
              }
            }
            continue;
          }

          if (type === "tool_result" || type === "mcp_tool_result") {
            var rImgs = imageUrlsFromUnknown(b.content);
            var uniq = Array.from(new Set(rImgs));
            for (var ri = 0; ri < uniq.length; ri++) {
              usedUrls.push(uniq[ri]);
              var rp = await imagePart(uniq[ri], "", "");
              if (rp) parts.push(rp);
            }
            var rawSvg =
              typeof b.content === "string" ? b.content : "";
            var svgHit = prepareSvg(rawSvg);
            if (svgHit) {
              var svgUrl = svgDataUrl(svgHit);
              parts.push({
                type: "image",
                src: svgUrl,
                href: svgUrl,
                caption: "",
                alt: "diagram",
                diagram: true,
              });
            }
            var hits = searchSources(b.content);
            if (hits.length) parts.push({ type: "sources", items: hits });
            if (opts.includeToolResults) {
              var txt = stringifyToolResult(b.content);
              if (txt && txt.length < 20000 && txt !== "{}" && txt !== "null") {
                parts.push({
                  type: "code",
                  lang: "text",
                  title: b.is_error ? "Tool error" : "Tool result",
                  text: txt,
                });
              }
            }
            continue;
          }

          if (type === "document") {
            var docName = b.title || b.file_name || "Document";
            parts.push({
              type: "file",
              name: docName,
              extra: (b.source && b.source.media_type) || b.media_type || "document",
            });
            var dImgs = imageUrlsFromUnknown(b);
            for (var di = 0; di < dImgs.length; di++) {
              var dp = await imagePart(dImgs[di], docName, docName);
              if (dp) parts.push(dp);
            }
            if (b.source && b.source.type === "text" && b.source.data) {
              parts.push({ type: "markdown", text: b.source.data });
            }
            continue;
          }

          if (type === "code" || type === "code_block") {
            parts.push({
              type: "code",
              lang: b.language || b.lang || "",
              title: b.title || "",
              text: b.code || b.text || "",
            });
            continue;
          }

          if (type === "container_upload" && b.file_id) {
            parts.push({ type: "file", name: b.file_id, extra: "container file" });
            continue;
          }
        }
      }

      parts = parts.filter(Boolean);

      var myFigures = [];
      if (msg.sender !== "human") {
        myFigures = claimFigures(figScan.items, msg, parts);
      }
      if (myFigures.length) {
        /* the live render supersedes anything rebuilt from widget source */
        parts = parts.filter(function (p) {
          return !(p && p.type === "image" && p.diagram);
        });
        parts = parts.concat(myFigures);
      } else {
        /* no picture to show, so the numbers had better be visible */
        parts.forEach(function (p) {
          if (p && p.chartData) {
            p.html = p.html.replace('<details class="chartdata">', '<details class="chartdata" open>');
          }
        });
      }

      var sourceBag = [];
      parts = parts.filter(function (p) {
        if (p.type === "sources") {
          sourceBag = sourceBag.concat(p.items || []);
          return false;
        }
        return true;
      });
      sourceBag = dedupeSources(sourceBag);
      if (sourceBag.length) parts.push({ type: "sources", items: sourceBag });
      if (!parts.length) continue;

      var role = msg.sender === "human" ? "user" : "claude";
      var heading = "";
      if (role === "user" && typeof msg.text === "string" && msg.text && msg._fromDom !== undefined) {
        heading = msg.text.split("\n")[0].slice(0, 140);
      }
      turns.push({
        role: role,
        who: role === "user" ? whoUser : "Claude",
        ts: CTP.util.formatWhen(msg.created_at),
        iso: msg.created_at || "",
        heading: "",
        parts: parts,
      });
    }

    var unplacedFigures = [];
    (figScan.items || []).forEach(function (it) {
      if (!it.used) unplacedFigures = unplacedFigures.concat(it.parts);
    });
    if (unplacedFigures.length && turns.length) {
      var host = null;
      for (var hi = turns.length - 1; hi >= 0; hi--) {
        if (turns[hi].role === "claude") {
          host = turns[hi];
          break;
        }
      }
      if (host) {
        host.parts = host.parts
          .filter(function (p) {
            return !(p && p.type === "image" && p.diagram);
          })
          .concat(unplacedFigures);
      }
    }

    var extra = [];
    if (!opts.skipDomImages) {
      CTP.util.progress("Collecting images from the page…", {
        current: messages.length,
        total: messages.length,
      });
      extra = await extraImagesFromDom(usedUrls);
    }
    if (extra.length) {
      var already = new Set();
      turns.forEach(function (t) {
        (t.parts || []).forEach(function (p) {
          if (p.href) already.add(p.href);
          if (p.src) already.add(p.src);
        });
      });
      extra = extra.filter(function (p) {
        return !already.has(p.href) && !already.has(p.src);
      });
      if (extra.length) {
        var last = turns[turns.length - 1];
        if (last && last.role === "claude") {
          last.parts = last.parts.concat(extra);
        } else {
          turns.push({
            role: "claude",
            who: "Claude",
            ts: "",
            parts: extra,
          });
        }
      }
    }

    var title = data.name || data.snapshot_name || CTP.api.pageTitle();
    var share = page && page.kind === "share";
    return {
      title: title,
      eyebrow: share ? "Shared Claude conversation" : "Claude conversation",
      meta:
        "Participants: Claude & " +
        whoUser +
        " | Exported " +
        CTP.util.exportedStamp() +
        (data.model ? " | " + data.model : ""),
      charts: figuresFound,
      chartErrors: figureErrors,
      messagesInPage: figScan.messagesSeen || 0,
      source: (page && page.url) || location.href,
      disclaimer: share
        ? "This is a copy of a chat between Claude and " +
          whoUser +
          ". Content may include unverified or unsafe content that do not represent the views of Anthropic. Shared snapshot may contain attachments and data not displayed here."
        : "",
      turns: turns,
    };
  }

  function buildPayload(model, opts) {
    opts = opts || {};
    var theme = resolveTheme(opts.theme, opts.appearance);
    return {
      title: model.title || "Claude conversation",
      css: css(theme, opts.page || "A4"),
      body: '<div class="doc">' + bodyHtml(model) + "</div>",
      autoPrint: opts.autoPrint !== false,
      theme: theme,
    };
  }

  return {
    css: css,
    prepare: prepare,
    buildPayload: buildPayload,
    bodyHtml: bodyHtml,
    renderPart: renderPart,
    resolveTheme: resolveTheme,
  };
})();
