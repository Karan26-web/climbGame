/* Headless stage validation. Run: node tools/stage_test.js [stageNumber]
 *
 * index.html is the whole game, and its PHYSICS-CORE, STAGES and WORLD modules
 * are DOM-free by contract, so they are extracted verbatim and run here — one
 * source of truth, no second copy of the track to drift out of sync.
 *
 * A bot drives each authored pathway end to end with the same rules the game
 * uses (three lives, checkpoint respawns, fuel drain, fuel cans). What comes
 * out is what the stage table needs: is it finishable at all, how long a
 * competent-but-not-perfect driver takes (that is the par time), and how many
 * coins are actually on the route (that is the coin goal).
 */
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* --- extract the DOM-free modules ------------------------------------- */
function core() {
  const m = html.match(/PHYSICS-CORE-START[^\n]*\n([\s\S]*?)\/\*[^\n]*PHYSICS-CORE-END/);
  if (!m) throw new Error('PHYSICS-CORE block not found');
  return m[1];
}
/* Slice one `(function (CG) { ... })(CG);` module by its banner comment. */
function moduleAfter(banner) {
  const at = html.indexOf(banner);
  if (at < 0) throw new Error('module not found: ' + banner);
  const start = html.indexOf('(function (CG) {', at);
  let depth = 0, i = start;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth === 0) break; }
  }
  return html.slice(start, html.indexOf(';', i) + 1);
}

vm.runInThisContext(core());
vm.runInThisContext(moduleAfter('================================== STAGES ====='));
vm.runInThisContext(moduleAfter('=================================== WORLD ====='));

/* --- game rules mirrored from the GAME module ------------------------- */
const DT = 1 / 240;
const FUEL_MAX = 100, FUEL_DRIVE = 3.4, FUEL_IDLE = 1.0, FUEL_CAN = 34, CP_FUEL = 30;
const LIVES = 3, TIME_CAP = 600;
/* the chasm sequence: spawn + place animation is on the clock, thinking is
   not; a first-try answer banks 30 coins */
const PLANK_ANIM_T = 0.38 + 1.1, GAP_BONUS = 30;
const SLOWDOWN = { gas: 0, brake: 0.55, boost: false };
const CREEP = { gas: 0.4, brake: 0, boost: false };

/* Sign conventions, measured rather than assumed, so this keeps working if the
   torque sign in the physics ever changes:
     angle `a` follows the terrain convention (y grows downward), so a NEGATIVE
     angle is nose-up; gas pitches the nose up in the air, brake pitches it
     down. GAS_DIR is the sign of the angular velocity gas produces. */
function airTorqueSign() {
  CG.Terrain.setTrack(null);
  CG.Terrain.setSeed(1);
  const v = new CG.Vehicle(CG.Terrain);
  v.reset(200);
  v.y -= 400; v.vy = 0; v.vx = 300;                 // drop it in clear air
  for (let i = 0; i < 90; i++) v.step(DT, { gas: 1, brake: 0 });
  return Math.sign(v.av);
}
const GAS_DIR = airTorqueSign();

/* A deliberately ordinary driver:
     ground — full throttle, easing off when the nose lifts away from the slope
              (flooring it up a steep face is how a real player loops over
              backwards, and a bot that never lifts would condemn fair stages);
     air    — a plain PD controller holding the car a touch nose-up, which is
              the one thing every player learns in the first minute.
   No lookahead, no racing line, no braking points. If this bot can finish, a
   player can. */
const GAS = { gas: 1, brake: 0, boost: false };
const EASE = { gas: 0.6, brake: 0, boost: false };
const CRAWL = { gas: 0.25, brake: 0, boost: false };
const BRAKE = { gas: 0, brake: 1, boost: false };
const COAST = { gas: 0, brake: 0, boost: false };
const gsample = {};

function botInput(v) {
  if (v.onGround) {
    const g = CG.Terrain.sample(v.x, gsample);
    const nose = v.a - g.ang;                       // < 0 = nose above the slope
    if (nose < -0.30) return CRAWL;
    if (nose < -0.18) return EASE;
    return GAS;
  }
  /* aim slightly nose-up: wheels-first landings are what keep you alive */
  const want = (-0.12 - v.a) * 3.2 - v.av * 0.55;   // desired angular velocity
  if (Math.abs(want) < 0.05) return COAST;
  return (want * GAS_DIR > 0) ? GAS : BRAKE;
}

function pickDist(p, v) {
  const V = CG.VConst;
  const ax = v.x + V.axleRear.x * v.ca - V.axleRear.y * v.sa;
  const ay = v.y + V.axleRear.x * v.sa + V.axleRear.y * v.ca;
  const bx = v.x + V.axleFront.x * v.ca - V.axleFront.y * v.sa;
  const by = v.y + V.axleFront.x * v.sa + V.axleFront.y * v.ca;
  const dx = bx - ax, dy = by - ay;
  const t = CG.clamp(((p.x - ax) * dx + (p.y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(ax + dx * t - p.x, ay + dy * t - p.y);
}

/* The game's approach controller, verbatim in spirit: ease to the stop. */
function approachInput(v, g) {
  const rem = g.stopX - v.x, sp = v.forwardSpeed();
  const want = CG.clamp(rem * 2.4, 0, 260);
  if (sp > want + 15 && sp > 20) return SLOWDOWN;
  if (sp < want - 15) return CREEP;
  return COAST;
}
function hold(v) { v.vx = 0; v.vy = 0; v.av = 0; v.wheels[0].omega = 0; v.wheels[1].omega = 0; }

function runStage(i) {
  const st = CG.Stages[i];
  const track = CG.buildStage(i);
  CG.Terrain.setSeed(st.seed);
  CG.Terrain.setTrack(track);
  CG.Terrain.setPlanks([]);
  CG.World.init(st.seed, track);

  const v = new CG.Vehicle(CG.Terrain);
  v.reset(160);

  let t = 0, fuel = st.fuel, lives = LIVES, cpIdx = -1, cpX = 160;
  let coins = 0, cans = 0, deaths = [], stuck = 0, lastX = v.x, maxAir = 0, air = 0;
  let used = 0, gained = 0, gaps = 0;
  let totalCoins = 0, counted = new Set();

  while (t < TIME_CAP) {
    let inp = fuel > 0 ? botInput(v) : { gas: 0, brake: 0, boost: false };
    /* chasm ahead: the game takes the pedals, stops the car on the lip, asks.
       The bot knows the answer — it lays the exact plank and pays only the
       animation time, which is what a player who is right first time pays. */
    const g = track.chasms[gaps];
    if (g && v.x >= g.armX) {
      if (v.x >= g.stopX - 8 && Math.abs(v.forwardSpeed()) < 30 || v.x >= g.stopX) {
        v.x = Math.min(v.x, g.stopX); hold(v);
        CG.Terrain.addPlank(CG.Gaps.plankFor(g, g.D));
        g.solved = true; gaps++; coins += GAP_BONUS; t += PLANK_ANIM_T;
        stuck = 0; lastX = v.x;
        inp = COAST;
      } else inp = approachInput(v, g);
    }
    v.step(DT, inp);
    t += DT;

    const burn = (inp.gas > 0 || inp.brake > 0 ? FUEL_DRIVE : FUEL_IDLE) * DT;
    used += Math.min(fuel, burn);
    fuel = Math.max(0, fuel - burn);
    air = v.onGround ? 0 : air + DT;
    maxAir = Math.max(maxAir, air);

    /* pickups within reach */
    CG.World.each(v.x - 300, v.x + 300, function (ch) {
      for (const p of ch.picks) {
        if (!counted.has(p.id)) { counted.add(p.id); if (p.type === 'coin') totalCoins++; }
        if (CG.World.isTaken(p.id) || pickDist(p, v) > p.r + 40) continue;
        CG.World.take(p.id);
        if (p.type === 'coin') coins++;
        else if (p.type === 'gem') coins += 25;
        else if (p.type === 'star') coins += 50;
        else if (p.type === 'fuel') {
          gained += Math.min(FUEL_CAN, FUEL_MAX - fuel);
          fuel = Math.min(FUEL_MAX, fuel + FUEL_CAN); cans++;
        }
      }
    });

    while (cpIdx + 1 < track.cps.length && v.x >= track.cps[cpIdx + 1]) {
      cpIdx++; cpX = track.cps[cpIdx];
      gained += Math.min(CP_FUEL, FUEL_MAX - fuel);
      fuel = Math.min(FUEL_MAX, fuel + CP_FUEL);
    }

    if (v.x >= track.finishX) {
      return { ok: true, t, coins, totalCoins, cans, fuel, lives, deaths, maxAir,
               used, gained, len: track.length, finishX: track.finishX,
               cps: track.cps.length, gaps };
    }

    /* not moving for 6s on the ground = the bot is beaten by the terrain */
    if (v.onGround && Math.abs(v.x - lastX) < 40) stuck += DT; else { stuck = 0; lastX = v.x; }

    if (v.crashed || fuel <= 0 || stuck > 6) {
      const why = v.crashed ? v.crashReason : (fuel <= 0 ? 'fuel' : 'stuck');
      const part = track.at(v.x);
      deaths.push(why + ' on ' + (part ? part.name + '[' + part.index + '] at ' +
                  Math.round((v.x - part.x0) / part.len * 100) + '%' : 'run-out') +
                  ' @' + Math.round(v.x / CG.PPM) + 'm');
      lives--;
      if (lives <= 0) {
        return { ok: false, t, coins, totalCoins, cans, fuel, lives, deaths, maxAir,
                 len: track.length, finishX: track.finishX, cps: track.cps.length,
                 diedAt: v.x };
      }
      v.reset(Math.max(120, cpIdx >= 0 ? cpX : 160));
      v.crashed = false; v.crashReason = ''; v.upsideTime = 0;
      fuel = Math.max(fuel, 30);
      stuck = 0; lastX = v.x;
    }
  }
  return { ok: false, t, coins, totalCoins, cans, fuel, lives, deaths, maxAir,
           len: track.length, finishX: track.finishX, cps: track.cps.length,
           diedAt: v.x, timeout: true };
}

/* --- every chasm, every answer ------------------------------------------
   For each chasm the car is parked on the lip, every mark on the ruler (1 to
   RULER_MAX units) is laid in turn as a plank, and the car is floored across with the same scripted nudges
   the game applies (a short plank tips the nose at its end, a long one pitches
   the car into the wall). The exact plank must carry the car to the far side
   on its wheels; every wrong one must put it in the pit. `raw` repeats the
   wrong ones WITHOUT the nudges, so we also know whether the geometry alone
   teaches the lesson or the script is doing the work. */
function checkChasms(i) {
  const st = CG.Stages[i];
  const track = CG.buildStage(i);
  CG.Terrain.setSeed(st.seed);
  CG.Terrain.setTrack(track);
  const V = CG.VConst, problems = [], notes = [];
  for (const g of track.chasms) {
    const deep = Math.max(g.ay, g.by) + 130;
    for (let len = 1; len <= CG.Gaps.RULER_MAX; len++) {
      const o = { label: String(len), len, ok: len === g.q.D };
      for (const mode of (o.ok ? ['game'] : ['game', 'raw'])) {
        const p = CG.Gaps.plankFor(g, o.len);          // fresh: a short one gets bent
        CG.Terrain.setPlanks([p]);
        const v = new CG.Vehicle(CG.Terrain);
        v.reset(g.stopX); hold(v);
        let t = 0, tipped = false, tipT = 0, out = 'timeout';
        const Gp = CG.Gaps;
        while (t < 8) {
          v.step(DT, GAS); t += DT;
          if (mode === 'game') {
            if (p.kind === 'short') {
              if (!tipped && Gp.shortTripped(v, p)) { tipped = true; tipT = t; Gp.boardGives(v); }
              if (tipped) Gp.tipPlank(p, DT);
            } else if (p.kind === 'long' && !tipped && Gp.longTripped(v, p)) { tipped = true; tipT = t; Gp.wallFlip(v); }
            if (tipped && Gp.failed(v, g, t - tipT)) {
              out = v.crashed ? 'crash:' + v.crashReason : v.y > deep ? 'pit' : 'wrecked';
              break;
            }
          }
          if (v.x > g.bx + 150 && v.onGround && !v.crashed) { out = 'across'; break; }
          if (v.y > deep) { out = 'pit'; break; }
          if (v.crashed) { out = 'crash:' + v.crashReason; break; }
        }
        const tag = 'chasm ' + (g.index + 1) + ' ' + JSON.stringify(g.a) + '->' + JSON.stringify(g.b) +
                    ' plank ' + o.label + ' (' + p.kind + (mode === 'raw' ? ', no nudge' : '') + '): ' + out;
        if (p.kind === 'exact' && out !== 'across') problems.push(tag);
        if (p.kind !== 'exact' && out === 'across') {
          if (mode === 'game') problems.push(tag); else notes.push(tag);
        }
        if (p.kind !== 'exact' && out === 'timeout' && mode === 'game') problems.push(tag);
      }
    }
  }
  CG.Terrain.setPlanks([]);
  return { n: track.chasms.length, problems, notes };
}

/* --- part geometry sanity: nothing the car physically cannot meet ------ */
function slopeReport(track) {
  let maxUp = 0, maxDown = 0, atUp = 0, atDown = 0;
  for (let x = 0; x < track.length; x += 3) {
    const part = track.at(x);
    if (part && part.gap) continue;                 // chasm walls are meant to be walls
    const m = (CG.Terrain.y(x + 1.5) - CG.Terrain.y(x - 1.5)) / 3;
    if (-m > maxUp) { maxUp = -m; atUp = x; }
    if (m > maxDown) { maxDown = m; atDown = x; }
  }
  return { up: Math.atan(maxUp) * 57.3, upAt: atUp,
           down: Math.atan(maxDown) * 57.3, downAt: atDown };
}

const only = process.argv[2] ? +process.argv[2] : 0;
let fails = 0;
console.log('stage  name            len    time   par    coins/on-track  cans  fuel  lives  maxAir  steepest up');
for (let i = 0; i < CG.Stages.length; i++) {
  const st = CG.Stages[i];
  if (only && st.id !== only) continue;
  const r = runStage(i);
  const sl = slopeReport(CG.buildStage(i) && CG.Terrain.track ? CG.Terrain.track : null) ;
  const line = [
    String(st.id).padEnd(6),
    st.name.padEnd(15),
    (Math.round(r.finishX / CG.PPM) + 'm').padEnd(6),
    (r.ok ? r.t.toFixed(1) : '—').padStart(6),
    String(st.par).padStart(5),
    (r.coins + '/' + r.totalCoins).padStart(15),
    String(r.cans).padStart(6),
    r.fuel.toFixed(0).padStart(6),
    String(r.lives).padStart(7),
    r.maxAir.toFixed(2).padStart(8),
    (sl.up.toFixed(0) + '°').padStart(13)
  ].join(' ');
  console.log(line);
  if (!r.ok) {
    fails++;
    console.log('       FAILED' + (r.timeout ? ' (timeout)' : '') +
                ' at ' + Math.round(r.diedAt / CG.PPM) + 'm of ' +
                Math.round(r.finishX / CG.PPM) + 'm');
  }
  if (r.deaths.length) console.log('       retries: ' + r.deaths.join(', '));
  const cc = checkChasms(i);
  console.log('       chasms: ' + cc.n + (cc.problems.length ? '' : ' — exact plank carries, every wrong plank fails'));
  for (const pr of cc.problems) { fails++; console.log('       ** ' + pr); }
  for (const nt of cc.notes) console.log('       note: ' + nt);
  if (r.ok) {
    const budget = st.fuel + r.gained;
    console.log('       fuel: burned ' + r.used.toFixed(0) + ' of ' +
                budget.toFixed(0) + ' available (' +
                (budget / r.used).toFixed(2) + 'x margin, ' + r.cps + ' checkpoints)');
    /* The bot is the baseline for ONE star: it finishes, unhurried, driving the
       obvious line. Par is 5% quicker than it manages and the coin goal 5% more
       than it picks up, so the second and third stars cost the player something
       the bot has not got — a line, and a reason to detour. If the bot ever
       scores 3, the stage has stopped asking for anything. */
    const stars = 1 + (r.t <= st.par ? 1 : 0) + (r.coins >= st.coins ? 1 : 0);
    console.log('       the bot scores ' + stars + ' star(s): ' +
                r.t.toFixed(1) + 's vs par ' + st.par + ', ' +
                r.coins + ' coins vs goal ' + st.coins);
    const par = Math.round(r.t * 0.95 / 5) * 5;
    const goal = Math.round(r.coins * 1.05 / 5) * 5;
    if (stars > 1) {
      console.log('       ** goals too soft — the bot should score exactly 1 star **');
    }
    if (Math.abs(par - st.par) > 5 || Math.abs(goal - st.coins) > 25) {
      console.log('       suggest par: ' + par + '  coins: ' + goal +
                  '   (table says ' + st.par + ' / ' + st.coins + ')');
    }
  }
}
console.log(fails ? '\n' + fails + ' stage(s) not completable by the bot' : '\nall stages completable');
process.exit(fails ? 1 : 0);
