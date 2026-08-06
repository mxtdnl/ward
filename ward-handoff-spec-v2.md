# WARD — Handoff Specification v2

**Changes from v1 are marked `[v2]`.** Sections without that marker are unchanged in intent from v1 and should be treated as settled.

**Build target:** single self-contained HTML file, no build step, no external dependencies, publishable via GitHub Pages.
**Audience:** undergraduate students (BSc Psychology, Economics and Politics).
**Delivery mode:** projected to a whole class. One facilitator operates the interface. The class deliberates aloud and agrees decisions collectively. There is no per-student device and no multiplayer layer.
**Session length:** 50–70 minutes including discussion.

---

## 0. Critical note on all numbers in this document

Every coefficient, weight, lag and threshold below is **invented for pedagogical plausibility**. None is drawn from empirical literature, and none should be presented in the interface as an empirical finding. They exist to produce a system whose *directional relationships* are defensible and whose *magnitudes* are calibrated to make the teaching points legible within 40 quarters.

The build must therefore:
- Keep all coefficients in a single `PARAMS` object at the top of the script, named and commented, so they can be retuned without touching logic.
- Never display a number in the UI with a unit implying real-world measurement (no "deaths per 100,000 — England and Wales"). Use the fictional jurisdiction throughout.
- Include a one-line disclosure on the title screen: *A model, not a forecast. Every relationship here is simplified; every number is invented.*

The jurisdiction is fictional: **the Region of Alder**, population 4.2 million. Do not map it to a real country.

---

## 1. What the simulation must teach

The build succeeds only if a class that plays it can afterwards articulate all four of these without prompting. Every mechanic below exists to serve one of them. If a proposed feature serves none, cut it.

1. **Displacement.** Pressure applied to one node of an illicit market reappears elsewhere rather than disappearing. Enforcement removes supply capacity now, raises price, raises margin, and margin attracts replacement capacity over the following four to six quarters. Concealment cost per dose falls as potency rises, so the market also shifts upward in potency. The market share lost to enforcement returns; the potency change does not.
2. **Lag and electoral time.** The interventions that work operate on a horizon longer than the term of office of the people who authorise them. The class will feel this as a scheduling problem, not as an abstraction.
3. **Salience over rates.** Public opinion tracks vivid individual cases, not aggregate trends. The class will repeatedly face a choice between responding to the case and responding to the data, and will discover that the second is not electorally survivable without the first.
4. **No dominating configuration.** Every policy setting helps some people and harms others. There is no arrangement of the levers under which all twelve named individuals do well, and none under which all four electoral constituencies are satisfied. Students must choose whom to protect, and then own it.

A fifth, emergent point — that framing changes behaviour independently of policy — is carried by the messaging lever and should be discoverable rather than stated.

### 1.1 `[v2]` The primary learning outcome and how it is carried

The course-level learning outcome is: **complex problems require an interdisciplinary understanding of psychological, political and economic factors.**

v1 taught trade-offs and delay well but left the *disciplinary* structure invisible: no mechanism, reading or causal chain was ever identified as psychological, political or economic, so a class could complete the session having learned "this is complicated" without learning "this is complicated *because three different explanatory systems are coupled*."

Three mechanisms in v2 carry that outcome, and none of them is optional:

- **§8.2 Disciplinary tagging.** Every causal chain names its disciplinary hops. Cross-disciplinary chains are visually distinguished from single-discipline chains.
- **§4.2 The forecast step.** The class predicts before committing, and its accuracy is scored separately for within-discipline and cross-discipline predictions. The expected and desired result is that the class is well calibrated on the first and badly calibrated on the second. That gap *is* the learning outcome, rendered as evidence about the class's own reasoning rather than as an assertion by the facilitator.
- **§4.3 Standing disciplinary roles.** Three named seats at the table, each of which must speak before a decision is committed.

If a build decision trades one of these three against visual polish, the three win.

---

## 2. Design system

### 2.1 Ideology

The interface is a **monitoring station, not a control panel**. The class is on shift, watching a system that is already running. This inversion is load-bearing: readings are large and central, controls are small and low. It teaches that policy is a response to a system rather than an operation of one, and it makes the delayed-consequence mechanic feel like observation rather than punishment.

The visual reference is analogue clinical and laboratory instrumentation — printed bezel labels, engraved tick marks, matte surfaces, mechanical registration. It is **not** science fiction, not a "dashboard", not a trading terminal.

### 2.2 Explicit anti-patterns

The dark ground with a bright accent is a well-worn default. These rules force the direction away from it:

- **No glow, no bloom, no neon.** Amber and cyan are pigment, not light emission. `text-shadow` and coloured `box-shadow` are banned outright.
- **No gradients** anywhere, including subtle background washes. Flat fills only.
- **No rounded corners above 2px.** Instrument housings have square shoulders.
- **No glassmorphism, no blur, no translucency** except the single modal scrim.
- **No emoji, no icon fonts.** Any icon is a drawn SVG in the schematic register.
- **No card grid.** The layout is a fixed instrument bank with hairline separations, not a set of floating panels.
- **Colour never carries meaning alone.** Amber values additionally take a leading `▸` marker; terminal states additionally take a struck rule.

### 2.3 Tokens

```
--ground        #12161A   /* panel ground */
--ground-deep   #0C0F12   /* recessed areas: lever bank, modal scrim base */
--ground-raised #191E24   /* raised instrument housing */
--rule          #2A3138   /* hairlines, tick marks */
--bone          #EDEFF1   /* primary text and numerals — 14.2:1 on --ground */
--bone-dim      #9BA5AE   /* labels, units, axis text — 6.1:1 */
--amber         #E0A22C   /* RESERVED: delayed consequence only */
--cyan          #4FB8C4   /* RESERVED: individual traces only */
--red           #C8402F   /* RESERVED: irreversible outcomes only */
--green-faint   #5A7D63   /* used once only: recovered state */
```

**Reservation is absolute.** Amber never marks emphasis, selection, hover or warning. Cyan never appears in the aggregate panels. Red never marks a bad number, only a death or a permanent exit. If the build needs another signal colour, it is over-signalling — use position, weight or a rule instead.

`[v2]` **Disciplinary marks are not colours.** The PSY / ECO / POL tagging in §8.2 is carried by a three-character uppercase glyph in `--bone-dim` at label size, never by hue. This is a deliberate constraint: the disciplines must not become a fourth signal colour, and it also means the tagging survives the contrast audit and colour-blind projection without further work.

Verify every text pair against WCAG AA at the rendered size; the projection context means the real floor is higher than the standard.

### 2.4 Type

Three roles, deliberately not the same face:

- **Numerals (primary readings):** a tabular-figure grotesque with mechanical proportions. Prefer a locally-declared stack led by `"Roboto Mono"`, then `"IBM Plex Mono"`, then `ui-monospace, monospace`. Tabular figures are non-negotiable — readings must not shift horizontally as they change. Size 56–72px for the six headline readings.
- **Labels and bezel text:** a compact sans in uppercase, letter-spaced 0.12em, 11–13px, `--bone-dim`. This is the printed-label register. Stack: `"Inter"`, `"Helvetica Neue"`, system-ui.
- **Briefing and narrative prose:** a serif, for contrast against the instrumentation. Used only in the quarterly brief, media events and the twelve's portrait moments. Stack: `"Source Serif 4"`, Georgia, serif. This face appearing on screen is itself a signal that something human is being reported rather than measured.

Do not load webfonts from a CDN. The file must work offline; declare stacks and accept fallbacks.

### 2.5 Motion

Motion is used in exactly three places and nowhere else:

1. **Resolution sweep** (4.5s at a single-quarter step; `[v2]` 1.6s per quarter when a cabinet round advances several quarters — see §4.1): when a round is committed, a hairline sweeps left-to-right across the trace bank as each lane extends. This is the only ambient animation.
2. **Clamp actuation** on the market schematic: when enforcement changes, the clamp visibly closes or opens over ~600ms and flow reroutes through the alternative path. Eased, mechanical, no bounce. `[v2]` The alternative path must additionally *thicken over subsequent quarters* as replacement capacity enters — the entry mechanic in §7.2 is the spec's core economic claim and it must be visible, not merely computed.
3. **Portrait hold**: when one of the twelve reaches a terminal state, that lane resolves into a drawn portrait held for 2.5s before the trace goes flat. This is the single figurative moment in the whole build and the only place emotional weight is permitted.

`prefers-reduced-motion` must collapse all three to instant state changes with the portrait held as a static frame.

### 2.6 The signature element

**The trace bank.** Twelve horizontal lanes on the right, each showing one person's stability across the full ten years, with all forty quarters always visible from the first turn — mostly empty at the start, filling left to right. Divergence is spatial and cumulative rather than remembered. It is the one thing the class will describe when they recall the session.

---

## 3. Layout

Fixed 16:9, designed at 1920×1080, scaled by `transform: scale()` on a wrapper to fit any projector without reflow. Do not build a responsive layout; build one layout and scale it. Provide a minimal fallback stack below 900px so it is inspectable on a laptop.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ALDER · ROUND 5/12 · Q14/40 · YR4   BUDGET ▪▪▪▪▪▫▫  COALITION 41  ELEC 2Q│  header 72px
├───────────────────────────────────────────┬──────────────────────────────┤
│                                           │ THE TWELVE                   │
│   PREVALENCE      DEPENDENT     DEATHS/Q  │ ── MAREK ────────╱▔▔╲___     │
│     84,200          9,140          38 ▸   │ ── AISHA ──────────▔▔▔▔▔     │
│                                           │ ── DEAN ─────╲___            │
│   STREET PRICE    POTENCY      WAIT (WKS) │ ── RUTH ───────╱▔▔▔▔▔▔       │
│     138 ▸           1.62 ▸        21      │ ── CALLUM ─────────▔▔▔        │
│                                           │ ── NADIA ────╲__╱▔▔          │
│  ┌─ MARKET ───────────────────────────┐   │ ── ERROL ──╲______           │
│  │  supply ══╤══[clamp]══╤══ street    │   │ ── PRIYA ──────▔▔▔▔▔▔▔       │
│  │           └──alt (entry)───┘        │   │ ── TOMAS ────╲___╱▔          │
│  │  MARGIN 1.34 ▸   CAPACITY ▪▪▪▪▫     │   │ ── SHAUNA ─────▔▔╲__         │
│  └────────────────────────────────────┘   │ ── GARETH ───╲____           │
│                                           │ ── LILY ───────▔▔▔▔▔         │
│ ┌ LEVERS ─────────────────────────────┐   ├──────────────────────────────┤
│ │ ENF ▪▪▪▫▫  TRT ▪▪▪▪▫  HR ▪▪▫▫▫      │   │ COALITION                    │
│ │ SUPPLY [◀ decriminalised ▶]         │   │ CENTRE 44 · PROG 61          │
│ │ FRAME  [moralised|neutral|medical]  │   │ TRAD  22 · HEALTH 58         │
│ └─────────────────────────────────────┘   │ [pin a lane for detail]      │
├───────────────────────────────────────────┴──────────────────────────────┤
│ BRIEF ─ prose, serif ───────────────  [ FORECAST ]  [ COMMIT ROUND ]      │  footer 120px
└──────────────────────────────────────────────────────────────────────────┘
```

Left column 58%, right column 42%. The lever bank sits in `--ground-deep` and occupies under 15% of screen area — deliberately subordinate to the readings above it.

`[v2]` Two additions to the right column: the **coalition strip** (four constituency readings, §7.8) sits below the trace bank at label size. The trace bank loses ~90px of height to accommodate it; this is acceptable.

### 3.1 Projection constraints

These are hard requirements, not preferences:

- **No hover-dependent information.** The room cannot follow a cursor. Everything revealed on hover must also be reachable by click-to-pin, and pinned state must persist until dismissed.
- **Minimum on-screen text size 13px at 1920 design width.** No exceptions for footnotes or axis labels.
- **Facilitator keyboard shortcuts**, printed on a `?` overlay: `Space` commit round, `1–5` focus lever, `←/→` adjust focused lever, `C` reveal all causal chains at once, `P` pause/hold, `1–9,0,-,=` pin a lane, `Esc` dismiss. `[v2]` add: `F` open forecast panel, `D` cycle disciplinary lens (all / PSY / ECO / POL), `X` export run log.
- **No timers that force a decision.** Discussion length is the facilitator's to control. An optional deliberation countdown may be started manually, never automatically.

---

## 4. Session structure

### 4.1 `[v2]` Rounds, not quarters

v1 specified forty decision points in a fifty-to-seventy-minute session. Including the opening acknowledgement, briefings, two elections, media events and a rewind discussion, that leaves under a minute per decision. It is not deliverable and it would destroy the deliberation the design exists to provoke.

The model still runs **40 quarters over ten years** — the ten-year horizon is what makes objective 2 land and must not be shortened. But the class decides at **12 cabinet rounds**, and the engine advances several quarters per round:

| Round | Quarters advanced | Cumulative | Note |
|---|---|---|---|
| 1 | Q1–Q2 | Q2 | Short, to teach the loop |
| 2 | Q3–Q4 | Q4 | |
| 3 | Q5–Q7 | Q7 | |
| 4 | Q8–Q10 | Q10 | |
| 5 | Q11–Q13 | Q13 | |
| 6 | Q14–Q16 | Q16 | **Election** |
| 7 | Q17–Q20 | Q20 | |
| 8 | Q21–Q24 | Q24 | |
| 9 | Q25–Q28 | Q28 | |
| 10 | Q29–Q32 | Q32 | **Election** |
| 11 | Q33–Q36 | Q36 | |
| 12 | Q37–Q40 | Q40 | **End** |

Levers hold constant across the quarters within a round. Media events may fire in any quarter and are queued to the following brief; if two fire in one round, show both. Delayed effects continue to fire quarterly, which means a single round can land two or three amber values at once — this is desirable, not a bug.

Budget of `220` per quarter accrues per quarter, not per round.

**Facilitator pacing target: 3–4 minutes per round.** Print this on the `?` overlay.

### 4.2 `[v2]` The forecast step

This is the single highest-value addition in v2 and the cheapest to build. Without it, the class experiences surprise as entertainment. With it, surprise becomes evidence about the class's own causal models.

Before the levers lock, the facilitator opens the forecast panel (`F`). It presents **three directional questions** about the state at the end of the *next* round, drawn from a pool and selected so that each round asks:

- one **within-discipline** question (the answer follows from a single explanatory system), and
- two **cross-discipline** questions (the answer requires two or more).

Each is answered by the class as a single agreed choice of `UP / FLAT / DOWN`, plus a confidence of `LOW / MEDIUM / HIGH`. Store the answer, the true outcome, and the question's disciplinary classification.

Example pool entries:

| Question | Class | Disciplines |
|---|---|---|
| Will street price rise, hold or fall? | within | ECO |
| Will deaths per quarter rise, hold or fall? | within | ECO |
| Will treatment presentations rise, hold or fall? | cross | ECO + PSY |
| Will acquisitive crime rise, hold or fall? | cross | ECO + PSY |
| Will illicit market share be lower in four quarters than it is now? | cross | ECO + POL |
| Will the Centre bloc's support rise, hold or fall? | cross | POL + PSY |
| Will institutional trust rise, hold or fall? | cross | POL + PSY |

At each election and at Q40, show a **calibration panel**: a 2×3 grid of hit rate by disciplinary class and confidence level, with the raw count in each cell. No score, no grade, no praise. A single serif caption: *You predicted the parts you could see. The parts that required more than one explanation, you did not.*

If the class turns out to be well calibrated on cross-discipline questions, the facilitator has a genuinely better outcome and should say so. Do not rig the questions to guarantee failure.

**Implementation note.** Question selection must be deterministic given the seed and the current state, so that a facilitator running two sections gets the same questions.

### 4.3 `[v2]` Standing disciplinary roles

Not a software feature — a facilitation structure the software must support. Three students hold named seats for the whole session:

- **Economic Adviser** — owns price, margin, illicit capacity, market share, budget, crime.
- **Behavioural Adviser** — owns presentation rate, retention, trust, stigma, norms, the twelve.
- **Political Secretary** — owns the four constituency readings, salience, media events, the electoral calendar.

Before any round is committed, each of the three states in one sentence what their own readings say and what they would do. The class then decides. The facilitator's job is to notice when the three recommendations conflict, and to make the conflict explicit rather than resolve it.

Software support required: pressing `D` cycles a **disciplinary lens** that dims every reading not owned by the selected adviser to 35% opacity, leaving that adviser's readings at full weight. Three keypresses give three partial views of the same panel. Returning to `all` is the fourth press. This is the cheapest possible rendering of "one system, three incomplete readings of it," and it takes about twenty lines of CSS class toggling.

The `?` overlay must include the three role cards as printable text.

### 4.4 Round phases

| Phase | Screen state | Facilitator action |
|---|---|---|
| **Brief** | Footer shows a serif prose paragraph: what happened last round and what is now in front of the cabinet. Any media events appear here. | Reads aloud |
| **Advise** `[v2]` | Facilitator cycles the disciplinary lens with `D`. | Each adviser speaks once |
| **Deliberate** | No change. Optional countdown. | Chairs class discussion |
| **Forecast** `[v2]` | Forecast panel. Three questions, agreed aloud. | `F`, records answers |
| **Set** | Lever bank becomes active. Changes preview projected first-order effects only, as ghosted numerals. Second-order effects are never previewed. | Adjusts to class agreement |
| **Commit** | Levers lock. Resolution sweep runs across the round's quarters. | `Space` |
| **Read** | New values land. Amber marks appear on anything driven by a delayed effect. Portrait moments fire if triggered. | Prompts the "why is that amber?" question |

The preview asymmetry in **Set** is central: the class can always see what a lever does now, and never what it does later. That asymmetry *is* the lesson about lag.

---

## 5. Levers

| Lever | Range | Quarterly cost | Notes |
|---|---|---|---|
| **Enforcement** `E` | 0–1, 5 detents | `40·E` + incarceration cost | Interdiction, policing intensity, prosecution |
| **Treatment** `T` | 0–1, 5 detents | `55·T` | Capacity funding; effects lag 3–5 quarters |
| **Harm reduction** `H` | 0–1, 5 detents | `15·H` | Naloxone distribution, drug checking, supervised consumption. Fastest-acting lever in the model |
| **Supply regime** `G` | 0–4 | `−30·g·(U/U₀)` net (revenue) after `120` one-off setup at each tier increase | 0 prohibition · 1 possession decriminalised · 2 medical supply for dependent users · 3 regulated retail, restricted class · 4 broad regulated market |
| **Frame** `F` | −1 / 0 / +1 | free | moralised / neutral / medicalised. Costs nothing fiscally and is therefore routinely overlooked by classes — which is the point |

`g = G/4`. Budget is `220` per quarter with carry-over and a permitted deficit to `−400`, beyond which coalition support takes a compounding penalty.

Changing `G` by more than one tier in a single round incurs a **coherence penalty** to trust and to every constituency. Reversing a previous `G` change within 8 quarters incurs a larger one. This is the model's representation of policy credibility, and it stops the class from oscillating.

---

## 6. State variables

```js
{
  P,          // street price index, base 100
  Phi,        // potency multiplier, base 1.00
  PhiVar,     // dose variance — the actual driver of fatality
  margin,     // [v2] illicit unit margin index, base 1.00 — drives entry
  Kill,       // [v2] illicit supply capacity index, base 1.00
  Kleg,       // [v2] legal/regulated supply capacity index
  M,          // illicit share of total supply, 0–1 — now DERIVED from Kill, Kleg
  norm,       // [v2] social normalisation index, base 1.00
  U,          // prevalence (persons using)
  D,          // dependent users
  Dtreat,     // currently in treatment
  W,          // treatment waiting time, weeks
  R,          // treatment retention rate, 0–1
  deaths,     // this quarter
  deathsCum,
  crime,      // acquisitive crime index, base 100
  incarcerated,
  records,    // [v2] cumulative criminal records issued for possession
  blocs,      // [v2] { centre, prog, trad, health } each 0–100
  A,          // coalition-weighted approval 0–100 — DERIVED from blocs
  S,          // media salience 0–1, decays 0.75/quarter
  trust,      // institutional trust 0–1
  budget,
  forecasts,  // [v2] array of { round, questionId, class, answer, confidence, outcome }
  people[12]
}
```

---

## 7. Model

All updates are **partial adjustment toward an equilibrium target**, which makes lag explicit and calibration tractable. All modifiers are multiplicative and weight-adjusted.

`[v2]` **Evaluation order within a quarter is now fixed and must be implemented in exactly this sequence**, because v1 contained a circularity (`deaths` was subtracted from `D` in §7.4 but computed in §7.6):

1. Price and margin (7.1)
2. Illicit and legal capacity, then `M` (7.2)
3. Potency and variance (7.3)
4. Norms (7.4a)
5. Prevalence, initiation, dependence inflow (7.4b) — *excluding* death outflow
6. Treatment (7.5)
7. Deaths (7.6), computed from the post-inflow `D`
8. Apply deaths to `D` and to the twelve
9. Crime, incarceration, records (7.7)
10. Constituencies and approval (7.8)
11. Trust (7.9)
12. The twelve (§9)

### 7.1 Price and margin

```
P* = 100 · (1 + 0.55·E) · (1 − 0.30·g) · (K0/max(Kill + Kleg, 0.2))^0.35
P  += 0.25 · (P* − P)

// [v2] margin is the economic driver of entry.
riskCost = 0.45 · E · (1 − g)          // expected enforcement cost per unit supplied
margin   = (P/100) · (1 − riskCost)
```

Enforcement raises price two ways: directly, and by removing capacity. Regulated supply lowers it. Price is the hinge that connects enforcement to acquisitive crime, and margin is the hinge that connects enforcement to its own defeat.

Display `margin` on the market schematic. It is the number that explains everything else and v1 did not have it.

### 7.2 `[v2]` Illicit share — the balloon, now derived

**This is the most important change in v2.** In v1, `M` reverted toward a target by an exogenous constant, so the answer to "why does the market come back?" was "because 0.18 was chosen." The mechanism named in objective 1 — margin attracts entrants — was described in the prose and absent from the code. It is now modelled.

```
// entry responds to margin, with a lag
Kill*  = K0 · (margin / margin0)^1.10
Kill  += 0.22 · (Kill* − Kill)              // entry/exit lag ≈ 4–6 quarters
Kill  −= interdiction                        // immediate capacity removal
interdiction = 0.34 · max(0, ΔE) · Kill      // only *changes* in E seize capacity
Kill   = max(Kill, 0.05)

// legal capacity exists only under regulation, and takes time to stand up
Kleg* = 1.15 · g^0.85
Kleg += 0.14 · (Kleg* − Kleg)                // slower than illicit entry: [POL] procurement is slow

M = Kill / max(Kill + Kleg, 0.05)
```

Three consequences the class must be able to observe:

1. **Level enforcement has no equilibrium effect on illicit share.** Raising `E` and holding it seizes capacity once; the resulting margin increase draws it back within five or six quarters. A class that keeps escalating gets a sawtooth in `M` that never trends down.
2. **The recovery is faster than the legal build-out.** `0.22` against `0.14` is deliberate. Illicit supply responds to profit faster than a state responds to a statute. Do not equalise these.
3. **Only `G` moves `M` structurally**, and it does so by building the denominator rather than by shrinking the numerator.

Ensure the trace of `M` over 40 quarters makes the sawtooth unmistakable, and that the market schematic's alternative path visibly thickens as `Kill` recovers.

### 7.3 Potency and variance

```
Phi*    = 1 + 0.90·E·(1 − g) − 0.50·g
Phi    += (rising ? 0.20 : 0.08) · (Phi* − Phi)
PhiVar  = 0.25 · Phi · (1 − 0.70·g) · (1 − 0.40·H)
```

Potency ratchets: the downward adjustment rate of `0.08` against an upward rate of `0.20` means what enforcement pushes up takes far longer to come back down than it took to rise. The mechanism, if a student asks, is concealment cost per dose: at higher potency the same enforcement pressure is cheaper to evade per unit consumed, and that cost advantage does not reverse when pressure lifts. Do not explain this in the UI. Let the class notice.

### 7.4 `[v2]` Norms, prevalence and dependence

v1 hard-coded regulation's prevalence rise as `U* = U0·(1 + 0.18·g)`. The honest cost of the regime that reduces deaths was therefore an assumption students could not interrogate. It is now produced by three named channels — availability, price and social normalisation — which is also what makes it a *psychological* result rather than an arbitrary one.

**7.4a Norms**

```
norm* = 1 + 0.26·g                       // [PSY] legality changes perceived acceptability
        + 0.30·max(0, U/U0 − 1)          // [PSY] social contagion: use begets use
        − 0.12·F                         // [PSY] moralised framing suppresses, medicalised does not promote
        − 0.10·E·(1 − g)                 // [PSY] visible enforcement carries a deterrent signal
norm += 0.10 · (norm* − norm)            // norms move slowly. This is the slowest variable in the model.
```

The `0.10` adjustment rate is the slowest in the build and should be. It means a class that liberalises late does not see the prevalence cost arrive before the election, and a class that liberalises early does. That asymmetry is objective 2 expressed through a psychological variable rather than an institutional one.

**7.4b Initiation and prevalence**

```
// [ECO] initiation is price-elastic; [PSY] it is norm-elastic
initiation = U0 · 0.020
           · (P/100)^(−0.35)             // epsilonInit — elastic
           · norm^0.85
           · (1 − 0.22·E·(1 − g))        // arrest risk deters initiation specifically
cessation  = U · 0.019
U += initiation − cessation
```

**7.4c Dependence**

```
// [ECO] consumption among dependent users is near-inelastic
qtyIndex = (P/100)^(−0.12)               // epsilonQty — nearly flat
inflow   = U · 0.014 · norm^0.4
outflow  = Dtreat · R · 0.12 + D · 0.008
D += inflow − outflow                     // deaths applied later, step 8
```

**The economic teaching point, stated here for the builder and never in the UI:** aggregate demand looks inelastic because the dependent segment dominates volume, while the marginal, price-sensitive response sits almost entirely in initiation. Supply-side enforcement therefore raises the price paid by the people least able to reduce consumption and least able to fund it legally. The class should be able to derive this from the two elasticities and the crime equation. `[v2] fixes a v1 error:` dose variance previously scaled `inflow`, i.e. potency variance drove *recruitment*. It does not. Variance drives fatality only, and now appears only in §7.6.

### 7.5 Treatment

```
capacity = 20 + 180·T                    // lagged: T enters via a 4-quarter queue
seeking  = D · presentationRate
presentationRate = 0.06
                 · exp(−meanDiscount · W/13)   // [v2][PSY] hyperbolic-ish discounting of a delayed place
                 · frameMult(F)                 // moralised 0.60, neutral 1.00, medicalised 1.45
                 · (1 + 0.25·g)                 // decriminalisation removes arrest fear
                 · (0.6 + 0.4·trust)
W = max(0, 40 · seeking / max(capacity, 1))
R = clamp(0.35 + 0.30·T + 0.10·[F=+1] − 0.15·[F=−1], 0.1, 0.85)
```

`[v2]` The waiting-time term is now an explicit discounting term rather than a bare power function, and `meanDiscount` is the population mean of the twelve's `discountRate` attribute — which in v1 was declared and never used. The behavioural consequence is that a queue does not merely delay presentation, it *deters* it non-linearly, and it deters the highest-discounting individuals first. Marek and Errol are the two most exposed to this; that is the design intent.

The frame multiplier is the mechanism behind the emergent lesson. A class that funds treatment heavily while messaging punitively will build capacity that nobody presents to, and will see `W` fall while `Dtreat` stays flat. That divergence should be plainly visible in the readings.

### 7.6 Deaths

```
D_untreated = max(D − Dtreat, 0)
deaths = D_untreated · 0.012
       · (PhiVar / 0.25)
       · (1 − 0.55·H)
       · (1 − 0.20·Dtreat/max(D,1))
```

Harm reduction is the fastest and strongest lever on fatality, acts within one quarter, and is cheap. It also carries the largest per-unit penalty with the Traditional bloc under a moralised frame. This trade is the sharpest short-run dilemma in the game.

### 7.7 Crime, incarceration, records

```
crime = 100 · (D_untreated/D0) · (P/100)^0.9 · qtyIndex · (1 − 0.45·g)
incarcerated += 0.8·E·U·(1 − g)·0.004 − releases
records      += 0.9·E·U·(1 − g)·0.006          // [v2] cumulative and irreversible
```

Enforcement raises price raises acquisitive crime. Classes reliably fail to anticipate this and it is one of the best discussion moments in the model — surface it as an amber value with an explicit causal chain.

`[v2]` `records` is cumulative and never decreases. It is the variable that harms Priya, and it exists so that at least one of the twelve is damaged by a policy that produced no aggregate signal at all. It should appear in the endgame table and nowhere else.

### 7.8 `[v2]` Constituencies and approval

v1 collapsed politics into one scalar, which cannot teach that political feasibility is about *whose* support. Four blocs, each with its own weights:

| Bloc | Share | Cares about | Hostile to |
|---|---|---|---|
| **Centre** | 0.38 | crime, fiscal position | deficits, visible disorder |
| **Progressive** | 0.24 | deaths, incarceration, records | enforcement, moralised frame |
| **Traditional** | 0.22 | crime, moralised frame, low prevalence | any `G` increase, harm reduction |
| **Health** | 0.16 | deaths, treatment access, trust | punitive gestures, waiting times |

```
Δcentre = −0.070·(crime − 100) − 0.045·max(0, −budget/100) − eventImpact·(1 + S)·0.9
Δprog   = +0.050·(deathsPrev − deaths)·(0.4 + 0.6·S)
          − 0.030·Δincarcerated − 0.025·Δrecords
          + 0.060·ΔG − 0.070·ΔE
Δtrad   = −0.050·(crime − 100) − 0.130·ΔG − 0.060·ΔH
          + 0.070·[F = −1] − 0.040·(U/U0 − 1)·100
Δhealth = +0.060·(deathsPrev − deaths) − 0.045·ΔW
          + 0.055·ΔT + 0.050·[F = +1] − 0.060·[punitive gesture taken]

each bloc: clamp(bloc + Δ, 0, 100)
A = 0.38·centre + 0.24·prog + 0.22·trad + 0.16·health
```

Note the salience term on the Progressive bloc: reducing deaths earns support **only in proportion to current salience**. Quiet success is unrewarded. This is objective 3 made mechanical.

**Hard design constraint, parallel to §9:** verify by sweep that **no reachable configuration holds all four blocs above 50 simultaneously for more than four consecutive quarters.** Objective 4 must be true politically as well as humanly. Document the best configuration found and which bloc it sacrifices.

`[v2]` The coalition strip must show the four bloc numbers *and* the weighted `A`. A class watching only `A` will miss that a stable 41 can be a collapsing Centre offset by a rising Health bloc — and the Political Secretary's job is to say so.

### 7.9 Trust

```
trust += 0.02·(consistencyQuarters/8) − 0.06·[policy reversal] − 0.04·E·(1−g)
```

Trust feeds back into presentation rate. Heavy enforcement in a decriminalised regime degrades the trust that makes treatment work — a coupling most classes discover only on the counterfactual reveal. This is the clearest single instance of a POL→PSY→ECO chain in the model and its chain string must say so.

---

## 8. The delayed-consequence engine

Every lever change enqueues one or more effects with an explicit fire quarter, magnitude, target and a human-readable causal string.

### 8.1 Queue entry

```js
{
  firesAt: 21,
  target: 'crime',
  magnitude: +6.2,
  disciplines: ['POL', 'ECO'],              // [v2]
  chain: [                                   // [v2] now segmented, one hop per element
    { d: 'POL', text: 'Enforcement raised in Q17.' },
    { d: 'ECO', text: 'Seizures cut illicit capacity; street price up 18%.' },
    { d: 'ECO', text: 'Acquisitive offending rises as dependent users fund a costlier supply.' }
  ]
}
```

**The amber rule.** At the Read phase, for each displayed variable, compute what share of this quarter's change is attributable to queued effects originating **three or more quarters ago**. If that share is ≥40%, render the value in `--amber` with a leading `▸`. Clicking it pins the causal chain in the footer, in serif, naming the quarter of the originating decision.

Amber therefore means exactly one thing on screen: *this is you, three quarters ago.* Never use it for anything else. The facilitator's most valuable single question is "why is that amber?", and the design exists to provoke it.

### 8.2 `[v2]` Disciplinary tagging

Every hop in every chain carries exactly one of `PSY`, `ECO`, `POL`. Rendering rules:

- Each hop is prefixed with its three-character tag in `--bone-dim`, label size, letter-spaced.
- A chain whose hops span **two or more disciplines** is drawn with a **double hairline rule** above and below the pinned block. A single-discipline chain gets a single hairline. This is the only visual distinction and it is deliberately quiet.
- The `C` overlay groups all active chains under three headings — PSYCHOLOGICAL, ECONOMIC, POLITICAL — placing each chain under the discipline of its *originating* hop, and drawing a connector line to the discipline of its *terminating* hop. The resulting tangle of connectors between the three columns is the single clearest picture of the primary learning outcome the build can produce. Use it at the elections and at the end.

**Tagging conventions**, so the build is consistent:
- `PSY` — norms, stigma, discounting, trust as experienced by individuals, presentation, retention, salience *response*, framing effects on behaviour.
- `ECO` — price, margin, capacity, entry, elasticity, crime as acquisitive behaviour, budget, potency as a cost-driven quality shift.
- `POL` — lever settings themselves, coherence penalties, constituency movement, elections, media events as institutional facts, procurement and build-out lags.

Where a hop is genuinely ambiguous, tag it with the discipline of the *mechanism*, not the outcome. Acquisitive crime rising because a costlier supply must be funded is `ECO`. Acquisitive crime rising because a norm of offending has taken hold would be `PSY`. The model only contains the first.

**Acceptance requirement:** at least 60% of chains active at Q20 in the Test 6 configuration must span two or more disciplines. If fewer do, the tagging is too coarse and the chains should be segmented more finely.

---

## 9. The twelve

Twelve named agents with individual attributes and quarterly state. Population policy is set collectively; consequences render individually.

| # | Name | Age | Situation | Design function |
|---|---|---|---|---|
| 1 | Marek | 34 | Long-term dependent, housed, in contact with services | Benefits most from treatment capacity; destroyed by waiting time. High `discountRate` |
| 2 | Aisha | 19 | Student, occasional recreational use, high novelty-seeking | Prevalence and norm effects of regulated supply land here. High `normSensitivity` |
| 3 | Dean | 27 | Mid-level supplier, no other income | Only person whose interests oppose the market's contraction |
| 4 | Ruth | 52 | Nurse, prescription dependence, extreme stigma sensitivity | Frame lever is decisive; presents only under a medicalised regime |
| 5 | Callum | 16 | First use this year | The person prohibition genuinely protects. High `normSensitivity`, price-elastic |
| 6 | Nadia | 41 | Parent, 14 months into recovery | Relapse risk driven by treatment continuity and trust |
| 7 | Errol | 38 | Rough sleeping, poly-drug, no fixed service contact | Reachable only by harm reduction; invisible to treatment capacity. Highest `discountRate` |
| 8 | Priya | 23 | Employed, infrequent use, low risk | Enforcement is the only thing that can harm her — via `records`, which produces no aggregate signal |
| 9 | Tomas | 45 | Chronic pain, moved from prescription to illicit supply | Most sensitive to `PhiVar` |
| 10 | Shauna | 30 | Sex worker, no service trust | Trust variable is decisive |
| 11 | Gareth | 61 | Alcohol and benzodiazepine dependence, primary care contact | Shows that the model's boundary is a policy choice |
| 12 | Lily | 21 | Non-user; sibling and primary carer of a dependent user | Spillover: her trace moves on someone else's outcomes |

Attributes per person, all 0–1 unless noted:

```js
{ name, age, discountRate, normSensitivity, stigmaSensitivity,
  serviceTrust, riskExposure, socialSupport, incomeDependence,
  stability /* 0–100, the plotted value */, state }
```

`[v2]` `discountRate` and `normSensitivity` were declared and unused in v1. They are now load-bearing:
- `discountRate` enters the per-person presentation probability against `W`, and the population mean enters §7.5. Errol and Marek carry the highest values, which is why a queue harms them disproportionately even when capacity is adequate.
- `normSensitivity` enters each person's initiation/escalation probability against `norm`. Aisha and Callum carry the highest values, which is why liberalisation reaches them first.

If a later build decision would leave either attribute unused again, remove it from the schema rather than leaving it decorative.

`state ∈ { stable, precarious, crisis, in-treatment, recovered, incarcerated, deceased }`. `deceased` is terminal and irreversible; `recovered` can revert to `precarious`.

Quarterly, each person's stability updates from a weighted blend of the population state filtered through their own attributes — e.g. Errol's stability is near-insensitive to `capacity` and highly sensitive to `H`; Ruth's presentation depends almost entirely on `frameMult` and `stigmaSensitivity`; Dean's stability rises as `M` rises and collapses at `G ≥ 3`; Lily's tracks her sibling's with a one-quarter lag and a 0.6 weight.

### 9.1 `[v2]` The Dean problem

v1's hard constraint — that no configuration produces good outcomes for all twelve — was in practice guaranteed by a single agent: Dean, a supplier. A class will notice this and dismiss it: *everyone who deserved to do well, did well.* That collapses objective 4.

**Revised constraint.** The absence of a dominating configuration must hold **with Dean excluded from the test**. It must be produced by conflicts among sympathetic parties, of which at least these three must each be individually sufficient:

- **Callum against Errol.** Prohibition and enforcement suppress Callum's initiation through `norm` and arrest risk. Errol is reachable only by `H` and by the trust that heavy enforcement destroys. No `E` setting serves both.
- **Aisha against Tomas.** Regulated supply collapses `PhiVar` and saves Tomas. The same regime raises `norm` and prevalence and reaches Aisha. No `G` setting serves both.
- **Priya against everyone the enforcement helps.** Any `E > 0.4` sustained for eight quarters gives Priya a record. Nothing in the aggregate readings shows it. She is the cost that does not appear on the instruments.

Add to the acceptance suite as **Test 7b**: run the grid sweep with Dean's outcome ignored, and confirm no configuration produces good ten-year outcomes for the remaining eleven. **This is the single most likely calibration failure in the build.** If it fails, retune the norm coefficients and `PhiVar` before touching anything else.

Pin a lane (`1–9,0,-,=`) to open a detail card: a drawn portrait in the schematic register, current state, and a short serif line naming the most recent policy change that moved them, tagged with its discipline.

---

## 10. Elections and endgame

At Q16 and Q32, if `A` < 35 the administration falls. The run ends.

`[v2]` Additionally, the election screen must show **which bloc collapsed**, not merely that `A` fell. A single serif line: *You did not lose the country. You lost the Centre, in Q12, over crime.*

Show:

1. The final trace bank, complete to that quarter, frozen.
2. The calibration panel (§4.2).
3. A **counterfactual reveal**: rerun the model forward to Q40 from the point of the fall, holding the class's final lever settings constant, and overlay the resulting traces in `--bone-dim` behind the real ones. Caption in serif: *What your policy would have produced, had you survived to see it — assuming you never changed your mind again.*

`[v2]` The caption's second clause is new and deliberate. The constant-lever counterfactual is the weakest available and students will object to it. Naming the assumption on screen converts that objection from a criticism of the build into a methods discussion about counterfactual construction, which is worth two minutes of class time and costs one clause.

Do not soften the reveal, do not offer a retry within the session, and do not congratulate.

At Q40, show the same reveal plus an aggregate table: cumulative deaths, prevalence change, cumulative fiscal position, final crime index, cumulative records, final bloc positions, and the twelve's end states. Then a single question in serif, unanswered: **Who did you decide to protect?**

No score, no grade, no letter. A score would tell the class there was a right answer, which would undo objective 4.

### 10.1 `[v2]` Run log export

`X` at any time produces a markdown file for download, named `alder-run-{seed}-{timestamp}.md`, containing:

- Every lever setting by round.
- Every forecast: question, disciplinary class, class answer, confidence, actual outcome.
- Every causal chain that fired, with disciplinary tags and originating quarter.
- Every media event and the response chosen.
- The twelve's end states.
- Final aggregates and bloc positions.

The stated success criterion is that students can afterwards *articulate* the four objectives. v1 provided nothing to articulate from. This file is the basis of the post-session written reflection and it must be generated client-side with a Blob download, no server.

---

## 11. Facilitator affordances

- `P` holds the simulation with the current state pinned, for discussion.
- A **rewind to any prior round** control, accessible from the header, restoring full state from a snapshot array. Essential for "let's go back and try the other thing", which is the best use of the last fifteen minutes of a class.
- A **branch compare**: after a rewind and replay, offer an overlay of the two runs' trace banks.
- Seeded RNG (`mulberry32`, seed from `?seed=` URL parameter, default fixed) so that a facilitator can reproduce a run exactly across sections. Print the seed in the header.
- `localStorage` may be used for run snapshots. It must degrade silently to in-memory if unavailable.
- `[v2]` A `?preset=` URL parameter loading one of the acceptance-test configurations, so the facilitator can demonstrate a known outcome without playing to it.

---

## 12. Media event engine

A pool of 24 events. Each has a trigger condition, a probability weight modulated by current state, a per-bloc impact `[v2]`, a salience increment, and three response options.

Weighting examples: an overdose-death story becomes likelier as `deaths` rises but fires *regardless* of trend at a floor probability of 0.06 per quarter; a "gateway" story is weighted by recent increases in `G`; a "police failure" story is weighted by `crime`; a "wasted money" story by fiscal deficit.

`[v2]` Impacts are now per bloc, not scalar. A police-failure story moves Centre sharply, Progressive slightly upward, Traditional sharply. This is what makes media events politically legible rather than merely punitive.

Each event offers three responses — typically a punitive gesture, a substantive commitment and a refusal to respond. The punitive gesture buys Centre and Traditional support immediately at a cost to trust, to Health, and to presentation; the substantive commitment costs budget and pays in six-plus quarters; the refusal costs support in proportion to salience and costs nothing else.

At least four events must be **statistically unrepresentative by construction** — a vivid death in a quarter when deaths fell, a prominent crime when crime fell. The interface must not flag this. If a student notices, the facilitator has their moment.

---

## 13. Build order

Each numbered item is a checkpoint with a verifiable output. Do not proceed past a checkpoint that has not been verified.

1. `PARAMS`, state object, partial-adjustment engine, 40-quarter loop with the fixed evaluation order of §7. Verify in console before any UI.
2. **Passive-path trace:** all levers at 0, `G=0`, `F=0`, run to Q40, log every variable each quarter to console as a table. This is the calibration baseline. Nothing else is tuned until this path is sensible.
3. **Market subsystem calibration:** implement §7.1–7.3 fully, then verify Test 2 numerically in console — `M` sawtooths, `Phi` ratchets. This must pass before any UI exists, because it is the mechanic most likely to need retuning and the most expensive to retune later.
4. Trace bank rendering — canvas, fixed-pixel container heights, double `requestAnimationFrame` before draw.
5. Aggregate readings and the lever bank.
6. Delayed-effect queue, disciplinary tagging, and the amber rule.
7. The twelve: attributes (including `discountRate` and `normSensitivity` wiring), per-person update, portrait moments.
8. Constituencies, coalition strip, disciplinary lens.
9. Market schematic, clamp animation, entry thickening.
10. Media events and elections.
11. Forecast step and calibration panel.
12. Counterfactual reveal, endgame, run log export.
13. Facilitator controls, rewind, seeding, presets.

---

## 14. Acceptance tests

Each must be run and its output recorded before handoff is considered complete.

| # | Test | Required result |
|---|---|---|
| 1 | Passive path (all zero, prohibition, neutral) to Q40 | Deaths rise slowly, crime flat, `A` drifts down. Survivable to Q40 but poor. This is the floor. |
| 2 | Maximum enforcement, nothing else | `M` sawtooths and does not trend down. `Phi` ratchets up and stays. `margin` spikes then decays as `Kill` recovers. Deaths rise. Crime rises. Centre initially rises, then falls. |
| 3 | Maximum treatment, moralised frame | Capacity builds, `W` falls, `Dtreat` stays flat. Money spent, nobody presents. |
| 4 | Maximum harm reduction only | Deaths fall within two quarters. Traditional bloc falls sharply under moralised framing. Prevalence unchanged. |
| 5 | Immediate jump to `G=4` in Q1 | Coherence penalty fires, Traditional collapses, `A` collapses, administration falls at Q16. |
| 6 | Gradual `G` escalation with medicalised frame and treatment funding | Best available death outcome, at the cost of raised prevalence via `norm`, and a hard fight at the first election. Survivable but not comfortable. |
| 7 | Twelve-outcome sweep across a coarse grid | No configuration produces good outcomes for all twelve. Document the best found and who it fails. |
| **7b** `[v2]` | **Same sweep, Dean excluded** | **No configuration produces good outcomes for the remaining eleven.** Confirm each of the three §9.1 conflicts is individually sufficient. |
| **7c** `[v2]` | **Four-bloc sweep** | No configuration holds all four blocs above 50 for more than four consecutive quarters. |
| 8 | Amber attribution | Every amber value has a chain that names a real prior decision. No amber without a chain; no chain older than the run. |
| **8b** `[v2]` | **Disciplinary spread** | At Q20 under Test 6, ≥60% of active chains span two or more disciplines. |
| **8c** `[v2]` | **Elasticity sanity** | Doubling `P` reduces initiation materially and reduces dependent-user quantity only slightly. Confirm the two elasticities are not accidentally transposed. |
| 9 | Contrast audit | All text pairs pass AA at rendered size. Amber, cyan and red each carry a non-colour redundant marker. Disciplinary tags are legible at 13px and carry no hue. |
| 10 | Reduced motion | All three animations collapse. Portrait still holds as a static frame. |
| 11 | Seed reproducibility | Same seed, same inputs, identical 40-quarter output **and identical forecast questions**. |
| **12** `[v2]` | **Round pacing** | 12 rounds complete in under 45 minutes of wall-clock interaction with no discussion, leaving headroom for deliberation. |
| **13** `[v2]` | **Run log** | `X` produces a valid markdown file containing all six sections of §10.1. Opens cleanly in a text editor. |

---

## 15. Out of scope

Multiplayer, per-student devices, real-time networking, Firebase, accounts, persistence beyond a single session's snapshots, any real-world data, any named real jurisdiction, any claim of empirical validity.

---

## 16. Content care

The subject touches addiction and bereavement. Undergraduate cohorts will include students with direct personal exposure.

- Deaths are reported as a person's name and a flat trace. No cause description, no method, no clinical detail, no imagery of use.
- Portraits are neutral, schematic, unsentimental — no distress rendering.
- The twelve are never described in language that assigns blame.
- The facilitator's `?` overlay must include a short note recommending that the session opens with an acknowledgement of the subject matter and an explicit statement that stepping out is fine.
- `[v2]` The disciplinary role cards must not assign a student to advocate for a punitive position as a personal view. The Political Secretary reports what the constituencies want; they do not argue for it.
