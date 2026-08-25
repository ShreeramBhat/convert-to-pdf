# convert-to-pdf

Turn a **claude.ai** conversation (live chat or share link) into a typeset PDF: messages, fenced code with whitespace, images, artifacts, widgets, and attachments.

Two ways to do it:

| | |
|---|---|
| **Chrome extension** | Unpacked MV3 extension in `extension/`. Open a Claude tab, click the icon, export PDF. |
| **Agent skill** | `SKILL.MD` plus `build_pdf.py` / `check_code_blocks.py` for agent-driven extraction and typesetting. |

## Chrome extension

See [`extension/README.md`](extension/README.md) for install and usage.

Short version:

1. `chrome://extensions` → Developer mode → **Load unpacked** → select `extension/`
2. Open `https://claude.ai/chat/…` or `https://claude.ai/share/…`
3. Click **Claude to PDF** → **Export PDF** → Save as PDF with **Background graphics** on

The PDF theme follows the Claude tab (light/dark). You can override it in the popup.

## Skill (Python)

`SKILL.MD` is the page-to-PDF skill. `build_pdf.py` typesets a markdown transcript; `check_code_blocks.py` verifies code indentation against fingerprints in `extraction.md`.
