/* =====================================================================
 * WARD — Region of Alder
 * Build-order steps 1-3, 7 and 8: PARAMS, state object, partial-
 * adjustment engine with the fixed evaluation order of §7, the
 * 40-quarter loop, the twelve named individuals (§9), and the four
 * constituencies with the readings the coalition strip is built from
 * (§7.8, §10).
 *
 * A model, not a forecast. Every relationship here is simplified;
 * every number is invented.
 *
 * No UI, no rendering, no delayed-effect queue (step 6), no media
 * events (step 10). Steps 7 and 8 are present only in their headless
 * parts: the per-person model and the bloc readings, not the portrait
 * moments, the trace bank or the disciplinary lens, all of which need
 * step 4's canvas.
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

    /* --- §9 the twelve: global coefficients ------------------------ *
     * Build-order step 7. Every person's stability is a partial
     * adjustment toward a target, in the form §7 uses for every other
     * variable. The target is the population state filtered through
     * that person's own attributes: base + resilience − their own
     * trajectory + the sum of the weighted channels in `twelve` below.
     * Nothing here is stochastic: the twelve must be reproducible
     * across sections (§11, Test 11), so hazards accumulate rather
     * than being sampled.                                             */
    people: {
      base: 52,                  // baseline target stability, before attributes
      supportCoef: 16,           // + supportCoef·socialSupport — resilience
      adjust: 0.18,              // stability += 0.18·(target − stability)
      min: 0, max: 100,
      bandStable: 70,            // at or above -> `stable`
      bandPrecarious: 45,        // below -> `crisis`
      spillRef: 55,              // §9 Lily's reference for her sibling's trace
      presThreshold: 0.030,      // personal presentation propensity to enter treatment
      treatEntryBand: 60,        // only someone below this presents at all
      presLeaveThreshold: 0.018, // below this an in-treatment person leaves
      recoverQuarters: 6,        // consecutive quarters treated before `recovered`
      recoverRetention: 0.55,    // ... and R must be at least this
      relapseBand: 45,           // §9 `recovered` reverts to `precarious` below this
      hazardBase: 0.012,         // fatal hazard/quarter at riskExposure 1, PhiVar0, H=0
      hazardHarmCoef: 0.55,      // harm reduction on the individual hazard, as §7.6
      hazardCrisis: 2.5,         // hazard multiplier in crisis
      hazardPrecarious: 1.0,
      hazardStable: 0.25,
      hazardTreat: 0.35,         // multiplier while in treatment
      hazardFatal: 1.0,          // accumulated hazard at which the trace goes flat
      recordThresholdE: 0.40,    // §9.1 "any E > 0.4 ..."
      recordQuarters: 8,         // "... sustained for eight quarters" -> a record
      incarcThresholdQ: 6,       // enforcement-exposure quarters before a spell
      incarcQuarters: 4,         // length of a spell
      incarcFloor: 30            // stability target while incarcerated
    },

    /* --- §9 the twelve: attributes and channel weights ------------- *
     * `attrs` are the §9 schema, all 0-1. `w` are stability points at a
     * signal of 1, signed: positive means the signal helps that person.
     * Channels, and the attribute each is filtered through:
     *   treat   T · exp(−discountRate·W/13)      [PSY] discounting a place
     *   queue   max(0, W/W0 − 1) · dr/meanDr     [PSY] the queue deters
     *   harm    H
     *   enf     E·(1−g)
     *   trust   (trust − trust0) · (1 − serviceTrust)
     *   frame   F · stigmaSensitivity
     *   reg     g
     *   price   (P/100 − 1) · incomeDependence
     *   varq    (PhiVar/PhiVar0 − 1) · riskExposure
     *   norm    (norm − 1) · normSensitivity
     *   mkt     (Kill/K0 − 1)
     *   regStep 1 when G >= regStepTier
     *   record  1 once a possession record has been issued
     *   spill   (sibling's stability last quarter − spillRef)
     * `pressure` is the person's own trajectory in the absence of any
     * policy: what the model says about them before the cabinet acts.  */
    twelve: [
      { name: 'Marek', age: 34, state0: 'precarious', stability0: 48,
        pressure: 10, reachable: true, incarcRisk: 0.2, recordRisk: 0.6,
        attrs: { discountRate: 0.85, normSensitivity: 0.35, stigmaSensitivity: 0.40,
                 serviceTrust: 0.60, riskExposure: 0.75, socialSupport: 0.45,
                 incomeDependence: 0.30 },
        w: { treat: 44, queue: -34, harm: 6, enf: -6, trust: 8, frame: 6,
             reg: 2, price: -8, varq: -8, norm: -6, mkt: 0, regStep: 0,
             record: -6, spill: 0 } },

      { name: 'Aisha', age: 19, state0: 'stable', stability0: 72,
        pressure: 4, reachable: false, incarcRisk: 0.1, recordRisk: 0.8,
        attrs: { discountRate: 0.55, normSensitivity: 0.90, stigmaSensitivity: 0.30,
                 serviceTrust: 0.55, riskExposure: 0.35, socialSupport: 0.70,
                 incomeDependence: 0.15 },
        w: { treat: 0, queue: 0, harm: 0, enf: -4, trust: 2, frame: 2,
             reg: -32, price: 3, varq: -6, norm: -90, mkt: 0, regStep: 0,
             record: -10, spill: 0 } },

      { name: 'Dean', age: 27, state0: 'stable', stability0: 60,
        pressure: -6, reachable: false, incarcRisk: 1.0, recordRisk: 0.4,
        attrs: { discountRate: 0.40, normSensitivity: 0.30, stigmaSensitivity: 0.25,
                 serviceTrust: 0.20, riskExposure: 0.70, socialSupport: 0.30,
                 incomeDependence: 0.95 },
        w: { treat: 0, queue: 0, harm: 0, enf: -8, trust: 0, frame: 0,
             reg: -30, price: 22, varq: 0, norm: 4, mkt: 30, regStep: -25,
             record: -8, spill: 0 }, regStepTier: 3 },

      { name: 'Ruth', age: 52, state0: 'precarious', stability0: 55,
        pressure: 9, reachable: true, incarcRisk: 0, recordRisk: 0.1,
        attrs: { discountRate: 0.35, normSensitivity: 0.25, stigmaSensitivity: 0.95,
                 serviceTrust: 0.35, riskExposure: 0.55, socialSupport: 0.55,
                 incomeDependence: 0.25 },
        w: { treat: 20, queue: -12, harm: 4, enf: -5, trust: 6, frame: 34,
             reg: 4, price: -4, varq: -5, norm: -4, mkt: 0, regStep: 0,
             record: -6, spill: 0 } },

      { name: 'Callum', age: 16, state0: 'precarious', stability0: 66,
        pressure: 20, reachable: false, incarcRisk: 0.2, recordRisk: 0.9,
        attrs: { discountRate: 0.70, normSensitivity: 0.95, stigmaSensitivity: 0.45,
                 serviceTrust: 0.50, riskExposure: 0.45, socialSupport: 0.65,
                 incomeDependence: 0.10 },
        w: { treat: 0, queue: 0, harm: 0, enf: 34, trust: 2, frame: 0,
             reg: -12, price: 10, varq: -5, norm: -40, mkt: 0, regStep: 0,
             record: -10, spill: 0 } },

      { name: 'Nadia', age: 41, state0: 'recovered', stability0: 58,
        pressure: 8, reachable: true, incarcRisk: 0, recordRisk: 0.2,
        attrs: { discountRate: 0.30, normSensitivity: 0.40, stigmaSensitivity: 0.60,
                 serviceTrust: 0.65, riskExposure: 0.50, socialSupport: 0.60,
                 incomeDependence: 0.25 },
        w: { treat: 26, queue: -16, harm: 3, enf: -5, trust: 24, frame: 6,
             reg: 0, price: -4, varq: -5, norm: -8, mkt: 0, regStep: 0,
             record: -6, spill: 0 } },

      { name: 'Errol', age: 38, state0: 'crisis', stability0: 30,
        pressure: 16, reachable: false, incarcRisk: 0.6, recordRisk: 0.7,
        attrs: { discountRate: 0.95, normSensitivity: 0.30, stigmaSensitivity: 0.55,
                 serviceTrust: 0.10, riskExposure: 0.95, socialSupport: 0.10,
                 incomeDependence: 0.35 },
        w: { treat: 0, queue: 0, harm: 44, enf: -34, trust: 22, frame: 3,
             reg: 6, price: -8, varq: -12, norm: 0, mkt: 0, regStep: 0,
             record: -6, spill: 0 } },

      { name: 'Priya', age: 23, state0: 'stable', stability0: 78,
        pressure: 0, reachable: false, incarcRisk: 0.05, recordRisk: 1.0,
        attrs: { discountRate: 0.25, normSensitivity: 0.35, stigmaSensitivity: 0.50,
                 serviceTrust: 0.60, riskExposure: 0.20, socialSupport: 0.80,
                 incomeDependence: 0.20 },
        w: { treat: 0, queue: 0, harm: 0, enf: -6, trust: 2, frame: 2,
             reg: 3, price: -2, varq: -3, norm: -4, mkt: 0, regStep: 0,
             record: -40, spill: 0 } },

      { name: 'Tomas', age: 45, state0: 'precarious', stability0: 50,
        pressure: 16, reachable: true, incarcRisk: 0.1, recordRisk: 0.5,
        attrs: { discountRate: 0.45, normSensitivity: 0.25, stigmaSensitivity: 0.45,
                 serviceTrust: 0.40, riskExposure: 0.85, socialSupport: 0.40,
                 incomeDependence: 0.30 },
        w: { treat: 2, queue: -6, harm: 0, enf: -6, trust: 6, frame: 4,
             reg: 30, price: -8, varq: -20, norm: -3, mkt: 0, regStep: 0,
             record: -6, spill: 0 } },

      { name: 'Shauna', age: 30, state0: 'crisis', stability0: 40,
        pressure: 14, reachable: true, incarcRisk: 0.4, recordRisk: 0.7,
        attrs: { discountRate: 0.60, normSensitivity: 0.40, stigmaSensitivity: 0.70,
                 serviceTrust: 0.05, riskExposure: 0.80, socialSupport: 0.20,
                 incomeDependence: 0.55 },
        w: { treat: 10, queue: -8, harm: 14, enf: -18, trust: 40, frame: 8,
             reg: 6, price: -6, varq: -8, norm: 0, mkt: 0, regStep: 0,
             record: -8, spill: 0 } },

      { name: 'Gareth', age: 61, state0: 'precarious', stability0: 52,
        pressure: 10, reachable: true, incarcRisk: 0, recordRisk: 0.1,
        attrs: { discountRate: 0.35, normSensitivity: 0.20, stigmaSensitivity: 0.55,
                 serviceTrust: 0.70, riskExposure: 0.60, socialSupport: 0.35,
                 incomeDependence: 0.20 },
        w: { treat: 24, queue: -10, harm: 4, enf: -3, trust: 8, frame: 12,
             reg: 4, price: -3, varq: -4, norm: -3, mkt: 0, regStep: 0,
             record: -4, spill: 0 } },

      { name: 'Lily', age: 21, state0: 'stable', stability0: 62,
        pressure: 4, reachable: false, incarcRisk: 0, recordRisk: 0,
        attrs: { discountRate: 0.20, normSensitivity: 0.30, stigmaSensitivity: 0.45,
                 serviceTrust: 0.55, riskExposure: 0.10, socialSupport: 0.50,
                 incomeDependence: 0.30 },
        w: { treat: 0, queue: 0, harm: 0, enf: -3, trust: 4, frame: 2,
             reg: 0, price: -2, varq: -4, norm: 0, mkt: 0, regStep: 0,
             record: 0, spill: 0.6 }, sibling: 'Marek' }
    ]
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

  /* §7.5's meanDiscount is the population mean of the twelve's
     discountRate attribute — the one place an individual attribute
     feeds the aggregate model. */
  function meanDiscount(P) {
    var v = P.twelve, s = 0, i;
    for (i = 0; i < v.length; i++) s += v[i].attrs.discountRate;
    return v.length ? s / v.length : 0;
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
      people: createPeople(P),           // §9, build step 7

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
      _coherence: { jump: false, reversal: false },
      _blocTerms: null,                  // §7.8 target decomposition, step 8
      _signals: null                     // §9 population signals, step 7
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
     * 8. Apply deaths to D and to the twelve (§9).                    */
    st.D = Math.max(0, st.D - st.deaths);
    st.U = Math.max(0, st.U - st.deaths);
    st.Dtreat = Math.min(st.Dtreat, st.D);
    st.deathsCum += st.deaths;

    var sig = peopleSignals(st, { E: E, T: T, H: H, G: G, F: F }, P);
    st._signals = sig;
    applyDeathsToTwelve(st, sig, P);

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

    /* [step 8] the target decomposition, kept so the coalition strip and
       §10's election screen can name WHICH term moved a bloc, not merely
       that it moved. Nothing reads back into the model. */
    st._blocTerms = {
      centre: { base: pb.base.centre,
                crime: -pb.centre.crime * (st.crime - cr.base),
                deficit: -pb.centre.deficit * Math.max(0, -st.budget / 100),
                tax: -pb.centre.tax * taxPts },
      prog:   { base: pb.base.prog,
                deaths: pb.prog.deaths * (pb.deathsRef - st.deaths)
                        * (pb.prog.salienceFloor + pb.prog.salienceCoef * st.S),
                records: -pb.prog.records * (st.records / 1000),
                g: pb.prog.g * g, enf: -pb.prog.enf * E,
                frame: pb.prog.frame * F, tax: -pb.prog.tax * taxPts },
      trad:   { base: pb.base.trad,
                crime: -pb.trad.crime * (st.crime - cr.base),
                g: -pb.trad.g * g, harm: -pb.trad.harm * H,
                frame: -pb.trad.frame * F,
                prevalence: -pb.trad.prevalence * (st.U / ref.U0 - 1) * 100,
                tax: -pb.trad.tax * taxPts },
      health: { base: pb.base.health,
                deaths: pb.health.deaths * (pb.deathsRef - st.deaths),
                wait: -pb.health.wait * st.W, treat: pb.health.treat * T,
                frame: pb.health.frame * F, enf: -pb.health.enf * E,
                tax: -pb.health.tax * taxPts }
    };

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
     * 12. The twelve (§9) — build-order step 7.                       */
    updateTwelve(st, sig, P);

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
      taxBurden: st.taxBurden, cost: st._cost,
      people: peopleSnapshot(st),
      blocTerms: st._blocTerms
    };
  }

  /* ===================================================================
   * THE TWELVE (§9) — build-order step 7
   * -------------------------------------------------------------------
   * Population policy is set collectively; consequences render
   * individually. Each person's stability is a partial adjustment
   * toward a target built from the population state filtered through
   * their own attributes. Deterministic throughout: no RNG enters here,
   * so two sections run on the same seed get the same twelve.
   *
   * `discountRate` and `normSensitivity` are load-bearing (§9): the
   * first scales both the treatment-access channel and the queue
   * channel, the second scales the norm channel. Remove either and
   * Marek/Errol and Aisha/Callum stop behaving as §9 describes.
   * =================================================================== */

  function createPeople(P) {
    P = P || PARAMS;
    var out = [], i, d, a;
    for (i = 0; i < P.twelve.length; i++) {
      d = P.twelve[i];
      a = d.attrs;
      out.push({
        name: d.name, age: d.age,
        discountRate: a.discountRate,
        normSensitivity: a.normSensitivity,
        stigmaSensitivity: a.stigmaSensitivity,
        serviceTrust: a.serviceTrust,
        riskExposure: a.riskExposure,
        socialSupport: a.socialSupport,
        incomeDependence: a.incomeDependence,
        stability: d.stability0,
        state: d.state0,
        /* --- bookkeeping ------------------------------------------- */
        _i: i,
        _target: d.stability0,
        _prevStability: d.stability0,
        _hazard: 0,                 // accumulated fatal hazard, terminal at 1
        _record: 0,                 // 1 once a possession record is issued
        _recordQ: 0,                // quarters of E above the §9.1 threshold
        _enfExposure: 0,            // quarters of enforcement exposure
        _incarcLeft: 0,             // quarters left in a spell
        _treatedQ: 0,               // consecutive quarters in treatment
        _pres: 0,                   // personal presentation propensity
        _terminalQ: 0,              // quarter the trace went flat, 0 if alive
        _channels: {}
      });
    }
    return out;
  }

  /* The population signals every person reads, computed once a quarter.
   * Each is expressed as a deviation from the baseline state, so on the
   * passive path every channel is ~0 and the target is attributes only. */
  function peopleSignals(st, lev, P) {
    var ref = st._ref, g = clamp(lev.G, 0, 4) / 4;
    return {
      E: clamp(lev.E, 0, 1), T: clamp(lev.T, 0, 1), H: clamp(lev.H, 0, 1),
      G: clamp(lev.G, 0, 4), g: g, F: lev.F,
      enf: clamp(lev.E, 0, 1) * (1 - g),
      queue: Math.max(0, st.W / P.init.W0 - 1),
      wait: st.W,
      trust: st.trust - P.init.trust0,
      price: st.P / P.price.base - 1,
      varq: st.PhiVar / (P.potency.varBase * P.init.Phi0) - 1,
      norm: st.norm - P.init.norm0,
      mkt: st.Kill / ref.K0 - 1,
      capacityFree: Math.max(0, st._capacity - st.Dtreat),
      R: st.R
    };
  }

  /* Personal presentation propensity — the per-person form of §7.5's
   * population rate, with that person's own discountRate against the
   * queue and their own stigmaSensitivity against the frame. */
  function presentationOf(p, sig, st, P) {
    var tr = P.treatment;
    var frame = Math.pow(frameMult(P, sig.F), p.stigmaSensitivity);
    return tr.presentationBase
      * Math.exp(-p.discountRate * sig.wait / tr.waitWeeksPerQuarter)
      * frame
      * (1 + tr.regPresentationCoef * sig.g)
      * (tr.trustFloor + tr.trustCoef * st.trust)
      * (p.serviceTrust + (1 - p.serviceTrust) * st.trust);
  }

  /* Step 8 of the evaluation order: apply deaths to the twelve. The
   * hazard is the individual form of §7.6 — variance drives fatality,
   * harm reduction is the fastest lever on it — scaled by riskExposure
   * and by how precarious the person currently is. */
  function applyDeathsToTwelve(st, sig, P) {
    var pp = P.people, i, p, mult, haz;
    for (i = 0; i < st.people.length; i++) {
      p = st.people[i];
      if (p.state === 'deceased') continue;
      mult = p.state === 'in-treatment' ? pp.hazardTreat
           : p.stability < pp.bandPrecarious ? pp.hazardCrisis
           : p.stability < pp.bandStable ? pp.hazardPrecarious
           : pp.hazardStable;
      haz = pp.hazardBase * p.riskExposure * (1 - pp.hazardHarmCoef * sig.H)
          * (st.PhiVar / (P.potency.varBase * P.init.Phi0)) * mult;
      p._hazard += haz;
      if (p._hazard >= pp.hazardFatal) {
        p.state = 'deceased';        // terminal and irreversible (§9)
        p.stability = 0;
        p._terminalQ = st.q;
      }
    }
  }

  /* Step 12 of the evaluation order: the twelve. */
  function updateTwelve(st, sig, P) {
    var pp = P.people, md = meanDiscount(P), i, k, p, d, w, c, target, sib;
    var byName = {};
    for (i = 0; i < st.people.length; i++) byName[st.people[i].name] = st.people[i];

    for (i = 0; i < st.people.length; i++) {
      p = st.people[i];
      d = P.twelve[i];
      w = d.w;
      if (p.state === 'deceased') { p._prevStability = p.stability; continue; }

      /* --- §9.1 the record. Cumulative and irreversible, like §7.7's
         aggregate: any E above the threshold, sustained, issues one. */
      if (sig.E > pp.recordThresholdE && d.recordRisk > 0) {
        p._recordQ += 1;
        if (p._recordQ >= pp.recordQuarters) p._record = 1;
      }

      /* --- enforcement exposure and spells ------------------------- */
      if (p._incarcLeft > 0) p._incarcLeft -= 1;
      else if (d.incarcRisk > 0) {
        p._enfExposure += sig.enf * d.incarcRisk;
        if (p._enfExposure >= pp.incarcThresholdQ) {
          p._incarcLeft = pp.incarcQuarters;
          p._enfExposure = 0;
        }
      }

      /* --- channels ------------------------------------------------ */
      sib = d.sibling ? byName[d.sibling] : null;
      c = {
        treat:  w.treat * sig.T * Math.exp(-p.discountRate * sig.wait / P.treatment.waitWeeksPerQuarter),
        queue:  w.queue * sig.queue * (md > 0 ? p.discountRate / md : 0),
        harm:   w.harm * sig.H,
        enf:    w.enf * sig.enf,
        trust:  w.trust * sig.trust * (1 - p.serviceTrust),
        frame:  w.frame * sig.F * p.stigmaSensitivity,
        reg:    w.reg * sig.g,
        price:  w.price * sig.price * p.incomeDependence,
        varq:   w.varq * sig.varq * p.riskExposure,
        norm:   w.norm * sig.norm * p.normSensitivity,
        mkt:    w.mkt * sig.mkt,
        regStep: w.regStep * (d.regStepTier != null && sig.G >= d.regStepTier ? 1 : 0),
        record: w.record * p._record,
        spill:  sib ? w.spill * (sib._prevStability - pp.spillRef) : 0
      };
      p._channels = c;

      target = pp.base + pp.supportCoef * p.socialSupport - d.pressure;
      for (k in c) if (Object.prototype.hasOwnProperty.call(c, k)) target += c[k];
      if (p._incarcLeft > 0) target = pp.incarcFloor;
      target = clamp(target, pp.min, pp.max);
      p._target = target;

      p._prevStability = p.stability;
      p.stability = clamp(p.stability + pp.adjust * (target - p.stability), pp.min, pp.max);

      /* --- presentation and the treated stock ---------------------- */
      p._pres = d.reachable ? presentationOf(p, sig, st, P) : 0;

      /* --- state (§9) ---------------------------------------------- */
      if (p._incarcLeft > 0) { p.state = 'incarcerated'; p._treatedQ = 0; continue; }

      if (p.state === 'in-treatment') {
        if (p._pres < pp.presLeaveThreshold) { p._treatedQ = 0; }
        else p._treatedQ += 1;
      } else if (d.reachable && p._pres >= pp.presThreshold && sig.capacityFree > 0
                 && p.stability < pp.treatEntryBand) {
        p._treatedQ = 1;
      } else {
        p._treatedQ = 0;
      }

      if (p._treatedQ >= pp.recoverQuarters && sig.R >= pp.recoverRetention
          && p.stability >= pp.bandStable) {
        p.state = 'recovered';
        p._treatedQ = 0;
      } else if (p._treatedQ > 0) {
        p.state = 'in-treatment';
      } else if (p.state === 'recovered') {
        /* `recovered` can revert to `precarious` (§9), and only that. */
        p.state = p.stability < pp.relapseBand ? 'precarious' : 'recovered';
      } else {
        p.state = p.stability >= pp.bandStable ? 'stable'
                : p.stability >= pp.bandPrecarious ? 'precarious' : 'crisis';
      }
    }
  }

  function peopleSnapshot(st) {
    var out = [], i, p;
    for (i = 0; i < st.people.length; i++) {
      p = st.people[i];
      out.push({ name: p.name, stability: p.stability, state: p.state,
                 target: p._target, hazard: p._hazard, record: p._record,
                 pres: p._pres });
    }
    return out;
  }

  /* ===================================================================
   * CONSTITUENCIES (§7.8) — build-order step 8, headless part
   * -------------------------------------------------------------------
   * The bloc equations themselves live in stepQuarter, in the fixed
   * evaluation order. What step 8 adds here is what the coalition strip
   * and §10's election screen read: the four readings with the weighted
   * A beside them, and an attribution of a collapse to a bloc, a
   * quarter and a term. No rendering — the strip is a data shape.
   * =================================================================== */

  var LENS = {
    /* §4.3 — which adviser owns which reading. Not a colour, not a
       number: a mapping the disciplinary lens dims against. */
    ECO: ['P', 'margin', 'Kill', 'Kleg', 'M', 'Phi', 'crime', 'budget', 'taxBurden', 'cost'],
    PSY: ['norm', 'W', 'R', 'Dtreat', 'trust', 'U', 'D', 'people'],
    POL: ['centre', 'prog', 'trad', 'health', 'A', 'S', 'incarcerated', 'records']
  };

  function coalitionStrip(st, P) {
    P = P || PARAMS;
    var w = P.blocs.weights, b = st.blocs;
    var names = ['centre', 'prog', 'trad', 'health'], i, weakest = names[0];
    for (i = 1; i < names.length; i++) if (b[names[i]] < b[weakest]) weakest = names[i];
    return {
      blocs: { centre: b.centre, prog: b.prog, trad: b.trad, health: b.health },
      weights: { centre: w.centre, prog: w.prog, trad: w.trad, health: w.health },
      A: st.A,
      weakest: weakest,
      weakestValue: b[weakest],
      terms: st._blocTerms
    };
  }

  /* §10: "You did not lose the country. You lost the Centre, in Q12,
     over crime." Returns the bloc that fell furthest from its own peak,
     the quarter of its steepest single-quarter fall, and the target term
     that moved most against it over that fall. */
  function collapseAttribution(history) {
    var names = ['centre', 'prog', 'trad', 'health'], i, q, h, nm;
    var best = null;
    for (i = 0; i < names.length; i++) {
      nm = names[i];
      var peak = -Infinity, peakQ = 0, fall = 0, fallQ = 0, worstStep = 0, stepQ = 0;
      for (q = 1; q < history.length; q++) {
        h = history[q];
        if (h[nm] > peak) { peak = h[nm]; peakQ = h.q; }
        if (peak - h[nm] > fall) { fall = peak - h[nm]; fallQ = h.q; }
        if (q > 1 && history[q - 1][nm] - h[nm] > worstStep) {
          worstStep = history[q - 1][nm] - h[nm]; stepQ = h.q;
        }
      }
      if (!best || fall > best.fall) {
        best = { bloc: nm, peak: peak, peakQ: peakQ, fall: fall, fallQ: fallQ,
                 steepestQ: stepQ, steepest: worstStep };
      }
    }
    /* §10 wants a term named, not merely a bloc: the caption is "you
       lost the Centre, in Q12, over crime". `over` is the term standing
       furthest against the bloc at the bottom of its worst drawdown —
       the level. `worsened` is the term that moved most against it on
       the way down — the flow. A step change in a lever shows in the
       first and not the second, so both are reported. */
    var at = best ? history[best.fallQ] : null;
    if (at && at.blocTerms) {
      var z = at.blocTerms[best.bloc], k, term = null, worst = 0;
      for (k in z) if (Object.prototype.hasOwnProperty.call(z, k)) {
        if (k !== 'base' && z[k] < worst) { worst = z[k]; term = k; }
      }
      best.over = term;
      best.overPoints = worst;

      var from = history[Math.max(1, best.peakQ)];
      if (from && from.blocTerms) {
        var a = from.blocTerms[best.bloc], drop = 0, moved = null;
        for (k in z) if (Object.prototype.hasOwnProperty.call(z, k)) {
          if (k !== 'base' && (a[k] || 0) - z[k] > drop) { drop = (a[k] || 0) - z[k]; moved = k; }
        }
        best.worsened = moved;
        best.worsenedPoints = drop;
      }
    }
    return best;
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
    createPeople: createPeople,
    peopleSignals: peopleSignals,
    presentationOf: presentationOf,
    updateTwelve: updateTwelve,
    peopleSnapshot: peopleSnapshot,
    LENS: LENS,
    coalitionStrip: coalitionStrip,
    collapseAttribution: collapseAttribution,
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
