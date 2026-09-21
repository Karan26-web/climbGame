/* Drive the real game in headless Chromium through one whole chasm — the
 * stop, the question, a short plank and its fall, a long plank and its flip,
 * the exact plank and the crossing — and screenshot each beat into docs/shots.
 *
 *   node tools/shoot_gaps.js [stage]
 *
 * Needs Playwright (the module is resolved from PLAYWRIGHT_PATH, the project,
 * or the npx cache). The game is opened over file://, which is how it ships.
 */
const path = require('path'), fs = require('fs');

function loadPlaywright() {
  const cands = [process.env.PLAYWRIGHT_PATH, 'playwright'].filter(Boolean);
  const npx = path.join(process.env.HOME || '', '.npm', '_npx');
  if (fs.existsSync(npx)) {
    for (const d of fs.readdirSync(npx)) cands.push(path.join(npx, d, 'node_modules', 'playwright'));
  }
  for (const c of cands) {
    try {
      const pw = require(c);
      if (fs.existsSync(pw.chromium.executablePath())) return pw;   // its browser is installed
    } catch (e) {}
  }
  throw new Error('no playwright with an installed chromium — set PLAYWRIGHT_PATH or run npx playwright install');
}

const root = path.join(__dirname, '..');
const out = path.join(root, 'docs', 'shots');
const stage = process.argv[2] || '1';

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console.error', m.text()); });

  const url = 'file://' + path.join(root, 'index.html') + '?stage=' + stage;
  await page.goto(url);
  await page.waitForFunction(() => window.CG && CG.Game && CG.Game.state === 'play', null, { timeout: 20000 });
  await page.waitForTimeout(400);

  const shot = async (name) => {
    await page.screenshot({ path: path.join(out, name + '.png') });
    console.log('shot', name);
  };
  const phase = () => page.evaluate(() => CG.Game.gap ? CG.Game.gap.phase : null);
  const waitPhase = (p, ms) => page.waitForFunction(
    (p) => CG.Game.gap && CG.Game.gap.phase === p, p, { timeout: ms || 15000 });
  const gas = (on) => on ? page.keyboard.down('ArrowRight') : page.keyboard.up('ArrowRight');

  /* 1. drive to the first chasm and get stopped */
  await gas(true);
  await waitPhase('ask', 30000);
  await gas(false);
  await page.waitForTimeout(900);                     // grid fade-in
  await shot('g1_ask');

  const q = await page.evaluate(() => {
    const g = CG.Game.gap.g;
    return { a: g.a, b: g.b, D: g.q.D };
  });
  console.log('question', JSON.stringify(q));
  const shortI = q.D > 2 ? q.D - 2 : (q.D > 1 ? q.D - 1 : 0), longI = Math.min(q.D + 2, 14), okI = q.D;

  /* open the ruler, light a mark, confirm — what a finger does */
  async function tryAnswer(k, tag) {
    await page.evaluate(() => CG.Game.rulerToggle(true));
    await page.waitForTimeout(500);
    if (tag === 'g2_short') await shot('g1b_ruler_open');
    await page.evaluate((k) => CG.Game.rulerPick(k), k);
    await page.waitForTimeout(250);
    if (tag === 'g2_short') await shot('g1c_ruler_picked');
    await page.evaluate(() => CG.Game.rulerConfirm());
    await page.waitForTimeout(250);
    await shot(tag + '_spawn');
    await waitPhase('place');
    await page.waitForTimeout(520);
    await shot(tag + '_place');
    await waitPhase('drive');
    await page.waitForTimeout(150);
    await shot(tag + '_landed');
    await gas(true);
  }

  /* 2. too short: drive off the end */
  if (shortI >= 1) {
    await tryAnswer(shortI, 'g2_short');
    await waitPhase('fail', 12000);
    await page.waitForTimeout(260);
    await shot('g2_short_fall');
    await gas(false);
    await waitPhase('ask', 5000);
    await page.waitForTimeout(700);
    await shot('g2_short_reset');
  }

  /* 3. too long: the wedge and the flip */
  await tryAnswer(longI, 'g3_long');
  await waitPhase('fail', 12000);
  await page.waitForTimeout(200);
  await shot('g3_long_flip');
  await gas(false);
  await waitPhase('ask', 5000);
  await page.waitForTimeout(700);
  await shot('g3_long_reset');

  /* 4. the right answer, and across */
  await tryAnswer(okI, 'g4_exact');
  await page.waitForFunction(() => {
    const G = CG.Game, g = G.gap && G.gap.g;
    return g && G.v.x > g.ax + 40;
  }, null, { timeout: 8000 });
  await shot('g4_exact_crossing');
  await page.waitForFunction(() => !CG.Game.gap || CG.Game.gap.phase === 'done', null, { timeout: 12000 });
  await page.waitForTimeout(300);
  await shot('g4_exact_across');
  await gas(false);
  await page.waitForTimeout(1200);
  await shot('g5_after');

  /* 5. a phone, portrait, at the question */
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await phone.goto(url);
  await phone.waitForFunction(() => window.CG && CG.Game && CG.Game.state === 'play', null, { timeout: 20000 });
  await phone.keyboard.down('ArrowRight');
  await phone.waitForFunction(() => CG.Game.gap && CG.Game.gap.phase === 'ask', null, { timeout: 30000 });
  await phone.keyboard.up('ArrowRight');
  await phone.waitForTimeout(900);
  await phone.evaluate(() => CG.Game.rulerToggle(true));
  await phone.waitForTimeout(500);
  await phone.screenshot({ path: path.join(out, 'g6_phone_ask.png') });
  console.log('shot g6_phone_ask');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
