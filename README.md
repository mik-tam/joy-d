# JOY:D

Built for **OpenAI Build Week 2026** (Apps for Your Life track), with **Codex using GPT-5.6**.

*__Every smile opens a new world.__*

Not a slogan. The whole mechanic. Smile at your camera and JOY:D turns that one real moment into a Smile Signature nobody else will ever have. It opens a portal into a rabbit hole of AI-generated worlds built from it, three doors deep. At the end, a Joy Story turns the run into something shareable. Then one small, anonymous connection: your smile finds another smile.

**Hackathon repository:** https://github.com/mik-tam/joy-d

## OpenAI Build Week submission

JOY:D is my entry for OpenAI Build Week 2026, in the Apps for Your Life track: a consumer app for the small moments, curiosity, delight, connection.

### How Codex and GPT-5.6 were used

Codex using GPT-5.6 was my build partner on this one, not just autocomplete. I used it to turn the product vision into a working React app, build the camera and local smile-signal flow, design and iterate on the portal experience, build the AI generation and matching services, and stress-test the failure paths before every ship.

A few decisions I made with Codex along the way:

- Camera frames, face landmarks, raw smile data: all stay in the browser. Only a deliberately playful creative signature reaches the server.
- The Smile Signature is a creative cue. Not emotion science. Not identity. Not biometric matching.
- Free-model generation had to survive slow responses, duplicate dev requests, and Markdown-wrapped JSON. So it does.
- Matching is an explicit opt-in to a seven-day anonymous pool. It never uses identity or camera data, and never pretends a demo traveler is a real person.

**Runtime note:** JOY:D runs on any OpenAI-compatible runtime. OpenAI config defaults to `gpt-5.6`; OpenRouter is an optional local demo fallback. The project itself was built with Codex using GPT-5.6.

## The experience

1. Open the camera and smile.
2. JOY:D detects the smile locally in the browser and creates a playful, non-scientific Smile Signature.
3. A portal opens into a darkened star-void where the world's story writes itself out typewriter-style. The reading time doubles as painting time: the finished world fades in as layered generated art, its name and quote floating over it.
4. Inside the portal, the face stays the key. The live smile lights each world. Holding a smile charges the next door open. A held "WOW" face (an open, O-shaped mouth, detected locally from the same face signal) transforms the hidden wonder into an AI-painted element of the scene. Tapping always works too. Each Smile Signature shape unlocks a little differently.
5. Follow the glimmer through up to three distinct discoveries.
6. Create and share a Joy Story.
7. Let the signature find another anonymous JOY:D traveler.

## Built with

- React, TypeScript, Vite, Tailwind CSS, and Framer Motion
- MediaPipe Face Landmarker for browser-local smile signal detection
- OpenAI-compatible API calls through OpenRouter or OpenAI for Joy Capsule generation
- AI scene casting: the model writes a vivid visual description for every element of its own story (a miniature boat, travelers stepping off clouds) plus a backdrop line, with escalating whimsy briefs per depth and a deterministic fallback scene when a model cannot hold the schema
- Live world painting: every world's visuals generate in real time, with image prompts following an explicit per-world art direction rather than a single default visual style. Images route through OpenRouter's image API (`OPENROUTER_IMAGE_MODEL`, default `openai/gpt-image-1-mini`) when an OpenRouter key is present, or straight through OpenAI's `gpt-image-1` otherwise. `JOYD_IMAGE_PROVIDER` pins the choice. Worlds open instantly on the painted stage kit; the generated art blooms in as it arrives. Without image credit, the kit is still the complete experience
- Express for local dev/preview and any persistent-Node host; the same three route handlers also run as Vercel serverless functions for a Vercel deployment (see Deploy below)
- Web Audio API for the world soundscapes (filtered-noise beds, pentatonic music-box plinks, and chimes), on by default with a visible mute
- "Hear this world" reads the capsule aloud with OpenAI's TTS API (`gpt-4o-mini-tts`, a soft storyteller voice) when `OPENAI_API_KEY` is configured, falling back to the browser's own speech synthesis otherwise. Only the AI-generated story text is sent, same rule as image generation
- A local-only voyage journal in `localStorage` (never sent anywhere) and a canvas-rendered shareable Joy Story card

## The hardest problem

Free-model calls can be slow, and they'll occasionally hand back JSON wrapped in a Markdown fence instead of the clean schema I asked for. The generation flow had to survive both, plus React's development-mode duplicate requests, without ever losing a Joy Capsule that already succeeded because a later call failed.

The harder problem showed up once the AI started painting its own worlds. A model casting elements at will has no sense of where things already are: a colossal moon and a tiny door would land on the exact same spot as often as not. I built a small physics-style solver with Codex that spreads every cast element apart just enough for depth without letting anything swallow anything else, then clamps everything back inside the frame. It runs on every single capsule, silently, before a user ever sees the scene.

## Privacy by design

JOY:D is a creative experience. Not an emotion-analysis product. Not biometric identification.

- Camera frames, video, face landmarks, and raw smile measurements stay in the browser and are never sent to the server.
- The camera remains active inside the portal so the live smile can light each world and open doors. This is disclosed in the portal UI, processing stays entirely in the browser, and the camera stops when the portal closes.
- World image generation sends only AI-generated story text (element descriptions, backdrop line, and the LOOK direction) to the image API. Never camera frames, face data, or anything typed by the user.
- The AI generator receives a playful creative signature: a shape, a signal percentage, a three-color trail, and a whimsical title. On deeper discoveries, it also receives earlier world names solely to avoid repeating them.
- Smile Matching is an explicit opt-in. It receives only shape, signal percentage, color trail, a temporary random session token that prevents matching a browser session with itself, and the names and quotes of the three AI-generated worlds. It never uses a name, account, location, camera frame, or face data.
- With Supabase configured, opted-in profiles are stored for up to seven days so a real anonymous traveler can discover them. Expired profiles are deleted on matching requests; no seeded demo travelers are used. Without Supabase, matching is unavailable rather than simulated.

## Run locally

No separate sample-data download is required. The repository includes the browser model. Configure Supabase if you want real anonymous matching in local development.

### Prerequisites

- Node.js 20 or newer and npm
- A modern desktop browser with a working camera
- An OpenAI or OpenRouter API key for AI-generated Joy Capsules

### 1. Install dependencies

```bash
npm install
```

### 2. Configure AI providers

Copy `.env.example` to `.env`. Default is OpenRouter-only (no OpenAI API balance needed):

- **Stories** → OpenRouter chat (`JOYD_TEXT_PROVIDER=openrouter`)
- **World images** → OpenRouter image model (`JOYD_IMAGE_PROVIDER=openrouter`)

Stories default to OpenRouter's free tier (`openrouter/free`) so no credits burn on every capsule. Free tier can be slow, so if `OPENAI_API_KEY` is also set, a slow free-tier response automatically falls back to direct OpenAI for that one request instead of making a traveler wait. Avoid `openai/gpt-*` chat models on OpenRouter itself: they often return provider ToS `403` even when your credits are fine. Image models like `openai/gpt-image-1-mini` are separate and usually work.

```bash
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
OPENROUTER_IMAGE_MODEL=openai/gpt-image-1-mini
OPENROUTER_SITE_URL=http://localhost:5173
JOYD_TEXT_PROVIDER=openrouter
JOYD_IMAGE_PROVIDER=openrouter
JOYD_WORLD_IMAGES=on

# Optional: only spent when the free tier is slow, or when
# JOYD_TEXT_PROVIDER=openai is set explicitly.
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-5.6
```

If only OpenAI is configured, JOY:D can still use it. When both keys exist and providers are unset, OpenRouter wins for stories, with OpenAI as the automatic slow-response fallback described above.

Never commit `.env`.

### 3. Start JOY:D

```bash
npm run dev
```

Open the local address shown in the terminal. `npm run dev` starts both the Vite app and the local API server.

## Deploy

The three `/api` routes (`joy-capsules`, `joy-scenes`, `smile-matches`) are implemented once as plain functions in `server/lib/*.mjs` and exposed on two different hosts, so behavior never drifts between them:

- **`server/index.mjs`**: an Express app that serves `dist` and the `/api` routes from one long-running process. Use this for local dev/preview and for any host that runs a persistent Node process (Render, Railway, Fly.io, a VPS, etc).
- **`api/*.js`**: the same routes as Vercel serverless functions, for deploying straight to Vercel.

Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in your host's encrypted environment settings. Never expose either key in a Vite `VITE_*` variable. Deploy over HTTPS: browsers require a secure context for camera access outside `localhost`.

For real anonymous matching, run `supabase/migrations/20260721_create_joyd_match_profiles.sql` in the Supabase SQL editor, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-only environment variables. Profiles contain only opted-in creative signature fields and three AI-generated world summaries, expire after seven days, and remain inaccessible from the browser through Row Level Security.

No camera frames, face landmarks, or raw smile measurements are sent to the server in any deployment.

### Option A: Vercel

1. Import the repo in Vercel. The **Vite** framework preset is fine. Vercel auto-detects the `api/` folder and turns it into serverless functions regardless of preset.
2. Set environment variables (Production and Preview): `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=openrouter/free` (avoid `openai/gpt-*` for chat, those often return ToS 403), `OPENROUTER_IMAGE_MODEL=openai/gpt-image-1-mini`, `OPENROUTER_SITE_URL` (your deployed URL, e.g. `https://joy-d-one.vercel.app`), `JOYD_TEXT_PROVIDER=openrouter`, `JOYD_IMAGE_PROVIDER=openrouter`, `JOYD_WORLD_IMAGES=on`. If an old `OPENROUTER_MODEL=openai/...` value is still set on Vercel, change or delete it and redeploy.
3. Optionally also set `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.6`: a slow free-tier response then falls back to direct OpenAI for that request instead of leaving the traveler waiting, without spending OpenAI credit on every capsule.
4. For real anonymous matching, run the Supabase migration and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Deploy. No `vercel.json` is needed.

`api/joy-capsules.js` and `api/joy-scenes.js` set `maxDuration` (90s / 120s) to cover the slower story and image generation calls. Raise these in the function file if you change the provider timeouts in `server/lib/*.mjs`.

### Option B: a persistent Node host (Render / Railway / Fly.io / a VPS)

```bash
npm run build
npm start
```

Hosts normally provide `PORT`; `npm start` binds to the host's network interface, while `npm run dev` stays loopback-only.

### Quick test

1. Allow the browser camera permission.
2. Hold a smile until **Enter your first JOY:D world** appears.
3. Open the portal. Hold a smile until the next door charges open (or tap **Go deeper**). Do it twice.
4. Open **Create my Joy Story** with one long smile (or a tap), then select **Let my smile find another**.

The matching finale is anonymous and opt-in. With Supabase configured, it can match a real traveler who has opted in during the previous seven days; otherwise it explains that no live traveler is waiting rather than using a demo profile.

## Codex feedback session ID

OpenAI Build Week asks for the `/feedback` Codex Session ID associated with the majority of the project's core functionality. Before submitting, run `/feedback` in that Codex session and paste the resulting ID into the Devpost form. Do not invent or commit a session ID to this repository.

## What's next

Future JOY:D could grow into a global Joyventure universe: opt-in persistent journeys, friend quests, a real-time joy constellation, AR worlds nobody's smiled into yet. Privacy stays non-negotiable. A smile is never identity. It is never a scientific measurement of how you feel. It is just the key.

## Verification

```bash
npm run build
npm run lint
```

## License

MIT. See [LICENSE](./LICENSE).
