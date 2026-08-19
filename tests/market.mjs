import { WARD } from "./harness.mjs";
for (const cfg of [{E:1,T:0,H:0,G:0,F:0},{E:0,T:1,H:0,G:0,F:-1},{E:0,T:0,H:1,G:0,F:0}]){
  const st = WARD.runSim(cfg);
  console.log("cfg", JSON.stringify(cfg));
  console.table(st.history.filter(h=>h.q%4===0).map(h=>({
    q:h.q,P:+h.P.toFixed(1),margin:+h.margin.toFixed(2),Kill:+h.Kill.toFixed(2),
    Kleg:+h.Kleg.toFixed(2),M:+h.M.toFixed(3),Phi:+h.Phi.toFixed(2),PhiVar:+h.PhiVar.toFixed(3),
    W:+h.W.toFixed(1),Dtreat:Math.round(h.Dtreat),deaths:+h.deaths.toFixed(1),
    crime:+h.crime.toFixed(1),A:+h.A.toFixed(1),C:+h.blocs.centre.toFixed(0),
    T_:+h.blocs.trad.toFixed(0),budget:Math.round(h.budget)})));
}
