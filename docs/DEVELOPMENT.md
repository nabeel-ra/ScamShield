# ScamShield

A web demo that makes social-engineering tactics visible as a suspicious call unfolds. Built with Next.js App Router, TypeScript, Tailwind CSS, and Lucide icons.

## Current status: Phase 4 evaluation implemented

The complete mock demo remains available without credentials. **NVIDIA Nemotron** mode sends synthetic transcript prefixes to NVIDIA for real classification, validates the returned JSON and exact evidence, then uses the same deterministic scoring engine. ElevenLabs clip generation and synchronized playback are implemented; all six real ElevenLabs clips have been generated and saved. A measured 32-case evaluation is available at `/evaluation`. No microphone, real calls, database, or authentication is used.

## NVIDIA setup

1. Put your NVIDIA Build key in `.env.local` (already ignored by Git):

   ```dotenv
   NVIDIA_API_KEY=your-key-here
   NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
   ```

2. Restart `npm run dev` after saving the key.
3. Select **NVIDIA Nemotron**, then **Start call**. The status shows analyzed-line coverage, model name, and last-request latency. A full call can issue up to six requests.
4. If a request fails, use **Retry analysis**, or explicitly switch to **Mock**. Switching modes resets the call. There is no automatic substitution of scripted results.

Keep the key server-side; never prefix it with `NEXT_PUBLIC_` or commit `.env.local`. `.env.example` contains only placeholders. Brev GPU credits are not used by this hosted API path. Live NVIDIA access was verified with the configured key. One full-transcript request returned four valid tactics in 4.377 seconds (75/100): authority, urgency, OTP request, and isolation. It omitted the separate threat label. This is a smoke test, not an accuracy benchmark; classifications and latency can vary. Additional prefix tests found an OTP false positive on a code mention and an omitted authority signal. Browser testing also encountered a validation rejection and a transient NVIDIA 503. Keep Mock mode available for presenting; real mode is experimental until the labeled evaluation is complete.

## Launch

Use Node.js 20.9+ and npm.

```sh
cd /Users/bell/Desktop/ScamShield
npm install
npm run dev
```

Open http://localhost:3000. Click **Start call**. The 35-second fictional bank call reveals six transcript segments. Mock mode produces the exact progression below; real model detections and latency may differ. Evidence is highlighted and the risk timeline records every score increase. End the call early or let it finish, then use **Replay call** to reset the simulation.

For a production-style demo:

```sh
npm run build
npm start
```

Run `npm run typecheck` to check TypeScript and `npm test` for validation, scoring, and endpoint tests. The tests stub NVIDIA and make no paid API calls. After installing dependencies, Mock mode needs no external services, fonts, images, or network calls to function. Keep the browser tab visible during the demonstration.

## Demo story

| Time | Signal | Cumulative score |
| --- | --- | --- |
| 00:02 | Claimed bank affiliation | 15 |
| 00:07 | Suspicious purchase claim; no new tactic | 15 |
| 00:12 | Urgency | 25 |
| 00:18 | Code mentioned; no request yet | 25 |
| 00:23 | Request to read back the verification code | 55 |
| 00:29 | Isolation and account lock threat | 90 |
| 00:35 | Call summary | 90 |

The caller's bank affiliation is a claim, not proof of impersonation. Merely mentioning a code does not add an OTP-request detection. The later request uses the preceding transcript for context. Mock mode is a curated illustration of that distinction. Nemotron mode must infer it from transcript context.

## Architecture

```text
Local scenario → progressive transcript
  → mock detections OR server-side Nemotron classification
  → schema and exact-evidence validation (Nemotron)
  → deterministic risk engine
  → score, tactic cards, safety action, timeline, summary
```

- `src/app/page.tsx`: page entry point.
- `src/app/layout.tsx`: metadata and global styles.
- `src/components/dashboard.tsx`: call lifecycle, rendering, highlighted evidence, and dashboard.
- `src/lib/scenario.ts`: typed synthetic scenario, tactic catalog, scoring, risk bands, and guidance.
- `src/app/api/analyze/route.ts`: server-only NVIDIA request, timeout, and sanitized errors.
- `src/lib/analysis.ts`: classifier prompt and strict output validation.
- `src/hooks/use-nemotron.ts`: sequential analysis, request cancellation, coverage, and retry.
- `tests/analysis.test.ts`: grounded-evidence, schema, scoring, and endpoint tests.
- `src/app/globals.css`: responsive dark dashboard styles; Tailwind is configured through PostCSS.

The timer uses elapsed wall-clock time, clears its interval on end/unmount, and resets on replay. Mock mode derives detections from visible lines. Nemotron mode makes one request at a time, coalesces newly available lines into the next request, and never sends future lines or mock labels. Analysis can finish after the call ends. The UI labels pending/failed coverage; it never represents an API failure as a safe call. Replay and mode switches abort old work and ignore stale responses. No persistence is needed.

## Risk engine

Every unique tactic contributes its weight once. Sum the weights and cap at 100; repetition does not inflate the score. There are no combination bonuses in this phase.

| Tactic | Weight |
| --- | ---: |
| Authority impersonation / claimed authority signal | 15 |
| Urgency | 10 |
| Threat | 15 |
| Credential request | 25 |
| OTP request | 30 |
| Payment request | 30 |
| Isolation | 20 |
| Safe-account transfer | 30 |

Display bands: 0 awaiting signal; 1–24 low; 25–49 elevated; 50–74 high; 75–100 critical. These are illustrative, uncalibrated risk indicators, not probability estimates. A low score does not establish that a call is safe. Safety guidance switches immediately when an OTP request appears.

## Phase 2: NVIDIA Nemotron — Beyond the Chatbot

Nemotron is an internal classifier, not a chat interface. It receives cumulative transcript context and is prompted for `{ "techniques": [{ "type", "confidence", "evidence", "severity" }] }`, without a risk score. The default model uses `chat_template_kwargs.enable_thinking: false` for a concise classification response. The server strictly parses JSON and rejects unsupported fields/types, invalid confidence/severity, duplicates, and quotes absent from the supplied transcript. Output is prompt-constrained and runtime-validated; it is not claimed to be guaranteed by provider-side schema enforcement. Verbatim evidence validation establishes grounding, not semantic accuracy.

Accepted tactics accumulate once per call; a later omission does not retract an earlier detection. Confidence is model-reported metadata, not a calibrated probability or a scoring multiplier. Timeline timestamps reflect call elapsed time when results arrive, so they may lag the evidence; work finishing after the call ends uses the final call time. Transcript highlighting still points to the original evidence line.

Requests have a 45-second total budget. Transient HTTP 429/500/502/503/504 and network failures retry up to three total attempts with exponential backoff (1s, 2s, plus jitter). Retry-After is respected; if it exceeds the remaining budget, the failure is returned without retrying early. Cancellation interrupts backoff. Authentication errors, other permanent HTTP failures, and model-output validation failures are not retried. Responses record attempts and retry reasons/delays. Missing keys, rejected access, rate limits, network errors, and invalid model outputs produce visible errors and preserve only previous valid detections. The route accepts only a synthetic scenario prefix length, not arbitrary user transcripts. This hackathon endpoint has no authentication or durable rate limiting; before a public deployment with credentials, add access controls/quotas. No deployment has been performed.

API references: [NVIDIA Nemotron Super model](https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b).

## Phase 3: ElevenLabs — Out Loud

1. Add `ELEVENLABS_API_KEY` to `.env.local`. The key needs Text to Speech permission.
2. Optionally set `ELEVENLABS_VOICE_ID`. The default is George (`JBFqnCBsd6RMkjVDRZzb`), a stock voice from ElevenLabs' official quickstart.
3. Run `npm run audio:generate`. This sends only the six synthetic caller lines to ElevenLabs, using `eleven_multilingual_v2`, and saves MP3 clips under `public/audio/`.
4. Refresh the page or click **Check for audio**, select **ElevenLabs voice**, then **Start call**. It works with either Mock or Nemotron analysis.

Generation uses your ElevenLabs credits. Each clip is cached by a hash of its text, voice, model, and settings; rerunning reuses saved clips. A complete manifest is published only when all six clips exist. Changes to voice or text generate new clip files. Keys are never written to the manifest or exposed in browser code.

Playback uses one browser audio element. A line appears on its clip's `playing` event; the next clip starts on `ended`. The timer and evidence timestamps follow actual playback rather than the silent 35-second schedule. There is no microphone or speech recognition: transcripts come from the same source text used for TTS. Nemotron can lag the speech while it analyzes. Mute preserves timing; ending, replaying, or switching modes stops the previous audio. Failed or blocked playback ends the call with an explicit error; select Silent to replay without audio.

Generated clips are static assets and can be included in a Vercel deployment. Generate them locally before deploying; no ElevenLabs key is needed for playback on the deployed site. Do not generate clips in a serverless request. When committing synthetic audio, follow any attribution/license requirements of your ElevenLabs plan.

Files: `scripts/generate-audio.ts` (local generation), `src/hooks/use-call.ts` (playback and silent timer), `src/lib/audio.ts` (manifest validation). [ElevenLabs API reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

## Phase 4: measured evaluation

Open `/evaluation` from the dashboard. The saved run is available without additional NVIDIA requests. Use the filters to inspect mistakes or API failures and expand a prediction to see its evidence. Download JSON for the prompt, model settings, fingerprints, individual predictions, and measured latency.

To run a new evaluation:

```sh
npm run evaluate
```

This sends 32 synthetic snippets to NVIDIA, up to three attempts per case for transient service failures, using the same prompt, output validation, and model client as the live demo. Labels and rationales are never sent. Attempt counts and transient retry events are recorded alongside final outputs or errors. Valid classifications are never retried to seek a better label. Results are checkpointed to `public/evaluation/latest.json` and archived under `public/evaluation/runs/`. Refresh the evaluation page to load progress. A rerun creates a new archive; do not select only favorable runs when reporting results.

### Protocol

- Dataset `synthetic-v1`: 16 intended scams and 16 intended legitimate calls, hand-authored in English. Includes negation, scam warnings, ordinary payment notices, indirect credential requests, and contextual OTP references.
- Frozen keyword baseline `keywords-v1`: eight case-insensitive patterns, without negation or context handling. Matched tactics receive the same weights as model detections.
- Both detectors predict scam when the deterministic score is **at least 25**. This is a fixed development cutoff, not a calibrated fraud probability. An authority claim alone scores 15.
- Precision = TP/(TP+FP); recall = TP/(TP+FN); F1 = 2TP/(2TP+FP+FN). A zero denominator displays N/A.
- API/validation failures are abstentions. The main table compares both detectors on the identical subset with valid model responses. Coverage, errors, and full-dataset baseline results appear separately. A partial run is explicitly labeled.

### First measured run

27/32 valid responses (84.4% coverage); five NVIDIA HTTP 503 errors. Paired results on those same 27 cases:

| Detector | Precision | Recall | F1 | False positives | False negatives |
| --- | ---: | ---: | ---: | ---: | ---: |
| Keyword baseline | 58.8% | 71.4% | 64.5% | 7 | 4 |
| Nemotron | 100.0% | 64.3% | 78.3% | 0 | 5 |

Nemotron reduced false alarms but missed more scams at this fixed threshold. These are measured development-set results, not evidence of general accuracy. The set is small, synthetic, not held out, and contains distinctions already described in the prompt. Case labels represent fictional intent rather than verifiable real-world legitimacy. Missing cases could materially change the metrics. No prompt or threshold tuning was performed after this run to improve these reported numbers.

### Reliability rerun after adding transient retries

A separate full run completed 32/32 cases with zero final API errors. Three HTTP 503 responses recovered on the second attempt; the saved JSON includes each delay and status. Nemotron measured 100% precision, 87.5% recall, 93.3% F1, zero false positives, and two false negatives; the baseline measured 60% precision, 75% recall, 66.7% F1, eight false positives, and four false negatives. The original run remains archived. These results are not directly attributable to retries alone: coverage changed and model outputs can vary. The prompt and decision threshold were unchanged.

Files: `src/lib/evaluation/dataset.ts` (frozen examples), `metrics.ts` (baseline and metrics), `scripts/evaluate.ts` (runner), `src/lib/nemotron.ts` (shared server/CLI classifier), and `src/components/evaluation-dashboard.tsx` (results UI). Tests cover confusion-matrix arithmetic, undefined metrics, baseline behavior, and dataset balance.

## Intended hackathon track fit

- **NVIDIA Nemotron — Beyond the Chatbot:** structured classification inside the decision pipeline is implemented; live access verified with a synthetic call.
- **ElevenLabs — Out Loud:** saved AI-generated caller speech with transcript synchronization. All six caller clips were generated with ElevenLabs; playback uses saved assets.
- **Financial Hack:** fraud-prevention education with synthetic data only.
- **Cold Start:** a small, understandable first full project with a complete demo path.

These tracks are taken from the supplied project brief. Official sponsor rules, submission requirements, and eligibility were not separately supplied or verified. Confirm them before submission; Mock mode alone does not demonstrate sponsor API use.

## Deployment

The app uses standard Next.js conventions and is Vercel-friendly. Import this repository into Vercel, select the Next.js preset, and use the default build settings. Mock mode requires no environment variables. Nemotron mode requires `NVIDIA_API_KEY` in server environment settings; `NVIDIA_MODEL` is optional. Deployment has not been performed.
