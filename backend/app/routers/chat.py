import json
from fastapi import APIRouter, Depends, HTTPException
from mistralai import Mistral

from app.auth import get_current_user, CurrentUser
from app.database import get_user_client, supabase_admin
from app.config import settings
from app.models import MessageIn, GenerationResult, GeneratedFile

router = APIRouter(prefix="/chat", tags=["chat"])

mistral_client = Mistral(api_key=settings.MISTRAL_API_KEY)

SYSTEM_PROMPT = """You are AppForge, an AI that builds fullstack web apps from conversation.

Rules:
- If you don't yet have enough detail (stack preference, key features, pages, data model),
  ask ONE focused clarifying question at a time. Don't generate code yet.
- Once you have enough detail, generate a complete, working fullstack project:
  backend + frontend files, ready to run.
- Prefer: FastAPI or Flask backend, vanilla HTML/JS or React frontend, SQLite unless
  the user asks for Postgres/Supabase.
- Always respond with ONLY a JSON object, no markdown fences, no preamble, matching:
{
  "reply": "<short message to show the user in the chat>",
  "ready": <true if you generated files, false if you're still asking questions>,
  "files": [{"path": "<relative file path>", "content": "<full file content>"}]
}
"files" must be an empty array when "ready" is false.
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

    # Confirm the project belongs to this user (RLS would also block it, but
    # we want a clean 404 rather than an empty result)
    project = db.table("projects").select("*").eq("id", body.project_id).single().execute()
    if not project.data:
        raise HTTPException(404, "Project not found")

    _deduct_credit(user.id)

    # Save the user's message
    db.table("messages").insert(
        {"project_id": body.project_id, "role": "user", "content": body.content}
    ).execute()

    # Pull full history for context
    history = (
        db.table("messages")
        .select("role, content")
        .eq("project_id", body.project_id)
        .order("created_at")
        .execute()
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m["role"], "content": m["content"]} for m in history.data]

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

    # Save the assistant's reply
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
