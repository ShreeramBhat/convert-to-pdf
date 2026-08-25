---
name: page-to-pdf
description: Turn the page open in the browser into a faithful, typeset PDF — especially a shared or live Claude conversation (claude.ai/share/...), but any article works. Preserves every message, code block indentation, blockquote, list and link, and verifies the result before sending. Use when the user says "make this a pdf", "save this chat as a pdf", "export this page", "print this with the full content", or asks for a PDF of whatever they are looking at.
---

# Page → PDF

Browser page in, verified PDF out. The hard part is not the PDF; it is getting
**complete, correctly-whitespaced** content out of the page. Follow the order below.

## 0. Ground rules learned the hard way

- `get_page_text` is the only extraction call that reliably returns the whole page in
  one shot. It **strips leading indentation and collapses runs of inner spaces**, so it
  is a prose source, not a code source.
- `javascript_tool` results are content-filtered. Anything that looks like structured
  data comes back as `[BLOCKED: Cookie/query string data]` or `[BLOCKED: Base64 encoded
  data]`. **Never** base64-encode, never dump `innerHTML`, never return a whole code
  block. Return *fingerprints* (numbers) and, when you must return source, ≤200-character
  slices.
- Never guess indentation. Reconstruct it from the fingerprint and prove it with
  `scripts/check_code_blocks.py`.

## 1. Prepare the page

Get the tab id from the tab context block. Then, before extracting:

- Scroll to the bottom (`computer` → `scroll`, or `window.scrollTo(0,1e7)`) so lazy
  content loads. Re-run the message count until it stops growing.
- Expand anything collapsed — "Show more", collapsed code blocks, "View all" —
  with `find` + `computer` click.

## 2. Extract

**a. Prose (one call):** `get_page_text` on the tab. This is your transcript backbone.

**b. Code fingerprints (two calls):** see `references/extraction.md` snippets 1 and 2.
They return, per `<pre>` block, the leading-space count and the trimmed length of every
line. Save each result to `ind.txt` and `len.txt` verbatim.

**c. Structure (three or four small calls):** snippets 3–6 in `references/extraction.md`
give headings, lists/blockquotes, `<strong>` spans, inline `<code>` spans, and links with
hrefs. These tell you what was bold, what was a list, and where citations pointed.

If any call comes back `[BLOCKED: ...]`, split it — return `.slice(0,14)` then
`.slice(14,28)` of the array, or shorter string slices. Chunks of ~200 characters
almost always pass.

## 3. Assemble the transcript

Write `transcript.md` in the format `scripts/build_pdf.py` documents:

```
---
title: <a real title, not "Chat">
eyebrow: Shared Claude conversation
meta: Participants: Claude & <name> | Exported <date>
source: <url>
disclaimer: <the page's own disclaimer, if it has one>
---

::: turn user | <name> | 33 minutes ago
## <their opening line as the heading>

<message markdown>
:::

::: turn claude | Claude | 30 minutes ago
## <the response's own title line>

::: tool Searched the web

<response markdown, with ``` fences, > quotes, - lists, **bold**, `code`>
:::
```

Rules while assembling:

- Reproduce the wording exactly. Do not summarize, tidy, or re-order anything.
- Re-indent each fenced block from the fingerprint: the prose gives you each line's
  text, `ind.txt` gives its leading spaces, `len.txt` catches collapsed inner runs
  (aligned end-of-line comments are the usual culprit — pad until the length matches).
- Tag each fence with its language (`python`, `toml`, `bash`, …) when the page showed one.
- Finish with a "Links referenced" list if the page had citations.

## 4. Verify, then build

```bash
python3 scripts/check_code_blocks.py transcript.md --indents ind.txt --lengths len.txt
```

Fix every reported line before continuing. If a line resists reconstruction, pull that
exact region from the DOM in ≤200-character slices (snippet 7).

```bash
python3 scripts/build_pdf.py transcript.md -o <slug>.pdf --png
```
  
Options: `--theme warm|slate`, `--page A4|Letter`, `--keep-html`.

## 5. Check the render, then send

Read at least the first page PNG and one code-heavy page. Look for: content that runs
off the page, a nearly-empty page (an oversized code block that refused to break — the
builder already allows breaks above 22 lines), clipped text, missing turns.

Sanity-check the text layer too:

```bash
python3 -c "
from pypdf import PdfReader
t=''.join(p.extract_text() for p in PdfReader('<slug>.pdf').pages)
for k in ['<a phrase from the first turn>','<one from the last turn>']: print(k, k in t)"
```

Then `SendUserFile` the PDF with a one-line summary (page count, what was preserved).
Delete the page PNGs afterwards; they are scratch.

## Chrome extension (preferred for the user)

When the user wants to export chats themselves, use the unpacked extension in
`extension/` rather than this agent pipeline. It talks to claude.ai’s JSON API
from the live tab, inlines images, and opens Chrome’s print dialog (Save as PDF).

Load it: `chrome://extensions` → Developer mode → Load unpacked → `extension/`.

## Non-Claude pages

Same flow, with `main`/`article` in place of `main` in the snippets. Drop the `::: turn`
wrappers and write plain Markdown under the front matter — everything else is identical.