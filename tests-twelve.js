/* =====================================================================
 * WARD — acceptance tests 7, 7b and 7c
 *
 * Build-order steps 7 (the twelve) and 8 (the constituencies) have a
 * single verifiable output between them, and it is the sweep: §9's
 * "no configuration produces good outcomes for all twelve", §9.1's
 * revision of it with Dean excluded, and §7.8's parallel constraint on
 * the four blocs.
 *
 * Headless. Runs in the browser via harness-twelve.html, or in node:
 *   node tests-twelve.js
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
   * the simulation. What counts as a "good ten-year outcome" is a test
   * definition, and §9 does not state one, so it is stated here where a
   * retune can find it.
   * =================================================================== */

  var THRESHOLDS = {
    goodStability: 60,          // stability at or above this...
    badStates: ['crisis', 'deceased', 'incarcerated'],   // ...and not in one of these
    horizon: 40,                // §4.1 ten years
    /* Judged over the final round (§4.1 round 12 = Q37-Q40), not at Q40
       alone. An endpoint-only reading rewards a terminal gesture: four
       quarters of maximum enforcement in the last round lift Callum
       over the line while Priya's record, which needs eight quarters to
       be issued, never arrives. That is an artefact of where the
       measurement is taken, not a policy that protected anyone for ten
       years. */
    goodWindow: 4,

    /* The coarse grid of §14 Test 7. Same 675 points as Test 7c, so the
       humane and the political constraints are read off one sweep. */
    grid: { E: [0, 0.25, 0.5, 0.75, 1], T: [0, 0.5, 1], H: [0, 0.5, 1],
            G: [0, 1, 2, 3, 4], F: [-1, 0, 1] },

    blocFloor: 50,              // §7.8 "all four blocs above 50"...
    blocStreak: 4,              // ...for more than four consecutive quarters
    blocNearMiss: 40,           // the constraint should be approached, not remote

    /* §14 Test 7 says "sweep", and a sweep of held settings is not the
       whole lever space: the levers move by round (§4.1). A seeded
       hill-climb over 12-round plans is the cheapest available check
       that the constraint is not an artefact of holding the levers
       still. Deterministic — same restarts, same steps, same result. */
    searchSeed: 20260819,
    searchRestarts: 24,
    searchSteps: 400,

    /* §9.1's three conflicts. Each must be individually sufficient: on
       its own, it must rule out every configuration in the grid. The
       test of "sufficient" is that no configuration gives BOTH members
       of the pair a good outcome. */
    conflicts: [
      { pair: ['Callum', 'Errol'],
        over: 'E — prohibition and arrest risk suppress Callum; Errol is reachable ' +
              'only by H and by the trust heavy enforcement destroys' },
      { pair: ['Aisha', 'Tomas'],
        over: 'G — regulated supply collapses PhiVar and saves Tomas; the same ' +
              'regime raises norm and reaches Aisha' },
      { pair: ['Priya', 'Callum'],
        over: 'E — any sustained E above the record threshold gives Priya a record, ' +
              'and Callum is the person that same enforcement protects' }
    ]
  };

  function r0(x) { return Math.round(x); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }

  function isGood(p, TH) {
    return TH.badStates.indexOf(p.state) < 0 && p.stability >= TH.goodStability;
  }

  /* The same judgement over the final round: no bad state in any of its
     quarters, and a mean stability over the window at the threshold. */
  function isGoodOverWindow(history, name, TH) {
    var q, i, p, sum = 0, n = 0;
    for (q = TH.horizon - TH.goodWindow + 1; q <= TH.horizon; q++) {
      for (i = 0; i < history[q].people.length; i++) {
        p = history[q].people[i];
        if (p.name !== name) continue;
        if (TH.badStates.indexOf(p.state) >= 0) return false;
        sum += p.stability; n++;
      }
    }
    return n > 0 && sum / n >= TH.goodStability;
  }
  function levLabel(l) {
    return 'E=' + l.E + ' T=' + l.T + ' H=' + l.H + ' G=' + l.G + ' F=' + l.F;
  }

  /* One pass over the grid, carrying everything all three tests read. */
  function sweep(P, TH) {
    var g = TH.grid, rows = [], names = [], i;
    for (i = 0; i < P.twelve.length; i++) names.push(P.twelve[i].name);

    g.E.forEach(function (E) { g.T.forEach(function (T) { g.H.forEach(function (H) {
    g.G.forEach(function (G) { g.F.forEach(function (F) {
      var lev = { E: E, T: T, H: H, G: G, F: F };
      var run = W.run({ levers: lev, params: P, quarters: TH.horizon });
      var end = run.history[TH.horizon];
      var good = {}, nGood = 0, nGoodExDean = 0, k, p;
      for (k = 0; k < end.people.length; k++) {
        p = end.people[k];
        good[p.name] = isGoodOverWindow(run.history, p.name, TH);
        if (good[p.name]) { nGood++; if (p.name !== 'Dean') nGoodExDean++; }
      }
      /* the political constraint, read off the same run */
      var streak = 0, longest = 0, peakMin = -Infinity, peakQ = 0, q, h, mn;
      for (q = 1; q <= TH.horizon; q++) {
        h = run.history[q];
        mn = Math.min(h.centre, h.prog, h.trad, h.health);
        if (mn > peakMin) { peakMin = mn; peakQ = q; }
        if (mn > TH.blocFloor) { streak++; if (streak > longest) longest = streak; }
        else streak = 0;
      }
      rows.push({ lev: lev, good: good, people: end.people, end: end,
                  nGood: nGood, nGoodExDean: nGoodExDean,
                  blocStreak: longest, blocPeakMin: peakMin, blocPeakQ: peakQ });
    }); }); }); }); });

    return { rows: rows, names: names };
  }

  /* §4.1's round table: the levers can only move at these boundaries. */
  var ROUNDS = [[1, 2], [3, 4], [5, 7], [8, 10], [11, 13], [14, 16],
                [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40]];

  /* §11's generator, so the search is reproducible. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Hill-climb over per-round lever plans, counting good outcomes among
     the eleven. Returns the best plan found and what it still fails. */
  function roundPlanSearch(P, TH) {
    var g = TH.grid, rnd = mulberry32(TH.searchSeed);
    var keys = ['E', 'T', 'H', 'G', 'F'];
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function leversOf(plan) {
      return function (q) {
        for (var i = 0; i < ROUNDS.length; i++)
          if (q >= ROUNDS[i][0] && q <= ROUNDS[i][1]) return plan[i];
        return plan[plan.length - 1];
      };
    }
    function score(plan) {
      var run = W.run({ levers: leversOf(plan), params: P, quarters: TH.horizon });
      var end = run.history[TH.horizon], n = 0, bad = [], k, p;
      for (k = 0; k < end.people.length; k++) {
        p = end.people[k];
        if (p.name === 'Dean') continue;
        if (isGoodOverWindow(run.history, p.name, TH)) n++;
        else bad.push(p.name + ' (' + Math.round(p.stability) + ', ' + p.state + ')');
      }
      return { n: n, bad: bad };
    }
    var best = null, restart, step, plan, cur, i, key, was, s;
    for (restart = 0; restart < TH.searchRestarts; restart++) {
      plan = [];
      for (i = 0; i < ROUNDS.length; i++)
        plan.push({ E: pick(g.E), T: pick(g.T), H: pick(g.H), G: pick(g.G), F: pick(g.F) });
      cur = score(plan);
      for (step = 0; step < TH.searchSteps; step++) {
        i = Math.floor(rnd() * ROUNDS.length);
        key = keys[Math.floor(rnd() * keys.length)];
        was = plan[i][key];
        plan[i][key] = pick(g[key]);
        s = score(plan);
        if (s.n >= cur.n) cur = s; else plan[i][key] = was;
      }
      if (!best || cur.n > best.n) {
        best = { n: cur.n, bad: cur.bad, plan: JSON.parse(JSON.stringify(plan)) };
      }
    }
    return best;
  }

  /* =================================================================== */

  function suite(P, label, emit) {
    var TH = THRESHOLDS;
    var RESULTS = [];

    /* Step 6's attribution layer is switched off for the sweep. It
       carries a shadow run per lever change, which is what makes the
       amber rule read a real quantity rather than a stipulated one —
       and which costs about six times a bare run. Tests 7/7b/7c read
       ten-year outcomes and never read a chain, and the attribution
       provably changes no state variable, so the sweep and the
       round-plan search run without it. */
    P = W.deepMerge(P, { delayed: { track: false } });
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

    head('PARAMETER SET: ' + label);
    var S = sweep(P, TH), rows = S.rows, names = S.names, i, j, r;
    say('grid: ' + rows.length + ' configurations, held constant to Q' + TH.horizon);
    say('a good ten-year outcome = mean stability >= ' + TH.goodStability +
        ' over the final round (Q' + (TH.horizon - TH.goodWindow + 1) + '-Q' +
        TH.horizon + '), in none of whose quarters the person is in ' +
        TH.badStates.join('/'));

    function bestBy(key, exclude) {
      var best = null;
      for (var k = 0; k < rows.length; k++) {
        if (!best || rows[k][key] > best[key]) best = rows[k];
      }
      return best;
    }
    function failing(row, exclude) {
      var out = [], k, p;
      for (k = 0; k < row.people.length; k++) {
        p = row.people[k];
        if (p.name === exclude) continue;
        if (!row.good[p.name]) out.push(p.name + ' (' + r0(p.stability) + ', ' + p.state + ')');
      }
      return out;
    }

    /* --- TEST 7 ---------------------------------------------------- */
    head('TEST 7 — TWELVE-OUTCOME SWEEP   [' + label + ']');
    say('Required: no configuration produces good outcomes for all twelve.');
    var b7 = bestBy('nGood');
    check('7', 'no configuration is good for all twelve',
          b7.nGood < 12,
          'best is ' + b7.nGood + '/12 at ' + levLabel(b7.lev) +
          ', failing ' + failing(b7, null).join(', '));

    var counts = {};
    for (i = 0; i < names.length; i++) counts[names[i]] = 0;
    for (i = 0; i < rows.length; i++)
      for (j = 0; j < names.length; j++)
        if (rows[i].good[names[j]]) counts[names[j]]++;
    note('7', 'configurations in which each person ends well',
         names.map(function (n) { return n + ' ' + counts[n]; }).join('  '));

    /* --- TEST 7b --------------------------------------------------- */
    head('TEST 7b — SAME SWEEP, DEAN EXCLUDED   [' + label + ']');
    say('Required: no configuration produces good outcomes for the remaining');
    say('eleven, and each of the three §9.1 conflicts is individually');
    say('sufficient to rule out a dominating configuration.');

    var b7b = bestBy('nGoodExDean');
    check('7b', 'no configuration is good for all eleven with Dean excluded',
          b7b.nGoodExDean < 11,
          'best is ' + b7b.nGoodExDean + '/11 at ' + levLabel(b7b.lev) +
          ', failing ' + failing(b7b, 'Dean').join(', '));

    /* The failure must not be carried by one agent standing in for Dean:
       every one of the eleven has to be reachable by SOME configuration,
       or the constraint is guaranteed by an individual again (§9.1). */
    var never = [];
    for (i = 0; i < names.length; i++)
      if (names[i] !== 'Dean' && counts[names[i]] === 0) never.push(names[i]);
    check('7b', 'no single person carries the constraint: each of the eleven ' +
          'ends well under some configuration',
          never.length === 0,
          never.length ? 'never good: ' + never.join(', ')
                       : 'the scarcest is ' + (function () {
                           var m = null;
                           for (var k = 0; k < names.length; k++) {
                             if (names[k] === 'Dean') continue;
                             if (!m || counts[names[k]] < counts[m]) m = names[k];
                           }
                           return m + ', good in ' + counts[m] + ' of ' + rows.length;
                         })());

    for (i = 0; i < TH.conflicts.length; i++) {
      var cf = TH.conflicts[i], both = [], k;
      for (k = 0; k < rows.length; k++)
        if (rows[k].good[cf.pair[0]] && rows[k].good[cf.pair[1]]) both.push(rows[k]);
      check('7b', cf.pair.join(' against ') + ' is individually sufficient',
            both.length === 0,
            both.length === 0
              ? 'no configuration is good for both — ' + cf.over
              : both.length + ' configurations satisfy both, e.g. ' + levLabel(both[0].lev));
    }

    /* The levers move by round; a sweep of held settings is not proof
       about the whole space. The obvious attack is a terminal gesture —
       four quarters of maximum enforcement in the last round lift
       Callum before Priya's record can be issued — which is why the
       outcome is judged over the final round rather than at Q40. */
    var dyn = roundPlanSearch(P, TH);
    check('7b', 'no per-round lever plan reaches all eleven either',
          dyn.n < 11,
          'a seeded hill-climb over ' + TH.searchRestarts + ' restarts x ' +
          TH.searchSteps + ' steps of 12-round plans reaches ' + dyn.n +
          '/11, still failing ' + dyn.bad.join(', '));

    note('7b', 'the closest the eleven get',
         'the four best configurations, by count of good outcomes: ' +
         rows.slice().sort(function (a, b) { return b.nGoodExDean - a.nGoodExDean; })
             .slice(0, 4)
             .map(function (x) { return levLabel(x.lev) + ' -> ' + x.nGoodExDean + '/11'; })
             .join(';  '));

    /* --- TEST 7c --------------------------------------------------- */
    head('TEST 7c — FOUR-BLOC SWEEP   [' + label + ']');
    say('Required: no configuration holds all four blocs above ' + TH.blocFloor);
    say('for more than ' + TH.blocStreak + ' consecutive quarters.');

    var longest = 0, nBreach = 0, bestBloc = null;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (r.blocStreak > longest) longest = r.blocStreak;
      if (r.blocStreak > TH.blocStreak) nBreach++;
      if (!bestBloc || r.blocPeakMin > bestBloc.blocPeakMin) bestBloc = r;
    }
    var be = bestBloc.end;
    var nm = { CENTRE: be.centre, PROG: be.prog, TRAD: be.trad, HEALTH: be.health };
    var sac = 'CENTRE', kk;
    for (kk in nm) if (nm[kk] < nm[sac]) sac = kk;

    check('7c', 'no configuration holds all four blocs above ' + TH.blocFloor +
          ' for more than ' + TH.blocStreak + ' quarters',
          longest <= TH.blocStreak,
          'longest streak across ' + rows.length + ' configurations: ' + longest +
          ' quarters; ' + nBreach + ' configurations exceed ' + TH.blocStreak);
    check('7c', 'the constraint is a visible boundary, not a remote one',
          bestBloc.blocPeakMin > TH.blocNearMiss,
          'best weakest-bloc reading is ' + r1(bestBloc.blocPeakMin) +
          ' (Q' + bestBloc.blocPeakQ + ') at ' + levLabel(bestBloc.lev) +
          '; at Q40 that configuration sacrifices ' + sac + ' at ' + r1(nm[sac]));
    note('7c', 'best configuration at Q40',
         levLabel(bestBloc.lev) + ' -> centre ' + r0(be.centre) + ' prog ' + r0(be.prog) +
         ' trad ' + r0(be.trad) + ' health ' + r0(be.health) + ' A ' + r1(be.A));

    /* --- step 8's other headless outputs --------------------------- */
    head('STEP 8 — COALITION STRIP AND COLLAPSE ATTRIBUTION   [' + label + ']');
    var t5 = W.run({ levers: { E: 0, T: 0, H: 0, G: 4, F: 0 }, params: P });
    var strip = W.coalitionStrip(t5.state, P);
    var att = W.collapseAttribution(t5.history);
    check('8', 'the coalition strip reports four blocs and the weighted A',
          strip && strip.A > 0 && strip.weakest && strip.terms != null,
          'weakest bloc ' + strip.weakest + ' at ' + r1(strip.weakestValue) +
          ', A ' + r1(strip.A));
    check('8', 'a collapse is attributable to a bloc, a quarter and a term (§10)',
          !!(att && att.bloc && att.over),
          'lost ' + att.bloc.toUpperCase() + ' by Q' + att.fallQ + ', ' + r1(att.fall) +
          ' points off its peak, over ' + att.over + ' (' + r1(att.overPoints) +
          ' points of target); the term that moved most on the way down was ' +
          att.worsened + ' (' + r2(att.worsenedPoints) + ')');
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
    return { label: label, results: RESULTS, pass: pass, fail: fail, sweep: S };
  }

  var API = { THRESHOLDS: THRESHOLDS, sweep: sweep, suite: suite,
              isGood: isGood, isGoodOverWindow: isGoodOverWindow };
  root.WARD_TWELVE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof module !== 'undefined' && require.main === module) {
    suite(W.withCalibration(), 'STEP-2 CALIBRATED');
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
