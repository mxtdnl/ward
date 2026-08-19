/* =====================================================================
 * WARD — deferred acceptance tests
 *
 * Tests written now, to be RUN AFTER the build steps they depend on
 * exist. Two open items from the step 1-3 verification:
 *
 *   (a) TEST 5 (§14) does not fell the administration. Under the
 *       immediate G=4 configuration Traditional collapses to ~23 by
 *       Q16, as required, but Centre RISES to ~67 on the instant crime
 *       benefit of regulation, so A holds around 50 and the run
 *       survives. The spec requires it to fall. Three candidate causes
 *       are separated below and each is given its own assertion, so
 *       that whichever fix lands — media events (build step 10), a
 *       coherence penalty that persists, or a lagged crime benefit —
 *       the suite says which one closed the gap and by how much.
 *
 *   (b) Coherence detection (§5) is implemented but untested: it fires
 *       only on lever CHANGES, and tests 1-4 hold levers constant after
 *       Q1. It cannot be exercised properly until rounds exist (§4.1),
 *       because "changing G by more than one tier in a single round" is
 *       a statement about rounds, not quarters. TEST C below is that
 *       dedicated test, written against the §4.1 round table.
 *
 * Every assertion carries one of three statuses:
 *   PASS     — holds now.
 *   FAIL     — should hold now and does not. A regression.
 *   PENDING  — does not hold now BY DESIGN: it is the acceptance
 *              criterion for a build step that has not been built.
 *              `blockedOn` names that step. A PENDING that turns PASS
 *              is the signal the step is complete.
 *
 * Runs in the browser via harness-deferred.html, or in node:
 *   node tests-deferred.js
 *
 * Depends on engine.js only. No UI, no rendering.
 * ===================================================================== */

(function (root) {
  'use strict';

  var W = root.WARD || (typeof require !== 'undefined' ? require('./engine.js') : null);

  /* ===================================================================
   * THRESHOLDS
   * -------------------------------------------------------------------
   * Acceptance thresholds, not model coefficients: nothing here enters
   * the simulation. They live in one object for the same reason PARAMS
   * does — so a retune changes one number in one place. Each says what
   * it gates and where the spec asks for it.
   * =================================================================== */

  var THRESHOLDS = {

    /* --- §10 / §14 Test 5 ----------------------------------------- */
    fallThreshold: 35,          // [SPEC §10] A < 35 at Q16 or Q32 -> falls
    electionQ: 16,              // [SPEC §4.1] round 6 ends at Q16
    election2Q: 32,             // [SPEC §4.1] round 10 ends at Q32
    tradCollapseCeiling: 25,    // Traditional counts as collapsed at or below this
    centreProfitTolerance: 0.5, // Centre may not end Q16 above its own base by more

    /* --- the crime windfall (§7.7) -------------------------------- */
    /* Share of regulation's total crime benefit permitted to land in
       the quarter the tier is set. §7's opening line makes every other
       channel a partial adjustment; the (1 - 0.45·g) term is the only
       instantaneous structural benefit in the model, and it is what
       pays Centre before any cost arrives. */
    crimeInstantShareCeiling: 0.50,
    crimeBenefitWindow: 8,      // quarters over which the total benefit is measured

    /* --- coherence persistence (§5) ------------------------------- */
    /* A coherence penalty is a credibility loss. If it is a one-off
       point deduction it is erased by the blocs' own relaxation at
       PARAMS.blocs.adjust, half-life ~4.3 quarters, so a breach in Q1
       is worth nothing by the Q16 election. These two say how much of
       it must survive to that election for it to be a policy-
       credibility mechanic rather than a rounding error. */
    coherenceResidualQuarters: 8,
    coherenceResidualShare: 0.50,   // share of the initial deduction still present
    coherenceElectionPoints: 2.0,   // A-points the Q1 breach must still cost at Q16

    /* --- TEST C, coherence mechanics ------------------------------ */
    reversalOutsideWindow: 12,  // > PARAMS.coherence.reversalWindow, so clean
    epsilon: 1e-9,
    blocEpsilon: 1e-6
  };

  /* --- §4.1 round table: quarters advanced per cabinet round ------- */
  var ROUNDS = [
    { round: 1,  from: 1,  to: 2 },
    { round: 2,  from: 3,  to: 4 },
    { round: 3,  from: 5,  to: 7 },
    { round: 4,  from: 8,  to: 10 },
    { round: 5,  from: 11, to: 13 },
    { round: 6,  from: 14, to: 16 },   // election
    { round: 7,  from: 17, to: 20 },
    { round: 8,  from: 21, to: 24 },
    { round: 9,  from: 25, to: 28 },
    { round: 10, from: 29, to: 32 },   // election
    { round: 11, from: 33, to: 36 },
    { round: 12, from: 37, to: 40 }    // end
  ];

  function roundOf(q) {
    var i;
    for (i = 0; i < ROUNDS.length; i++) if (q >= ROUNDS[i].from && q <= ROUNDS[i].to) return ROUNDS[i];
    return null;
  }
  function firstQuarterOfRound(r) { return ROUNDS[r - 1].from; }

  /* ===================================================================
   * Runner. run() does not surface the per-quarter coherence flags, so
   * this drives stepQuarter directly and records them alongside the
   * snapshot. byRound() converts a per-round lever plan into the
   * per-quarter lever function the engine takes, which is what makes
   * "more than one tier in a single ROUND" testable.
   * =================================================================== */

  function runQ(levers, P, quarters) {
    var st = W.createState(P);
    var n = quarters || P.quarters;
    var hist = [W.snapshot(st, { E: 0, T: 0, H: 0, G: 0, F: 0 })];
    var coh = [null];
    var q, lev;
    for (q = 1; q <= n; q++) {
      lev = (typeof levers === 'function') ? levers(q, st) : levers;
      W.stepQuarter(st, lev, P);
      hist.push(W.snapshot(st, lev));
      coh.push({ jump: st._coherence.jump, reversal: st._coherence.reversal,
                 trust: st.trust });
    }
    return { state: st, history: hist, coherence: coh, params: P };
  }

  /* plan: { roundNumber: {E,T,H,G,F} } — the settings adopted at that
     round and held until the next entry. Levers hold constant across
     the quarters within a round (§4.1). */
  function byRound(plan, base) {
    var cur = { E: base.E, T: base.T, H: base.H, G: base.G, F: base.F };
    var applied = {};
    return function (q) {
      var r = roundOf(q);
      if (r && plan[r.round] && !applied[r.round]) {
        var k, p = plan[r.round];
        for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) cur[k] = p[k];
        applied[r.round] = true;
      }
      return { E: cur.E, T: cur.T, H: cur.H, G: cur.G, F: cur.F };
    };
  }

  /* Coherence off: the isolation control. Same lever path, penalties
     zeroed, so any difference between the two runs is the penalty and
     nothing else. */
  function withoutCoherence(P) {
    return W.deepMerge(P, { coherence: {
      jumpTrustPenalty: 0, jumpBlocPenalty: 0,
      reversalTrustPenalty: 0, reversalBlocPenalty: 0
    } });
  }

  /* =================================================================== */

  function r0(x) { return Math.round(x); }
  function r2(x) { return Math.round(x * 100) / 100; }
  function r3(x) { return Math.round(x * 1000) / 1000; }

  /* ===================================================================
   * Suite
   * =================================================================== */

  function suite(P, label, emit) {
    var TH = THRESHOLDS;
    var RESULTS = [];
    var say = emit || function (s) { if (typeof console !== 'undefined') console.log(s); };
    function rule(ch) { say(new Array(75).join(ch || '-')); }
    function head(s) { say(''); rule('='); say(s); rule('='); }

    /* blockedOn: naming a build step turns a miss into PENDING rather
       than FAIL. A PENDING that flips to PASS is the completion signal
       for that step. */
    function check(test, claim, ok, detail, blockedOn) {
      var status = ok ? 'PASS' : (blockedOn ? 'PENDING' : 'FAIL');
      RESULTS.push({ test: test, result: status, claim: claim,
                     observed: detail, blockedOn: blockedOn || '' });
      say('  ' + status + (status === 'PASS' ? '     ' : status === 'FAIL' ? '     ' : '  ') +
          claim + '  --  ' + detail + (blockedOn ? '   [blocked on: ' + blockedOn + ']' : ''));
    }
    /* A diagnostic records a measurement without asserting anything.
       It exists so that a retune can be read against the previous run. */
    function note(test, what, detail) {
      RESULTS.push({ test: test, result: 'NOTE', claim: what, observed: detail, blockedOn: '' });
      say('  NOTE   ' + what + '  --  ' + detail);
    }

    var w = P.blocs.weights;
    var BLOCS = ['centre', 'prog', 'trad', 'health'];

    head('PARAMETER SET: ' + label);

    /* =================================================================
     * TEST 5 — immediate jump to G=4 in Q1
     * §14: "Coherence penalty fires, Traditional collapses, A collapses,
     * administration falls at Q16."
     * =============================================================== */
    head('TEST 5 — IMMEDIATE G=4 IN Q1   E=T=H=0, F=0   [' + label + ']');
    say('Required: coherence penalty fires, Traditional collapses,');
    say('A collapses, administration falls at Q16 (A < 35).');
    say('');

    var lev5 = { E: 0, T: 0, H: 0, G: 4, F: 0 };
    var t5 = runQ(lev5, P);
    var t5free = runQ(lev5, withoutCoherence(P));      // isolation control
    var h5 = t5.history;
    var atElec = h5[TH.electionQ];
    var base = P.blocs.base;

    /* --- 5.1 the coherence penalty fires at all ------------------- */
    check(5, 'coherence penalty fires in Q1 (dG = 4 > jumpThreshold ' +
          P.coherence.jumpThreshold + ')',
          t5.coherence[1] && t5.coherence[1].jump === true,
          'Q1 jump=' + (t5.coherence[1] ? t5.coherence[1].jump : 'n/a') +
          ' reversal=' + (t5.coherence[1] ? t5.coherence[1].reversal : 'n/a') +
          ';  blocs -' + P.coherence.jumpBlocPenalty + ', trust -' +
          r3(P.coherence.jumpTrustPenalty + P.trust.reversalPenalty));

    /* --- 5.2 Traditional collapses -------------------------------- */
    check(5, 'Traditional collapses by Q' + TH.electionQ +
          ' (<= ' + TH.tradCollapseCeiling + ')',
          atElec.trad <= TH.tradCollapseCeiling,
          'Q1 ' + r2(h5[1].trad) + ' -> Q' + TH.electionQ + ' ' + r2(atElec.trad) +
          ' -> Q40 ' + r2(h5[40].trad) + '  (base ' + base.trad + ')');

    /* --- 5.3 the headline requirement ----------------------------- */
    check(5, 'administration falls at Q' + TH.electionQ + ': A < ' + TH.fallThreshold,
          atElec.A < TH.fallThreshold,
          'A at Q' + TH.electionQ + ' = ' + r2(atElec.A) + ', short of the fall by ' +
          r2(atElec.A - TH.fallThreshold) + ' points' +
          '  (Q32 ' + r2(h5[TH.election2Q].A) + ', Q40 ' + r2(h5[40].A) + ')',
          'step 10 media events, or a persisting coherence penalty (§5), ' +
          'or a lagged crime benefit (§7.7)');

    /* --- 5.4 the specific blocker: Centre profits ----------------- */
    check(5, 'Centre does not profit from the tier jump',
          atElec.centre <= base.centre + TH.centreProfitTolerance,
          'Centre base ' + base.centre + ' -> Q' + TH.electionQ + ' ' + r2(atElec.centre) +
          ' (+' + r2(atElec.centre - base.centre) + ')' +
          '; crime ' + r2(h5[0].crime) + ' -> ' + r2(atElec.crime) +
          ', tax ' + r3(atElec.taxBurden) + ', budget ' + r0(atElec.budget) +
          ' — Centre cares about crime and the fiscal position (§7.8) and ' +
          'G=4 improves both at once, immediately',
          'step 10 media events, or a lagged crime benefit (§7.7)');

    /* --- 5.5 decomposition: what would have to give --------------- */
    var contrib = {}, i, need = {};
    for (i = 0; i < BLOCS.length; i++) {
      contrib[BLOCS[i]] = w[BLOCS[i]] * atElec[BLOCS[i]];
      /* level this bloc alone would have to reach for A < 35 */
      need[BLOCS[i]] = atElec[BLOCS[i]] - (atElec.A - TH.fallThreshold) / w[BLOCS[i]];
    }
    note(5, 'A decomposition at Q' + TH.electionQ,
         BLOCS.map(function (b) {
           return b + ' ' + r2(atElec[b]) + '×' + w[b] + '=' + r2(contrib[b]);
         }).join('  ') + '   sum A=' + r2(atElec.A));
    note(5, 'gap-closing requirement (each bloc acting alone)',
         BLOCS.map(function (b) {
           return b + '→' + (need[b] < 0 ? 'impossible' : r2(need[b]));
         }).join('  ') +
         '   — Traditional is already at ' + r2(atElec.trad) + ', so no single ' +
         'bloc but Centre can close a ' + r2(atElec.A - TH.fallThreshold) + '-point gap');

    /* --- 5.6 is the coherence penalty still there at the election? -- */
    var cohAt1 = t5free.history[1].A - h5[1].A;          // A-points deducted in Q1
    var cohAtElec = t5free.history[TH.electionQ].A - atElec.A;
    var residualShare = cohAt1 > TH.epsilon ? cohAtElec / cohAt1 : 0;
    check(5, 'the Q1 coherence penalty is still worth >= ' +
          TH.coherenceElectionPoints + ' A-points at Q' + TH.electionQ,
          cohAtElec >= TH.coherenceElectionPoints,
          'penalty costs ' + r2(cohAt1) + ' A-points in Q1 and ' + r2(cohAtElec) +
          ' at Q' + TH.electionQ + ' (' + r0(100 * residualShare) + '% left): the blocs ' +
          'relax toward target at ' + P.blocs.adjust + ', so a one-off deduction has a ' +
          'half-life of ' + r2(Math.log(0.5) / Math.log(1 - P.blocs.adjust)) +
          ' quarters and is spent long before the election',
          'a persisting coherence penalty (§5)');

    /* --- 5.7 the instant crime benefit ---------------------------- */
    var crime0 = h5[0].crime, crimeQ1 = h5[1].crime;
    var crimeMin = crime0, qq;
    for (qq = 1; qq <= TH.crimeBenefitWindow; qq++) crimeMin = Math.min(crimeMin, h5[qq].crime);
    var totalBenefit = crime0 - crimeMin, instantBenefit = crime0 - crimeQ1;
    var instantShare = totalBenefit > TH.epsilon ? instantBenefit / totalBenefit : 1;
    check(5, 'regulation\'s crime benefit is not delivered instantly (<= ' +
          r0(100 * TH.crimeInstantShareCeiling) + '% in the first quarter)',
          instantShare <= TH.crimeInstantShareCeiling,
          'crime ' + r2(crime0) + ' -> ' + r2(crimeQ1) + ' in ONE quarter, floor ' +
          r2(crimeMin) + ' by Q' + TH.crimeBenefitWindow + ': ' +
          r0(100 * instantShare) + '% of the benefit lands in Q1. §7.7\'s ' +
          '(1 - ' + P.crime.regCoef + '·g) is the only structural term in §7 that is ' +
          'not a partial adjustment, and it is what pays Centre before any cost arrives',
          'a lagged crime benefit (§7.7), consistent with §7\'s opening line');

    note(5, 'why the run survives, in one line',
         'Traditional does collapse (' + r2(atElec.trad) + '), but it carries only ' +
         w.trad + ' of A, and Centre (' + w.centre + ') gains ' +
         r2(atElec.centre - base.centre) + ' points on a crime index that goes ' +
         r2(crime0) + ' -> ' + r2(crimeQ1) + ' in the first quarter. ' +
         'Prog ' + r2(atElec.prog) + ' and Health ' + r2(atElec.health) +
         ' barely move. Felling the administration needs a cost that arrives ' +
         'BEFORE Q16 and lands on Centre.');

    /* --- 5.8 regression guard on whatever fix lands --------------- */
    var t1 = runQ({ E: 0, T: 0, H: 0, G: 0, F: 0 }, P);
    var t6 = runQ(byRound({ 3: { G: 1 }, 5: { G: 2 }, 7: { G: 3 }, 9: { G: 4 } },
                          { E: 0, T: 1, H: 0, G: 0, F: 1 }), P);
    check(5, 'GUARD: the passive path (Test 1) still survives to Q40',
          t1.history[TH.electionQ].A >= TH.fallThreshold &&
          t1.history[TH.election2Q].A >= TH.fallThreshold &&
          t1.history[40].A >= TH.fallThreshold,
          'A Q16 ' + r2(t1.history[TH.electionQ].A) + ' / Q32 ' +
          r2(t1.history[TH.election2Q].A) + ' / Q40 ' + r2(t1.history[40].A) +
          ' — whatever fells Test 5 must not fell Test 1');
    check(5, 'GUARD: gradual G escalation (Test 6) survives Q16, "a hard fight"',
          t6.history[TH.electionQ].A >= TH.fallThreshold,
          'A Q16 ' + r2(t6.history[TH.electionQ].A) + ' (trad ' +
          r2(t6.history[TH.electionQ].trad) + ') vs Test 5 ' + r2(atElec.A) +
          ' — §14 Test 6 is "survivable but not comfortable"; the ' +
          'difference between it and Test 5 is coherence, and it must stay visible');

    /* =================================================================
     * TEST C — coherence, dedicated
     * §5: "Changing G by more than one tier in a single round incurs a
     * coherence penalty to trust and to every constituency. Reversing a
     * previous G change within 8 quarters incurs a larger one."
     * =============================================================== */
    head('TEST C — COHERENCE PENALTY, ROUND-AWARE   [' + label + ']');
    say('§5 states the rule in ROUNDS, not quarters, so every path below');
    say('changes levers only at a §4.1 round boundary and holds them for');
    say('the quarters within the round.');
    say('');

    var flat = { E: 0, T: 0, H: 0, G: 0, F: 0 };

    /* --- C1 no false positives ------------------------------------ */
    var c1 = runQ(flat, P);
    var fired1 = 0;
    for (i = 1; i <= 40; i++) if (c1.coherence[i].jump || c1.coherence[i].reversal) fired1++;
    check('C1', 'held levers fire no coherence event in 40 quarters',
          fired1 === 0,
          fired1 + ' events; trust ' + r3(c1.history[1].trust) + ' -> ' +
          r3(c1.history[40].trust) + ' (consistency gain only)');

    /* --- C2 one tier per round is clean --------------------------- */
    var c2 = runQ(byRound({ 2: { G: 1 }, 3: { G: 2 }, 4: { G: 3 }, 5: { G: 4 } }, flat), P);
    var fired2 = 0, firedAt2 = [];
    for (i = 1; i <= 40; i++) if (c2.coherence[i].jump || c2.coherence[i].reversal) {
      fired2++; firedAt2.push(i);
    }
    check('C2', 'one tier per round (G 0->1->2->3->4 over rounds 2-5) is coherent',
          fired2 === 0,
          fired2 + ' events' + (firedAt2.length ? ' at Q' + firedAt2.join(',Q') : '') +
          '; G reaches 4 by Q' + firstQuarterOfRound(5) + ' with no penalty — this is ' +
          'the path §14 Test 6 walks and it must stay clean');

    /* --- C3 a two-tier jump fires once, at the round boundary ----- */
    var jumpRound = 4, jumpQ = firstQuarterOfRound(jumpRound);
    var c3 = runQ(byRound({ 4: { G: 2 } }, flat), P);
    var fired3 = [], jumpOnly = true;
    for (i = 1; i <= 40; i++) if (c3.coherence[i].jump || c3.coherence[i].reversal) {
      fired3.push(i);
      if (c3.coherence[i].reversal) jumpOnly = false;
    }
    check('C3', 'a two-tier change in one round fires exactly once, in the round\'s ' +
          'first quarter',
          fired3.length === 1 && fired3[0] === jumpQ,
          'round ' + jumpRound + ' (Q' + ROUNDS[jumpRound - 1].from + '-Q' +
          ROUNDS[jumpRound - 1].to + '), G 0->2: events at Q' +
          (fired3.length ? fired3.join(',Q') : 'none') +
          ' — the levers hold for the rest of the round, so the penalty is not ' +
          're-charged per quarter');
    check('C3', 'it is classified as a jump, not a reversal',
          jumpOnly && c3.coherence[jumpQ].jump === true,
          'jump=' + c3.coherence[jumpQ].jump + ' reversal=' + c3.coherence[jumpQ].reversal);

    /* --- C4 magnitudes, and who pays ------------------------------ */
    var c3free = runQ(byRound({ 4: { G: 2 } }, flat), withoutCoherence(P));
    var dBloc = {}, allEqual = true, firstD = null;
    for (i = 0; i < BLOCS.length; i++) {
      dBloc[BLOCS[i]] = c3free.history[jumpQ][BLOCS[i]] - c3.history[jumpQ][BLOCS[i]];
      if (firstD === null) firstD = dBloc[BLOCS[i]];
      if (Math.abs(dBloc[BLOCS[i]] - firstD) > TH.blocEpsilon) allEqual = false;
    }
    check('C4', 'the jump penalty lands on EVERY constituency, equally (§5)',
          allEqual && Math.abs(firstD - P.coherence.jumpBlocPenalty) < TH.blocEpsilon,
          BLOCS.map(function (b) { return b + ' -' + r3(dBloc[b]); }).join('  ') +
          '  (PARAMS.coherence.jumpBlocPenalty = ' + P.coherence.jumpBlocPenalty + ')');

    var dTrust3 = c3free.history[jumpQ].trust - c3.history[jumpQ].trust;
    check('C4', 'the jump penalty lands on trust (§5)',
          Math.abs(dTrust3 - P.coherence.jumpTrustPenalty) < TH.blocEpsilon,
          'trust -' + r3(dTrust3) + ' in the jump quarter, isolated against the same ' +
          'lever path with coherence penalties zeroed (PARAMS.coherence.' +
          'jumpTrustPenalty = ' + P.coherence.jumpTrustPenalty + ')');

    /* §7.9's own [policy reversal] term is charged on a JUMP as well as
       on a reversal — engine.js sets `reversal = (jump || reversal)`.
       Isolated by zeroing trust.reversalPenalty alone. */
    var c3noRev = runQ(byRound({ 4: { G: 2 } }, flat),
                       W.deepMerge(P, { trust: { reversalPenalty: 0 } }));
    var dTrustRev = c3noRev.history[jumpQ].trust - c3.history[jumpQ].trust;
    check('C4', 'a jump is charged §7.9\'s [policy reversal] term on top of §5\'s',
          Math.abs(dTrustRev - P.trust.reversalPenalty) < TH.blocEpsilon,
          'total trust cost of a first-ever two-tier jump is ' +
          r3(P.coherence.jumpTrustPenalty + P.trust.reversalPenalty) + ' = §5\'s ' +
          P.coherence.jumpTrustPenalty + ' + §7.9\'s ' + P.trust.reversalPenalty +
          ' (isolated: -' + r3(dTrustRev) + '). The class has reversed nothing; §7.9\'s ' +
          'term reads [policy reversal] and §5\'s rule is a tier jump. This is the one ' +
          'place the two sections overlap — record it as a build choice or split them');

    /* --- C5 reversal inside the window ---------------------------- */
    /* Round 4 (Q8) up one tier, round 5 (Q11) back down: 3 quarters
       apart, inside PARAMS.coherence.reversalWindow. */
    var revQ = firstQuarterOfRound(5);
    var c5 = runQ(byRound({ 4: { G: 1 }, 5: { G: 0 } }, flat), P);
    check('C5', 'reversing a G change within ' + P.coherence.reversalWindow +
          ' quarters fires the reversal',
          c5.coherence[revQ].reversal === true && c5.coherence[revQ].jump === false,
          'up at Q' + jumpQ + ', down at Q' + revQ + ' (' + (revQ - jumpQ) +
          ' quarters): jump=' + c5.coherence[revQ].jump +
          ' reversal=' + c5.coherence[revQ].reversal);

    var c5free = runQ(byRound({ 4: { G: 1 }, 5: { G: 0 } }, flat), withoutCoherence(P));
    var dRevBloc = c5free.history[revQ].trad - c5.history[revQ].trad;
    var dRevTrust = c5free.history[revQ].trust - c5.history[revQ].trust;
    check('C5', 'the reversal penalty is LARGER than the jump penalty (§5)',
          dRevBloc > firstD + TH.blocEpsilon &&
          dRevTrust > dTrust3 + TH.blocEpsilon,
          'reversal: blocs -' + r3(dRevBloc) + ', trust -' + r3(dRevTrust) +
          '   vs jump: blocs -' + r3(firstD) + ', trust -' + r3(dTrust3));

    /* --- C6 reversal outside the window --------------------------- */
    /* Round 4 (Q8) up one tier, round 9 (Q25) back down: 17 quarters
       apart, outside the window. */
    var lateQ = firstQuarterOfRound(9);
    var c6 = runQ(byRound({ 4: { G: 1 }, 9: { G: 0 } }, flat), P);
    check('C6', 'reversing after more than ' + P.coherence.reversalWindow +
          ' quarters is not penalised',
          c6.coherence[lateQ].reversal === false && c6.coherence[lateQ].jump === false,
          'up at Q' + jumpQ + ', down at Q' + lateQ + ' (' + (lateQ - jumpQ) +
          ' quarters apart): jump=' + c6.coherence[lateQ].jump +
          ' reversal=' + c6.coherence[lateQ].reversal +
          ' — a class that changes its mind slowly is not punished for it');

    /* --- C7 does the penalty persist? ----------------------------- */
    var kQ = jumpQ + TH.coherenceResidualQuarters;
    var res0 = c3free.history[jumpQ].trad - c3.history[jumpQ].trad;
    var resK = c3free.history[kQ].trad - c3.history[kQ].trad;
    var share = res0 > TH.epsilon ? resK / res0 : 0;
    check('C7', 'the penalty still costs >= ' + r0(100 * TH.coherenceResidualShare) +
          '% of its initial size ' + TH.coherenceResidualQuarters + ' quarters later',
          share >= TH.coherenceResidualShare,
          'Traditional deduction ' + r3(res0) + ' at Q' + jumpQ + ' -> ' + r3(resK) +
          ' at Q' + kQ + ' (' + r0(100 * share) + '% left). The deduction is a one-off ' +
          'level shock and blocs relax at ' + P.blocs.adjust + '/quarter, so it decays ' +
          'geometrically: (1-' + P.blocs.adjust + ')^' + TH.coherenceResidualQuarters +
          ' = ' + r3(Math.pow(1 - P.blocs.adjust, TH.coherenceResidualQuarters)) +
          '. A credibility loss that evaporates in two rounds does not stop ' +
          'oscillation, which is what §5 says it is for',
          'a persisting coherence penalty (§5)');

    /* --- C8 oscillation must be dominated ------------------------- */
    /* §5: the penalty exists to "stop the class from oscillating". The
       test of that is economic, not mechanical: does a class that
       oscillates end up worse than one that holds? */
    var osc = runQ(byRound({ 3: { G: 2 }, 4: { G: 0 }, 5: { G: 2 }, 6: { G: 0 },
                             7: { G: 2 }, 8: { G: 0 } }, flat), P);
    var hold = runQ(byRound({ 3: { G: 1 }, 4: { G: 2 } }, flat), P);
    check('C8', 'oscillating G is worse at the Q' + TH.electionQ +
          ' election than reaching the same tier and holding',
          osc.history[TH.electionQ].A < hold.history[TH.electionQ].A,
          'oscillator (G 0<->2 every round, rounds 3-8): A ' +
          r2(osc.history[TH.electionQ].A) + ', trust ' +
          r3(osc.history[TH.electionQ].trust) +
          '   holder (G 0->1->2, rounds 3-4): A ' + r2(hold.history[TH.electionQ].A) +
          ', trust ' + r3(hold.history[TH.electionQ].trust));

    /* --- C9 trust is the channel that persists -------------------- */
    var oscFree = runQ(byRound({ 3: { G: 2 }, 4: { G: 0 }, 5: { G: 2 }, 6: { G: 0 },
                                 7: { G: 2 }, 8: { G: 0 } }, flat), withoutCoherence(P));
    note('C9', 'where the oscillation cost actually sits at Q' + TH.electionQ,
         'blocs: A ' + r2(osc.history[TH.electionQ].A) + ' vs ' +
         r2(oscFree.history[TH.electionQ].A) + ' without penalties (' +
         r2(oscFree.history[TH.electionQ].A - osc.history[TH.electionQ].A) + ' points);' +
         '  trust: ' + r3(osc.history[TH.electionQ].trust) + ' vs ' +
         r3(oscFree.history[TH.electionQ].trust) + ' (' +
         r3(oscFree.history[TH.electionQ].trust - osc.history[TH.electionQ].trust) +
         ') — trust holds the loss because §7.9 has no relaxation term, blocs do not ' +
         'because §7.8 does. Any persisting-penalty fix should note that trust ' +
         'already behaves the way §5 wants and the blocs do not');

    /* --- C10 coherence under the Test 5 configuration ------------- */
    check('C10', 'Test 5\'s Q1 G=0->4 is the largest breach the model can produce',
          t5.coherence[1].jump === true &&
          Math.abs((t5free.history[1].trad - t5.history[1].trad) -
                   P.coherence.jumpBlocPenalty) < TH.blocEpsilon,
          'a four-tier jump and a one-tier-over-threshold jump are charged the same ' +
          r3(t5free.history[1].trad - t5.history[1].trad) + ' points: the penalty is ' +
          'a flat rate, not proportional to |dG|. §5 says "more than one tier" ' +
          'without specifying either, so this is a build choice worth stating rather ' +
          'than a defect — but it is the reason a Q1 jump to G=4 costs so little');

    /* --- summary --------------------------------------------------- */
    head('SUMMARY — ' + label);
    var counts = { PASS: 0, FAIL: 0, PENDING: 0, NOTE: 0 };
    for (i = 0; i < RESULTS.length; i++) counts[RESULTS[i].result]++;
    say('PASS ' + counts.PASS + '   FAIL ' + counts.FAIL +
        '   PENDING ' + counts.PENDING + '   (notes ' + counts.NOTE + ')');
    say('');
    say('PENDING assertions are the acceptance criteria for build steps');
    say('that do not exist yet. Re-run after each of the following and');
    say('the ones it fixes should flip to PASS:');
    for (i = 0; i < RESULTS.length; i++) {
      if (RESULTS[i].result === 'PENDING') {
        say('  [' + RESULTS[i].test + '] ' + RESULTS[i].claim);
        say('        blocked on: ' + RESULTS[i].blockedOn);
      }
    }
    if (counts.FAIL) {
      say('');
      say('FAILING assertions are regressions — they should hold now:');
      for (i = 0; i < RESULTS.length; i++) {
        if (RESULTS[i].result === 'FAIL') say('  [' + RESULTS[i].test + '] ' + RESULTS[i].claim);
      }
    }

    return { label: label, results: RESULTS, counts: counts };
  }

  var API = {
    THRESHOLDS: THRESHOLDS,
    ROUNDS: ROUNDS,
    roundOf: roundOf,
    runQ: runQ,
    byRound: byRound,
    withoutCoherence: withoutCoherence,
    suite: suite
  };

  root.WARD_DEFERRED = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  /* Run directly under node. */
  if (typeof module !== 'undefined' && require.main === module) {
    suite(W.withCalibration(), 'STEP-2 CALIBRATED');
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
