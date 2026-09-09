// Full end-to-end UI test using real headless Chromium instances, one per
// player, against the locally-running production server (npm start on
// :3001). Takes screenshots at each phase so they can be visually reviewed.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const URL = "http://localhost:3001";
const SHOT_DIR = path.join(__dirname, "e2e-shots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok:", msg);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
}

(async () => {
  const browser = await chromium.launch();
  const names = ["Alice", "Bob", "Carol", "Dave", "Erin"];
  const contexts = await Promise.all(names.map(() => browser.newContext({ viewport: { width: 420, height: 850 } })));
  const pages = await Promise.all(contexts.map((c) => c.newPage()));

  // --- 1. Home screen render check (this is exactly what the user saw
  // reported as broken: title / tabs / name field visibility). ---
  await pages[0].goto(URL);
  await pages[0].waitForTimeout(500);
  await shot(pages[0], "01-home");

  const title = await pages[0].locator("h1").first().textContent();
  assert(title.includes("Imposter Party"), `title renders: "${title}"`);
  const tagline = await pages[0].locator(".brand p").first().textContent();
  assert(tagline.length > 10, `tagline renders: "${tagline}"`);
  assert(await pages[0].locator(".tabs .tab").count() === 2, "both tabs render");
  assert(await pages[0].locator("input.text-input").isVisible(), "name input is visible");
  const titleColor = await pages[0].locator("h1").first().evaluate((el) => getComputedStyle(el).color);
  console.log("   h1 computed color:", titleColor);
  assert(titleColor !== "rgba(0, 0, 0, 0)" && titleColor !== "rgb(0, 0, 0)", "h1 text color isn't invisible/black");

  const createBtn = pages[0].locator("button", { hasText: "Create Room" });
  assert(await createBtn.isDisabled(), "Create Room button starts disabled with no name typed");
  await pages[0].fill("input.text-input", names[0]);
  assert(!(await createBtn.isDisabled()), "Create Room button enables once a name is typed");
  await shot(pages[0], "02-home-name-filled");

  // --- 2. Create room + 4 players join ---
  await createBtn.click();
  await pages[0].waitForSelector(".room-code-pill .code");
  const roomCode = (await pages[0].locator(".room-code-pill .code").textContent()).trim();
  assert(/^[A-Z0-9]{4}$/.test(roomCode), `room created with code ${roomCode}`);
  await shot(pages[0], "03-lobby-host-alone");

  for (let i = 1; i < pages.length; i++) {
    await pages[i].goto(`${URL}/?room=${roomCode}`);
    await pages[i].waitForTimeout(200);
    // Join tab should be pre-selected and the code pre-filled from the URL.
    assert(await pages[i].locator(".tab.active", { hasText: "Join Room" }).isVisible(), `${names[i]} lands on Join tab via link`);
    const prefilled = await pages[i].locator("input.code-input").inputValue();
    assert(prefilled === roomCode, `${names[i]} sees the room code pre-filled`);
    await pages[i].fill('input.text-input:not(.code-input)', names[i]);
    await pages[i].locator("button", { hasText: "Join Room" }).click();
    await pages[i].waitForSelector(".room-code-pill .code");
  }
  await pages[0].waitForFunction(() => document.querySelectorAll(".player-row").length === 5);
  await shot(pages[0], "04-lobby-full");
  await shot(pages[1], "04-lobby-full-nonhost-view");

  const startBtn = pages[0].locator("button", { hasText: "Start Game" });
  assert(!(await startBtn.isDisabled()), "Start Game enabled with 5 players");
  assert(await pages[1].locator("text=Waiting for the host").isVisible(), "non-host sees waiting message");

  // --- 3. Category selection (host) propagates to everyone ---
  await pages[0].locator(".category-chip", { hasText: "Movies" }).click();
  await pages[1].waitForFunction(() => document.querySelector(".waiting-note")?.textContent.includes("Movies"));
  assert(true, "category change (Movies) propagated live to a non-host player");

  // --- 4. Start game -> reveal phase, private per-player assignment ---
  await startBtn.click();
  await Promise.all(pages.map((p) => p.waitForSelector(".flip-scene")));
  await shot(pages[0], "05-reveal-facedown");

  for (const p of pages) await p.locator(".flip-scene").click();
  await pages[0].waitForTimeout(300);
  await shot(pages[0], "06-reveal-flipped-p0");
  await shot(pages[1], "06-reveal-flipped-p1");

  const revealTexts = [];
  for (let i = 0; i < pages.length; i++) {
    const isImposter = await pages[i].locator(".imposter-text").count();
    if (isImposter) {
      revealTexts.push({ name: names[i], imposter: true });
    } else {
      const word = (await pages[i].locator(".secret-word").textContent()).trim();
      revealTexts.push({ name: names[i], imposter: false, word });
    }
  }
  const imposters = revealTexts.filter((r) => r.imposter);
  const civilians = revealTexts.filter((r) => !r.imposter);
  assert(imposters.length === 1, `exactly 1 imposter assigned (got ${imposters.length})`);
  assert(civilians.length === 4, "4 civilians got a word");
  const words = new Set(civilians.map((c) => c.word));
  assert(words.size === 1, `all civilians got the SAME word: ${[...words]}`);
  console.log("   imposter:", imposters[0].name, "| word:", [...words][0]);

  for (const p of pages) await p.locator("button", { hasText: "Got it, hide my card" }).click();
  await Promise.all(pages.map((p) => p.waitForSelector(".timer-ring")));
  await shot(pages[0], "07-discussion");

  // --- 5. Host skips discussion -> voting ---
  await pages[0].locator("button", { hasText: "Start Voting Now" }).click();
  await Promise.all(pages.map((p) => p.waitForSelector(".vote-grid")));
  await shot(pages[0], "08-voting");

  const imposterName = imposters[0].name;
  const imposterIdx = names.indexOf(imposterName);
  const civilianNames = names.filter((n) => n !== imposterName);

  // Everyone correctly votes the imposter; the imposter votes a civilian
  // (can't vote for themselves — the UI doesn't even show that option).
  for (let i = 0; i < pages.length; i++) {
    const targetName = i === imposterIdx ? civilianNames[0] : imposterName;
    await pages[i].locator(".vote-card", { hasText: targetName }).click();
  }

  await Promise.all(pages.map((p) => p.waitForSelector(".outcome-banner")));
  await shot(pages[0], "09-results-caught");

  const outcomeText = await pages[0].locator(".outcome-banner h2").textContent();
  assert(outcomeText.toLowerCase().includes("caught"), `outcome banner says caught: "${outcomeText}"`);

  const scoreRows = await pages[0].locator(".player-row").allTextContents();
  console.log("   scoreboard:", scoreRows.map((s) => s.replace(/\s+/g, " ").trim()));
  for (const name of civilianNames) {
    const row = scoreRows.find((r) => r.includes(name));
    assert(/\+1/.test(row) || row.includes("1"), `${name} shows a +1 / score 1 in the scoreboard row`);
  }

  // --- 6. Host plays again -> fresh round, new word/imposter possible ---
  await pages[0].locator("button", { hasText: "Play Again" }).click();
  await Promise.all(pages.map((p) => p.waitForSelector(".flip-scene")));
  assert(true, "Play Again correctly starts a fresh reveal round");
  await shot(pages[0], "10-round-2-reveal");

  console.log("\nAll browser end-to-end checks passed. Screenshots saved to", SHOT_DIR);
  await browser.close();
  process.exit(0);
})().catch(async (e) => {
  console.error("\nE2E TEST FAILED:", e.message);
  process.exit(1);
});
