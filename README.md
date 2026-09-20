# ScamShield

(Nabeel Raza, nar179@pitt.edu)

[Live demo](https://scamshield-flax-two.vercel.app) · [GitHub](https://github.com/nabeel-ra/ScamShield) · [Evaluation](https://scamshield-flax-two.vercel.app/evaluation)

ScamShield makes social-engineering tactics visible during a synthetic phone call. One of five selectable voiced scenarios plays while the transcript, scam tactics, quoted evidence, deterministic risk score, and safety recommendation update. A post-call timeline explains the warnings.

Built for a hackathon with **Next.js App Router, React, TypeScript, Tailwind CSS, NVIDIA Nemotron, and ElevenLabs**. No database, authentication, microphone, or real phone calls are required. All call and evaluation data is synthetic.

## Try the demo

1. Choose Bank Fraud, IRS / Government Impersonation, Tech Support Scam, Fake Recruiter Scam, or Family Emergency Scam, then continue.
2. Select **NVIDIA Nemotron** for real model classification, or **Mock** for scripted offline detections.
3. Select **ElevenLabs voice**, then **Start call**.
4. Follow the transcript and risk panel; inspect the evidence, recommendation, and timeline.
5. Use **Replay call**, **End call**, or **Mute** as needed. **Try Another Scenario** returns to the picker with a fresh call and analysis.

Voice clips are included, so playback needs no ElevenLabs API request. Silent simulations run for 35–39 seconds; voice timing follows each saved clip. Nemotron can take longer than the spoken dialogue; coverage and pending/error states are visible. Mock mode is explicitly labeled and never silently substituted for AI output.

## Run locally

Use Node.js 22 or 24 and npm.

```sh
git clone https://github.com/nabeel-ra/ScamShield.git
cd ScamShield
npm ci
cp .env.example .env.local
# Set NVIDIA_API_KEY in .env.local for live classification.
npm run dev
```

Open http://localhost:3000. Keep `.env.local` private; it is excluded from Git and Vercel uploads. Never use a `NEXT_PUBLIC_` prefix for secrets.

```sh
npm test                 # Automated checks; no provider calls
npm run typecheck        # TypeScript
npm run build            # Production build
npm start                # Serve the production build
```

## Architecture

```text
Synthetic scenario → saved ElevenLabs speech + synchronized transcript
                   → server /api/analyze → NVIDIA Nemotron
                   → strict JSON and exact-evidence validation
                   → deterministic TypeScript risk engine
                   → score, tactics, evidence, guidance, timeline
```

- `src/components/dashboard.tsx`: main demo interface.
- `src/hooks/use-call.ts`: audio sequencing, call timer, replay, and cancellation.
- `src/hooks/use-nemotron.ts`: sequential analysis and protection against stale responses.
- `src/app/api/analyze/route.ts`: server-only endpoint, accepting only an allowlisted scenario ID and synthetic transcript prefix length.
- `src/lib/nemotron.ts` / `nvidia-transport.ts`: model calls and bounded transient retries.
- `src/lib/analysis.ts`: structured-output prompt and validation.
- `src/lib/scenarios.ts`: reusable scenario metadata, scripts, timings, mock labels, audio manifests, and verification guidance.
- `src/lib/scenario.ts`: shared tactic types, weights, risk scoring, and safety guidance.
- `src/components/scenario-picker.tsx`: accessible scenario selection.
- `/evaluation`: saved measured results and individual predictions.

## NVIDIA Nemotron: beyond a chatbot

Nemotron is an internal classifier. It receives only the transcript shown so far, with prior context, and returns JSON containing tactic type, confidence, severity, and an exact evidence quote. It does not converse with the user or invent the final score.

The server rejects unsupported tactics, malformed JSON, duplicate types, invalid confidence/severity, and evidence absent from the supplied transcript. Exact evidence establishes grounding, not that the model's interpretation is correct. Accepted tactics accumulate once per call.

TypeScript sums unique tactic weights and caps the score at 100: authority 15, urgency 10, threats 15, credentials 25, OTP 30, payments 30, isolation 20, and safe-account transfers 30. Scores are illustrative indicators, not calibrated probabilities. A low score does not prove a call is safe.

Temporary NVIDIA 429/500/502/503/504 responses and network failures receive up to three attempts with exponential backoff and a 45-second total budget. Retry-After is respected. Permanent errors and invalid model outputs are not automatically retried. Failures remain visible, and previous valid detections are preserved.

## ElevenLabs: meaningful voice

Thirty speech clips across five scenarios were generated from the synthetic caller dialogue using ElevenLabs Multilingual v2 and the stock George voice. Each transcript line appears when its clip starts; the next clip starts when the previous clip ends. These are synchronized scripted transcripts, not speech-to-text.

To regenerate clips, set `ELEVENLABS_API_KEY` (the secret beginning `sk_`) and optionally `ELEVENLABS_VOICE_ID` in `.env.local`, then run:

```sh
npm run audio:generate
```

This uses ElevenLabs credits. Unchanged clips are reused by content hash. Each scenario’s generated manifest contains no credentials. All clips must exist before its manifest is published. Review attribution/license requirements of your ElevenLabs plan before distributing the generated audio.

## Evaluation

The `/evaluation` page compares a simple keyword baseline with Nemotron on 32 hand-authored synthetic examples: 16 intended scams and 16 intended legitimate calls. Both use the same risk engine and a fixed score ≥25 cutoff. Labels are never sent to the model.

The latest saved run completed **32/32 cases**, with three transient 503 failures recovered automatically and no final API errors:

| Detector | Precision | Recall | F1 | False positives | False negatives |
| --- | ---: | ---: | ---: | ---: | ---: |
| Keyword baseline | 60.0% | 75.0% | 66.7% | 8 | 4 |
| Nemotron | 100.0% | 87.5% | 93.3% | 0 | 2 |

This is a small development set, not a held-out benchmark or real-world accuracy claim. Model outputs vary. Failed cases are excluded from both sides of the paired comparison; coverage and retries are shown explicitly. The earlier run with five service failures remains archived.

```sh
npm run evaluate
```

This makes real NVIDIA requests and creates a new saved run. Classifications are not retried to obtain better labels. The results page includes downloadable JSON, prediction filters, evidence, formulas, and limitations.

## Deployment on Vercel

Production is deployed at https://scamshield-flax-two.vercel.app using the Vercel CLI. Automatic deployments on Git pushes are not connected yet; the Vercel account needs its GitHub login connection enabled. The current deployment does not depend on that connection.

Import the GitHub repository using Vercel's **Next.js** preset. Install with `npm ci` and build with `npm run build`.

Configure `NVIDIA_API_KEY` as a sensitive server-side environment variable in Vercel. Optionally set `NVIDIA_MODEL` to `nvidia/nemotron-3-super-120b-a12b`. Redeploy after changing environment variables. No ElevenLabs key is needed in production because generated audio is included in `public/audio/`.

This is a submission demo, not a hardened public service: the synthetic-only analysis endpoint has bounded requests/retries but no account authentication or durable usage quota. Do not use real personal or financial data.

## Intended hackathon tracks

- **NVIDIA Nemotron — Beyond the Chatbot:** structured classification inside a decision pipeline, plus measured evaluation.
- **ElevenLabs — Out Loud:** generated caller speech drives the simulation.
- **Financial Hack:** fraud-prevention education using synthetic data.
- **Cold Start:** a complete, understandable project with a reliable mock fallback.

Track names came from the project brief. Official sponsor rules and eligibility were not supplied for verification.

See [development notes](docs/DEVELOPMENT.md) for implementation history and earlier evaluation results.
