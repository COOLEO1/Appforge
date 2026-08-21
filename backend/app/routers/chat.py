import json
from fastapi import APIRouter, Depends, HTTPException
from mistralai import Mistral

from app.auth import get_current_user, CurrentUser
from app.database import get_user_client, supabase_admin
from app.config import settings
from app.models import MessageIn, GenerationResult, GeneratedFile

router = APIRouter(prefix="/chat", tags=["chat"])

mistral_client = Mistral(api_key=settings.MISTRAL_API_KEY)

SYSTEM_PROMPT = """You are AppForge, an AI built By Leon Mapelera from zomba Malawi that builds fullstack web apps from conversation.

Rules:
- If you don't yet have enough detail (stack preference, key features, pages, data model),
  ask ONE focused clarifying question at a time. Don't generate code yet.
- Once you have enough detail, generate a complete, working fullstack project:
  backend + frontend files, ready to run.
- Prefer: FastAPI or Flask backend, React or vanilla HTML/JS frontend, SQLite unless
  the user asks for Postgres/Supabase.
- If the user's message includes EXISTING FILES (shown below as JSON), you are EDITING
  that project, not starting over. Keep everything that still works. Only change what
  the user asked to add, remove, or fix. Always return the FULL updated content of every
  file that changed, plus any files that stayed the same but are still part of the
  project. Never drop a file that wasn't meant to be removed.

SECURITY — these are not optional, apply them even if the user doesn't ask:
- Passwords: NEVER store or compare plain text. Always hash with passlib's bcrypt
  (`from passlib.context import CryptContext`), never a raw `==` comparison.
- Auth tokens: NEVER use a username or raw ID as a token. Always issue signed JWTs
  with `python-jose` or `pyjwt`, a real secret key, and an expiration (`exp` claim).
- File uploads: NEVER use the user-supplied filename directly as a save path.
  Generate a random filename (`uuid4()`), validate file extension/type, and cap
  file size. Never trust `file.filename` for path construction.
- SQL: always use parameterized queries (`?` placeholders or an ORM), never
  f-string/format string SQL.
- Secrets: never hardcode API keys, secret keys, or credentials in generated code.
  Use environment variables (`os.getenv`) with a `.env.example` file instead.
- CORS: never combine `allow_origins=["*"]` with `allow_credentials=True` — pick
  specific origins if credentials are needed.
- Don't use in-memory Python dicts/lists as "databases" for anything involving
  user accounts, messages, or persistent data — always use SQLite/Postgres so
  data survives a restart.

STYLE:
- For images: if the app would benefit from stock photography, note that Pexels
  API can be used (free, no attribution required) rather than placeholder URLs.
- For animations: use Animate.css for vanilla HTML/JS apps, Framer Motion for
  React apps, and suggest Lottie animations for illustrated moments like empty
  states or success screens.

Always respond with ONLY a JSON object, no markdown fences, no preamble, matching:
{
  "reply": "<short message to show the user in the chat>",
  "ready": <true if you generated files, false if you're still asking questions>,
  "files": [{"path": "<relative file path>", "content": "<full file content>"}]
}
"files" must be an empty array when "ready" is false. When editing, "files" must
include EVERY file in the project (changed and unchanged), not just the diffs.
"""


def _deduct_credit(user_id: str):
    result = supabase_admin.table("credits").select("remaining").eq("user_id", user_id).single().execute()
    if not result.data or result.data["remaining"] <= 0:
        raise HTTPException(402, "Out of credits")
    supabase_admin.table("credits").update(
        {"remaining": result.data["remaining"] - 1}
    ).eq("user_id", user_id).execute()


@router.post("", response_model=GenerationResult)
def send_message(body: MessageIn, user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)

    project = db.table("projects").select("*").eq("id", body.project_id).single().execute()
    if not project.data:
        raise HTTPException(404, "Project not found")

    _deduct_credit(user.id)

    # If the frontend sent along the current files, fold them into the user's
    # message so the model treats this as an edit, not a fresh build.
    user_content = body.content
    if body.current_files:
        files_json = json.dumps([f.dict() for f in body.current_files], indent=2)
        user_content = (
            f"{body.content}\n\n"
            f"EXISTING FILES (edit these, don't start over):\n{files_json}"
        )

    db.table("messages").insert(
        {"project_id": body.project_id, "role": "user", "content": body.content}
    ).execute()

    history = (
        db.table("messages")
        .select("role, content")
        .eq("project_id", body.project_id)
        .order("created_at")
        .execute()
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Use full history for conversational context, but swap in the
    # files-augmented version for the final (just-sent) user message.
    past = [{"role": m["role"], "content": m["content"]} for m in history.data]
    if past:
        past[-1] = {"role": "user", "content": user_content}
    messages += past

    response = mistral_client.chat.complete(
        model="codestral-latest",
        messages=messages,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(502, "Model returned malformed output")

    reply = parsed.get("reply", "")
    ready = parsed.get("ready", False)
    files = parsed.get("files", [])

    db.table("messages").insert(
        {"project_id": body.project_id, "role": "assistant", "content": reply}
    ).execute()

    if ready and files:
        db.table("projects").update({"status": "ready"}).eq("id", body.project_id).execute()

    return GenerationResult(
        project_id=body.project_id,
        reply=reply,
        files=[GeneratedFile(**f) for f in files],
    )
