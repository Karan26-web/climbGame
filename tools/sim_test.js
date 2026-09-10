/* Headless physics validation. Run: node tools/sim_test.js */
/* index.html is the whole game. The PHYSICS-CORE block in it is DOM-free by
   contract, so it is extracted verbatim and run here — one source of truth. */
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = html.match(/PHYSICS-CORE-START[^\n]*\n([\s\S]*?)\/\*[^\n]*PHYSICS-CORE-END/);
if (!m) throw new Error('PHYSICS-CORE block not found in index.html');
vm.runInThisContext(m[1]);

const DT = 1 / 240;
const flat = { y: () => 300, sample: (x, o) => (o = o || {}, o.x = x, o.y = 300, o.m = 0,
  o.nx = 0, o.ny = -1, o.tx = 1, o.ty = 0, o.ang = 0, o) };
function slope(deg) {
  const m = Math.tan(deg * Math.PI / 180) * -1;   // uphill to the right
  const L = Math.sqrt(1 + m * m);
  return { y: x => 300 + m * x,
    sample: (x, o) => (o = o || {}, o.x = x, o.y = 300 + m * x, o.m = m,
      o.nx = m / L, o.ny = -1 / L, o.tx = 1 / L, o.ty = m / L, o.ang = Math.atan2(m, 1), o) };
}
function run(t, secs, input, v) {
  v = v || new CG.Vehicle(t);
  const n = Math.round(secs / DT);
  let maxAv = 0, bad = null;
  for (let i = 0; i < n; i++) {
    v.step(DT, typeof input === 'function' ? input(i * DT, v) : input);
    maxAv = Math.max(maxAv, Math.abs(v.av));
    if (!bad && !isFinite(v.x + v.y + v.a + v.av)) bad = 'NaN at t=' + (i * DT).toFixed(2);
  }
  v.maxAv = maxAv; v.bad = bad;
  return v;
}
const NONE = { gas: 0, brake: 0 }, GAS = { gas: 1, brake: 0 }, BRK = { gas: 0, brake: 1 };
const kmh = px => (px / CG.PPM * 3.6).toFixed(1);

console.log('=== settle on flat (2s, no input) ===');
let v = run(flat, 2, NONE);
console.log(`  chassis y ${v.y.toFixed(2)}  (expected ${300 - CG.VConst.WHEEL_R - 18} = ground - R - COM)`);
console.log(`  sag r/f ${v.wheels[0].s.toFixed(2)}/${v.wheels[1].s.toFixed(2)}  (static ${CG.VConst.sagRear.toFixed(2)}/${CG.VConst.sagFront.toFixed(2)}, load ${(100*CG.VConst.shareRear).toFixed(0)}/${(100*CG.VConst.shareFront).toFixed(0)}%)`);
console.log(`  angle ${(v.a * 57.3).toFixed(2)} deg   drift vx ${v.vx.toFixed(2)}  vy ${v.vy.toFixed(3)}`);

console.log('\n=== flat acceleration (full gas) ===');
v = new CG.Vehicle(flat); run(flat, 2, NONE, v);
v.vx = 0; v.vy = 0;
const marks = {}; let t = 0;
for (let i = 0; i < 240 * 25; i++, t += DT) {
  v.step(DT, GAS);
  for (const s of [200, 400, 600, 800, 900, 950]) if (!marks[s] && v.vx >= s) marks[s] = t;
}
console.log(`  top speed ${v.vx.toFixed(0)} px/s = ${kmh(v.vx)} km/h`);
console.log('  time to: ' + Object.entries(marks).map(([k, t]) => `${k}px/s ${t.toFixed(2)}s`).join('  '));
console.log(`  wheel slip r/f ${v.wheels[0].slip.toFixed(1)}/${v.wheels[1].slip.toFixed(1)} px/s   pitch ${(v.a * 57.3).toFixed(1)} deg`);

console.log('\n=== braking from top speed ===');
let d0 = v.x, tb = 0;
while (v.vx > 5 && tb < 10) { v.step(DT, BRK); tb += DT; }
console.log(`  stop in ${tb.toFixed(2)}s over ${((v.x - d0) / CG.PPM).toFixed(1)} m`);

console.log('\n=== sustained climb speed (6s full gas per grade) ===');
for (const deg of [10, 15, 20, 25, 30, 35, 40, 45, 50]) {
  const t2 = slope(deg);
  const vv = run(t2, 8, GAS);
  const vf = vv.forwardSpeed();
  const spun = Math.abs(vv.wheels[0].slip) > 60;
  console.log(`  ${String(deg).padStart(2)} deg -> ${vf > 8 ? kmh(vf).padStart(5) + ' km/h' : ' STALL   '}` +
    `  climbed ${((300 - vv.y - 51) / CG.PPM).toFixed(1)} m vert${spun ? '   [wheelspin]' : ''}${vv.bad ? '  ' + vv.bad : ''}`);
}

console.log('\n=== real terrain, 90s full gas (seed 1) ===');
CG.Terrain.setSeed(1);
v = new CG.Vehicle(CG.Terrain);
let crashAt = null, air = 0, maxAir = 0, maxImpact = 0, maxSpeed = 0;
for (let i = 0; i < 240 * 90; i++) {
  v.step(DT, GAS);
  maxAir = Math.max(maxAir, v.airTime); maxImpact = Math.max(maxImpact, v.impact);
  maxSpeed = Math.max(maxSpeed, Math.hypot(v.vx, v.vy));
  if (!v.onGround) air += DT;
  if (v.crashed && !crashAt) { crashAt = { d: v.x, t: i * DT, why: v.crashReason }; break; }
  if (!isFinite(v.x)) { console.log('  DIVERGED at t=' + (i * DT).toFixed(2)); break; }
}
console.log(`  distance ${(v.x / CG.PPM).toFixed(0)} m   max speed ${kmh(maxSpeed)} km/h   airborne ${(100 * air / (crashAt ? crashAt.t : 90)).toFixed(0)}%`);
console.log(`  longest air ${maxAir.toFixed(2)}s   biggest suspension impact ${maxImpact.toFixed(0)} px/s`);
console.log(`  ${crashAt ? `CRASHED (${crashAt.why}) at ${(crashAt.d / CG.PPM).toFixed(0)} m, t=${crashAt.t.toFixed(1)}s` : 'no crash'}`);

console.log('\n=== stability sweep: 12 seeds x 60s full gas ===');
let far = 0, sum = 0, crashes = {};
for (let s = 1; s <= 12; s++) {
  CG.Terrain.setSeed(s);
  const vv = new CG.Vehicle(CG.Terrain);
  let why = null;
  for (let i = 0; i < 240 * 60; i++) {
    vv.step(DT, GAS);
    if (vv.crashed) { why = vv.crashReason; break; }
    if (!isFinite(vv.x)) { why = 'DIVERGED'; break; }
  }
  sum += vv.x / CG.PPM; far = Math.max(far, vv.x / CG.PPM);
  crashes[why || 'ok'] = (crashes[why || 'ok'] || 0) + 1;
  process.stdout.write(`  seed ${String(s).padStart(2)}: ${String(Math.round(vv.x / CG.PPM)).padStart(5)} m  ${why || 'ok'}\n`);
}
console.log(`  mean ${(sum / 12).toFixed(0)} m, best ${far.toFixed(0)} m, outcomes ${JSON.stringify(crashes)}`);

console.log('\n=== airtime / jumps (seed 1, 90s full gas) ===');
CG.Terrain.setSeed(1);
{
  const vv = new CG.Vehicle(CG.Terrain);
  let air = 0, jumps = [], cur = 0, t = 0;
  for (let i = 0; i < 240 * 90; i++, t += DT) {
    vv.step(DT, GAS);
    if (!vv.onGround) { cur += DT; air += DT; } else { if (cur > 0.25) jumps.push(cur); cur = 0; }
    if (vv.crashed) break;
  }
  jumps.sort((a, b) => b - a);
  console.log(`  airborne ${(100 * air / t).toFixed(0)}%   jumps>0.25s: ${jumps.length}` +
    `   longest ${jumps.slice(0, 5).map(j => j.toFixed(2)).join(', ')}`);
}

console.log('\n=== timestep sensitivity (does it need 240 Hz?) ===');
for (const hz of [60, 90, 120, 180, 240, 480]) {
  CG.Terrain.setSeed(1);
  const vv = new CG.Vehicle(CG.Terrain), h = 1 / hz;
  let ok = true;
  for (let i = 0; i < hz * 60; i++) { vv.step(h, GAS); if (!isFinite(vv.x)) { ok = false; break; } }
  console.log(`  ${String(hz).padStart(3)} Hz -> ${ok ? (vv.x / CG.PPM).toFixed(0).padStart(5) + ' m' : 'DIVERGED'}` +
    `  angle ${(vv.a * 57.3).toFixed(0)} deg  ${vv.crashed ? 'crashed:' + vv.crashReason : ''}`);
}
