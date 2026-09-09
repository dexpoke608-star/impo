// Sanity check against real iPhone/Android device emulation profiles
// (real touch input, real device viewport + UA), against the locally
// running production server (npm start on :3001).
const { chromium, devices } = require("playwright");
const path = require("path");
const fs = require("fs");

const URL = "http://localhost:3001";
const SHOT_DIR = path.join(__dirname, "e2e-shots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok:", msg);
}

async function checkDevice(browser, deviceName) {
  console.log(`\n--- ${deviceName} ---`);
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();
  await page.goto(URL);
  await page.waitForTimeout(400);

  assert(await page.locator("h1", { hasText: "Imposter Party" }).isVisible(), `${deviceName}: title visible`);
  assert(await page.locator("input#player-name-input").isVisible(), `${deviceName}: name input visible`);

  // Real touch tap (not a mouse click) on the name field, then type.
  await page.locator("input#player-name-input").tap();
  await page.locator("input#player-name-input").fill("Nagendra");
  await page.screenshot({ path: path.join(SHOT_DIR, `${deviceName.replace(/\s+/g, "-")}-home.png`) });

  const createBtn = page.locator("button.btn-primary");
  assert(!(await createBtn.isDisabled()), `${deviceName}: Create Room enabled after typing`);

  await createBtn.tap();
  await page.waitForSelector(".room-code-pill .code", { timeout: 10000 });
  await page.screenshot({ path: path.join(SHOT_DIR, `${deviceName.replace(/\s+/g, "-")}-lobby.png`) });
  assert(true, `${deviceName}: tapping Create Room reaches the lobby`);

  // Tap a category chip (now a real <button>) via touch.
  const chip = page.locator(".category-chip", { hasText: "Food" });
  await chip.tap();
  await page.waitForFunction(() => document.querySelector(".category-chip.selected")?.textContent.includes("Food"));
  assert(true, `${deviceName}: tapping a category chip selects it`);

  // No page ever needs horizontal scroll on a real device viewport.
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert(!hasHorizontalOverflow, `${deviceName}: no horizontal overflow/scroll`);

  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  await checkDevice(browser, "iPhone 13");
  await checkDevice(browser, "Pixel 7");
  await checkDevice(browser, "iPad Mini");
  await browser.close();
  console.log("\nAll device checks passed. Screenshots saved to", SHOT_DIR);
  process.exit(0);
})().catch((e) => {
  console.error("\nMOBILE CHECK FAILED:", e.message);
  process.exit(1);
});
