/* =====================================================================
 * WARD — Region of Alder
 * Build-order steps 1-3: PARAMS, state object, partial-adjustment engine
 * with the fixed evaluation order of §7, and the 40-quarter loop.
 *
 * A model, not a forecast. Every relationship here is simplified;
 * every number is invented.
 *
 * No UI, no rendering, no delayed-effect queue (step 6), no agents
 * (step 7), no media events (step 10). Those are later checkpoints.
 *
 * EVERY coefficient lives in PARAMS below. Nothing numeric outside it.
 *
 * Entries marked [P1]..[P5] are the v2.1 revisions, each documented in
 * place and mirrored into ward-handoff-spec-v2.md:
 *   [P1] §7.8 rewritten as partial adjustment to a target
 *   [P2] the fiscal channel — treatment's political opponent
 *   [P3] riskCost and the Kleg floor
 *   [P4] lever costs doubled so the budget envelope binds
 *   [P5] spec/equation disagreements reconciled
 * ===================================================================== */

(function (root) {
  'use strict';

  /* ===================================================================
   * PARAMS
   * -------------------------------------------------------------------
   * Grouped by the spec section that introduces the coefficient.
   * Entries marked [SPEC] are transcribed verbatim from ward-handoff-
   * spec-v2.md. Entries marked [BUILD] are values the spec requires the
   * engine to have but does not state: initial conditions, and the
   * three closures named in the build notes at the foot of this file.
   * Both kinds are retunable here without touching logic.
   * =================================================================== */

  var PARAMS = {

    /* --- run ------------------------------------------------------- */
    quarters: 40,                        // [SPEC §4.1] ten years

    /* --- initial conditions [BUILD] -------------------------------- */
    init: {
      U0: 84200,                         // prevalence, persons using
      D0: 9140,                          // dependent users
      Dtreat0: 0,
      W0: 21,                            // treatment wait, weeks
      P0: 100,                           // [SPEC §6] price index base
      Phi0: 1.00,                        // [SPEC §6] potency base
      norm0: 1.00,                       // [SPEC §6] normalisation base
      K0: 1.00,                          // [SPEC §7.2] reference capacity
      Kleg0: 0.20,                       // = capacity.legalFloor; licit supply at g=0
      margin0: 1.00,                     // [SPEC §7.1] margin at E=0, g=0, P=100
      trust0: 0.50,
      S0: 0.10,                          // media salience
      budget0: 0,
      incarcerated0: 0,
      records0: 0,
      blocs0: { centre: 52, prog: 50, trad: 44, health: 50 }  // = blocs.base
    },

    /* --- §7.1 price and margin ------------------------------------- */
    price: {
      base: 100,
      enfCoef: 0.55,                     // (1 + 0.55·E)
      regCoef: 0.30,                     // (1 − 0.30·g)
      capacityExp: 0.35,                 // (K0/max(Kill+Kleg,0.2))^0.35
      capacityFloor: 0.20,
      adjust: 0.25,                      // P += 0.25·(P* − P)
      /* [P3] 0.45 -> 0.32. At 0.45 the equilibrium margin under held E=1
         is 0.891, so Kill settles at 0.881 and enforcement permanently
         removes ~12% of illicit capacity — contradicting §7.2's claim
         that level enforcement has no equilibrium effect. 0.32 puts
         equilibrium Kill at 0.991, i.e. the seized capacity comes back
         essentially in full. Costs almost nothing elsewhere: Q8 crime
         under maximum enforcement moves only 129.5 -> 128.4. */
      riskCostCoef: 0.32                 // riskCost = 0.32·E·(1−g)
    },

    /* --- §7.2 illicit / legal capacity ----------------------------- */
    capacity: {
      entryExp: 1.10,                    // Kill* = K0·(margin/margin0)^1.10
      illicitAdjust: 0.22,               // entry/exit lag ≈ 4-6 quarters
      interdictionCoef: 0.34,            // 0.34·max(0,ΔE)·Kill
      illicitFloor: 0.05,
      legalTarget: 1.15,                 // Kleg* = 1.15·g^0.85 + legalFloor
      legalExp: 0.85,
      legalAdjust: 0.14,                 // deliberately slower than 0.22
      /* [P3] Without a floor, Kleg = 0 under prohibition, so
         M = Kill/(Kill+Kleg) is identically 1.000 and the balloon is
         invisible on the variable §7.2 puts it on. A licit supply does
         exist under prohibition — Gareth is on prescribed
         benzodiazepines, Tomas moved to illicit supply *from* a
         prescription. 0.20 gives M a legible sawtooth under enforcement. */
      legalFloor: 0.20,
      shareFloor: 0.05                   // M = Kill/max(Kill+Kleg, 0.05)
    },

    /* --- §7.3 potency and variance --------------------------------- */
    potency: {
      enfCoef: 0.90,                     // Phi* = 1 + 0.90·E·(1−g) − 0.50·g
      regCoef: 0.50,
      adjustUp: 0.20,                    // ratchet: up fast
      adjustDown: 0.08,                  //          down slow
      varBase: 0.25,                     // PhiVar = 0.25·Phi·(1−0.70g)(1−0.40H)
      varRegCoef: 0.70,
      varHarmCoef: 0.40
    },

    /* --- §7.4a norms ----------------------------------------------- */
    norms: {
      regCoef: 0.26,                     // +0.26·g
      contagionCoef: 0.30,               // +0.30·max(0, U/U0 − 1)
      frameCoef: 0.12,                   // −0.12·F
      enfCoef: 0.10,                     // −0.10·E·(1−g)
      adjust: 0.10                       // slowest variable in the model
    },

    /* --- §7.4b initiation and prevalence --------------------------- */
    prevalence: {
      initRate: 0.020,                   // initiation = U0·0.020·…
      epsilonInit: -0.35,                // price elasticity of initiation
      normExp: 0.85,
      arrestDeterrence: 0.22,            // (1 − 0.22·E·(1−g))
      cessationRate: 0.019
    },

    /* --- §7.4c dependence ------------------------------------------ */
    dependence: {
      epsilonQty: -0.12,                 // near-inelastic consumption
      inflowRate: 0.014,                 // inflow = U·0.014·norm^0.4
      inflowNormExp: 0.4,
      treatExitRate: 0.12,               // outflow = Dtreat·R·0.12 + D·0.008
      spontaneousExit: 0.008
    },

    /* --- §7.5 treatment -------------------------------------------- */
    treatment: {
      capacityBase: 20,                  // capacity = 20 + 180·T
      capacityPerT: 180,
      capacityQueue: 4,                  // T enters via a 4-quarter queue
      presentationBase: 0.06,
      waitWeeksPerQuarter: 13,           // exp(−meanDiscount·W/13)
      frameMult: { '-1': 0.60, '0': 1.00, '1': 1.45 },
      regPresentationCoef: 0.25,         // (1 + 0.25·g)
      trustFloor: 0.6, trustCoef: 0.4,   // (0.6 + 0.4·trust)
      waitScale: 40,                     // W* = 40·seeking/max(capacity,1)
      waitAdjust: 0.35,                  // [BUILD] closure A — see notes
      retentionBase: 0.35,               // R = 0.35 + 0.30T + 0.10[F=1] − 0.15[F=−1]
      retentionPerT: 0.30,
      retentionFrameUp: 0.10,
      retentionFrameDown: 0.15,
      retentionMin: 0.10, retentionMax: 0.85,
      dropoutRate: 0.10                  // [BUILD] closure B — see notes
    },

    /* --- §7.6 deaths ----------------------------------------------- */
    deaths: {
      baseRate: 0.012,                   // D_untreated · 0.012
      varRef: 0.25,                      // ·(PhiVar / 0.25)
      harmCoef: 0.55,                    // ·(1 − 0.55·H)
      treatCoef: 0.20                    // ·(1 − 0.20·Dtreat/max(D,1))
    },

    /* --- §7.7 crime, incarceration, records ------------------------ */
    crime: {
      base: 100,
      priceExp: 0.9,
      regCoef: 0.45,                     // (1 − 0.45·g)
      incarcCoef: 0.8, incarcRate: 0.004,
      releaseRate: 0.11,                 // [BUILD] closure C — see notes
      recordsCoef: 0.9, recordsRate: 0.006
    },

    /* --- §7.8 constituencies --------------------------------------- *
     * [P1] Rewritten as partial adjustment toward a target, which is the
     * form §7 uses for every other variable and which §7's opening line
     * requires. As written in the spec the blocs INTEGRATE a flow with no
     * equilibrium, so any sustained condition drives them to 0 or 100 and
     * parks them: under the spec's own Δcentre, held enforcement runs
     * -0.070·(crime-100) = -2.75/quarter for thirty quarters and nothing
     * can arrest it. Every level coefficient below is a target offset in
     * bloc points; the Δ terms that survive are genuine shocks (a lever
     * moved, a coherence breach) and are applied on top.               */
    blocs: {
      weights: { centre: 0.38, prog: 0.24, trad: 0.22, health: 0.16 },
      adjust: 0.15,                      // all four blocs relax at this rate

      /* Bases differ. Objective 4 requires incompatible ideal points: if
         every bloc's target sits at the same neutral base, the moderate
         configuration is near everyone's optimum and Test 7c cannot pass
         at any coefficient setting (verified over a 675-point sweep).
         §3's own header sketch shows CENTRE 44 · PROG 61 · TRAD 22 ·
         HEALTH 58, i.e. a wide spread, so a spread is intended.        */
      base: { centre: 52, prog: 50, trad: 44, health: 50 },

      /* deathsRef is an ASPIRATION, not the status quo. Anchored at the
         achievable baseline instead, the status quo satisfies Progressive
         and Health by construction and objective 4 fails politically. */
      deathsRef: 40,

      centre: { crime: 0.30, deficit: 0.10, tax: 0.34, event: 0.9,
                gesture: 3.5 },
      prog:   { deaths: 0.09, salienceFloor: 0.4, salienceCoef: 0.6,
                records: 0.60, g: 3.0, enf: 14, frame: 9.0, tax: 0.06,
                dG: 0.060, dE: 0.070 },
      trad:   { crime: 0.20, g: 30, harm: 12, frame: 7.0, prevalence: 0.50,
                tax: 0.30, gesture: 4.0, dG: 0.130 },
      health: { deaths: 0.12, wait: 0.20, treat: 10, frame: 6.0, enf: 8,
                tax: 0.07, punitive: 0.060 },
      min: 0, max: 100
    },

    /* --- [P2] the fiscal channel ----------------------------------- *
     * Treatment had no political opponent anywhere in §7.8: no bloc
     * carried a negative T term, so no coefficient could make it cost
     * anything and the moderate-treatment configuration satisfied all
     * four blocs indefinitely. The opponent is fiscal rather than
     * ideological — programme spending is funded from taxation, and the
     * tax burden is felt by the blocs that care about the fiscal
     * position. This also makes §5's budget envelope bind, which it
     * previously never did.                                            */
    tax: {
      sensitivity: 0.50,   // taxBurden* = 1 + 0.50·(spend / perQuarter)
      adjust: 0.12,        // [POL] a tax rise is felt with a lag
      base: 1.00           // index, 1.00 = the status quo take
    },

    /* --- §7.9 trust ------------------------------------------------ */
    trust: {
      consistencyGain: 0.02,             // 0.02·(consistencyQuarters/8)
      consistencyWindow: 8,
      reversalPenalty: 0.06,
      enfPenalty: 0.04,                  // −0.04·E·(1−g)
      min: 0, max: 1
    },

    /* --- §4.1 / §5 budget and lever costs -------------------------- */
    budget: {
      perQuarter: 220,
      /* [P4] Lever costs doubled. At the spec's 40/55/15 every lever at
         maximum costs 110 against an envelope of 220, so the class can
         run maximum treatment, maximum harm reduction and the medicalised
         frame at once and still bank a surplus — Test 3 finished at
         +6,600. Scarcity is meant to be one of the forces creating the
         trade-off and it was not one. Doubled, max-all is exactly 220. */
      enfCost: 80,                       // 80·E
      trtCost: 110,                      // 110·T
      harmCost: 30,                      // 30·H
      regRevenue: 30,                    // −30·g·(U/U0) net
      regSetup: 120,                     // one-off at each tier increase
      /* [BUILD, corrected] 0.9 was mis-scaled by ~45x: the incarcerated
         stock equilibrates near 2,450 under E=1, so 0.9/head charged
         2,200 per quarter against a 220 envelope and drove the maximum-
         enforcement run to -54,801. §5 puts incarceration cost alongside
         40·E, i.e. tens per quarter, not thousands. 0.02 gives ~49. */
      incarcerationUnitCost: 0.02,       // cost per incarcerated head
      deficitFloor: -400,                // beyond which coalition compounds
      deficitPenalty: 0.010              // [BUILD] per 100 below the floor, per bloc
    },

    /* --- §5 coherence ---------------------------------------------- */
    coherence: {
      jumpThreshold: 1,                  // >1 tier in a round
      reversalWindow: 8,                 // quarters
      jumpTrustPenalty: 0.05,
      jumpBlocPenalty: 2.0,
      reversalTrustPenalty: 0.10,
      reversalBlocPenalty: 4.0
    },

    /* --- §12 salience ---------------------------------------------- */
    salience: { decay: 0.75 },

    /* --- §9 the twelve: discountRate only -------------------------- *
     * Step 7 builds the agents. §7.5 needs meanDiscount now, so the
     * discountRate column is declared here. Errol highest, Marek next,
     * per the design functions in §9.                                 */
    twelveDiscountRate: {
      Marek: 0.85, Aisha: 0.55, Dean: 0.40, Ruth: 0.35,
      Callum: 0.70, Nadia: 0.30, Errol: 0.95, Priya: 0.25,
      Tomas: 0.45, Shauna: 0.60, Gareth: 0.35, Lily: 0.20
    }
  };

  /* ===================================================================
   * CALIBRATION — build-order step 2
   * -------------------------------------------------------------------
   * "Nothing else is tuned until this path is sensible."
   *
   * Run under the spec's literal coefficients the passive path is not
   * sensible. Two PARAMS entries are mis-scaled relative to the spec's
   * own initial state; both are demonstrable by arithmetic, not taste.
   * The spec values remain the default above. This overlay is opt-in via
   * withCalibration(), so both paths can be run and compared.
   *
   * (1) dependence.inflowRate 0.014 -> 0.0028
   *     §7.4c: inflow = U·0.014, outflow = Dtreat·R·0.12 + D·0.008,
   *     plus deaths = D_untreated·0.012 at step 8. Total D outflow is
   *     therefore ~0.020·D per quarter, so equilibrium D = U·0.014/0.020
   *     = 0.70·U — 58,900 dependent users out of 84,200 users. The
   *     spec's own initial state has D0/U0 = 0.1086. A stationary
   *     baseline needs 0.1086·0.020 = 0.00217. 0.0028 puts equilibrium
   *     D at 0.14·U, so the passive path drifts from 9,140 to 10,262
   *     dependent users over 40 quarters — which is what produces the
   *     "deaths rise slowly, crime flat, A drifts down, survivable but
   *     poor" floor that Test 1 requires.
   *
   * (2) treatment.capacityBase 20 -> 400, capacityPerT 180 -> 3600
   *     (x20, the 1:9 ratio preserved).
   *     §7.5: W = 40·seeking/capacity. At the spec's initial W0 = 21 and
   *     D0 = 9,140, seeking is 197 presentations, which needs a capacity
   *     of 40·197/21 = 375 to produce W = 21. Capacity of 20 produces
   *     W = 394 weeks. The x20 scale also lifts capacity at T=1 above
   *     the equilibrium treated stock, so that the frame multiplier and
   *     not the ceiling is what determines Dtreat — which is the whole
   *     point of Test 3.
   *
   * Nothing else is retuned. If either number is wrong, it is wrong
   * here and nowhere else.
   * =================================================================== */

  var CALIBRATION = {
    dependence: { inflowRate: 0.0028 },
    treatment: { capacityBase: 400, capacityPerT: 3600 }
  };

  function deepMerge(a, b) {
    var out = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) {
      out[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]))
        ? deepMerge(a[k] || {}, b[k]) : b[k];
    }
    return out;
  }

  function withCalibration(patch) {
    return deepMerge(PARAMS, patch || CALIBRATION);
  }

  /* =================================================================== */

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  function meanDiscount(P) {
    var v = P.twelveDiscountRate, s = 0, n = 0, k;
    for (k in v) if (Object.prototype.hasOwnProperty.call(v, k)) { s += v[k]; n++; }
    return n ? s / n : 0;
  }

  function frameMult(P, F) { return P.treatment.frameMult[String(F)]; }

  /* -------------------------------------------------------------------
   * State object (§6)
   * ----------------------------------------------------------------- */
  function createState(P) {
    P = P || PARAMS;
    var i = P.init;
    var st = {
      q: 0,

      P: i.P0,
      Phi: i.Phi0,
      PhiVar: P.potency.varBase * i.Phi0,
      margin: i.margin0,
      Kill: i.K0,
      Kleg: i.Kleg0,                     // [P3] licit supply exists at g=0
      M: i.K0 / Math.max(i.K0 + i.Kleg0, P.capacity.shareFloor),
      norm: i.norm0,

      U: i.U0,
      D: i.D0,
      Dtreat: i.Dtreat0,
      W: i.W0,
      R: 0,

      deaths: 0,
      deathsPrev: 0,
      deathsCum: 0,

      crime: P.crime.base,
      incarcerated: i.incarcerated0,
      records: i.records0,

      blocs: {
        centre: i.blocs0.centre, prog: i.blocs0.prog,
        trad: i.blocs0.trad, health: i.blocs0.health
      },
      A: 0,
      S: i.S0,
      trust: i.trust0,
      budget: i.budget0,
      taxBurden: P.tax.base,             // [P2]

      forecasts: [],
      people: [],                        // step 7

      /* --- engine bookkeeping, not displayed --------------------- */
      _ref: { U0: i.U0, D0: i.D0, K0: i.K0, margin0: i.margin0 },
      _prevLevers: { E: 0, T: 0, H: 0, G: 0, F: 0 },
      _tQueue: [],                       // §7.5 four-quarter capacity queue
      _consistencyQuarters: 0,
      _gHistory: [],                     // { q, delta } for reversal detection
      _capacity: P.treatment.capacityBase,
      _seeking: 0,
      _qtyIndex: 1,
      _riskCost: 0,
      _interdiction: 0,
      _cost: 0,
      _coherence: { jump: false, reversal: false }
    };
    var w = P.blocs.weights;
    st.A = w.centre * st.blocs.centre + w.prog * st.blocs.prog +
           w.trad * st.blocs.trad + w.health * st.blocs.health;
    var n;
    for (n = 0; n < P.treatment.capacityQueue; n++) st._tQueue.push(0);
    return st;
  }

  /* -------------------------------------------------------------------
   * One quarter. Evaluation order is §7 steps 1-12, in sequence.
   * ----------------------------------------------------------------- */
  function stepQuarter(st, lev, P) {
    P = P || PARAMS;
    var ref = st._ref;
    var E = clamp(lev.E, 0, 1),
        T = clamp(lev.T, 0, 1),
        H = clamp(lev.H, 0, 1),
        G = clamp(lev.G, 0, 4),
        F = lev.F;
    var g = G / 4;
    var prev = st._prevLevers;
    var dE = E - prev.E, dT = T - prev.T, dH = H - prev.H, dG = G - prev.G;

    st.q += 1;

    /* --- coherence (§5), evaluated on the lever change ------------- */
    var coh = { jump: false, reversal: false };
    if (Math.abs(dG) > P.coherence.jumpThreshold) coh.jump = true;
    if (dG !== 0) {
      var k, h;
      for (k = st._gHistory.length - 1; k >= 0; k--) {
        h = st._gHistory[k];
        if (st.q - h.q > P.coherence.reversalWindow) break;
        if (h.delta * dG < 0) { coh.reversal = true; break; }
      }
      st._gHistory.push({ q: st.q, delta: dG });
    }
    st._coherence = coh;

    var anyChange = (dE || dT || dH || dG || (F - prev.F));
    st._consistencyQuarters = anyChange ? 0 :
      Math.min(st._consistencyQuarters + 1, P.trust.consistencyWindow);

    /* ============================================================== *
     * 1. Price and margin (§7.1)
     * -------------------------------------------------------------- *
     * Capacity term uses last quarter's Kill/Kleg: price is evaluated
     * before capacity, per the fixed order.                           */
    var pp = P.price;
    var capTotal = Math.max(st.Kill + st.Kleg, pp.capacityFloor);
    var Pstar = pp.base *
                (1 + pp.enfCoef * E) *
                (1 - pp.regCoef * g) *
                Math.pow(ref.K0 / capTotal, pp.capacityExp);
    st.P += pp.adjust * (Pstar - st.P);

    var riskCost = pp.riskCostCoef * E * (1 - g);
    st.margin = (st.P / pp.base) * (1 - riskCost);
    st._riskCost = riskCost;

    /* ============================================================== *
     * 2. Illicit and legal capacity, then M (§7.2)                    */
    var pc = P.capacity;
    var KillStar = ref.K0 * Math.pow(Math.max(st.margin, 0) / ref.margin0, pc.entryExp);
    st.Kill += pc.illicitAdjust * (KillStar - st.Kill);

    var interdiction = pc.interdictionCoef * Math.max(0, dE) * st.Kill;
    st.Kill -= interdiction;
    st.Kill = Math.max(st.Kill, pc.illicitFloor);
    st._interdiction = interdiction;

    var KlegStar = pc.legalTarget * Math.pow(g, pc.legalExp) + pc.legalFloor;
    st.Kleg += pc.legalAdjust * (KlegStar - st.Kleg);

    st.M = st.Kill / Math.max(st.Kill + st.Kleg, pc.shareFloor);

    /* ============================================================== *
     * 3. Potency and variance (§7.3)                                  */
    var pt = P.potency;
    var PhiStar = 1 + pt.enfCoef * E * (1 - g) - pt.regCoef * g;
    var rising = PhiStar > st.Phi;
    st.Phi += (rising ? pt.adjustUp : pt.adjustDown) * (PhiStar - st.Phi);
    st.PhiVar = pt.varBase * st.Phi * (1 - pt.varRegCoef * g) * (1 - pt.varHarmCoef * H);

    /* ============================================================== *
     * 4. Norms (§7.4a)                                                */
    var pn = P.norms;
    var normStar = 1
      + pn.regCoef * g                                 // [PSY] legality
      + pn.contagionCoef * Math.max(0, st.U / ref.U0 - 1)  // [PSY] contagion
      - pn.frameCoef * F                               // [PSY] framing
      - pn.enfCoef * E * (1 - g);                      // [PSY] deterrent signal
    st.norm += pn.adjust * (normStar - st.norm);

    /* ============================================================== *
     * 5. Prevalence, initiation, dependence inflow (§7.4b, §7.4c)
     *    — excluding death outflow.                                   */
    var pv = P.prevalence;
    var initiation = ref.U0 * pv.initRate
      * Math.pow(st.P / pp.base, pv.epsilonInit)       // [ECO] price-elastic
      * Math.pow(Math.max(st.norm, 0), pv.normExp)     // [PSY] norm-elastic
      * (1 - pv.arrestDeterrence * E * (1 - g));
    var cessation = st.U * pv.cessationRate;
    st.U += initiation - cessation;
    st.U = Math.max(st.U, 0);

    var pd = P.dependence;
    var qtyIndex = Math.pow(st.P / pp.base, pd.epsilonQty);  // [ECO] near-inelastic
    st._qtyIndex = qtyIndex;
    var inflow = st.U * pd.inflowRate * Math.pow(Math.max(st.norm, 0), pd.inflowNormExp);
    var outflow = st.Dtreat * st.R * pd.treatExitRate + st.D * pd.spontaneousExit;
    st.D += inflow - outflow;
    st.D = Math.max(st.D, 0);
    st.Dtreat = Math.min(st.Dtreat, st.D);

    /* ============================================================== *
     * 6. Treatment (§7.5)                                             */
    var tr = P.treatment;
    st._tQueue.push(T);
    var Tlagged = st._tQueue.shift();
    var capacity = tr.capacityBase + tr.capacityPerT * Tlagged;
    st._capacity = capacity;

    var md = meanDiscount(P);
    var presentationRate = tr.presentationBase
      * Math.exp(-md * st.W / tr.waitWeeksPerQuarter)   // [PSY] discounting a delayed place
      * frameMult(P, F)
      * (1 + tr.regPresentationCoef * g)
      * (tr.trustFloor + tr.trustCoef * st.trust);
    var seeking = st.D * presentationRate;
    st._seeking = seeking;

    var Wstar = Math.max(0, tr.waitScale * seeking / Math.max(capacity, 1));
    var Wprev = st.W;
    st.W += tr.waitAdjust * (Wstar - st.W);            // [BUILD] closure A
    st.W = Math.max(0, st.W);

    st.R = clamp(tr.retentionBase + tr.retentionPerT * T
      + (F === 1 ? tr.retentionFrameUp : 0)
      - (F === -1 ? tr.retentionFrameDown : 0),
      tr.retentionMin, tr.retentionMax);

    /* Dtreat stock [BUILD] closure B: admissions limited by free places,
     * exits are completions (§7.4c) plus dropout.                      */
    var admissions = Math.min(seeking, Math.max(0, capacity - st.Dtreat));
    var completions = st.Dtreat * st.R * pd.treatExitRate;
    var dropouts = st.Dtreat * (1 - st.R) * tr.dropoutRate;
    st.Dtreat = clamp(st.Dtreat + admissions - completions - dropouts, 0, st.D);

    /* ============================================================== *
     * 7. Deaths (§7.6), from the post-inflow D                        */
    var dp = P.deaths;
    var DuntreatedPre = Math.max(st.D - st.Dtreat, 0);
    st.deathsPrev = st.deaths;
    st.deaths = DuntreatedPre * dp.baseRate
      * (st.PhiVar / dp.varRef)
      * (1 - dp.harmCoef * H)
      * (1 - dp.treatCoef * st.Dtreat / Math.max(st.D, 1));
    st.deaths = Math.max(0, st.deaths);

    /* ============================================================== *
     * 8. Apply deaths to D (and, from step 7 of the build order, to
     *    the twelve — not yet present).                               */
    st.D = Math.max(0, st.D - st.deaths);
    st.U = Math.max(0, st.U - st.deaths);
    st.Dtreat = Math.min(st.Dtreat, st.D);
    st.deathsCum += st.deaths;

    /* ============================================================== *
     * 9. Crime, incarceration, records (§7.7)                         */
    var cr = P.crime;
    var Duntreated = Math.max(st.D - st.Dtreat, 0);
    st.crime = cr.base * (Duntreated / ref.D0)
      * Math.pow(st.P / pp.base, cr.priceExp)
      * qtyIndex
      * (1 - cr.regCoef * g);

    var incarcIn = cr.incarcCoef * E * st.U * (1 - g) * cr.incarcRate;
    var releases = st.incarcerated * cr.releaseRate;   // [BUILD] closure C
    var incarcPrev = st.incarcerated;
    st.incarcerated = Math.max(0, st.incarcerated + incarcIn - releases);
    var dIncarc = st.incarcerated - incarcPrev;

    var recordsIn = cr.recordsCoef * E * st.U * (1 - g) * cr.recordsRate;
    st.records += recordsIn;                            // cumulative, irreversible

    /* --- budget (§4.1, §5) ---------------------------------------- */
    var bg = P.budget;
    var cost = bg.enfCost * E
      + bg.trtCost * T
      + bg.harmCost * H
      + bg.incarcerationUnitCost * st.incarcerated
      - bg.regRevenue * g * (st.U / ref.U0)
      + (dG > 0 ? bg.regSetup * dG : 0);
    st._cost = cost;
    st.budget += bg.perQuarter - cost;

    /* --- [P2] tax burden ------------------------------------------- *
     * Programme spending is funded from taxation. The burden is an index
     * on the status quo take and is felt with a lag.                   */
    var tx = P.tax;
    var taxStar = tx.base + tx.sensitivity * (Math.max(0, cost) / bg.perQuarter);
    st.taxBurden += tx.adjust * (taxStar - st.taxBurden);
    var taxPts = (st.taxBurden - tx.base) * 100;   // burden in index points

    /* ============================================================== *
     * 10. Constituencies and approval (§7.8)                          */
    var pb = P.blocs;
    var eventImpact = 0;                 // media events are step 10
    var punitiveGesture = 0;             // ditto

    /* [P1] Each bloc has a target; the bloc relaxes toward it. Frame
       terms are symmetric in F — the spec rewarded a bloc's preferred
       frame but never penalised the opposite one, so F cost nobody
       anything. [P5] Progressive gains the F term §7.8's own table
       requires ("hostile to ... moralised frame") and the equation
       omitted. [P2] every bloc carries a tax term. */
    var tCentre = pb.base.centre
      - pb.centre.crime * (st.crime - cr.base)
      - pb.centre.deficit * Math.max(0, -st.budget / 100)
      - pb.centre.tax * taxPts;

    var tProg = pb.base.prog
      + pb.prog.deaths * (pb.deathsRef - st.deaths)
        * (pb.prog.salienceFloor + pb.prog.salienceCoef * st.S)
      - pb.prog.records * (st.records / 1000)
      + pb.prog.g * g
      - pb.prog.enf * E
      + pb.prog.frame * F
      - pb.prog.tax * taxPts;

    var tTrad = pb.base.trad
      - pb.trad.crime * (st.crime - cr.base)
      - pb.trad.g * g
      - pb.trad.harm * H
      - pb.trad.frame * F
      - pb.trad.prevalence * (st.U / ref.U0 - 1) * 100
      - pb.trad.tax * taxPts;

    var tHealth = pb.base.health
      + pb.health.deaths * (pb.deathsRef - st.deaths)
      - pb.health.wait * st.W
      + pb.health.treat * T
      + pb.health.frame * F
      - pb.health.enf * E
      - pb.health.tax * taxPts;

    /* Shocks applied on top of the relaxation: a lever moved (the
       announcement, not the level), and the enforcement gesture that
       §12 says buys Centre and Traditional support immediately. */
    var ad = pb.adjust;
    var dCentre = ad * (tCentre - st.blocs.centre)
      + pb.centre.gesture * Math.max(0, dE) * (1 + st.S)
      - eventImpact * (1 + st.S) * pb.centre.event;
    var dProg = ad * (tProg - st.blocs.prog)
      + pb.prog.dG * dG - pb.prog.dE * dE;
    var dTrad = ad * (tTrad - st.blocs.trad)
      + pb.trad.gesture * Math.max(0, dE) * (1 + st.S)
      - pb.trad.dG * dG;
    var dHealth = ad * (tHealth - st.blocs.health)
      - pb.health.punitive * punitiveGesture;

    /* coherence penalty applies to every constituency (§5) */
    var cohPen = (coh.jump ? P.coherence.jumpBlocPenalty : 0)
               + (coh.reversal ? P.coherence.reversalBlocPenalty : 0);

    /* compounding penalty below the permitted deficit (§5) */
    var deficitPen = 0;
    if (st.budget < bg.deficitFloor) {
      deficitPen = bg.deficitPenalty * ((bg.deficitFloor - st.budget) / 100);
    }

    st.blocs.centre = clamp(st.blocs.centre + dCentre - cohPen - deficitPen, pb.min, pb.max);
    st.blocs.prog   = clamp(st.blocs.prog   + dProg   - cohPen - deficitPen, pb.min, pb.max);
    st.blocs.trad   = clamp(st.blocs.trad   + dTrad   - cohPen - deficitPen, pb.min, pb.max);
    st.blocs.health = clamp(st.blocs.health + dHealth - cohPen - deficitPen, pb.min, pb.max);

    var w = pb.weights;
    st.A = w.centre * st.blocs.centre + w.prog * st.blocs.prog
         + w.trad * st.blocs.trad + w.health * st.blocs.health;

    /* ============================================================== *
     * 11. Trust (§7.9)                                                */
    var tu = P.trust;
    var reversal = (coh.jump || coh.reversal) ? 1 : 0;
    st.trust += tu.consistencyGain * (st._consistencyQuarters / tu.consistencyWindow)
      - tu.reversalPenalty * reversal
      - (coh.jump ? P.coherence.jumpTrustPenalty : 0)
      - (coh.reversal ? P.coherence.reversalTrustPenalty : 0)
      - tu.enfPenalty * E * (1 - g);
    st.trust = clamp(st.trust, tu.min, tu.max);

    /* --- salience decay (§6) --------------------------------------- */
    st.S = st.S * P.salience.decay;

    /* ============================================================== *
     * 12. The twelve (§9) — build-order step 7. Not yet present.      */

    st._prevLevers = { E: E, T: T, H: H, G: G, F: F };
    return st;
  }

  /* -------------------------------------------------------------------
   * 40-quarter loop
   * levers: object {E,T,H,G,F} or function(q, st) -> {E,T,H,G,F}
   * ----------------------------------------------------------------- */
  function run(opts) {
    opts = opts || {};
    var P = opts.params || PARAMS;
    var n = opts.quarters || P.quarters;
    var st = opts.state || createState(P);
    var levers = opts.levers;
    var history = [snapshot(st, { E: 0, T: 0, H: 0, G: 0, F: 0 })];
    var q, lev;
    for (q = 1; q <= n; q++) {
      lev = (typeof levers === 'function') ? levers(q, st) : levers;
      stepQuarter(st, lev, P);
      history.push(snapshot(st, lev));
    }
    return { state: st, history: history, params: P };
  }

  function snapshot(st, lev) {
    return {
      q: st.q,
      E: lev.E, T: lev.T, H: lev.H, G: lev.G, F: lev.F,
      P: st.P, margin: st.margin, Kill: st.Kill, Kleg: st.Kleg, M: st.M,
      Phi: st.Phi, PhiVar: st.PhiVar, norm: st.norm,
      U: st.U, D: st.D, Dtreat: st.Dtreat, W: st.W, R: st.R,
      capacity: st._capacity, seeking: st._seeking,
      deaths: st.deaths, deathsCum: st.deathsCum,
      crime: st.crime, incarcerated: st.incarcerated, records: st.records,
      centre: st.blocs.centre, prog: st.blocs.prog,
      trad: st.blocs.trad, health: st.blocs.health,
      A: st.A, trust: st.trust, budget: st.budget, S: st.S,
      taxBurden: st.taxBurden, cost: st._cost
    };
  }

  var WARD = {
    PARAMS: PARAMS,
    CALIBRATION: CALIBRATION,
    withCalibration: withCalibration,
    deepMerge: deepMerge,
    createState: createState,
    stepQuarter: stepQuarter,
    run: run,
    snapshot: snapshot,
    clamp: clamp,
    meanDiscount: meanDiscount
  };

  root.WARD = WARD;
  if (typeof module !== 'undefined' && module.exports) module.exports = WARD;

})(typeof globalThis !== 'undefined' ? globalThis : this);

/* =====================================================================
 * BUILD NOTES — three closures the spec requires but does not state.
 * All three are PARAMS entries and can be retuned without logic changes.
 *
 * A. treatment.waitAdjust (0.35).
 *    §7.5 gives W = 40·seeking/max(capacity,1) as a level, but seeking
 *    itself depends on W through the discounting term. Taken literally
 *    that is a same-quarter fixed point which oscillates violently at
 *    low capacity. §7's opening line — "all updates are partial
 *    adjustment toward an equilibrium target" — is applied: the stated
 *    expression is the target W*, and W adjusts toward it.
 *
 * B. treatment.dropoutRate (0.10) and the Dtreat stock.
 *    §7.5 computes seeking and capacity; §7.4c takes Dtreat·R·0.12 out
 *    of D. Nothing in the spec says how Dtreat itself moves. Modelled
 *    as: admissions = min(seeking, free places); exits = completions
 *    (the §7.4c term) + dropout of the non-retained.
 *
 * C. crime.releaseRate (0.11).
 *    §7.7 writes "− releases" without defining it. Modelled as a
 *    constant hazard on the incarcerated stock (≈2.3-year mean stay).
 * =================================================================== */
