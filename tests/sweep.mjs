import { WARD } from "./harness.mjs";
const P = WARD.PARAMS;
const seeds = (process.env.SEEDS || String(P.sim.defaultSeed)).split(",").map(Number);
const names = P.person.roster.map(r => r.name);
const DEAN = names.indexOf("Dean");

const rows = [];
for (const E of P.levers.detents)
for (const T of P.levers.detents)
for (const H of P.levers.detents)
for (const G of P.levers.supplyTiers)
for (const F of P.levers.frames){
  const cfg = { E,T,H,G,F };
  // a config passes only if it passes on every seed
  let goodAll = true, goodNoDean = true, blocRun = 0, best = null;
  const perPerson = names.map(() => true);
  for (const seed of seeds){
    const st = WARD.runSim(cfg, { seed });
    const rep = WARD.outcomeReport(st);
    rep.forEach((r,i) => { if (!r.good) perPerson[i] = false; });
    blocRun = Math.max(blocRun, WARD.longestAllBlocRun(st).best);
    const mins = st.history.map(h => Math.min(h.blocs.centre,h.blocs.prog,h.blocs.trad,h.blocs.health));
    const score = Math.max(...mins);
    if (!best || score > best.score){
      const qi = mins.indexOf(score);
      best = { score, q: st.history[qi].q, blocs: st.history[qi].blocs, A: st.history[qi].A };
    }
  }
  goodAll = perPerson.every(Boolean);
  goodNoDean = perPerson.every((v,i) => i === DEAN ? true : v);
  rows.push({ cfg, perPerson, best, nGood: perPerson.filter(Boolean).length,
              nGoodNoDean: perPerson.filter((v,i)=>v&&i!==DEAN).length,
              goodAll, goodNoDean, blocRun });
}

const fmt = c => `E${c.E} T${c.T} H${c.H} G${c.G} F${c.F>0?"+1":c.F}`;
console.log(`configs: ${rows.length}  seeds: ${seeds.join(",")}`);

console.log("\n--- TEST 7 (all twelve) ---");
console.log("configs good for all twelve:", rows.filter(r=>r.goodAll).length);
const best7 = rows.slice().sort((a,b)=>b.nGood-a.nGood).slice(0,5);
for (const r of best7)
  console.log(` ${fmt(r.cfg)}  good ${r.nGood}/12  fails: ${names.filter((n,i)=>!r.perPerson[i]).join(", ")}`);

console.log("\n--- TEST 7b (Dean excluded) ---");
const pass7b = rows.filter(r=>r.goodNoDean);
console.log("configs good for the other eleven:", pass7b.length);
for (const r of pass7b.slice(0,20)) console.log("  PASSES:", fmt(r.cfg));
const best7b = rows.slice().sort((a,b)=>b.nGoodNoDean-a.nGoodNoDean).slice(0,8);
for (const r of best7b)
  console.log(` ${fmt(r.cfg)}  good ${r.nGoodNoDean}/11  fails: ${names.filter((n,i)=>!r.perPerson[i]&&i!==DEAN).join(", ")}`);

console.log("\n--- §9.1 conflicts, each individually sufficient? ---");
for (const [a,b] of [["Callum","Errol"],["Aisha","Tomas"]]){
  const ia=names.indexOf(a), ib=names.indexOf(b);
  const both = rows.filter(r=>r.perPerson[ia]&&r.perPerson[ib]);
  console.log(` ${a} & ${b} both good in ${both.length} configs` +
    (both.length?` e.g. ${both.slice(0,3).map(r=>fmt(r.cfg)).join(" | ")}`:" — conflict is sufficient"));
}
{
  const ip=names.indexOf("Priya"), ic=names.indexOf("Callum");
  const both = rows.filter(r=>r.perPerson[ip]&&r.perPerson[ic]);
  console.log(` Priya & Callum both good in ${both.length} configs` +
    (both.length?` e.g. ${both.slice(0,3).map(r=>fmt(r.cfg)).join(" | ")}`:" — conflict is sufficient"));
}

console.log("\n--- reachability: is each person good in at least one configuration? ---");
names.forEach((n,i)=>{
  const ok = rows.filter(r=>r.perPerson[i]);
  console.log(` ${n.padEnd(7)} good in ${String(ok.length).padStart(4)} configs` +
    (ok.length?`  e.g. ${fmt(ok[0].cfg)}`:"  — NEVER GOOD"));
});

console.log("\n--- TEST 7c (four blocs) ---");
const over = rows.filter(r=>r.blocRun>4);
console.log("configs holding all four blocs >50 for more than 4 consecutive quarters:", over.length);
const bestBloc = rows.slice().sort((a,b)=>b.blocRun-a.blocRun).slice(0,6);
for (const r of bestBloc) console.log(` ${fmt(r.cfg)}  longest all-four-above-50 run: ${r.blocRun}q`);
const byMin = rows.slice().sort((a,b)=>b.best.score-a.best.score).slice(0,5);
console.log(" best-supported configurations, at their strongest quarter:");
for (const r of byMin){
  const b = r.best.blocs;
  const lowest = Object.entries(b).sort((x,y)=>x[1]-y[1])[0];
  console.log(`  ${fmt(r.cfg)} @Q${r.best.q}  centre ${b.centre.toFixed(0)} prog ${b.prog.toFixed(0)} trad ${b.trad.toFixed(0)} health ${b.health.toFixed(0)}  A ${r.best.A.toFixed(0)}  — sacrifices ${lowest[0]} (${lowest[1].toFixed(0)})`);
}
