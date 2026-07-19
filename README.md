# JOY:D

> **OpenAI Build Week 2026 — Apps for Your Life**
> Built with **Codex using GPT-5.6**.

> What if your smile could unlock a world that exists only because you smiled?

JOY:D is a whimsical AI joy adventure. A real-time smile opens a portal, creates a playful Smile Signature, and unlocks a rabbit hole of unexpected AI-generated worlds. At the end, a Joy Story turns the journey into a shareable memory—and an anonymous Joy:D resonance match creates one small human connection.

**Hackathon repository:** https://github.com/mik-tam/joy-d

## OpenAI Build Week submission

JOY:D is an entry for **OpenAI Build Week 2026** in the **Apps for Your Life** track: a consumer app for everyday moments of curiosity, emotional uplift, and sharing.

### How Codex and GPT-5.6 were used

Codex using GPT-5.6 was the core build partner for JOY:D. It helped translate the product vision into a working React application, implement the camera and local smile-signal flow, design and iterate on the portal experience, build the AI generation and anonymous matching services, diagnose production-like failure paths, and validate the finished project with build and lint checks.

Key decisions accelerated with Codex and GPT-5.6:

- Keep camera frames, face landmarks, and raw smile data in the browser; send only a deliberately playful creative signature to the server.
- Treat the Smile Signature as a creative cue, not emotion science, identity, or biometric matching.
- Make free-model generation resilient to slow responses, duplicate local development requests, and Markdown-wrapped JSON.
- Build a genuine local matching mechanism with transparent seeded demo travelers, rather than claim a nonexistent social network.

**Runtime note:** JOY:D supports an OpenAI-compatible runtime. Its OpenAI configuration defaults to `gpt-5.6`; OpenRouter is an optional local demo fallback when configured. The hackathon project itself was built with Codex using GPT-5.6.

## The experience

1. Open the camera and smile.
2. JOY:D detects the smile locally in the browser and creates a playful, non-scientific Smile Signature.
3. A portal opens into a first AI Joy Capsule: a world name, story, quote, sound mood, visual direction, and hidden thing.
4. Follow the glimmer through up to three distinct discoveries.
5. Create and share a Joy Story.
6. Let the signature find another anonymous JOY:D traveler.

## Built with

- React, TypeScript, Vite, Tailwind CSS, and Framer Motion
- MediaPipe Face Landmarker for browser-local smile signal detection
- OpenAI-compatible API calls through OpenRouter or OpenAI for Joy Capsule generation
- Express for a tiny local API server
- Web Audio API for optional, gentle, user-enabled chimes

## Privacy by design

JOY:D is a creative experience, not an emotion-analysis or biometric-identification product.

- Camera frames, video, face landmarks, and raw smile measurements stay in the browser and are never sent to the server.
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

### Quick test

1. Allow the browser camera permission.
2. Hold a smile until **Enter your first JOY:D world** appears.
3. Open the portal, then select **Go deeper** twice.
4. Open **Create my Joy Story**, then select **Let my smile find another**.

The matching finale is local and anonymous. Its first result may be a clearly disclosed seeded demo traveler; a later local session can match a short-lived anonymous live traveler.

## Demo script (about two minutes)

1. **Open:** “Most apps ask you to click a button. JOY:D asks you to smile. I built it with Codex using GPT-5.6 for OpenAI Build Week.”
2. Open the camera, smile, and point out that the signal stays local.
3. When the door unlocks, click **Enter your first JOY:D world**.
4. Let the portal split open and show the AI-generated Joy Capsule.
5. Tap **Go deeper** twice. Show that each discovery is a new world, not a static card.
6. Open **Create my Joy Story** and show the three-world memory card.
7. Click **Let my smile find another** and disclose whether the result is a seeded demo traveler or a live anonymous local traveler.
8. Close with: “JOY:D is not about detecting smiles. It is about creating more reasons to smile.”

For the Devpost submission, record this as a **public YouTube video under three minutes** and include the spoken explanation of how Codex and GPT-5.6 were used.

## Codex feedback session ID

OpenAI Build Week asks for the `/feedback` Codex Session ID associated with the majority of the project’s core functionality. Before submitting, run `/feedback` in that Codex session and paste the resulting ID into the Devpost form. Do not invent or commit a session ID to this repository.

## Devpost description starter

### Inspiration

We wanted to turn a physical moment of joy into a digital act of discovery. Instead of making another app that measures how someone feels, JOY:D uses a smile as a playful key: smile once, and a tiny impossible world opens.

### What it does

JOY:D detects a smile locally, turns it into a creative Smile Signature, and uses AI to generate a one-of-one Joy Capsule. Each capsule contains a whimsical world, a micro-story, a quote, a sound mood, a visual direction, and a hidden surprise. Users can travel three layers deep, receive a shareable Joy Story, and finish with an anonymous resonance match: “Your smile found another smile.”

### How we built it

Built with **Codex using GPT-5.6**, the experience is a React and TypeScript web app. MediaPipe Face Landmarker runs in the browser for the real-time smile signal. An Express API routes a deliberately minimal creative signature to an OpenAI-compatible model through OpenRouter or OpenAI, then validates structured capsule output. Framer Motion creates the door, portal, and discovery transitions. The matching engine uses a small weighted comparison across only the playful signature fields, with temporary in-memory travelers for the hackathon demo.

Codex accelerated the implementation from product architecture through UI iteration, local privacy boundaries, API resilience, and validation. GPT-5.6 helped make the key tradeoffs explicit: a polished magical first experience, no misleading emotion claims, and an anonymous matching finale that is real within the local demo instead of overpromised.

### Challenges we ran into

Free-model calls can be slow and occasionally return JSON wrapped in a Markdown fence. We made the generation flow resilient to both, guarded against React development-mode duplicate requests, and ensured a successful Joy Capsule never disappears because a later request fails.

### What’s next

Future JOY:D could evolve into a global Joyventure universe: opt-in persistent journeys, friend quests, a real-time joy constellation, and AR worlds. We would keep privacy central and never treat a smile as identity or scientific emotion measurement.

## Verification

```bash
npm run build
npm run lint
```

## License

Choose and add a license before Devpost submission. The hackathon requires a public repository with relevant licensing; no license has been selected or added yet.
