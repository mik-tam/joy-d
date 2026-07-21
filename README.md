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
- The matching mechanism is genuinely local, with transparent seeded demo travelers. Not a claim to a social network that doesn't exist.

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
- Live world painting: every world's visuals generate in real time, transparent watercolor sprites for each cast element plus a distant backdrop, style-locked to the capsule's LOOK direction. Images route through OpenRouter's image API (`OPENROUTER_IMAGE_MODEL`, default `openai/gpt-image-1-mini`) when an OpenRouter key is present, or straight through OpenAI's `gpt-image-1` otherwise. `JOYD_IMAGE_PROVIDER` pins the choice. Worlds open instantly on the painted stage kit; the generated art blooms in as it arrives. Without image credit, the kit is still the complete experience
- Express for local dev/preview and any persistent-Node host; the same three route handlers also run as Vercel serverless functions for a Vercel deployment (see Deploy below)
- Web Audio API for the world soundscapes (filtered-noise beds, pentatonic music-box plinks, and chimes), on by default with a visible mute
- A local-only voyage journal in `localStorage` (never sent anywhere) and a canvas-rendered shareable Joy Story card

## Privacy by design

JOY:D is a creative experience. Not an emotion-analysis product. Not biometric identification.

- Camera frames, video, face landmarks, and raw smile measurements stay in the browser and are never sent to the server.
- The camera remains active inside the portal so the live smile can light each world and open doors. This is disclosed in the portal UI, processing stays entirely in the browser, and the camera stops when the portal closes.
- World image generation sends only AI-generated story text (element descriptions, backdrop line, and the LOOK direction) to the image API. Never camera frames, face data, or anything typed by the user.
- The AI generator receives a playful creative signature: a shape, a signal percentage, a three-color trail, and a whimsical title. On deeper discoveries, it also receives earlier world names solely to avoid repeating them.
- Smile Matching receives only shape, signal percentage, color trail, and a temporary random session token that prevents matching a browser session with itself. It never uses a name, account, location, camera frame, or face data.
- Local matching entries live only in server memory, are removed when the next match request finds them older than 30 minutes, and disappear when the local server restarts. The first matching result may use a clearly disclosed seeded demo traveler so the demo has a satisfying ending.

## Run locally

No separate sample-data download is required. The repository includes the browser model and clearly disclosed seeded demo travelers used to make the anonymous matching finale runnable from a first local session.

### Prerequisites

- Node.js 20 or newer and npm
- A modern desktop browser with a working camera
- An OpenAI or OpenRouter API key for AI-generated Joy Capsules

### 1. Install dependencies

```bash
npm install
```

### 2. Configure an AI provider

Copy `.env.example` to `.env`, then add **one** provider key. OpenRouter takes priority when both are present.

```bash
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/free
OPENROUTER_SITE_URL=http://localhost:5173
```

Or use OpenAI:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6
```

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

The matching pool lives in process memory only: ephemeral, capped, and cleared on restart. No camera frames, face landmarks, or raw smile measurements are sent to the server in any deployment.

### Option A: Vercel

1. Import the repo in Vercel. The **Vite** framework preset is fine. Vercel auto-detects the `api/` folder and turns it into serverless functions regardless of preset.
2. Set environment variables (Production and Preview): `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default `openrouter/free`), `OPENROUTER_IMAGE_MODEL` (default `openai/gpt-image-1-mini`), `OPENROUTER_SITE_URL` (your deployed URL, used as the OpenRouter referer header), `JOYD_WORLD_IMAGES=on`. Or use `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_IMAGE_MODEL` instead if you'd rather run on OpenAI directly (`JOYD_TEXT_PROVIDER` / `JOYD_IMAGE_PROVIDER` can pin one or the other independently).
3. Deploy. No `vercel.json` is needed.

`api/joy-capsules.js` and `api/joy-scenes.js` set `maxDuration` (90s / 120s) to cover the slower story and image generation calls. Raise these in the function file if you change the provider timeouts in `server/lib/*.mjs`.

**Known trade-off on Vercel:** the live matching pool (`server/lib/smileMatches.mjs`) is a plain in-memory array. On the Express host that's one persistent process, so it behaves exactly as documented. On Vercel, each function instance has its own memory and can be recycled between requests, so the pool is best-effort there. Some matches will resolve against another *live* traveler if you hit a warm instance, but most fall back to the seeded demo travelers. Same disclosed fallback UX either way. Nothing breaks. If you want guaranteed cross-instance live matching on Vercel, swap the storage in that one file for a shared store (Vercel KV / Upstash Redis); the three exported functions' signatures wouldn't need to change.

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

The matching finale is local and anonymous. Its first result may be a clearly disclosed seeded demo traveler; a later local session can match a short-lived anonymous live traveler.

## Demo video script (about two minutes forty)

**0:00-0:12, hook.** On screen: the landing page, boat sailing past, click into the camera.
> "Most apps ask you to tap a button to start. JOY:D asks you to smile. I built it with Codex, using GPT-5.6, for OpenAI Build Week."

**0:12-0:36, the ritual.** On screen: camera opens, smile meter fills, first unlock, the Joy Signature Print and its stats appear.
> "The camera never leaves my browser. That boundary, what stays local and what's allowed to leave, is something I built together with Codex. Face landmarks get read locally, turned into a Smile Signature nobody else will ever have, and that's the only thing that goes anywhere. No frames. No face data. Just a shape, a color trail, a name."

**0:36-1:05, the first world.** On screen: enter the portal, the wormhole transition, the story typing itself out (speed this up or cut it in the edit), the painted world fading in.
> "Smile again, and you fall through. GPT-5.6 writes the story, then casts its own scene: a backdrop, a handful of elements, each with its own vivid description. A second call paints every one of those into real watercolor art. Same palette, same world, every single time it's different. Watch the wormhole. That's not a video file. That's just motion, spinning."

**1:05-1:35, the interaction.** On screen: hold a smile to charge the next door, then a big WOW face triggering a hidden wonder to transform.
> "Hold a smile, and it charges the next door open, right there on screen. Make a big WOW face, mouth wide open, and a hidden wonder in the scene turns into something the AI just painted for that exact secret. Every Smile Signature shape unlocks a little differently. Bright Spark wants a fast, high smile. Slow Sunrise wants a long, gentle one."

**1:35-1:55, escalation.** On screen: quick cuts across all three doors, showing the worlds getting stranger.
> "Three doors. Each one stranger than the last. By the third, scale just stops making sense: giant things where they shouldn't be, tiny things holding enormous weight. That's on purpose. And the world is still painting itself while you're reading, so the wait becomes part of the story."

**1:55-2:25, the finale.** On screen: the cosmic Joy Story recap, the spinning Joy Print, a held smile triggering the search, two prints meeting.
> "At the end, JOY:D wraps the whole run into one journey: every world you found, the smile signature that made all of it. Then one held smile reaches out. Somewhere out there, another traveler's smile made a shape close to yours. Two prints meet. That's the whole point. Not detecting a smile. Making one more reason for one."

**2:25-2:40, close.** On screen: back to the landing page, the tagline.
> "JOY:D. Built with Codex, using GPT-5.6, for OpenAI Build Week 2026. Every smile opens a new world. Go find yours."

### Recording it without a production budget

The real risk here isn't the camera. It's that AI generation takes a few seconds and free models occasionally stumble, and one bad take shouldn't force a full re-record.

1. Record the browser, not the IDE, at the deployed URL so it's obviously live. QuickTime Player's **File → New Screen Recording** is free and already on your Mac.
2. Record one short clip per beat above, not one long take. If a generation call is slow or a smile doesn't register, just redo that clip.
3. Record the voiceover separately once the clips are locked, using Voice Memos or QuickTime's **New Audio Recording**, in a quiet room, close to the mic. Read the script above.
4. Assemble in iMovie (free, built in): drop the clips on the timeline in order, trim the dead air, nudge any slow loading moment to 1.1-1.25x speed, lay the voiceover underneath, export.
5. Upload as **public** on YouTube, not unlisted. Paste that link into the Devpost form.

## Codex feedback session ID

OpenAI Build Week asks for the `/feedback` Codex Session ID associated with the majority of the project's core functionality. Before submitting, run `/feedback` in that Codex session and paste the resulting ID into the Devpost form. Do not invent or commit a session ID to this repository.

## Devpost description starter

### Inspiration

A smile is just a muscle movement to most software. We wanted it to be a key.

Instead of building another app that measures how someone feels, JOY:D turns a real moment of joy into a digital act of discovery. Smile once, and a tiny impossible world opens.

### What it does

JOY:D detects a smile locally, turns it into a creative Smile Signature, and uses AI to generate a one-of-one Joy Capsule: a whimsical world, a micro-story, a quote, a sound mood, a visual direction, a hidden surprise. Travel three layers deep. Get a shareable Joy Story. Finish with an anonymous resonance match: "Your smile found another smile."

### How we built it

Built with Codex using GPT-5.6, JOY:D is a React and TypeScript web app. MediaPipe Face Landmarker runs entirely in the browser for the real-time smile signal (the same jaw-open and mouth-funnel blendshapes double as a "WOW" detector for the hidden wonders). An API layer sends a deliberately minimal creative signature to an OpenAI-compatible model through OpenRouter or OpenAI, which writes back both the story and a scene it casts for itself: a backdrop and a handful of visual elements, each with its own vivid description. A second call paints those descriptions into real transparent watercolor sprites and a backdrop image, style-locked to the story's own palette. Framer Motion carries the wormhole transitions and the portal ring. The matching engine runs a small weighted comparison across only the playful signature fields, with temporary in-memory travelers for the hackathon demo.

Codex was the build partner end to end: product architecture, UI iteration, the local privacy boundaries, API resilience, the AI scene-casting pipeline, all of it. GPT-5.6 helped make the key tradeoffs explicit. A first experience that feels genuinely magical. No misleading emotion claims, ever. An anonymous matching finale that's real within the local demo, not overpromised.

### Challenges we ran into

Free-model calls can be slow, and they'll occasionally hand back JSON wrapped in a Markdown fence instead of the clean schema we asked for. The generation flow had to survive both, plus React's development-mode duplicate requests, without ever losing a Joy Capsule that already succeeded because a later call failed.

The harder problem showed up once the AI started painting its own worlds. A model casting elements at will has no sense of where things already are: a colossal moon and a tiny door would land on the exact same spot as often as not. We built a small physics-style solver that spreads every cast element apart just enough for depth without letting anything swallow anything else, then clamps everything back inside the frame. It runs on every single capsule, silently, before a user ever sees the scene.

### What's next

Future JOY:D could grow into a global Joyventure universe: opt-in persistent journeys, friend quests, a real-time joy constellation, AR worlds nobody's smiled into yet. Privacy stays non-negotiable. A smile is never identity. It is never a scientific measurement of how you feel. It is just the key.

## Verification

```bash
npm run build
npm run lint
```

## License

MIT. See [LICENSE](./LICENSE).
