# Claude to PDF

Chrome extension that turns a **claude.ai** conversation — live chat or share link — into a typeset PDF. Messages, fenced code (whitespace preserved), images, artifacts, and attachments are included. The layout matches the warm transcript style in this repo’s `build_pdf.py` skill.

Everything runs locally in your browser. The extension only talks to `claude.ai` (the same JSON API the site already uses, plus the images already on the page).

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin **Claude to PDF** to the toolbar.

## Use

1. Open a conversation:
   - Live chat: `https://claude.ai/chat/…`
   - Share link: `https://claude.ai/share/…`
2. Click the extension icon.
3. **Export PDF**. A preview tab opens and Chrome’s print dialog appears.
4. Set **Destination → Save as PDF**.
5. Enable **Background graphics**. Turn **Headers and footers** off.

The PDF defaults to the Claude tab’s look: light page if Claude is light, dark page if Claude is dark. Change it in the popup (**Match this page / Light / Dark**) or with Light/Dark on the preview toolbar.

You can also download a standalone HTML file or a Markdown transcript (the same `::: turn` format `build_pdf.py` already understands).

## What is captured

- The active conversation branch (not discarded regenerations)
- User and Claude turns, timestamps, tool chips
- Fenced code with original indentation
- Uploaded and generated **images**, inlined so the PDF does not depend on live URLs
- **Charts and diagrams**, captured from the page as vector art with their title,
  axis labels and legend intact, plus a collapsed table of the underlying numbers
- Extra pictures still visible on the page (screenshots, “code images”, artifact previews)
- Artifacts / created files as code blocks
- Optional thinking blocks and raw tool-result text

A chart is captured twice, once for a light PDF and once for a dark one, so the
Light/Dark switch on the preview toolbar keeps it legible either way. Whichever view
the widget is showing is what gets exported — switch it to **Table** in the chat and
the PDF carries the full table, expanded to its natural height rather than clipped to
the scroll box it uses on screen.

If Claude’s internal API is blocked (some share pages), the extension falls back to
reading the rendered page. That fallback keeps the charts and the wording but loses
markdown structure such as headings and lists.

## Tests

The renderer runs without Chrome, so it can be exercised from the command line:

```bash
node test/e2e.js                      # current working tree
CTP_SRC=/path/to/older/src node test/e2e.js   # any other revision, to see which checks bite
```

`test/harness.js` loads the real files from `src/` behind the smallest browser
surface they actually touch; the fixtures copy shapes taken from live claude.ai
API responses. The checks cover step cards, the chip left behind by an image
that will not inline, relative `preview_url` resolution, and image de-duplication
against the page sweep.

## Permissions

| Permission | Why |
|---|---|
| `https://claude.ai/*` | Read the open conversation and fetch images with your existing session cookie |
| `storage` / `unlimitedStorage` | Hand the print-ready HTML (including inlined images) to the preview tab |
| `scripting` | Inject the exporter if you installed the extension after the tab was already open |

No analytics. Nothing is sent off your machine except the `claude.ai` requests the site itself already makes.
