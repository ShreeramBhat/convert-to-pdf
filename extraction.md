# Extraction snippets

Pass each as the `text` of `mcp__claude-in-chrome__javascript_tool`
(`action: "javascript_exec"`, plus the tab id). Replace `main` with `article` or
`body` on non-Claude pages. Several independent snippets can go in one
`browser_batch` — each result is filtered separately, so one blocked chunk does not
kill the others.

### 1. Code fingerprint — leading spaces per line → `ind.txt`

```js
[...document.querySelectorAll('main pre')].map((e,i)=>i+': '+
  e.textContent.split('\n').map(l=>l.match(/^ */)[0].length).join(',')).join('\n')
```

### 2. Code fingerprint — trimmed length per line → `len.txt`

```js
[...document.querySelectorAll('main pre')].map((e,i)=>i+': '+
  e.textContent.split('\n').map(l=>l.trim().length).join(',')).join('\n')
```

Sizes first, if you want to know what you are dealing with:

```js
[...document.querySelectorAll('main pre')].map((e,i)=>i+':'+e.textContent.length).join(', ')
```

### 3. Headings, lists, quotes

```js
[...document.querySelectorAll('main h1,main h2,main h3,main h4,main ul,main ol,main blockquote')]
  .map(e=>e.tagName+'|'+(e.tagName[0]=='H'?e.textContent.trim():e.children.length+' items')).join('\n')
```

### 4. Bold spans (tells you which sentences led with emphasis)

```js
[...document.querySelectorAll('main strong')].map(e=>e.textContent.trim()).join(' || ')
```

### 5. Inline code spans — fetch in slices of ~14

```js
const c=[...document.querySelectorAll('main code')].filter(e=>!e.closest('pre'))
  .map(e=>e.textContent.trim()); c.length+' :: '+c.slice(0,14).join(' | ')
```

Then `c.slice(14,28)`, `c.slice(28)`, …

### 6. Links with hrefs

```js
[...document.querySelectorAll('main a')].map(a=>a.textContent.trim().slice(0,40)+' -> '+a.href).join('\n')
```

### 7. Raw source, when a line will not reconstruct

Only for the region that failed the check. Keep slices ≤200 characters; JSON-ish or
config-ish text is what trips the filter, so shrink further if a chunk is blocked.

```js
document.querySelectorAll('main pre')[2].textContent.slice(430,530)
```

### 8. Message boundaries and timestamps

Claude share pages put each turn's title in an `h2` (`You said: …` / `Claude responded: …`)
and the relative time in a sibling. This is usually enough:

```js
[...document.querySelectorAll('main h2')].map(e=>e.textContent.trim()).join('\n')
```

Timestamps are visible in the `get_page_text` output; take them from there.

### Things that do not work

- `btoa(...)` of anything — blocked as base64.
- Returning `main.innerHTML`, or a whole `<pre>` — blocked, and enormous.
- Trusting `get_page_text` for whitespace inside code.
