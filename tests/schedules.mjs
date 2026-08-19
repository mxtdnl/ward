// Test 7b, extended: the class does not hold one setting for ten years. Search
// over twelve-round schedules for any that is good for the eleven (Dean out).
import { WARD } from "./harness.mjs";
const P = WARD.PARAMS;
const names = P.person.roster.map(r => r.name);
const DEAN = names.indexOf("Dean");
const seeds = [P.sim.defaultSeed, 7, 1234];
const D = P.levers.detents, TIER = P.levers.supplyTiers, FR = P.levers.frames;

function score(schedule){
  let worst = Infinity, fails = null, n = 12;
  for (const seed of seeds){
    const st = WARD.runRounds(schedule, { seed });
    const rep = WARD.outcomeReport(st);
    const eleven = rep.filter((_,i)=>i!==DEAN);
    const good = eleven.filter(r=>r.good).length;
    // margin: how far the worst of the eleven is from the good threshold
    const margin = Math.min(...eleven.map(r=>Math.min(r.final, r.meanLate)
      - (r.good ? 0 : 0) - P.outcome.goodFinalStability));
    if (good < n || (good === n && margin < worst)){ n = Math.min(n, good); }
    if (margin < worst){ worst = margin; fails = eleven.filter(r=>!r.good).map(r=>r.name); }
  }
  return { good: n, margin: worst, fails };
}
const rnd = (rng, a) => a[Math.floor(rng()*a.length)];
function randomSchedule(rng){
  const s = []; let G = 0;
  for (let r=0;r<12;r++){
    // G moves at most one tier per round, so coherence penalties do not dominate
    G = Math.max(0, Math.min(TIER.length-1, G + (rng()<0.30 ? (rng()<0.7?1:-1) : 0)));
    s.push({ E: rnd(rng,D), T: rnd(rng,D), H: rnd(rng,D), G, F: rnd(rng,FR) });
  }
  return s;
}
const rng = WARD.mulberry32(20260819);
let best = null;
const SAMPLES = Number(process.env.SAMPLES || 20000);
for (let i=0;i<SAMPLES;i++){
  const s = randomSchedule(rng), r = score(s);
  if (!best || r.good > best.r.good || (r.good===best.r.good && r.margin>best.r.margin)) best = { s, r };
}
// hill-climb from the best random schedule
for (let it=0; it<6000; it++){
  const s = best.s.map(x=>Object.assign({},x));
  const r0 = Math.floor(rng()*12), k = rnd(rng,["E","T","H","G","F"]);
  const v = k==="G" ? rnd(rng,TIER) : k==="F" ? rnd(rng,FR) : rnd(rng,D);
  if (k==="G"){ for (let r=r0;r<12;r++) s[r].G = v; } else s[r0][k] = v;
  const r = score(s);
  if (r.good > best.r.good || (r.good===best.r.good && r.margin > best.r.margin)) best = { s, r };
}
console.log(`searched ${SAMPLES} random + 6000 hill-climb schedules, ${seeds.length} seeds each`);
console.log(`best: good for ${best.r.good}/11; fails: ${best.r.fails.join(", ")}`);
console.log("schedule (round: E T H G F):");
best.s.forEach((c,i)=>console.log(`  R${String(i+1).padStart(2)}  E${c.E} T${c.T} H${c.H} G${c.G} F${c.F>0?"+1":c.F}`));
const st = WARD.runRounds(best.s, { seed: seeds[0] });
console.table(WARD.outcomeReport(st).map(r=>({...r,final:+r.final.toFixed(1),meanLate:+r.meanLate.toFixed(1)})));
