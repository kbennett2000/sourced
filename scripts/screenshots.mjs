// Captures the four README screenshots by driving the live dev server.
// Run with `pnpm dev` already serving http://localhost:3000:
//   node scripts/screenshots.mjs
// Override the demo question with SHOT_Q="...".
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import sharp from "sharp";

const QUESTION = process.env.SHOT_Q || "Compare the top AI search engines in 2026";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "docs/images";
const MAX_BYTES = 250 * 1024;
const PILL = 'button[aria-label^="Jump to source"]';
const CARD = 'li[id^="source-"]';
const STRUCTURED = 'button:has-text("Show structured content")';

async function optimize(path) {
  let size;
  try {
    size = statSync(path).size;
  } catch {
    return;
  }
  if (size <= MAX_BYTES) {
    console.log(`  ${path}: ${(size / 1024).toFixed(0)}KB ok`);
    return;
  }
  const out = await sharp(await readFile(path))
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await writeFile(path, out);
  console.log(`  ${path}: ${(size / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB (palette)`);
}

async function waitIdle(page) {
  await page.waitForFunction(
    () => {
      const b = document.querySelector('button[type="submit"]');
      return b && !b.disabled;
    },
    { timeout: 60000 },
  );
}

async function run() {
  await mkdir(OUT, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(300);

  // 01 — fresh landing
  await page.screenshot({ path: `${OUT}/01-landing.png` });
  console.log("01-landing captured");

  // 02 — answering on Web Search (default)
  await page.getByPlaceholder("Ask anything...").fill(QUESTION);
  await page.locator('button[type="submit"]').click();
  await page.locator(PILL).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(700);
  const webCount = await page.locator(CARD).count();
  await page.screenshot({ path: `${OUT}/02-answering.png` });
  console.log(`02-answering captured (web sources=${webCount})`);
  await waitIdle(page);

  // 03 — same question re-run on LLM Context
  await page.getByRole("radio", { name: /LLM Context/ }).click();
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(
    () => document.querySelector('button[type="submit"]')?.disabled === true,
    { timeout: 60000 },
  );
  await page.locator(PILL).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(700);
  const ctxCount = await page.locator(CARD).count();
  await page.screenshot({ path: `${OUT}/03-llm-context.png` });
  console.log(`03-llm-context captured (context sources=${ctxCount})`);
  await waitIdle(page);

  // 04 — a SourceCard whose snippet triggered the non-prose renderer, collapsed
  const structured = page.locator(CARD).filter({ has: page.locator(STRUCTURED) });
  const structuredCount = await structured.count();
  if (structuredCount === 0) {
    console.log("WARNING: no structured-snippet card this run — 04 NOT captured. Re-run with a different SHOT_Q.");
  } else {
    await structured.first().scrollIntoViewIfNeeded();
    await structured.first().screenshot({ path: `${OUT}/04-snippet-collapse.png` });
    console.log(`04-snippet-collapse captured (structured cards=${structuredCount})`);
  }

  await browser.close();

  console.log(`\nDIFF web=${webCount} vs context=${ctxCount}: ${webCount !== ctxCount ? "REAL" : "NONE — consider another question"}`);
  console.log("optimize:");
  for (const f of ["01-landing", "02-answering", "03-llm-context", "04-snippet-collapse"]) {
    await optimize(`${OUT}/${f}.png`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
