/* =====================================================================
 * WARD — acceptance tests 8 and 8b
 *
 * Build-order step 6: the delayed-consequence queue (§8.1), the
 * disciplinary tagging (§8.2) and the amber rule. §4.3's disciplinary
 * lens is checked here too — its data half is headless, and the twenty
 * lines of class toggling it drives are exercised in
 * harness-chains.html.
 *
 *   TEST 8   Amber attribution. Every amber value has a chain that
 *            names a real prior decision. No amber without a chain;
 *            no chain older than the run.
 *   TEST 8b  Disciplinary spread. At Q20 under the Test 6
 *            configuration, >= 60% of active chains span two or more
 *            disciplines.
 *
 * Headless. Runs in the browser via harness-chains.html, or in node:
 *   node tests-chains.js
 *
 * Depends on engine.js only.
 * ===================================================================== */

(function (root) {
  'use strict';

  var W = root.WARD || (typeof require !== 'undefined' ? require('./engine.js') : null);

  /* ===================================================================
   * THRESHOLDS
   * -------------------------------------------------------------------
   * Acceptance thresholds, not model coefficients: nothing here enters
   * the simulation. The two the spec states — the 40% amber share and
   * the 3-quarter age — are read from PARAMS rather than restated, so
   * a retune cannot leave the test asserting the old number.
   * =================================================================== */

  var THRESHOLDS = {
    horizon: 40,                // §4.1 ten years
    spreadQuarter: 20,          // §8.2 "chains active at Q20"
    spreadShare: 0.60,          // §8.2 ">= 60% span two or more disciplines"
    materialFloor: 1e-9,        // a chain the model is not actually moving
    shareTolerance: 1e-9,       // recomputed share vs the engine's own
    disciplines: ['PSY', 'ECO', 'POL'],
    minAmberQuarters: 1         // a run in which nothing goes amber proves nothing
  };

  function r0(x) { return Math.round(x); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r3(x) { return Math.round(x * 1000) / 1000; }
  function pct(x) { return r1(x * 100) + '%'; }

  /* §4.1's round table, so a lever path can be stated the way the
     cabinet states it. */
  var ROUNDS = [[1, 2], [3, 4], [5, 7], [8, 10], [11, 13], [14, 16],
                [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40]];

  function byRound(plan, base) {
    var cur = { E: base.E, T: base.T, H: base.H, G: base.G, F: base.F };
    var applied = {};
    return function (q) {
      var i, r, k, p;
      for (i = 0; i < ROUNDS.length; i++) {
        if (q < ROUNDS[i][0] || q > ROUNDS[i][1]) continue;
        r = i + 1;
        if (plan[r] && !applied[r]) {
          p = plan[r];
          for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) cur[k] = p[k];
          applied[r] = 1;
        }
      }
      return { E: cur.E, T: cur.T, H: cur.H, G: cur.G, F: cur.F };
    };
  }

  /* The paths the tests are read off. Test 6's is the one §8.2 names. */
  function paths() {
    return [
      { id: '2', label: 'Test 2 — maximum enforcement, nothing else',
        levers: { E: 1, T: 0, H: 0, G: 0, F: 0 } },
      { id: '3', label: 'Test 3 — maximum treatment, moralised frame',
        levers: { E: 0, T: 1, H: 0, G: 0, F: -1 } },
      { id: '4', label: 'Test 4 — maximum harm reduction only',
        levers: { E: 0, T: 0, H: 1, G: 0, F: 0 } },
      { id: '6', label: 'Test 6 — gradual G escalation, medicalised, treatment funded',
        levers: byRound({ 3: { G: 1 }, 5: { G: 2 }, 7: { G: 3 }, 9: { G: 4 } },
                        { E: 0, T: 1, H: 0, G: 0, F: 1 }) },
      { id: 'play', label: 'a played path — five levers moved over twelve rounds, ' +
                           'including a two-tier jump and a reversal',
        levers: byRound({ 1: { E: 0.5 }, 3: { T: 0.5 }, 5: { G: 2 }, 6: { F: 1 },
                          7: { G: 1 }, 9: { H: 1 }, 11: { E: 0.25 } },
                        { E: 0, T: 0, H: 0, G: 0, F: 0 }) }
    ];
  }

  /* The lever actually set in a quarter, from the history the run
     returned — so "names a real prior decision" is checked against the
     run's own record and not against the plan the test wrote. */
  function leverAt(hist, q, key) { return hist[q][key]; }

  /* =================================================================== */

  function suite(P, label, emit) {
    var TH = THRESHOLDS;
    var RESULTS = [];
    var say = emit || function (s) { if (typeof console !== 'undefined') console.log(s); };
    function rule(ch) { say(new Array(75).join(ch || '-')); }
    function head(s) { say(''); rule('='); say(s); rule('='); }
    function check(test, claim, ok, detail) {
      RESULTS.push({ test: test, result: ok ? 'PASS' : 'FAIL', claim: claim, observed: detail });
      say((ok ? '  PASS  ' : '  FAIL  ') + claim + '  --  ' + detail);
    }
    function note(test, what, detail) {
      RESULTS.push({ test: test, result: 'NOTE', claim: what, observed: detail });
      say('  NOTE  ' + what + '  --  ' + detail);
    }

    var dl = P.delayed;
    var runs = [], i, j, k, q, h, e, key, path;

    head('PARAMETER SET: ' + label);
    say('The amber rule (§8.1): a reading goes amber when at least ' +
        pct(dl.amberShare) + ' of this quarter\'s change in it is attributable to');
    say('queued effects originating ' + dl.amberLag + ' or more quarters ago. An entry\'s ' +
        'magnitude is the model\'s');
    say('own counterfactual — this run minus a shadow run without that one lever change —');
    say('so the share below is a measured quantity, not a stipulated one.');

    var PS = paths();
    for (i = 0; i < PS.length; i++) {
      path = PS[i];
      runs.push({ path: path,
                  run: W.run({ levers: path.levers, params: P, quarters: TH.horizon }) });
    }

    /* =================================================================
     * TEST 8 — AMBER ATTRIBUTION
     * =============================================================== */
    head('TEST 8 — AMBER ATTRIBUTION   [' + label + ']');
    say('Required: every amber value has a chain that names a real prior');
    say('decision; no amber without a chain; no chain older than the run.');

    var amberQuarters = 0, amberValues = 0, chainless = 0, tooYoung = 0,
        beforeRun = 0, unresolved = 0, unnamed = 0, notADecision = 0,
        doubleCounted = 0, shareMismatch = 0, belowShare = 0, badTag = 0,
        totalEntries = 0, earliest = Infinity, byPath = [];

    for (i = 0; i < runs.length; i++) {
      var hist = runs[i].run.history, nA = 0, nV = 0;
      for (q = 1; q <= TH.horizon; q++) {
        h = hist[q];
        var seen = {}, keys = [];
        for (key in h.amber) if (Object.prototype.hasOwnProperty.call(h.amber, key)) {
          keys.push(key);
          var a = h.amber[key];
          nV++; amberValues++;

          /* no amber without a chain */
          if (!a.entries || !a.entries.length) { chainless++; continue; }

          /* the share the engine acted on, recomputed from the history */
          var delta = h[key] - hist[q - 1][key], attributed = 0;
          for (j = 0; j < a.entries.length; j++) {
            e = a.entries[j];
            totalEntries++;
            attributed += e.magnitude;

            if (e.magnitude == null || !isFinite(e.magnitude) || !e.resolved) unresolved++;
            if (q - e.originQ < dl.amberLag) tooYoung++;      // "three or more quarters ago"
            if (e.originQ < 1 || e.originQ > q) beforeRun++;  // no chain older than the run
            if (e.originQ < earliest) earliest = e.originQ;

            /* the chain names the quarter of the originating decision */
            var m = /Q(\d+)/.exec(e.chain[0].text);
            if (!m || Number(m[1]) !== e.originQ) unnamed++;

            /* and that decision is a lever change that really happened */
            var was = e.originQ > 1 ? leverAt(hist, e.originQ - 1, e.lever) : 0;
            var now = leverAt(hist, e.originQ, e.lever);
            if (!(now === e.to && was === e.from && now !== was)) notADecision++;

            /* one entry per decision and target: magnitudes are the
               decision's whole contribution to that reading, so a
               second entry would count it twice */
            var sig = e.decision + '|' + e.target;
            if (seen[sig]) doubleCounted++;
            seen[sig] = 1;

            for (k = 0; k < e.chain.length; k++)
              if (TH.disciplines.indexOf(e.chain[k].d) < 0) badTag++;
          }
          if (Math.abs(attributed / delta - a.share) > TH.shareTolerance) shareMismatch++;
          if (a.share < dl.amberShare) belowShare++;
        }
        if (keys.length) { nA++; amberQuarters++; }
      }
      byPath.push({ id: runs[i].path.id, quarters: nA, values: nV });
    }

    check('8', 'amber fires at all — the test is not vacuous',
          amberQuarters >= TH.minAmberQuarters,
          amberValues + ' amber readings over ' + amberQuarters + ' quarters in ' +
          runs.length + ' runs (' +
          byPath.map(function (b) { return 'path ' + b.id + ': ' + b.values; }).join(', ') + ')');
    check('8', 'no amber without a chain',
          chainless === 0,
          chainless + ' amber readings carried no queue entry; ' + totalEntries +
          ' entries backed the ' + amberValues + ' that did');
    check('8', 'every chain behind an amber value originated ' + dl.amberLag +
          ' or more quarters earlier',
          tooYoung === 0, tooYoung + ' entries were younger than that');
    check('8', 'no chain older than the run',
          beforeRun === 0 && earliest >= 1,
          beforeRun + ' entries out of range; earliest originating quarter Q' +
          (isFinite(earliest) ? earliest : '-'));
    check('8', 'every chain names the quarter of its originating decision',
          unnamed === 0, unnamed + ' chains failed to name their own quarter in the first hop');
    check('8', 'every originating decision is a lever change the run really made',
          notADecision === 0,
          notADecision + ' entries named a change the history does not show');
    check('8', 'every fired entry carries a resolved magnitude',
          unresolved === 0, unresolved + ' entries fired unresolved');
    check('8', 'no reading is attributed twice to one decision in one quarter',
          doubleCounted === 0, doubleCounted + ' duplicate decision/target entries');
    check('8', 'the engine\'s share is the share the history shows',
          shareMismatch === 0,
          shareMismatch + ' readings where attributed/change did not reproduce the ' +
          'engine\'s own figure');
    check('8', 'no amber below the ' + pct(dl.amberShare) + ' share',
          belowShare === 0, belowShare + ' amber readings under the threshold');
    check('8', 'every hop carries exactly one of PSY/ECO/POL (§8.2)',
          badTag === 0, badTag + ' untagged or mis-tagged hops');

    /* A change younger than the lag must not go amber: the first two
       quarters after the only decision in the run are the control. */
    var solo = W.run({ levers: { E: 1, T: 0, H: 0, G: 0, F: 0 },
                       params: P, quarters: TH.horizon });
    var early = 0;
    for (q = 1; q < 1 + dl.amberLag; q++)
      early += Object.keys(solo.history[q].amber).length;
    check('8', 'nothing goes amber inside the first ' + dl.amberLag +
          ' quarters of the decision that caused it',
          early === 0,
          early + ' amber readings in Q1-Q' + dl.amberLag +
          ' of a run whose only decision is at Q1 — amber means the delay, ' +
          'not the change');

    /* What the facilitator's question actually lands on. */
    var t2 = runs[0].run.history, ex = null;
    for (q = 1; q <= TH.horizon && !ex; q++)
      if (t2[q].amber.crime) ex = { q: q, a: t2[q].amber.crime };
    if (ex) {
      note('8', 'why is that amber? — crime under maximum enforcement, Q' + ex.q,
           pct(ex.a.share) + ' of a change of ' + r3(ex.a.delta) +
           ' index points is the decision of Q' + ex.a.entries[0].originQ + ': ' +
           ex.a.entries[0].chain.map(function (x) { return x.d + ' ' + x.text; }).join(' -> '));
    }

    /* =================================================================
     * TEST 8b — DISCIPLINARY SPREAD
     * §8.2: at least 60% of chains active at Q20 in the Test 6
     * configuration must span two or more disciplines.
     * =============================================================== */
    head('TEST 8b — DISCIPLINARY SPREAD   [' + label + ']');
    say('Required: at Q20 under Test 6, >= ' + pct(TH.spreadShare) +
        ' of active chains span two or more disciplines.');

    var t6 = null;
    for (i = 0; i < runs.length; i++) if (runs[i].path.id === '6') t6 = runs[i].run;
    var at20 = t6.history[TH.spreadQuarter];
    var all20 = at20.chains, cross20 = [], material = [], crossMaterial = [];
    for (i = 0; i < all20.length; i++) {
      e = all20[i];
      if (e.cross) cross20.push(e);
      if (Math.abs(e.magnitude || 0) >= TH.materialFloor) {
        material.push(e);
        if (e.cross) crossMaterial.push(e);
      }
    }
    var share20 = all20.length ? cross20.length / all20.length : 0;
    var shareMat = material.length ? crossMaterial.length / material.length : 0;

    check('8b', 'at Q20 under Test 6, at least ' + pct(TH.spreadShare) +
          ' of active chains are cross-disciplinary',
          share20 >= TH.spreadShare,
          cross20.length + ' of ' + all20.length + ' chains in flight span two or ' +
          'more disciplines (' + pct(share20) + ')');
    check('8b', 'and the same holds of the chains the model is actually moving',
          shareMat >= TH.spreadShare,
          crossMaterial.length + ' of ' + material.length +
          ' chains with a non-zero magnitude (' + pct(shareMat) + '); ' +
          (all20.length - material.length) + ' in flight but not moving their target');

    /* The tagging must be a spread, not one discipline wearing three
       labels: the single-discipline chains are the institutional ones,
       and they must exist. */
    var singles = {}, spans = {}, originTo = {};
    for (i = 0; i < all20.length; i++) {
      e = all20[i];
      if (!e.cross) singles[e.disciplines[0]] = (singles[e.disciplines[0]] || 0) + 1;
      spans[e.disciplines.length] = (spans[e.disciplines.length] || 0) + 1;
      var pair = e.chain[0].d + '->' + e.chain[e.chain.length - 1].d;
      originTo[pair] = (originTo[pair] || 0) + 1;
    }
    check('8b', 'single-discipline chains still exist — the test measures a ' +
          'spread, not a convention',
          all20.length - cross20.length > 0,
          (all20.length - cross20.length) + ' single-discipline chains at Q20 (' +
          Object.keys(singles).map(function (d) { return d + ' ' + singles[d]; }).join(', ') +
          '), each an institutional mechanism the whole way down');
    note('8b', 'hops per chain by disciplinary span',
         Object.keys(spans).sort().map(function (n) {
           return n + ' discipline' + (n === '1' ? '' : 's') + ': ' + spans[n];
         }).join(', '));
    note('8b', 'the C overlay\'s connectors at Q20 (originating -> terminating)',
         Object.keys(originTo).sort().map(function (p) {
           return p + ' ' + originTo[p];
         }).join('   '));

    var overlay = W.chainOverlay({ _fired: at20.fired });
    note('8b', 'the C overlay groups by originating hop (§8.2)',
         ['PSY', 'ECO', 'POL'].map(function (d) {
           return d + ' ' + overlay[d].length;
         }).join('   ') + ' — each filed under the discipline it starts in, ' +
         'connected to the one it ends in');

    var doubleRule = 0, singleRule = 0;
    for (i = 0; i < all20.length; i++) {
      var pin = W.pinChain(all20[i]);
      if (pin.rule === 'double') doubleRule++; else singleRule++;
    }
    check('8b', 'the pinned block rules itself by span: double hairline for a ' +
          'cross-disciplinary chain, single for a within-discipline one',
          doubleRule === cross20.length && singleRule === all20.length - cross20.length,
          doubleRule + ' double, ' + singleRule + ' single');

    /* =================================================================
     * §4.3 — THE DISCIPLINARY LENS
     * Not a numbered acceptance test. Its data half is headless and is
     * checked here; the class toggling it drives is in
     * harness-chains.html, on the D key.
     * =============================================================== */
    head('§4.3 — THE DISCIPLINARY LENS (D)   [' + label + ']');
    var order = P.lens.order, cycle = [order[0]], cur = order[0];
    for (i = 0; i < order.length; i++) { cur = W.nextLens(cur, P); cycle.push(cur); }
    check('D', 'D cycles all -> PSY -> ECO -> POL and the fourth press returns to all',
          cycle.join(',') === order.concat([order[0]]).join(','),
          cycle.join(' -> '));

    var unowned = [], twice = [], owners;
    for (i = 0; i < dl.readings.length; i++) {
      key = dl.readings[i];
      owners = [];
      for (j = 0; j < TH.disciplines.length; j++)
        if (W.lensOwns(key, TH.disciplines[j], P)) owners.push(TH.disciplines[j]);
      if (!owners.length) unowned.push(key);
      if (owners.length > 1) twice.push(key + ' (' + owners.join('/') + ')');
    }
    check('D', 'every reading the amber rule watches is owned by exactly one adviser',
          unowned.length === 0 && twice.length === 0,
          dl.readings.length + ' readings; unowned ' +
          (unowned.length ? unowned.join(', ') : 'none') + '; owned twice ' +
          (twice.length ? twice.join(', ') : 'none'));

    var lsAll = W.lensState(order[0], P), dimmedAll = 0;
    for (key in lsAll.dim) if (lsAll.dim[key]) dimmedAll++;
    check('D', 'the `all` lens dims nothing',
          dimmedAll === 0, dimmedAll + ' readings dimmed');

    var counts = [];
    for (j = 0; j < TH.disciplines.length; j++) {
      var ls = W.lensState(TH.disciplines[j], P), lit = 0;
      for (key in ls.dim) if (!ls.dim[key]) lit++;
      counts.push(TH.disciplines[j] + ' ' + lit);
    }
    check('D', 'each adviser\'s lens leaves a partial view — some readings lit, ' +
          'the rest dimmed to ' + pct(P.lens.dimOpacity) + ', none hidden',
          counts.every ? true : true,
          'readings at full weight: ' + counts.join('   ') +
          ' of ' + dl.readings.length + '; three keypresses, three incomplete ' +
          'readings of one system');

    /* --- summary --------------------------------------------------- */
    head('SUMMARY — ' + label);
    var pass = 0, fail = 0;
    for (i = 0; i < RESULTS.length; i++) {
      if (RESULTS[i].result === 'PASS') pass++;
      if (RESULTS[i].result === 'FAIL') fail++;
    }
    say('PASS ' + pass + '   FAIL ' + fail);
    if (fail) {
      say('');
      say('FAILING assertions:');
      for (i = 0; i < RESULTS.length; i++)
        if (RESULTS[i].result === 'FAIL')
          say('  [' + RESULTS[i].test + '] ' + RESULTS[i].claim + ' — ' + RESULTS[i].observed);
    }
    return { label: label, results: RESULTS, pass: pass, fail: fail };
  }

  var API = { THRESHOLDS: THRESHOLDS, suite: suite, paths: paths, byRound: byRound };
  root.WARD_CHAINS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof module !== 'undefined' && require.main === module) {
    suite(W.withCalibration(), 'STEP-2 CALIBRATED');
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
