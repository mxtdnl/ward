import { WARD } from "./harness.mjs";
const cfg = JSON.parse(process.argv[2]);
const st = WARD.runSim(cfg);
console.log("cfg", JSON.stringify(cfg));
const h = st.history[st.history.length-1];
console.log("Q40 W",h.W.toFixed(1),"norm",h.norm.toFixed(3),"PhiVar",h.PhiVar.toFixed(3),
  "trust",h.trust.toFixed(2),"Kleg",h.Kleg.toFixed(2),"Kill",h.Kill.toFixed(2),
  "deaths",h.deaths.toFixed(0),"crime",h.crime.toFixed(0),"A",h.A.toFixed(0),
  "blocs",JSON.stringify(Object.fromEntries(Object.entries(h.blocs).map(([k,v])=>[k,+v.toFixed(0)]))));
console.table(WARD.outcomeReport(st).map(r=>({...r,final:+r.final.toFixed(1),meanLate:+r.meanLate.toFixed(1)})));
