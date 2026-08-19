import { WARD } from "./harness.mjs";
const cfg = JSON.parse(process.argv[2]);
const st = WARD.runSim(cfg);
console.log(JSON.stringify(cfg), "longest all>50:", WARD.longestAllBlocRun(st).best);
console.table(st.history.filter(h=>h.q%4===0).map(h=>({q:h.q,
  centre:+h.blocs.centre.toFixed(1), prog:+h.blocs.prog.toFixed(1),
  trad:+h.blocs.trad.toFixed(1), health:+h.blocs.health.toFixed(1),
  A:+h.A.toFixed(1), crime:+h.crime.toFixed(1), deaths:+h.deaths.toFixed(1),
  budget:Math.round(h.budget), U:Math.round(h.U)})));
