import { WARD } from "./harness.mjs";
const st = WARD.runSim({ E:0,T:0,H:0,G:0,F:0 });
const rows = st.history.filter(h => h.q % 5 === 0).map(h => ({
  q:h.q, P:+h.P.toFixed(1), Phi:+h.Phi.toFixed(2), M:+h.M.toFixed(2),
  norm:+h.norm.toFixed(3), U:Math.round(h.U), D:Math.round(h.D),
  Dtreat:Math.round(h.Dtreat), W:+h.W.toFixed(1), deaths:+h.deaths.toFixed(1),
  crime:+h.crime.toFixed(1), A:+h.A.toFixed(1), trust:+h.trust.toFixed(2),
  budget:Math.round(h.budget),
  C:+h.blocs.centre.toFixed(0), P_:+h.blocs.prog.toFixed(0),
  T_:+h.blocs.trad.toFixed(0), H_:+h.blocs.health.toFixed(0),
}));
console.table(rows);
console.table(WARD.outcomeReport(st).map(r=>({...r, final:+r.final.toFixed(1), meanLate:+r.meanLate.toFixed(1)})));
