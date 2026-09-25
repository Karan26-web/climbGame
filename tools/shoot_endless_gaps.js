/* Drive endless mode in headless Chromium through two chasms back to back —
 * the auto-brake, the grid, the ruler, a wrong plank's reset, then the right
 * plank and the crossing — and screenshot each beat into docs/shots. Also
 * checks the things that are new to endless: chasms actually arm without a
 * G.track, the game never mistakes a chasm for a stage finish/checkpoint,
 * and consecutive chasms land a sane distance apart.
 *
 *   node tools/shoot_endless_gaps.js [seed]
 *
 * Needs Playwright (resolved the same way tools/shoot_gaps.js does). The
 * game is opened over file://, which is how it ships.
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
      if (fs.existsSync(pw.chromium.executablePath())) return pw;
    } catch (e) {}
  }
  throw new Error('no playwright with an installed chromium — set PLAYWRIGHT_PATH or run npx playwright install');
}

const root = path.join(__dirname, '..');
const out = path.join(root, 'docs', 'shots');
const seed = process.argv[2] || '42';

function assert(cond, msg) { if (!cond) throw new Error('FAILED: ' + msg); console.log('ok:', msg); }

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console.error', m.text()); });

  const url = 'file://' + path.join(root, 'index.html') + '?seed=' + seed;
  await page.goto(url);
  await page.waitForFunction(() => window.CG && CG.Game && CG.Game.state === 'play', null, { timeout: 20000 });
  await page.waitForTimeout(300);

  assert(await page.evaluate(() => CG.Game.mode === 'endless'), 'starts in endless mode');
  assert(await page.evaluate(() => CG.Game.track === null), 'no stage track is set');
  assert(await page.evaluate(() => CG.Game.freePlay && CG.Endless.chasms.length === 0),
         'opens in free play, with no chasm laid yet');

  const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('shot', name); };
  const waitPhase = (p, ms) => page.waitForFunction(
    (p) => CG.Game.gap && CG.Game.gap.phase === p, p, { timeout: ms || 20000 });
  const gas = (on) => on ? page.keyboard.down('ArrowRight') : page.keyboard.up('ArrowRight');

  const waitReveal = () => page.waitForFunction(
    () => CG.Game.gap && CG.Game.gap.rulerIn > 0.5, null, { timeout: 15000 });

  async function tryAnswer(k, tag) {
    await waitReveal();                 // nothing is tappable until the question is up
    await page.evaluate(() => CG.Game.rulerToggle(true));
    await page.waitForTimeout(400);
    await page.evaluate((k) => CG.Game.rulerPick(k), k);
    await page.waitForTimeout(200);
    await page.evaluate(() => CG.Game.rulerConfirm());
    await page.waitForTimeout(200);
    await waitPhase('place');
    await page.waitForTimeout(520);
    await waitPhase('drive');
    await page.waitForTimeout(150);
    if (tag) await shot(tag);
    await gas(true);
  }

  /* ---- chasm 1: the stop, then the reveal beat by beat ---- */
  await gas(true);                     // free play (15s+), then the first gap ~3000px on
  await waitPhase('ask', 70000);
  await gas(false);
  await shot('e0_stopped');            // the car alone on the lip, nothing up yet
  await page.waitForTimeout(650);
  await shot('e0b_grid');              // pane and axes in, points arriving
  await waitReveal();
  await page.waitForTimeout(350);
  await shot('e1_ask');                // fully built

  const g1 = await page.evaluate(() => {
    const g = CG.Game.gap.g;
    return { a: g.a, b: g.b, D: g.q.D, stopX: g.stopX, time: CG.Game.time, dist: CG.Game.dist };
  });
  console.log('chasm 1', JSON.stringify(g1));
  assert(g1.a[1] === g1.b[1], 'chasm 1 is horizontal (both lips at the same height)');

  await tryAnswer(g1.D, 'e2_exact_landed');
  await page.waitForFunction(() => {
    const G = CG.Game, g = G.gap && G.gap.g;
    return g && G.v.x > g.ax + 40;
  }, null, { timeout: 8000 });
  await shot('e3_exact_crossing');
  await page.waitForFunction(() => !CG.Game.gap || CG.Game.gap.phase === 'done', null, { timeout: 12000 });
  assert(await page.evaluate(() => CG.Game.state === 'play'), 'still playing after the first chasm (finishStage did not fire)');

  /* ---- chasm 2: answer wrong on purpose, watch the reset, then get it right ---- */
  await waitPhase('ask', 60000);
  await page.waitForTimeout(900);
  await shot('e4_second_ask');

  const g2 = await page.evaluate(() => {
    const g = CG.Game.gap.g;
    return { D: g.q.D, stopX: g.stopX };
  });
  console.log('chasm 2', JSON.stringify(g2));
  const spacing = g2.stopX - g1.stopX;
  console.log('spacing (world px)', spacing);
  assert(spacing > 1500 && spacing < 20000, 'consecutive chasms are a sane distance apart (' + spacing + 'px)');

  const wrongI = g2.D > 2 ? g2.D - 2 : g2.D + 2;
  await tryAnswer(wrongI, null);
  await waitPhase('fail', 12000);
  await page.waitForTimeout(260);
  await shot('e5_wrong_fail');
  await gas(false);
  await waitPhase('ask', 5000);
  await page.waitForTimeout(700);
  assert(await page.evaluate((k) => CG.Game.gap.wrong[k] === true, wrongI), 'the wrong length is crossed out after the reset');

  await tryAnswer(g2.D, null);
  await page.waitForFunction(() => !CG.Game.gap || CG.Game.gap.phase === 'done', null, { timeout: 12000 });
  assert(await page.evaluate(() => CG.Game.state === 'play' && CG.Game.mode === 'endless'), 'still an ordinary endless run after the second chasm');
  await shot('e6_second_done');
  await gas(false);

  await browser.close();
  console.log('all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
