# AppForge Frontend (v1)

Dark cinematic chat UI for AppForge. React + Vite + Tailwind + Framer Motion.

## Design

- **Palette:** near-black `#0B0A0C` bg, panel `#16141A`, one accent — deep
  crimson `#B3122E`
- **Type:** Archivo Black (display), Inter (body), JetBrains Mono (code)
- **Signature element:** the breathing waveform loader (`PulseLoader.jsx`)
  replaces a generic spinner during generation — a nod to your music
  production work
- Respects `prefers-reduced-motion`; visible focus rings throughout

## Setup (Termux)

```bash
npm install
cp .env.example .env
# fill in your Supabase URL/anon key, and point VITE_API_BASE at your
# deployed backend once it's live (defaults to localhost:8000 for dev)
```

## Supabase Auth setup

In your Supabase dashboard → Authentication → URL Configuration, add your
frontend URL (e.g. `http://localhost:5173` for dev, your Render URL for prod)
to the redirect allow-list, or magic links won't complete.

## Run

```bash
npm run dev
```

## Build for deploy (Render static site or similar)

```bash
npm run build
# outputs to dist/
```

## Structure

- `src/App.jsx` — auth gate, layout, wires sidebar/chat/file-tree together
- `src/components/AuthScreen.jsx` — Supabase magic-link login
- `src/components/Sidebar.jsx` — project list
- `src/components/ChatPanel.jsx` — message list + input, calls `/chat`
- `src/components/PulseLoader.jsx` — the signature breathing waveform
- `src/components/FileTree.jsx` — slides in once files are generated, has
  ZIP and GitHub push buttons
- `src/lib/api.js` — fetch wrapper, attaches the Supabase JWT to every call
- `src/lib/supabase.js` — Supabase client

## Next up

- Persist and reload messages/files per project on selection (currently
  resets on switch — v2 should fetch from `/projects/{id}` + a messages
  endpoint)
- Streaming responses instead of a single blocking `/chat` call, so replies
  render token-by-token like Claude's chat
