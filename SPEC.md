# Build brief — hormone-first, sovereign-by-design prototype

Paste this file into the repo root as `SPEC.md`, open Claude Code, and say:
"Read SPEC.md. Build it in the order given. Stop at each checkpoint and show me."

Product name: Awarelle. Keep it in one constant `APP_NAME = "Awarelle"`.

## What we are demonstrating (one sentence)

A woman's phone turns a wearable she already owns plus a few quantitative hormone strips into an
understanding of her own hormonal pattern and a clinician-ready evidence dossier — computed entirely
on her device — while a cloud agent on Maritime provably sees nothing but noise and ciphertext.

## The demo in 60 seconds (build exactly this path, nothing else)

1. Open the public Maritime URL. Screen is split: left = phone frame (390×844), right = "What the cloud sees" console streaming the Maritime agent's logs.
2. Phone "Today" screen: two curves (estradiol teal, progesterone amber) over her current cycle, a marker on today, a confidence ring, and a card "What's happening now, and why" (templated text from her phase and her own baseline deviations).
3. Tap "Scan strip" → simulated camera scan (2 s animation) → "PdG 8.1 µg/mL — ovulation confirmed, luteal progesterone sufficient" → confidence ring rises. Console on the right logs nothing.
4. Tap "20-second check-in" → four sliders (irritability, anxiety, pain, functioning) → save. Console logs nothing. Ledger on the phone reads "0 bytes left this device".
5. Driver stops the Maritime agent from the dashboard (or toggles airplane mode). Phone keeps working. Ledger still 0. Restart the agent.
6. Tap "Your pattern" → after 2 tracked cycles the C-PASS-lite scorer shows: "Cycle-linked mood pattern: meets timing criteria in 2 of 2 cycles. This is not a diagnosis." → "Prepare dossier for a clinician" → encrypts on device → "Send" → console logs `relay: received 41,208 bytes of ciphertext · cannot decrypt · stored 0 bytes of plaintext`.
7. Open `/clinician?key=…` in a new tab → the dossier decrypts in the clinician's browser and renders.
8. Open `/employer` → aggregate program metrics only, with the line "n = 1,284 · k-anonymity ≥ 50 · differential privacy ε = 1.0 · no individual record exists".

Say on stage what is mocked: wearable and strip data are synthetic (generated from published physiology), the scan is simulated, the model is a simplified smoother. The encryption, the DP noise, the server, and the ledger are real.

## Stack (keep it boring)

- Monorepo: `client/` (Vite + React + TypeScript + Tailwind + Recharts) and `server/` (Node 20 + Express). One `Dockerfile` at the root that builds the client and serves it from the server on port 3000.
- No database. Server state in memory (fine for a demo; the agent's disk persists anyway).
- No LLM calls. All explanations are templated. This keeps the demo deterministic and the airplane-mode moment honest.
- Fonts: Google Fonts "Newsreader" (headings, 500) and "Instrument Sans" (UI). Palette: mist `#F1F4F3`, ink `#1B2432`, muted `#5E6974`, line `#D3DBD8`, teal `#146C6B`, teal tint `#DCEFEA`, amber `#E0A43C`, amber tint `#FBF3E4`, red `#B3261E`. Same identity as the survey and the architecture slides.
- PWA: `vite-plugin-pwa` with `registerType: 'autoUpdate'` and precache of all assets, so the app survives a reload with the network off.

## Repo layout

```
/Dockerfile
/package.json            (workspaces: client, server)
/SPEC.md
/client
  /src/data/synth.ts     synthetic 2-cycle dataset generator (seeded)
  /src/model/phase.ts    hormone-state estimator (phase + confidence)
  /src/model/cpass.ts    C-PASS-lite scorer
  /src/model/dp.ts       differentially private model update
  /src/crypto/dossier.ts AES-GCM encrypt/decrypt with WebCrypto
  /src/state/ledger.ts   bytes-sent ledger (counts every fetch body)
  /src/screens/Today.tsx, Scan.tsx, CheckIn.tsx, Pattern.tsx, Settings.tsx
  /src/pages/Clinician.tsx, Employer.tsx
  /src/components/Curves.tsx, ConfidenceRing.tsx, Phone.tsx, Console.tsx
/server
  index.ts               express app + SSE log stream
  routes: GET /api/model, POST /api/update, POST /api/relay, GET /api/relay/:id, GET /api/aggregate, GET /api/logs (SSE)
```

## Synthetic data (client/src/data/synth.ts)

Generate two consecutive 28-day cycles plus the current cycle up to today (day 24), seeded so the demo is identical every run. Per night:

- `tempC`: follicular baseline 36.30 ± 0.06 noise; dip of −0.10 on ovulation day; luteal baseline +0.38 from ovulation+1 to day 27; fall over the last two days.
- `restingHR`: 58 follicular, +3.5 luteal, noise ±1.2.
- `hrvRmssd`: 48 follicular, −8 luteal, extra −6 in the premenstrual 5 days, noise ±4.
- `sleepEfficiency`: 0.90 ± 0.03, with −0.06 in the premenstrual 3 days of cycle 2 only (so the anomaly flag has something to find).
- `bleeding`: days 1–5 of each cycle.
- Strips (only days 10–20 of cycles 1–2, and the current cycle): `lh` peaks day 13 (42 mIU/mL), `e3g` rises day 10–13 then plateaus, `pdg` positive (≥ 5 µg/mL) from day 16.
- Daily DRSP-lite (0–6 each): irritability, anxiety, depressed mood, pain, functioning impairment. Postmenstrual week (days 4–10) ≈ 1; premenstrual week (days 22–28) ≈ 4 for the emotional items in both completed cycles; pain ≈ 3 on days 1–2.

Export `getDataset()` → `{ cycles: Cycle[], today: DayRecord }`.

## Hormone-state estimator (client/src/model/phase.ts)

Keep it transparent — judges may ask:

1. Ovulation day = LH peak day if strips exist in that cycle; else the first day of a sustained temperature rise ≥ +0.25 °C over the follicular median for 3 consecutive nights, minus 1.
2. Phase labels: menstrual (bleeding), follicular, ovulatory (ov −1 … ov +1), luteal, premenstrual (last 7 days before the next bleeding or predicted bleeding at ov + 14).
3. Curves are drawn from a canonical template (estradiol: rise to a peak at ov − 1, drop, secondary bump at ov + 7; progesterone: flat until ov, peak at ov + 7, fall), stretched to her ovulation day and cycle length. Clearly label these as "estimated pattern" everywhere; strips render as measured dots on top.
4. Confidence (0–1): 0.35 baseline from the wearable alone; +0.25 if LH peak observed this cycle; +0.25 if PdG confirmed this cycle; +0.15 if ≥ 2 prior cycles are complete. Show it as a ring with the label "Estimated" below 0.6 and "Measured" at or above 0.6.
5. Baseline deviations for today: z-score of tonight's HRV, temperature, HR and sleep efficiency against her own same-phase history. Feed these into the "why" card templates, e.g.
   "Day 24 · late luteal. Progesterone is estimated to be falling. Your HRV is 18 % below your own luteal baseline — typical for you in this week. Sleep efficiency is down 6 % versus your other cycles — worth watching."

## C-PASS-lite (client/src/model/cpass.ts)

For each completed cycle: for each emotional item, mean of premenstrual week vs. mean of postmenstrual week. A cycle "meets timing criteria" if ≥ 1 emotional item shows ≥ 30 % relative increase AND premenstrual mean ≥ 3 AND functioning impairment premenstrual mean ≥ 2. Pattern = criteria met in 2 of 2 completed cycles. Output the per-cycle table so the dossier can show the evidence. Hard-coded footer on every result: "This is not a diagnosis. Diagnosis requires a clinician and prospective daily ratings over two cycles — which is what this dossier contains."

## Differentially private update (client/src/model/dp.ts)

Compute a 128-float "model update" (any deterministic function of her features — e.g., per-phase means), clip to L2 norm 1.0, add Gaussian noise with σ = 1.0 (ε ≈ 1 for the demo), and POST to `/api/update` only when the user taps "Contribute to the population model" in Settings (off by default). The ledger records the exact byte count. The server logs shape, norm, and ε, and explicitly `fields: none`.

## Dossier encryption (client/src/crypto/dossier.ts)

- Build the dossier JSON: phase summary, C-PASS table, strip results, cycle lengths, the last 60 nights of features, the generated "why" notes, and a `limitations` block.
- `crypto.subtle.generateKey('AES-GCM', 256)`, encrypt the JSON, POST `{ ciphertext, iv }` to `/api/relay` → server returns `{ id }`.
- Export the key as base64url and build the link `/clinician?id=…#key=…` — the key is in the URL fragment, which browsers never send to the server. Show the link with a copy button and the sentence "The relay cannot read this. Only someone with this link can."
- `/clinician` fetches the ciphertext, decrypts in the browser, renders the dossier as a printable page.

## Ledger (client/src/state/ledger.ts)

Wrap `fetch` once at app start. Every outgoing request body is counted. The Today screen footer shows `Bytes that left this device: 0` in teal, and the Settings screen shows the full ledger (timestamp, endpoint, bytes, what it contained: "DP-noised update, 128 floats" / "ciphertext, 41,208 bytes"). This is the sovereignty proof the audience can read.

## Server (server/index.ts) — the blind cloud

- `GET /api/model` → `{ version, weights: number[64], signature }` where `signature` is an HMAC over the weights with a server secret; the client verifies before "loading". Log: `model: served v3 (64 weights, signed)`.
- `POST /api/update` → validate shape 128, compute norm, log `update: 128 floats · norm 0.97 · ε 1.0 · fields: none · identity: none`, return 204.
- `POST /api/relay` → store `{ciphertext, iv}` under a random id, log `relay: received N bytes of ciphertext · cannot decrypt · plaintext stored: 0 bytes`, return `{ id }`.
- `GET /api/relay/:id` → returns the blob.
- `GET /api/aggregate` → `{ n: 1284, k: 50, epsilon: 1.0, metrics: { enrolled: 0.61, completedAssessment: 0.34, medianDaysToCare: 23, satisfaction: 4.4 } }` (synthetic, labeled synthetic on the Employer page).
- `GET /api/logs` → Server-Sent Events stream of the log lines above, with timestamps. The Console component subscribes and renders them monospace, newest at the bottom, with a header "What the cloud sees".
- Serve `client/dist` as static. Port 3000.
- Log the startup line: `agent up · holds no raw data · no identities · no cycle or hormone data`.

## Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci
COPY . .
RUN npm run build --workspace client && npm run build --workspace server
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
```

## Maritime

```bash
npm install -g maritime-cli
maritime login
maritime create Awarelle --repo https://github.com/<you>/<repo> --public --port 3000
maritime status Awarelle        # wait for active
maritime logs Awarelle -f       # second terminal; this is what you show if the console tab fails
```

Set `RELAY_SECRET` as a secret env var: `maritime env set Awarelle RELAY_SECRET=<random> --reload`.
Grab a dashboard screenshot while it's active (required for submission). Rehearse stopping and restarting the agent from the dashboard once before the pitch.

## Screens — content and layout

Phone frame centered-left (390×844, 24 px radius, 1 px line border, mist background). Tabs at the bottom: Today · Scan · Check-in · Pattern · Settings. Right of the phone on desktop: the Console panel, 420 px wide, titled "What the cloud sees", with the Maritime public URL under the title.

- **Today**: date + phase chip ("Day 24 · late luteal"); the two curves (Recharts `AreaChart`, no grid, smooth, teal/amber, today marker, measured strip dots); confidence ring (SVG, 72 px) with "Estimated / Measured"; the "why" card; footer "Bytes that left this device: 0".
- **Scan**: camera-shaped frame with a strip illustration; "Scan" button → 2 s progress → result card with the three values and "Measured" pill; "Why these numbers matter" one-liner.
- **Check-in**: four sliders 0–6 with anchor words; "Save" → toast "Saved on this device".
- **Pattern**: the C-PASS-lite result, per-cycle mini table, the "not a diagnosis" footer, and the "Prepare dossier" → "Send" flow with the link + copy button.
- **Settings**: three toggles with one-line explanations — "Contribute to the population model (DP-noised)" off, "I use hormonal contraception" (switches the Today screen to symptom-only mode with an honest note: no ovulatory cycle to estimate), "No wearable" (hides physiology, keeps strips + check-ins). Below: the full ledger. Below that: "Delete everything" (clears localStorage, reloads).
- **/clinician**: decrypted dossier, printable, with the limitations block at the top.
- **/employer**: aggregate card, k and ε shown, a sentence in red: "No individual data exists on this server. We do not predict productivity from cycles."

## Build order with checkpoints (one hour)

1. (10 min) Scaffold monorepo, Dockerfile, server with `/api/logs` SSE and the five routes, client shell with the phone frame + Console wired to SSE. **Checkpoint: console shows the startup line.**
2. (15 min) `synth.ts`, `phase.ts`, Today screen with curves, ring, why-card, ledger footer. **Checkpoint: Today renders with confidence 0.35, curves and dots.**
3. (10 min) Scan + Check-in screens; scan bumps confidence to 0.85. **Checkpoint: scan works, console stays empty.**
4. (15 min) `cpass.ts`, `dossier.ts`, Pattern screen, `/clinician`. **Checkpoint: send → console logs ciphertext → clinician link decrypts.**
5. (5 min) Settings toggles, `/employer`, PWA plugin. **Checkpoint: reload with network off still works.**
6. (5 min) Push, `maritime create`, open the public URL on a phone.

If time runs out after step 4, you still have the full demo path; steps 5–6 are polish and deployment.

## Backup

Record a 60-second screen capture of the full path once it works and keep it queued in a second tab.