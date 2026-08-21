# AppForge

An AI that builds fullstack web apps from a conversation — dark, cinematic,
chat-driven. Backend: FastAPI + Supabase + Mistral Codestral. Frontend:
React + Vite + Tailwind + Framer Motion.

```
appforge/
├── backend/     FastAPI API — auth, chat/generation, GitHub push, zip export
└── frontend/    React chat UI — the actual app people use
```

## Quick start (Termux)

### 1. Supabase (shared by both)

1. Create a project at supabase.com
2. SQL Editor → run `backend/schema.sql` (creates tables, RLS, credit trigger)
3. Authentication → URL Configuration → add your frontend URL to the
   redirect allow-list (`http://localhost:5173` for dev)
4. Grab your URL, anon key, service role key, and JWT secret from
   Project Settings → API

### 2. Backend

```bash
cd backend
pip install -r requirements.txt --break-system-packages
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# SUPABASE_JWT_SECRET, MISTRAL_API_KEY, GITHUB_TOKEN
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

Open a second Termux session:

```bash
cd frontend
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# VITE_API_BASE defaults to http://localhost:8000, fine for local dev
npm run dev
```

Visit the URL Vite prints (usually `http://localhost:5173`).

## Deploying (Render)

- **Backend:** new Web Service, root directory `backend`, build command
  `pip install -r requirements.txt`, start command
  `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set the same env vars from
  `backend/.env.example` in Render's dashboard.
- **Frontend:** new Static Site, root directory `frontend`, build command
  `npm install && npm run build`, publish directory `dist`. Set
  `VITE_API_BASE` to your deployed backend's Render URL, and
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Once both are live, add the frontend's Render URL to Supabase's redirect
  allow-list too, or magic links will fail in production.

## Security note

Both `.env` files hold real secrets (Supabase service role key, Mistral key,
GitHub token). They're gitignored here — keep it that way, and if a token
ever ends up pasted somewhere public, revoke it immediately.

## Roadmap

- v1 (this): web + fullstack generation, chat UI, GitHub push, zip export
- v2: EAS Build API for Expo/mobile output, streamed chat responses,
  persisted per-project message/file history on reload
- v3: live sandboxed preview (WebContainers or E2B), deploy-to-Render webhook
