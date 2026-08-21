# AppForge Backend (v1)

FastAPI backend for AppForge — the AI that builds fullstack web apps from chat.

## Setup (Termux)

```bash
pip install -r requirements.txt --break-system-packages
cp .env.example .env
# edit .env with your real Supabase, Mistral, and GitHub keys
```

## Supabase setup

1. Go to your Supabase project → SQL Editor → New query
2. Paste and run `schema.sql` — this creates `projects`, `messages`, `credits`
   tables, RLS policies, and an auto-credit trigger for new signups
3. Grab these from Project Settings → API:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - JWT secret is under Project Settings → API → JWT Settings

## Run locally

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

- `POST /projects` — create a project
- `GET /projects` — list your projects
- `GET /projects/{id}` — get one project
- `DELETE /projects/{id}` — delete a project
- `POST /chat` — send a message, get back a reply + generated files (once ready)
- `POST /github/push-files` — push generated files to a new/existing GitHub repo
- `POST /export/zip` — download generated files as a zip

All routes except health check (`/`) require:
`Authorization: Bearer <supabase_access_token>`

## Notes

- Credits are deducted per chat message (1 credit = 1 message). New users
  get 20 credits via the Supabase trigger.
- The LLM is instructed to always return structured JSON
  (`{reply, ready, files}`) — `ready: true` means it generated files, `false`
  means it's still asking clarifying questions.
- `GITHUB_TOKEN` should be a personal access token with `repo` scope. Since
  you've leaked tokens in chat before — once this is live, keep it only in
  `.env`, never commit it, and revoke immediately if it ever ends up
  somewhere public.

## Next up (v2)

- EAS Build API integration for Expo/mobile output
- Live sandboxed preview (WebContainers or E2B)
- Deploy-to-Render webhook
