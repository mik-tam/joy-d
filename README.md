# JOY:D

> What if your smile could unlock a world that exists only because you smiled?

JOY:D is a whimsical AI joy adventure. A real-time smile opens a portal, creates a playful Smile Signature, and unlocks a rabbit hole of unexpected AI-generated worlds. At the end, a Joy Story turns the journey into a shareable memory—and an anonymous Joy:D resonance match creates one small human connection.

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

## Demo script (about two minutes)

1. **Open:** “Most apps ask you to click a button. JOY:D asks you to smile.”
2. Open the camera, smile, and point out that the signal stays local.
3. When the door unlocks, click **Enter your first JOY:D world**.
4. Let the portal split open and show the AI-generated Joy Capsule.
5. Tap **Go deeper** twice. Show that each discovery is a new world, not a static card.
6. Open **Create my Joy Story** and show the three-world memory card.
7. Click **Let my smile find another**.
8. Close with: “JOY:D is not about detecting smiles. It is about creating more reasons to smile.”

## Devpost description starter

### Inspiration

We wanted to turn a physical moment of joy into a digital act of discovery. Instead of making another app that measures how someone feels, JOY:D uses a smile as a playful key: smile once, and a tiny impossible world opens.

### What it does

JOY:D detects a smile locally, turns it into a creative Smile Signature, and uses AI to generate a one-of-one Joy Capsule. Each capsule contains a whimsical world, a micro-story, a quote, a sound mood, a visual direction, and a hidden surprise. Users can travel three layers deep, receive a shareable Joy Story, and finish with an anonymous resonance match: “Your smile found another smile.”

### How we built it

The experience is a React and TypeScript web app. MediaPipe Face Landmarker runs in the browser for the real-time smile signal. An Express API routes a deliberately minimal creative signature to an OpenAI-compatible model through OpenRouter or OpenAI, then validates structured capsule output. Framer Motion creates the door, portal, and discovery transitions. The matching engine uses a small weighted comparison across only the playful signature fields, with temporary in-memory travelers for the hackathon demo.

### Challenges we ran into

Free-model calls can be slow and occasionally return JSON wrapped in a Markdown fence. We made the generation flow resilient to both, guarded against React development-mode duplicate requests, and ensured a successful Joy Capsule never disappears because a later request fails.

### What’s next

Future JOY:D could evolve into a global Joyventure universe: opt-in persistent journeys, friend quests, a real-time joy constellation, and AR worlds. We would keep privacy central and never treat a smile as identity or scientific emotion measurement.

## Verification

```bash
npm run build
npm run lint
```
