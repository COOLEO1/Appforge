import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user, CurrentUser
from app.database import get_user_client
from app.config import settings

router = APIRouter(prefix="/deploy", tags=["deploy"])

RENDER_API = "https://api.render.com/v1"


class DeployRequest(BaseModel):
    project_id: str
    repo_url: str  # e.g. https://github.com/username/repo-name
    has_backend: bool = True
    has_frontend: bool = True


def _render_headers():
    if not settings.RENDER_API_KEY or not settings.RENDER_OWNER_ID:
        raise HTTPException(500, "Render API not configured on server")
    return {
        "Authorization": f"Bearer {settings.RENDER_API_KEY}",
        "Content-Type": "application/json",
    }


def _create_backend_service(repo_url: str, name: str) -> dict:
    payload = {
        "type": "web_service",
        "name": f"{name}-backend",
        "ownerId": settings.RENDER_OWNER_ID,
        "repo": repo_url,
        "branch": "main",
        "autoDeploy": "yes",
        "serviceDetails": {
            "env": "python",
            "region": "oregon",
            "plan": "free",
            "envSpecificDetails": {
                "buildCommand": "pip install -r requirements.txt",
                "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
            },
            "rootDir": "backend",
        },
    }
    r = httpx.post(f"{RENDER_API}/services", json=payload, headers=_render_headers(), timeout=30)
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Render backend deploy failed: {r.text}")
    return r.json()


def _create_frontend_service(repo_url: str, name: str) -> dict:
    payload = {
        "type": "static_site",
        "name": f"{name}-frontend",
        "ownerId": settings.RENDER_OWNER_ID,
        "repo": repo_url,
        "branch": "main",
        "autoDeploy": "yes",
        "serviceDetails": {
            "buildCommand": "npm install && npm run build",
            "publishPath": "dist",
            "rootDir": "frontend",
        },
    }
    r = httpx.post(f"{RENDER_API}/services", json=payload, headers=_render_headers(), timeout=30)
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Render frontend deploy failed: {r.text}")
    return r.json()


@router.post("")
def deploy_project(body: DeployRequest, user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)
    project = db.table("projects").select("*").eq("id", body.project_id).single().execute()
    if not project.data:
        raise HTTPException(404, "Project not found")

    name = project.data["name"].lower().replace(" ", "-")[:20]
    urls = {}

    if body.has_backend:
        backend_result = _create_backend_service(body.repo_url, name)
        urls["backend_url"] = backend_result.get("serviceDetails", {}).get("url") or backend_result.get("service", {}).get("serviceDetails", {}).get("url")

    if body.has_frontend:
        frontend_result = _create_frontend_service(body.repo_url, name)
        urls["frontend_url"] = frontend_result.get("serviceDetails", {}).get("url") or frontend_result.get("service", {}).get("serviceDetails", {}).get("url")

    db.table("projects").update({"status": "deployed"}).eq("id", body.project_id).execute()

    return urls
