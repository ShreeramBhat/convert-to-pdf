#!/usr/bin/env python3
"""Build a typeset PDF from a lightly-extended Markdown transcript.

Usage:
    python3 build_pdf.py transcript.md -o out.pdf [--png] [--theme warm|slate]

Input format
------------
Optional front matter between `---` lines:

    ---
    title: Connecting Codex CLI to Xcode's LLDB session
    eyebrow: Shared Claude conversation
    meta: Participants: Claude & Shreeram | Exported 24 August 2026
    source: https://claude.ai/share/xxxx
    disclaimer: This is a copy of a chat between ...
    ---

Body is Markdown plus two directives:

    ::: turn user | Shreeram | 33 minutes ago
    ...markdown...
    :::

    ::: tool Searched the web        (a small pill, e.g. a tool call)

Supported Markdown: # ## ###, paragraphs, - / 1. lists, > quotes, ---,
fenced code (```lang), **bold**, *italic*, `code`, [text](url).
Code inside fences is emitted verbatim; nothing is reflowed.
"""
import argparse, html, os, re, shutil, subprocess, sys, glob

# ---------------------------------------------------------------- inline

_TOKEN = "\x00%d\x00"

def inline(text):
    """Escape, then apply inline markdown. Code spans are protected first."""
    stash = []

    def keep(s):
        stash.append(s)
        return _TOKEN % (len(stash) - 1)

    text = re.sub(r'`([^`]+)`', lambda m: keep('<code>' + html.escape(m.group(1)) + '</code>'), text)
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)',
                  lambda m: keep(f'<a href="{html.escape(m.group(2), quote=True)}">{m.group(1)}</a>'), text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<![\*\w])\*([^*\n]+)\*(?!\w)', r'<em>\1</em>', text)
    for i, s in enumerate(stash):
        text = text.replace(_TOKEN % i, s)
    return text

# ---------------------------------------------------------------- blocks

def render_blocks(lines):
    out, i, n = [], 0, len(lines)
    para, ul, ol, quote = [], [], [], []

    def flush():
        nonlocal para, ul, ol, quote
        if para:
            out.append('<p>' + inline(' '.join(para).strip()) + '</p>')
            para = []
        if ul:
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in ul) + '</ul>')
            ul = []
        if ol:
            out.append('<ol>' + ''.join(f'<li>{inline(x)}</li>' for x in ol) + '</ol>')
            ol = []
        if quote:
            out.append('<blockquote>' + inline(' '.join(quote)) + '</blockquote>')
            quote = []

    while i < n:
        ln = lines[i]
        s = ln.strip()

        if s.startswith('```'):
            lang = s[3:].strip()
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith('```'):
                buf.append(lines[i])
                i += 1
            i += 1
            flush()
            code = '\n'.join(buf).rstrip('\n')
            tall = ' tall' if code.count('\n') > 22 else ''
            label = f'<div class="lang">{html.escape(lang)}</div>' if lang else ''
            out.append(f'<div class="codewrap{tall}">{label}'
                       f'<pre><code>{html.escape(code)}</code></pre></div>')
            continue

        if s.startswith('::: tool '):
            flush()
            out.append(f'<div class="tool">{inline(s[9:].strip())}</div>')
            i += 1
            continue

        if s.startswith('::: turn'):
            parts = [p.strip() for p in s[len('::: turn'):].split('|')]
            role = (parts[0] or 'claude').lower()
            who = parts[1] if len(parts) > 1 else role.title()
            ts = parts[2] if len(parts) > 2 else ''
            i += 1
            buf = []
            depth = 0
            while i < n:
                t = lines[i].strip()
                if t.startswith('::: turn'):
                    depth += 1
                if t == ':::' and depth == 0:
                    break
                if t == ':::':
                    depth -= 1
                buf.append(lines[i])
                i += 1
            i += 1
            flush()
            stamp = f'<span class="ts">{inline(ts)}</span>' if ts else ''
            out.append(f'<section class="turn {html.escape(role)}">'
                       f'<div class="who">{inline(who)}{stamp}</div>'
                       + render_blocks(buf) + '</section>')
            continue

        if not s:
            flush()
            i += 1
            continue

        m = re.match(r'^(#{1,4})\s+(.*)$', s)
        if m:
            flush()
            lvl = len(m.group(1))
            out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>')
            i += 1
            continue

        if re.match(r'^(-{3,}|\*{3,})$', s):
            flush()
            out.append('<hr>')
            i += 1
            continue

        if s.startswith('> '):
            if para or ul or ol:
                flush()
            quote.append(s[2:])
            i += 1
            continue
        if quote:
            flush()

        m = re.match(r'^[-*]\s+(.*)$', s)
        if m:
            if para or ol:
                flush()
            ul.append(m.group(1))
            i += 1
            continue
        if ul:
            flush()

        m = re.match(r'^\d+[.)]\s+(.*)$', s)
        if m:
            if para or ul:
                flush()
            ol.append(m.group(1))
            i += 1
            continue
        if ol:
            flush()

        para.append(s)
        i += 1

    flush()
    return ''.join(out)

# ---------------------------------------------------------------- doc

def front_matter(text):
    meta = {}
    if text.startswith('---'):
        end = text.find('\n---', 3)
        if end != -1:
            for line in text[3:end].strip().split('\n'):
                if ':' in line:
                    k, v = line.split(':', 1)
                    meta[k.strip().lower()] = v.strip()
            text = text[end + 4:]
    return meta, text.lstrip('\n')

THEMES = {
    'warm':  dict(accent='#c96442', rule='#e6e1da', tint='#faf7f4', chip='#f1ede7',
                  ink='#1c1a17', mute='#6b6560', line='#e0dad1', quote='#f5f2ee'),
    'slate': dict(accent='#3b6ea5', rule='#e2e5e9', tint='#f6f8fa', chip='#eef1f4',
                  ink='#15181c', mute='#626a72', line='#dde1e6', quote='#f2f5f8'),
}

CSS = """
@page {{ size: {page}; margin: 16mm 14mm 18mm 14mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: Georgia, "Times New Roman", serif; color: {ink};
       font-size: 10.4pt; line-height: 1.55; margin: 0; }}
.doc-header {{ border-bottom: 2px solid {accent}; padding-bottom: 14px; margin-bottom: 26px; }}
.eyebrow {{ font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
           text-transform: uppercase; letter-spacing: .12em; font-size: 7.6pt;
           color: {accent}; font-weight: 700; }}
h1 {{ font-size: 21pt; line-height: 1.2; margin: 8px 0 10px; font-weight: 700; letter-spacing: -.01em; }}
.meta, .src {{ font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
              font-size: 8.4pt; color: {mute}; }}
.src {{ margin-top: 4px; }}
.url {{ font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: 7.8pt;
       color: {mute}; word-break: break-all; }}
.disclaimer {{ font-size: 8.2pt; color: {mute}; font-style: italic; margin: 12px 0 0; line-height: 1.45; }}
.turn {{ margin: 0 0 30px; padding-left: 14px; border-left: 3px solid {rule}; }}
.turn.user {{ border-left-color: {accent}; background: {tint}; padding: 12px 14px 4px; margin-left: -6px; }}
.who {{ font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 8.6pt;
       font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: {mute};
       margin-bottom: 6px; }}
.turn.user .who {{ color: {accent}; }}
.ts {{ font-weight: 400; text-transform: none; letter-spacing: 0; opacity: .75; margin-left: 8px; }}
h2 {{ font-size: 12.6pt; margin: 4px 0 10px; line-height: 1.3; font-weight: 700; break-after: avoid; }}
h3 {{ font-size: 11pt; margin: 20px 0 8px; font-weight: 700; break-after: avoid; }}
h4 {{ font-size: 10pt; margin: 16px 0 6px; font-weight: 700; break-after: avoid; }}
p {{ margin: 0 0 10px; }}
ul, ol {{ margin: 0 0 10px; padding-left: 20px; }}
li {{ margin-bottom: 5px; }}
blockquote {{ margin: 12px 0; padding: 9px 14px; background: {quote};
             border-left: 3px solid {line}; font-size: 9.8pt; }}
code {{ font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: 8.8pt;
       background: {chip}; padding: 1px 4px; border-radius: 3px; }}
.tool {{ display: inline-block; font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
        font-size: 7.6pt; color: {mute}; background: {chip}; border: 1px solid {line};
        border-radius: 10px; padding: 2px 9px; margin: 0 6px 10px 0; }}
.codewrap {{ margin: 12px 0 14px; border: 1px solid {line}; border-radius: 5px;
            overflow: hidden; background: {tint}; break-inside: avoid; }}
.codewrap.tall {{ break-inside: auto; }}
.lang {{ font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 7.4pt;
        text-transform: uppercase; letter-spacing: .1em; color: {mute}; background: {chip};
        border-bottom: 1px solid {line}; padding: 3px 10px; }}
pre {{ margin: 0; padding: 10px 12px; }}
pre code {{ font-size: 7.7pt; line-height: 1.45; background: none; padding: 0;
           white-space: pre-wrap; word-break: break-word; display: block; }}
a {{ color: {accent}; text-decoration: none; word-break: break-word; }}
hr {{ border: 0; border-top: 1px solid {line}; margin: 22px 0; }}
"""

def find_chrome():
    for pat in ('/opt/pw-browsers/chromium-*/chrome-linux/chrome',
                '/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell'):
        hits = sorted(glob.glob(pat))
        if hits:
            return hits[-1]
    for name in ('chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'):
        p = shutil.which(name)
        if p:
            return p
    mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    return mac if os.path.exists(mac) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('-o', '--output', default=None)
    ap.add_argument('--theme', default='warm', choices=sorted(THEMES))
    ap.add_argument('--page', default='A4')
    ap.add_argument('--png', action='store_true', help='also write page-N.png previews for review')
    ap.add_argument('--keep-html', action='store_true')
    args = ap.parse_args()

    src = open(args.input, encoding='utf-8').read()
    meta, body_md = front_matter(src)
    out_pdf = args.output or os.path.splitext(args.input)[0] + '.pdf'

    head = ''
    if meta:
        bits = []
        if meta.get('eyebrow'):
            bits.append(f'<div class="eyebrow">{inline(meta["eyebrow"])}</div>')
        if meta.get('title'):
            bits.append(f'<h1>{inline(meta["title"])}</h1>')
        if meta.get('meta'):
            cells = ' &nbsp;&nbsp;·&nbsp;&nbsp; '.join(
                inline(x.strip()) for x in meta['meta'].split('|'))
            bits.append(f'<div class="meta">{cells}</div>')
        if meta.get('source'):
            bits.append(f'<div class="src">Source: <span class="url">'
                        f'{html.escape(meta["source"])}</span></div>')
        if meta.get('disclaimer'):
            bits.append(f'<p class="disclaimer">{inline(meta["disclaimer"])}</p>')
        if bits:
            head = '<div class="doc-header">' + ''.join(bits) + '</div>'

    css = CSS.format(page=args.page, **THEMES[args.theme])
    title = html.escape(meta.get('title', os.path.basename(args.input)))
    doc = (f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title}</title>'
           f'<style>{css}</style></head><body>{head}'
           f'{render_blocks(body_md.split(chr(10)))}</body></html>')

    html_path = os.path.splitext(out_pdf)[0] + '.html'
    open(html_path, 'w', encoding='utf-8').write(doc)

    chrome = find_chrome()
    if not chrome:
        sys.exit('No Chromium/Chrome binary found; wrote HTML only: ' + html_path)
    subprocess.run([chrome, '--headless', '--disable-gpu', '--no-sandbox',
                    '--no-pdf-header-footer', f'--print-to-pdf={out_pdf}', html_path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not args.keep_html:
        os.remove(html_path)

    pages = '?'
    try:
        import pypdfium2 as pdfium
        d = pdfium.PdfDocument(out_pdf)
        pages = len(d)
        if args.png:
            stem = os.path.splitext(out_pdf)[0]
            for i in range(pages):
                d[i].render(scale=0.85).to_pil().save(f'{stem}-page-{i+1}.png')
    except Exception:
        pass
    print(f'{out_pdf}  ({pages} pages)')


if __name__ == '__main__':
    main()
