/*
 * End-to-end checks for the renderer: fixtures in, print-ready HTML and
 * markdown out, no browser involved. Each block states what it would catch;
 * run it against an older src/ with CTP_SRC to see which assertions bite.
 */
const H = require("./harness.js");
const { CTP } = H;

const ORG = "1d01bcbc-625a-465e-8d8b-7d3c048144b1";
const PREVIEW = `/api/${ORG}/files/71fa6d07-1290-4a4a-9f8e-000000000001/preview`;   // relative, as the API returns
const ABS = "https://claude.ai" + PREVIEW;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? "\n          " + detail : ""}`); }
}
const OPTS = { appearance: "dark", theme: "dark", skipDomFigures: true, includeThinking: false };

const STEPS = [
  { title: "Open the Chrome Web Store in Edge", description: "Go to chromewebstore.google.com in Edge." },
  { title: "Allow extensions from other stores", description: "Click the banner Edge shows." },
  { title: "Install the extension", description: "Press Add to Chrome; Edge installs it." },
  { title: "Pin it", description: "Open the puzzle icon and pin the extension." },
];

function convo(assistantContent, files) {
  return {
    name: "Fixture conversation",
    chat_messages: [
      { uuid: "u1", sender: "human", created_at: "2026-09-25T10:00:00Z",
        content: [{ type: "text", text: "Question from the user." }], files: files || [] },
      { uuid: "a1", sender: "assistant", created_at: "2026-09-25T10:00:05Z", content: assistantContent },
    ],
  };
}
const imageFile = {
  file_kind: "image", file_name: "Screenshot 2026-09-25 at 2.12.19 PM.png",
  preview_url: PREVIEW, thumbnail_url: PREVIEW,
  preview_asset: { url: PREVIEW }, size_bytes: 104886, uuid: "f-1",
};
const partsOf = (m) => m.turns.flatMap((t) => t.parts);
const typesOf = (m) => partsOf(m).map((p) => p.type);

(async () => {
  /* ---------------- 1. step_card_display_v0 ---------------- */
  console.log("\n1. step_card_display_v0 renders its steps");
  H.setDom({}); H.setFetch(H.failingFetch());
  {
    const data = convo([
      { type: "text", text: "Here is how to do it." },
      { type: "tool_use", name: "step_card_display_v0",
        input: { view: "stepper", summary: "Edge accepts Chrome extensions.", steps: STEPS } },
      { type: "tool_result", name: "step_card_display_v0", content: "ok" },
    ]);
    const model = await CTP.html.prepare(data, { kind: "chat", id: "x", url: "u" }, { ...OPTS });
    const html = CTP.html.buildPayload(model, OPTS).body;
    const md = CTP.md.transcript(model);
    const card = partsOf(model).find((p) => p.type === "html");

    check("an html part is produced", !!card, "part types: " + typesOf(model).join(","));
    check("tool chip says 'Listed steps'", html.includes("Listed steps"));
    check("payload contains the stepcard block", html.includes('class="stepcard"'));
    check("all 4 step titles reach the PDF body",
          STEPS.every((s) => html.includes(s.title)),
          STEPS.filter((s) => !html.includes(s.title)).map((s) => s.title).join(" | "));
    check("all 4 descriptions reach the PDF body", STEPS.every((s) => html.includes(s.description)));
    check("summary is rendered", html.includes("Edge accepts Chrome extensions."));
    check("renderPart is non-empty (would count as emptyParts otherwise)",
          !!card && CTP.html.renderPart(card).length > 40);
    check("markdown export carries numbered steps",
          md.includes("1. **" + STEPS[0].title + "**") && md.includes("4. **" + STEPS[3].title + "**"),
          md.split("\n").filter((l) => /^\d\./.test(l)).join(" / ").slice(0, 120));
  }

  /* ---------------- 2. file-chip fallback ---------------- */
  console.log("\n2. an image that cannot be inlined leaves a chip, not a hole");
  H.setDom({}); H.setFetch(H.failingFetch());
  {
    const data = convo([{ type: "text", text: "Reply." }], [imageFile]);
    const model = await CTP.html.prepare(data, { kind: "chat", id: "x", url: "u" },
                                         { ...OPTS, skipDomImages: true });
    const parts = partsOf(model);
    const chip = parts.find((p) => p.type === "file");
    const html = CTP.html.buildPayload(model, OPTS).body;

    check("the failed image still yields a part", parts.some((p) => p.type === "file" || p.type === "image"),
          "part types: " + typesOf(model).join(","));
    check("it is a file chip", !!chip, "types: " + typesOf(model).join(","));
    check("the chip names the file", !!chip && chip.name === imageFile.file_name, chip && chip.name);
    check("the file name reaches the PDF body", html.includes("Screenshot 2026-09-25 at 2.12.19 PM.png"));
    check("no broken <img> is emitted", !/<img[^>]*src=""/.test(html));
  }

  /* ---------------- 3a. the file path alone, no DOM to rescue it -------- */
  console.log("\n3a. a relative preview_url inlines from the file itself (no DOM fallback)");
  {
    H.setFetch(H.imageResponse("image/webp", [10, 20, 30, 40, 50]));
    H.setDom({ "main img, article img": [], "main canvas, article canvas": [] });
    const data = convo([{ type: "text", text: "Reply." }], [imageFile]);
    const model = await CTP.html.prepare(data, { kind: "chat", id: "x", url: "u" }, { ...OPTS });
    const images = partsOf(model).filter((p) => p.type === "image");

    check("the file's relative preview_url produced an image part", images.length === 1,
          "part types: " + typesOf(model).join(",") + "  (0 here means the URL was rejected before any fetch)");
    check("src is an inlined data: URL", images[0] && images[0].src.startsWith("data:image/webp"),
          images[0] && images[0].src.slice(0, 40));
    check("href was stored absolute", images[0] && images[0].href === ABS,
          images[0] && images[0].href);
  }

  /* ---------------- 3b. the same picture also on the page --------------- */
  console.log("\n3b. the same picture in the DOM must not be emitted twice");
  {
    H.setFetch(H.imageResponse("image/webp", [10, 20, 30, 40, 50]));
    H.setDom({
      "main img, article img": [
        { currentSrc: ABS, src: ABS, naturalWidth: 800, naturalHeight: 600, alt: "shot" },
      ],
      "main canvas, article canvas": [],
    });
    const data = convo([{ type: "text", text: "Reply." }], [imageFile]);
    const model = await CTP.html.prepare(data, { kind: "chat", id: "x", url: "u" }, { ...OPTS });
    const images = partsOf(model).filter((p) => p.type === "image");
    const bodyImgs = (CTP.html.buildPayload(model, OPTS).body.match(/<img /g) || []).length;

    check("exactly one image part, not two", images.length === 1,
          "image parts: " + images.length + " -> " + images.map((i) => i.href).join(" , "));
    check("exactly one <img> in the PDF body", bodyImgs === 1, "count=" + bodyImgs);
  }

  /* ---------------- 3c. what is actually doing the deduping ------------- */
  console.log("\n3c. dedupe rests on the inlined data, not on the href");
  {
    /*
     * Worth being precise: making imagePart store an absolute href puts the
     * file part and the DOM sweep in the same URL space, but it is NOT what
     * stops a double. prepare() also compares the inlined data: URLs, and that
     * is the check that fires here. Give the two sources different bytes and
     * the duplicate gets through — which is the real limit of this dedupe.
     */
    let n = 0;
    H.setFetch(async () => ({
      ok: true,
      blob: async () => ({ type: "image/webp", size: 4, _bytes: [n++, 9, 9, 9] }),
    }));
    H.setDom({
      "main img, article img": [
        { currentSrc: ABS + "?variant=2", src: ABS + "?variant=2",
          naturalWidth: 800, naturalHeight: 600, alt: "shot" },
      ],
      "main canvas, article canvas": [],
    });
    const data = convo([{ type: "text", text: "Reply." }], [imageFile]);
    const model = await CTP.html.prepare(data, { kind: "chat", id: "x", url: "u" }, { ...OPTS });
    const images = partsOf(model).filter((p) => p.type === "image");
    check("a different URL yielding different bytes is kept as a second image",
          images.length === 2,
          "image parts: " + images.length + " (documents the boundary, not a bug)");
  }

  /* ---------------- 4. absolute href, stated accurately ----------------- */
  console.log("\n4. imagePart stores an href in the same space the DOM reports");
  {
    H.setFetch(H.imageResponse());
    H.setDom({ "main img, article img": [], "main canvas, article canvas": [] });
    const data = convo([{ type: "text", text: "Reply." }], [imageFile]);
    const model = await CTP.html.prepare(data, { kind: "chat", id: "x", url: "u" }, { ...OPTS });
    const img = partsOf(model).find((p) => p.type === "image");
    check("href is absolute, matching how the browser reports img.currentSrc",
          !!img && img.href === ABS, img && img.href);
    check("and it is the resolved form of the API's relative preview_url",
          !!img && img.href === "https://claude.ai" + PREVIEW);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
