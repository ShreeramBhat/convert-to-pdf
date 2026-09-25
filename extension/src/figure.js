/* global CTP */
/*
 * Chart / diagram capture.
 *
 * Claude renders charts as an <svg> whose colours, fonts and sizes all live in
 * claude.ai's stylesheet, with the title, subtitle and legend as plain HTML
 * siblings. Serialising the <svg> on its own into a data: URL therefore throws
 * away everything that made it legible. We instead clone the whole <figure>,
 * freeze the computed styles onto the clone, and hand the result to the print
 * document as live HTML so it prints as vector art.
 */
var CTP = window.CTP || {};
window.CTP = CTP;

CTP.figure = (function () {
  var SAFE_FONT =
    "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  var SAFE_MONO = "'SFMono-Regular', Menlo, Consolas, monospace";

  var SVG_PROPS = [
    "display", "visibility", "opacity", "fill", "fill-opacity", "fill-rule",
    "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
    "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "paint-order",
    "clip-path", "clip-rule", "mask", "marker-start", "marker-mid", "marker-end",
    "stop-color", "stop-opacity", "mix-blend-mode", "filter",
    "text-anchor", "dominant-baseline", "alignment-baseline", "baseline-shift",
    "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric",
    "letter-spacing", "word-spacing",
    "transform", "transform-origin", "transform-box", "vector-effect", "shape-rendering",
  ];

  var HTML_PROPS = [
    "display", "visibility", "opacity", "box-sizing", "position",
    "flex-direction", "flex-wrap", "align-items", "align-self", "justify-content",
    "flex", "order", "gap", "row-gap", "column-gap",
    "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
    "grid-area", "place-items", "place-content",
    "top", "right", "bottom", "left",
    "margin", "padding", "border", "border-radius",
    "background-color", "background-image", "color",
    "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric",
    "line-height", "letter-spacing", "text-align", "text-transform",
    "white-space", "overflow", "vertical-align", "list-style", "transform",
  ];

  /* Values equal to these carry no information and are dropped to keep the
     inlined style attributes small. */
  var DEFAULTS = {
    "display": "inline", "visibility": "visible", "opacity": "1",
    "fill-opacity": "1", "fill-rule": "nonzero", "clip-rule": "nonzero",
    "stroke-opacity": "1", "stroke-dasharray": "none", "stroke-dashoffset": "0px",
    "stroke-linecap": "butt", "stroke-linejoin": "miter", "stroke-miterlimit": "4",
    "paint-order": "normal", "clip-path": "none", "mask": "none", "filter": "none",
    "marker-start": "none", "marker-mid": "none", "marker-end": "none",
    "stop-opacity": "1", "mix-blend-mode": "normal",
    "alignment-baseline": "auto", "baseline-shift": "0px",
    "letter-spacing": "normal", "word-spacing": "0px",
    "font-variant-numeric": "normal", "transform": "none", "transform-box": "view-box",
    "vector-effect": "none", "shape-rendering": "auto",
    "box-sizing": "content-box", "position": "static",
    "flex-direction": "row", "flex-wrap": "nowrap", "align-items": "normal",
    "align-self": "auto", "justify-content": "normal", "flex": "0 1 auto", "order": "0",
    "gap": "normal", "row-gap": "normal", "column-gap": "normal",
    "grid-template-columns": "none", "grid-template-rows": "none",
    "grid-column": "auto", "grid-row": "auto", "grid-area": "auto",
    "place-items": "normal", "place-content": "normal",
    "top": "auto", "right": "auto", "bottom": "auto", "left": "auto",
    "margin": "0px", "padding": "0px", "border": "0px none rgb(0, 0, 0)",
    "border-radius": "0px", "background-image": "none",
    "text-align": "start", "text-transform": "none", "white-space": "normal",
    "overflow": "visible", "vertical-align": "baseline", "list-style": "outside none disc",
  };

  /* Properties whose value may embed one or more colours. */
  var COLOR_PROPS = {
    fill: 1, stroke: 1, "stop-color": 1, color: 1, "background-color": 1,
    "background-image": 1, border: 1,
  };

  var COLOR_TOKEN =
    /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)/gi;

  /* ---- colour parsing -------------------------------------------------- */

  var _ctx = null;
  var _colorCache = new Map();

  function ctx2d() {
    if (_ctx) return _ctx;
    try {
      var c = document.createElement("canvas");
      c.width = 2;
      c.height = 1;
      _ctx = c.getContext("2d", { willReadFrequently: true });
    } catch (e) {
      _ctx = null;
    }
    return _ctx;
  }

  /* Paint the colour once over white and once over black; that pair determines
     alpha and the un-premultiplied channels exactly, which naive getImageData
     on a transparent canvas does not at low alpha. */
  function parseColor(value) {
    var v = String(value || "").trim();
    if (!v) return null;
    if (_colorCache.has(v)) return _colorCache.get(v);
    var out = null;
    if (!/^(none|transparent|currentcolor|inherit|initial|unset)$/i.test(v) && v.indexOf("url(") !== 0) {
      var ctx = ctx2d();
      if (ctx) {
        try {
          ctx.clearRect(0, 0, 2, 1);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 1, 1);
          ctx.fillStyle = "#000000";
          ctx.fillRect(1, 0, 1, 1);
          ctx.fillStyle = v;
          ctx.fillRect(0, 0, 2, 1);
          var d = ctx.getImageData(0, 0, 2, 1).data;
          var onWhite = [d[0], d[1], d[2]];
          var onBlack = [d[4], d[5], d[6]];
          var a = 1 - (onWhite[0] - onBlack[0]) / 255;
          a = Math.max(0, Math.min(1, a));
          if (a < 0.004) {
            out = { r: 0, g: 0, b: 0, a: 0 };
          } else {
            out = {
              r: Math.max(0, Math.min(255, Math.round(onBlack[0] / a))),
              g: Math.max(0, Math.min(255, Math.round(onBlack[1] / a))),
              b: Math.max(0, Math.min(255, Math.round(onBlack[2] / a))),
              a: Math.round(a * 1000) / 1000,
            };
          }
        } catch (e) {
          out = null;
        }
      }
    }
    _colorCache.set(v, out);
    return out;
  }

  function formatColor(c) {
    if (c.a >= 0.999) return "rgb(" + c.r + ", " + c.g + ", " + c.b + ")";
    return "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + c.a + ")";
  }

  /* A colour is "neutral" when it carries almost no hue: chart gridlines, axis
     labels, titles and panel backgrounds. Those are the ones that have to flip
     when the PDF theme is the opposite polarity of the page we captured from.
     Series colours keep their hue and are left exactly as the chart drew them. */
  function isNeutral(c) {
    return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) <= 28;
  }

  function invertNeutrals(value) {
    return String(value).replace(COLOR_TOKEN, function (tok) {
      var c = parseColor(tok);
      if (!c || !c.a || !isNeutral(c)) return tok;
      return formatColor({ r: 255 - c.r, g: 255 - c.g, b: 255 - c.b, a: c.a });
    });
  }

  /* ---- capture --------------------------------------------------------- */

  var CONTROL_ROLES = {
    button: 1, radio: 1, radiogroup: 1, checkbox: 1, switch: 1, slider: 1,
    tab: 1, tablist: 1, menu: 1, menubar: 1, menuitem: 1, toolbar: 1,
    combobox: 1, listbox: 1, tooltip: 1, dialog: 1,
  };

  /* Controls are chrome, not content: the chart's own display-mode switch, the
     hover tooltip, the copy button. Dropping the control alone would leave its
     styled wrapper behind as a stray block, so the whole subtree goes. */
  function isInteractive(el) {
    var t = el.tagName.toLowerCase();
    if (
      t === "button" || t === "input" || t === "select" || t === "textarea" ||
      t === "script" || t === "style" || t === "iframe" || t === "link" ||
      t === "noscript" || t === "template"
    ) {
      return true;
    }
    if (CONTROL_ROLES[el.getAttribute("role") || ""]) return true;
    if (el.hasAttribute("data-radix-popper-content-wrapper")) return true;
    if (el.querySelector && el.querySelector("input, button, [role='radiogroup']")) {
      /* a wrapper that exists only to hold controls */
      return !(el.textContent || "").trim() || !!el.closest("[role='radiogroup']");
    }
    return false;
  }

  function safeFont(value) {
    return /mono|courier|consol|menlo/i.test(value) ? SAFE_MONO : SAFE_FONT;
  }

  function isLeaf(el) {
    return el.children.length === 0;
  }

  var uid = 0;

  function freeze(source, clone) {
    var tall = false;
    var src = [source];
    var dst = [clone];
    Array.prototype.push.apply(src, source.querySelectorAll("*"));
    Array.prototype.push.apply(dst, clone.querySelectorAll("*"));
    var kill = [];
    for (var i = 0; i < src.length; i++) {
      var s = src[i];
      var d = dst[i];
      if (!s || !d || !d.style) continue;
      var cs;
      try {
        cs = getComputedStyle(s);
      } catch (e) {
        continue;
      }
      if (i > 0 && (isInteractive(s) || cs.display === "none" || cs.visibility === "hidden")) {
        kill.push(d);
        continue;
      }
      var inSvg = s.ownerSVGElement != null || s.tagName.toLowerCase() === "svg";
      var props = inSvg ? SVG_PROPS : HTML_PROPS;
      var decl = "";
      for (var p = 0; p < props.length; p++) {
        var prop = props[p];
        var v = cs.getPropertyValue(prop);
        if (!v || v === DEFAULTS[prop]) continue;
        if (prop === "font-family") v = safeFont(v);
        decl += prop + ":" + v + ";";
      }
      /*
       * A page can scroll; paper cannot. The widget's table view lives in a
       * 240px viewport with overflow-y:auto inside a grid track frozen at
       * 240px, so freezing those verbatim leaves the rows painting straight
       * over the legend and everything after it. Let any scroll viewport and
       * any fixed-height grid track grow to fit their content instead.
       */
      if (!inSvg) {
        var scrolls =
          s.scrollHeight > s.clientHeight + 4 || s.scrollWidth > s.clientWidth + 4;
        var oy = cs.overflowY;
        var ox = cs.overflowX;
        if (scrolls || oy === "auto" || oy === "scroll" || ox === "auto" || ox === "scroll") {
          decl += "overflow:visible;max-height:none;max-width:none;height:auto;";
          if (s.scrollHeight > s.clientHeight + 200) tall = true;
        }
        var tracks = cs.gridTemplateRows;
        if (tracks && /\d(\.\d+)?px/.test(tracks)) {
          decl += "grid-template-rows:" + tracks.replace(/\b\d+(\.\d+)?px\b/g, "auto") + ";";
        }
      }

      /* Freeze a box only on painted leaves — legend swatches, rules, dots.
         Text and containers stay fluid so a wide chart reflows into the print
         column instead of running off the page. */
      if (!inSvg && isLeaf(s) && !(s.textContent || "").trim()) {
        var box = s.getBoundingClientRect();
        if (box.width) decl += "width:" + Math.round(box.width * 100) / 100 + "px;";
        if (box.height) decl += "height:" + Math.round(box.height * 100) / 100 + "px;";
        decl += "flex:0 0 auto;";
      }
      d.setAttribute("style", decl);
      d.removeAttribute("class");
      d.removeAttribute("tabindex");
      d.removeAttribute("aria-describedby");
      d.removeAttribute("data-testid");
    }
    for (var k = 0; k < kill.length; k++) {
      if (kill[k] && kill[k].parentNode) kill[k].parentNode.removeChild(kill[k]);
    }
    return tall;
  }

  /* Two copies of a chart in one document would otherwise share clipPath and
     gradient ids; rename them per capture so each copy points at its own defs. */
  function namespaceIds(root, prefix) {
    var map = new Map();
    var withId = root.querySelectorAll("[id]");
    withId.forEach(function (el) {
      var old = el.getAttribute("id");
      if (!old) return;
      var next = prefix + map.size;
      map.set(old, next);
      el.setAttribute("id", next);
    });
    if (!map.size) return;
    var all = [root];
    Array.prototype.push.apply(all, root.querySelectorAll("*"));
    all.forEach(function (el) {
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        var v = a.value;
        if (v.indexOf("#") === -1) continue;
        var next = v.replace(/url\(\s*["']?#([^)"']+)["']?\s*\)/g, function (m, id) {
          return map.has(id) ? "url(#" + map.get(id) + ")" : m;
        });
        if (a.name === "href" || a.name === "xlink:href") {
          next = next.replace(/^#(.+)$/, function (m, id) {
            return map.has(id) ? "#" + map.get(id) : m;
          });
        }
        if (next !== v) a.value = next;
      }
    });
  }

  function fluidSvgs(root) {
    root.querySelectorAll("svg").forEach(function (sv) {
      var w = parseFloat(sv.getAttribute("width"));
      var h = parseFloat(sv.getAttribute("height"));
      if (!sv.getAttribute("viewBox") && w > 0 && h > 0) {
        sv.setAttribute("viewBox", "0 0 " + w + " " + h);
      }
      if (!sv.getAttribute("xmlns")) sv.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      sv.setAttribute("preserveAspectRatio", "xMidYMid meet");
      sv.removeAttribute("width");
      sv.removeAttribute("height");
      var style = sv.getAttribute("style") || "";
      style += "width:100%;height:auto;overflow:visible;";
      if (w > 0 && h > 0) style += "aspect-ratio:" + w + " / " + h + ";";
      sv.setAttribute("style", style);
    });
  }

  /* Elements whose only reason to exist was a control we just dropped. */
  function pruneEmpty(root) {
    for (var pass = 0; pass < 3; pass++) {
      var gone = 0;
      root.querySelectorAll("div, span, section").forEach(function (el) {
        if (el.children.length || (el.textContent || "").trim()) return;
        var st = el.getAttribute("style") || "";
        /* a painted leaf (legend swatch, rule) has a size and a colour */
        if (/background-color|background-image|border\s*:/.test(st) && /width\s*:/.test(st)) return;
        if (el.parentNode) {
          el.parentNode.removeChild(el);
          gone += 1;
        }
      });
      if (!gone) break;
    }
  }

  function variantHtml(source, invert, out) {
    var clone = source.cloneNode(true);
    if (freeze(source, clone) && out) out.tall = true;
    pruneEmpty(clone);
    fluidSvgs(clone);
    namespaceIds(clone, "ctpf" + uid++ + "-");
    if (invert) {
      var all = [clone];
      Array.prototype.push.apply(all, clone.querySelectorAll("*"));
      all.forEach(function (el) {
        var decl = el.getAttribute("style");
        if (!decl) return;
        var next = decl.replace(/([a-z-]+)\s*:\s*([^;]+);/gi, function (m, prop, val) {
          if (!COLOR_PROPS[prop.toLowerCase()]) return m;
          return prop + ":" + invertNeutrals(val) + ";";
        });
        if (next !== decl) el.setAttribute("style", next);
        /* presentation attributes can carry colour too */
        ["fill", "stroke", "stop-color"].forEach(function (a) {
          var v = el.getAttribute && el.getAttribute(a);
          if (v) el.setAttribute(a, invertNeutrals(v));
        });
      });
    }
    /* let the outer box breathe inside the print column */
    var rootStyle = (clone.getAttribute("style") || "")
      .replace(/(^|;)\s*(width|max-width|min-width)\s*:[^;]*;?/gi, "$1");
    clone.setAttribute("style", rootStyle + ";width:100%;max-width:100%;margin:0;");
    return clone.outerHTML;
  }

  /*
   * Returns a part ready for CTP.html.renderPart, holding the figure twice:
   * once as the page drew it and once with neutrals flipped, so the viewer's
   * light/dark switch keeps the chart legible either way.
   */
  function capture(el, appearance) {
    if (!el || !el.cloneNode) return null;
    var pageIsDark = appearance === "dark";
    var flags = { tall: false };
    var light, dark;
    try {
      light = variantHtml(el, pageIsDark, flags);
      dark = variantHtml(el, !pageIsDark, flags);
    } catch (e) {
      return null;
    }
    if (!light) return null;
    var label = (el.getAttribute("aria-label") || "").trim();
    if (!label) {
      var svg = el.querySelector("svg[aria-label]");
      if (svg) label = (svg.getAttribute("aria-label") || "").trim();
    }
    return {
      type: "html",
      figure: true,
      label: label,
      tall: flags.tall,
      html:
        '<div class="ctpfig' + (flags.tall ? " tall" : "") + '">' +
        '<div class="ctpfig-v" data-variant="light">' + light + "</div>" +
        '<div class="ctpfig-v" data-variant="dark">' + dark + "</div>" +
        "</div>",
    };
  }

  /* A chart is a <figure> that actually draws something, or a bare inline SVG
     of real size that is not an icon. */
  function isChart(el) {
    if (!el || el.closest("button, a")) return false;
    if (el.tagName.toLowerCase() === "figure") {
      return !!el.querySelector("svg, canvas");
    }
    var box = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!box || box.width < 120 || box.height < 90) return false;
    if (el.closest("figure")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.querySelectorAll("path, rect, circle, line, polyline, polygon, text").length >= 3;
  }

  function collect(root) {
    var scope = root || document.querySelector("main") || document.body;
    if (!scope) return [];
    var out = [];
    var seen = new Set();
    scope.querySelectorAll("figure, svg").forEach(function (el) {
      if (seen.has(el)) return;
      if (!isChart(el)) return;
      /* keep the outermost match only */
      for (var i = 0; i < out.length; i++) {
        if (out[i].contains(el)) return;
      }
      out = out.filter(function (prev) {
        return !el.contains(prev);
      });
      seen.add(el);
      out.push(el);
    });
    return out;
  }

  /* The outermost assistant-message elements currently mounted. */
  function assistantHosts() {
    var nodes = document.querySelectorAll(
      '[data-testid="assistant-message"], .font-claude-response'
    );
    var out = [];
    nodes.forEach(function (el) {
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] !== el && nodes[i].contains(el)) return;
      }
      out.push(el);
    });
    return out;
  }

  /* Letters and digits only, so a message can be recognised across the gap
     between the API's markdown and the DOM's rendered text. */
  function textKey(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  /* Generous: a message's own words can sit well past the chart's axis labels
     and legend, which land in the same text. */
  function hostKey(el) {
    return textKey(el.textContent || "").slice(0, 4000);
  }

  /* claude.ai keeps only the messages near the viewport in the DOM — a long
     chat has three of them mounted at a time — so a chart in any other message
     simply is not there to capture. This is the element that scrolls them. */
  function messageScroller() {
    var anchor = document.querySelector(
      '[data-testid="assistant-message"], [data-testid="user-message"]'
    );
    /* Walk up from a message rather than scanning the document: the chat page
       has thousands of divs and testing each one is slow enough to look hung. */
    for (var el = anchor; el; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 200) {
        var oy = "";
        try {
          oy = getComputedStyle(el).overflowY;
        } catch (e) {}
        if (oy === "auto" || oy === "scroll" || oy === "overlay") return el;
      }
    }
    var se = document.scrollingElement;
    if (se && se.scrollHeight > se.clientHeight + 100) return se;
    return null;
  }

  function settle(ms) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        requestAnimationFrame(function () {
          resolve();
        });
      }, ms);
    });
  }

  /*
   * Walk the whole conversation so every message mounts at least once, grabbing
   * charts as they appear. Each result is keyed by its message's text so the
   * caller can put it back into the right turn without relying on counts, which
   * virtualisation makes unreliable. The scroll position is restored afterwards.
   */
  async function scanAll(appearance, onProgress, expected) {
    var items = [];
    var byKey = new Set();
    var errors = [];

    function harvest() {
      assistantHosts().forEach(function (host) {
        var key = hostKey(host);
        if (!key || byKey.has(key)) return;
        var charts = collect(host);
        byKey.add(key);
        if (!charts.length) return;
        var parts = [];
        charts.forEach(function (el) {
          try {
            var part = capture(el, appearance);
            if (part) parts.push(part);
            else errors.push("capture returned nothing");
          } catch (e) {
            errors.push((e && e.message) || String(e));
          }
        });
        if (parts.length) items.push({ key: key, parts: parts });
      });
    }

    harvest();
    /* Scrolling a live chat is disruptive and slow, so only do it when the
       conversation is known to hold a chart we have not captured yet. */
    var want = typeof expected === "number" ? expected : 0;
    var sc = items.length >= want ? null : messageScroller();
    if (sc) {
      var restore = sc.scrollTop;
      var step = Math.max(240, Math.floor(sc.clientHeight * 0.55));
      var y = 0;
      var idle = 0;
      /* Mounting is not instant — measured at a few hundred milliseconds — and
         the list may snap back to the bottom, so step slowly and stop once a
         few passes in a row stop turning up messages we have not seen. */
      for (var guard = 0; guard < 20 && idle < 3; guard++) {
        var before = byKey.size;
        sc.scrollTop = y;
        await settle(200);
        harvest();
        if (onProgress) onProgress(items.length);
        if (items.length >= want) break;
        idle = byKey.size > before ? 0 : idle + 1;
        if (y >= sc.scrollHeight) y = 0;
        else y += step;
      }
      sc.scrollTop = sc.scrollHeight;
      await settle(260);
      harvest();
      sc.scrollTop = restore;
      await settle(80);
    }
    return { items: items, errors: errors, messagesSeen: byKey.size };
  }

  return {
    capture: capture,
    collect: collect,
    isChart: isChart,
    scanAll: scanAll,
    assistantHosts: assistantHosts,
    messageScroller: messageScroller,
    textKey: textKey,
    parseColor: parseColor,
    isNeutral: isNeutral,
  };
})();
