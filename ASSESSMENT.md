# WARD — repository assessment against ward-handoff-spec-v2.md

Assessed at commit `14a00c6`. Scope: build-order steps 1–11. Steps 12
(counterfactual reveal, endgame, run log export) and 13 (facilitator
controls, rewind, seeding, presets) are excluded as not-yet-built, per
instruction. Where an earlier step depends on something nominally
belonging to 12–13, that dependency is recorded but not counted as a gap.

---

## 1. What is actually in the repository

| File | Lines | Contents |
|---|---|---|
| `engine.js` | 1,986 | `PARAMS`, state, quarter step in §7's fixed order, 40-quarter loop, delayed-consequence queue with disciplinary tagging and the amber rule, the twelve, the four blocs, the lens mapping |
| `harness.html` + inline suite | 469 | Acceptance tests 1, 2, 2b, 3, 4, 8c, 7c |
| `tests-chains.js` / `harness-chains.html` | 528 | Tests 8, 8b, §4.3 lens |
| `tests-deferred.js` / `harness-deferred.html` | 545 | Test 5, coherence penalty |
| `tests-twelve.js` / `harness-twelve.html` | 500 | Tests 7, 7b, 7c |

**There is no `index.html`.** The build target named in `CLAUDE.md` and in
the spec's header does not exist in any form. Nothing in the repository
draws a pixel: no `<canvas>`, no `requestAnimationFrame`, no layout, no
tokens applied beyond the harnesses' own five-line debug stylesheet.

## 2. Build order — status by checkpoint

| # | Checkpoint | Status |
|---|---|---|
| 1 | `PARAMS`, state, engine, 40-quarter loop, §7 order | **Done.** Evaluation order matches §7's twelve steps exactly, including the step-7/step-8 split that removes v1's circularity |
| 2 | Passive-path calibration baseline | **Done, but see §3.1** — passes only under an overlay that is not the shipped default |
| 3 | Market subsystem, Test 2 verified numerically | **Done.** `Kill` sawtooths, `Phi` ratchets monotonically, held `E=1` returns `Kill` to 0.991 against the predicted 0.991 |
| 4 | Trace bank rendering | **Not started** |
| 5 | Aggregate readings and lever bank | **Not started** |
| 6 | Delayed-effect queue, tagging, amber rule | **Done headless.** Queue, chains, tags, amber shares all present as data. The pinned block, the `C` overlay and the double-hairline rule exist as computed structure (`chainOverlay`, `pinChain`) with no renderer |
| 7 | The twelve | **Done headless.** `discountRate` and `normSensitivity` are load-bearing, not decorative. Portrait moments are not implemented — they are step 4 work |
| 8 | Constituencies, coalition strip, lens | **Done headless.** `coalitionStrip` and `lensState` return the right structures; no CSS class toggling exists to consume them |
| 9 | Market schematic, clamp animation, entry thickening | **Not started** |
| 10 | Media events and elections | **Not started.** `eventImpact` is a hardcoded `0` at `engine.js:1104` |
| 11 | Forecast step and calibration panel | **Not started.** `state.forecasts` is an empty array with no question pool, no selection rule, no scoring |

Six of eleven checkpoints in scope are complete; all six are the headless
ones. Every checkpoint that requires rendering is untouched.

---

## 3. Findings, ranked

### 3.1 The source of truth has forked — highest priority

`engine.js` ships two coefficient sets: `PARAMS` (spec-literal) and a
`CALIBRATION` overlay applied through `withCalibration()`. Under the
shipped `PARAMS` defaults, **acceptance Test 1 and Test 3 fail**:

```
TEST 1  FAIL  deaths rise SLOWLY (<2x over 40Q)      ratio 3.51
TEST 1  FAIL  crime flat (within +/-15 index points) Q1 109.22 -> Q40 373.56
TEST 1  FAIL  survivable: A >= 35 at Q16/Q32/Q40     26.99 / 10.43 / 8.90
TEST 3  FAIL  Dtreat stays flat                      moralised 1% vs medicalised 1%
```

Under `withCalibration()` all of these pass and the passive path is the
"survivable to Q40 but poor" floor Test 1 asks for. Every test file
except `harness.html` runs only the calibrated set.

The overlay holds two changes, and they are not the same kind of thing:

- **`treatment.capacityBase` 20→400, `capacityPerT` 180→3600.** This is
  not a new invention — §7.5's own `[v2.1]` note states that 20/180 are
  "mis-scaled by about ×20" and that "400/3600 reproduces `W0 = 21`". The
  spec already says what the value should be; `PARAMS` simply carries the
  superseded one. This is a straight correction.
- **`dependence.inflowRate` 0.014→0.0028.** This is a genuine new
  calibration finding, argued correctly in the engine comment: with total
  `D` outflow ≈ 0.020·D per quarter, the spec's 0.014 puts equilibrium
  `D` at 0.70·U against an initial `D0/U0` of 0.1086. It is not in the
  spec anywhere.

Consequence: an outside reader running the file as shipped sees a model
that fails its own acceptance suite, and `CLAUDE.md`'s "never invent a
coefficient outside `PARAMS`" is technically breached by a second
coefficient object sitting beside it.

### 3.2 Acceptance Test 5 does not pass

Test 5 requires that an immediate jump to `G=4` in Q1 collapses `A` and
fells the administration at Q16. It does not:

```
PENDING  administration falls at Q16: A < 35   A at Q16 = 50.47, short by 15.47
```

Traditional does collapse to 22.71 as specified, but it carries only 0.22
of `A`, while Centre *gains* 14.65 points because §7.7's `(1 − 0.45·g)`
takes crime from 100 to 50.63 **in a single quarter** — 84% of the
benefit in Q1. That term is the only structural term in §7 that is not a
partial adjustment, and it pays Centre before any cost arrives.

The test file diagnoses this well and defers it to three candidate fixes
(media events, a persisting coherence penalty, a lagged crime benefit).
The deferral is honest but it means **a numbered acceptance test is
currently failing**, and the diagnosis points at §7.7 rather than at the
missing step-10 work: a one-quarter crime benefit contradicts §7's own
opening line that all updates are partial adjustment toward a target.

### 3.3 The coherence penalty decays faster than the thing it exists to stop

§5 says the penalty "stops the class from oscillating". Measured:

```
PENDING  penalty still costs >= 50% of its initial size 8 quarters later
         Traditional deduction 2 at Q8 -> 0.545 at Q16 (27% left)
```

Blocs relax toward target at 0.15/quarter, so a one-off level shock has a
half-life of 4.27 quarters — under two cabinet rounds. A class can breach
in round 3 and be fully forgiven by round 5. The test file's own note
observes that `trust` behaves correctly here (§7.9 has no relaxation
term) and the blocs do not.

### 3.4 The round schedule is not in the engine

§4.1's twelve-round table lives in `tests-deferred.js:88` as a local
`ROUNDS` array, not in `PARAMS`. The engine has no concept of a round at
all. Two consequences:

- `CLAUDE.md` requires every numeric constant to live in `PARAMS`; the
  round boundaries are numeric constants of the model, and the coherence
  rule is stated in rounds ("`>1` tier in a round", `engine.js:292`) while
  being detected per-quarter at `engine.js:913`. The two agree only
  because levers happen to hold constant within a round — an invariant
  nothing enforces.
- Steps 10 and 11 both need the schedule (elections at rounds 6 and 10,
  forecasts scored "at the end of the *next* round"). It will have to be
  promoted before either can be built.

### 3.5 Salience is inert, so objective 3 is currently unmechanised

`st.S` decays at 0.75/quarter (`engine.js:1216`) and **nothing raises
it** — the only source is media events (step 10). From `S0 = 0.10`,
salience is under 0.01 by Q9 and effectively zero thereafter. The
Progressive bloc's deaths reward is gated on `(0.4 + 0.6·S)`, so it sits
permanently at its floor, and the Centre/Traditional enforcement-gesture
terms `(1 + S)` are permanently unamplified.

This is expected at this stage — but §7.8 calls the salience gate
"objective 3 made mechanical", and until step 10 lands, objective 3 has
no mechanism in the build. It should be treated as blocking, not
cosmetic.

### 3.6 No seeded RNG exists

§11 requires `mulberry32` seeded from `?seed=`, printed in the header.
There is no RNG in the repository — the model is fully deterministic.
Acceptance Test 11 (seed reproducibility) is therefore currently vacuous
rather than passing. The twelve are generated deterministically
(`engine.js:1286`), which is the right instinct, but the seeding
machinery both step 10 (event draws) and step 11 (question selection)
depend on does not exist. Test 11's second clause — "identical forecast
questions" — cannot be satisfied by anything now present.

### 3.7 Minor: literals outside `PARAMS`

`PARAMS.levers.range.G` is `[0, 4]`, but `4` is written literally in the
`g = G/4` normalisation and in three `clamp` calls
(`engine.js:892, 894, 1333, 1336`). `100` appears as a scaling constant
in the tax-points and deficit terms (`engine.js:1099, 1115, 1132, 1165,
1183, 1195`). Both are defensible as structural rather than tunable, but
`CLAUDE.md` states the rule without that exemption: "If a number appears
anywhere else in the code, that is a bug — fix it."

---

## 4. What is genuinely good, and should not be disturbed

Recorded because the action plan below must not regress any of it.

- **The amber rule is measured, not stipulated.** An entry's magnitude is
  computed as this run minus a shadow run without that one lever change.
  20/20 assertions pass, including "the engine's share is the share the
  history shows" and "nothing goes amber inside the first 3 quarters".
- **Test 8b clears its bar with room.** 19 of 22 chains at Q20 span two
  or more disciplines (86.4%) against a 60% requirement, and three
  single-discipline chains survive so the test measures a spread rather
  than a convention.
- **Test 7b passes, and passes for the right reason.** No configuration is
  good for all eleven with Dean excluded; each of §9.1's three conflicts
  is independently verified sufficient; and no single agent carries the
  constraint (the scarcest, Callum, still ends well in 27 of 675 configs).
  A seeded hill-climb over per-round lever plans reaches only 8/11. The
  spec calls this "the single most likely calibration failure in the
  build" — it is not failing.
- **Test 7c passes at 0 quarters** against a ≤4 allowance, with the best
  configuration's weakest bloc at 48.4 — the visible boundary §7.8 asks
  for rather than a remote one.
- **`collapseAttribution`** already returns the bloc, the quarter and the
  *term* that moved, which is exactly what §10's "You lost the Centre, in
  Q12, over crime" line needs.

---

## 5. Action plan

Ordered so that each item unblocks the next. Items A–C are corrections to
work already checkpointed and should land before any new step is started,
because everything downstream reads these numbers.

### A. Resolve the coefficient fork *(blocks everything)*

1. Fold `treatment.capacityBase = 400` and `capacityPerT = 3600` into
   `PARAMS` as the defaults. Cite §7.5's `[v2.1]` note in the comment —
   this is adopting the spec's stated value, not overriding it.
2. Fold `dependence.inflowRate = 0.0028` into `PARAMS`, and mirror it
   into `ward-handoff-spec-v2.md` §7.4c as **`[P7]`**, following the
   established `[P1]`–`[P6]` convention: state the arithmetic (outflow
   ≈ 0.020·D, spec's own `D0/U0 = 0.1086`, stationary baseline needs
   0.00217) so the change is interrogable rather than asserted.
3. Delete `CALIBRATION`, `withCalibration()` and `deepMerge`'s calibration
   role, or keep `deepMerge` solely for the test files' parameter
   overrides. Update all four harnesses to run one parameter set.
4. Re-run all four suites and confirm the full green that currently only
   the calibrated path reaches.

**Verifiable output:** every acceptance test in the repository passes
against `WARD.PARAMS` with no overlay.

### B. Promote the round schedule into `PARAMS` *(blocks steps 10 and 11)*

1. Move `tests-deferred.js`'s `ROUNDS` into `PARAMS.rounds` as the twelve
   `{ round, from, to, election }` entries of §4.1's table.
2. Export `roundOf(q)` and `firstQuarterOfRound(r)` from `engine.js`;
   have the test files import them rather than redefine them.
3. Make the coherence jump test round-aware — compare `G` against its
   value at the start of the current round, not the previous quarter — so
   the rule matches §5's wording rather than relying on an unenforced
   invariant.

**Verifiable output:** `tests-deferred.js` defines no schedule of its own
and Test C still passes.

### C. Fix Test 5 at its cause, not with a workaround

The diagnosis in §3.2 points at §7.7, and §7's opening line supports it:
`crime` should adjust partially toward a target rather than jump.

1. Restate §7.7 as `crime* = 100·(D_untreated/D0)·(P/100)^0.9·qtyIndex·
   (1 − 0.45·g)` with `crime += rate·(crime* − crime)`, adding the rate to
   `PARAMS.crime`. Choose the rate so regulation's crime benefit delivers
   ≤50% in the first quarter, which is the assertion currently pending.
2. Re-verify Tests 1, 2 and 4, all of which read `crime`. Test 1's "crime
   flat" and Test 2's "crime rises vs passive at Q8" are the two most
   exposed.
3. Address §3.3 in the same pass: give the coherence deduction a decaying
   *carry* rather than a one-off level shock, so it still costs ≥50% of
   its initial size eight quarters on. `trust` already behaves this way —
   mirror it rather than inventing a second mechanism.
4. Mirror both into the spec as `[P8]` / `[P9]`.

**Verifiable output:** Test 5's five `PENDING` assertions resolve to
`PASS` without step-10 work, and no previously passing assertion regresses.

### D. Add the seeded RNG *(blocks steps 10 and 11)*

Implement `mulberry32` with the seed read from `?seed=` and a fixed
default, exposed on the engine and threaded through state so a
counterfactual or a rewind reproduces its draws. Nothing consumes it yet;
build it now so steps 10 and 11 are not each tempted to invent one.

**Verifiable output:** two runs at the same seed produce byte-identical
40-quarter output, and the seed is retrievable for the header.

### E. Step 4 — the trace bank

The signature element, and the dependency for the portrait moments in
step 7 that are currently the only unbuilt part of a checkpointed step.
Canvas, fixed-pixel container heights, double `requestAnimationFrame`
before draw, all forty quarters visible from the first turn. Cyan is
reserved to these lanes and appears nowhere else.

### F. Step 5 — aggregate readings and the lever bank

The six headline readings at 56–72px tabular figures, the lever bank in
`--ground-deep` under 15% of screen area, the fixed 1920×1080 wrapper
scaled by `transform: scale()`. `readAll()` already returns the values and
their amber marks; this is a renderer over an existing data structure.
The Set-phase preview asymmetry — first-order effects ghosted, second-order
never — is the load-bearing detail here.

### G. Steps 6–8 rendering

The pinned chain block with its single/double hairline rule, the `C`
overlay's three columns and connectors, the portrait moments, the
coalition strip, and the lens as CSS class toggling over `lensState()`.
All four are renderers over structures that already exist and are
already tested; none should require touching `engine.js`.

### H. Step 9 — market schematic

Clamp actuation at ~600ms, and the alternative path thickening over
subsequent quarters as `Kill` recovers. §7.2 calls the entry mechanic the
spec's core economic claim and requires it be visible rather than merely
computed — the sawtooth is already in the data and verified.

### I. Steps 10 and 11

Media events and elections, then the forecast step and calibration panel.
Both depend on A, B and D. Step 11 additionally needs the question pool
to be selected deterministically from seed and state, per §4.2's
implementation note.

---

## 6. One open question

`CLAUDE.md` forbids adding features not described in the spec, and §3.7's
literals are a genuine but trivial breach of its `PARAMS` rule. Item A.3
proposes deleting `CALIBRATION` outright rather than keeping both paths
runnable. If the ability to demonstrate the spec-literal path is
pedagogically wanted — showing a class what an uncalibrated model does —
that is a reason to keep it, and it should then be a documented `?preset=`
in step 13 rather than a second default. Worth a decision before item A
is executed.
