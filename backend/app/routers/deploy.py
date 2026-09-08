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
    repo_url: str
    backend_type: str = "none"   # "python" | "none"
    frontend_type: str = "none"  # "react" | "static" | "none"


def _render_headers():
    if not settings.RENDER_API_KEY or not settings.RENDER_OWNER_ID:
        raise HTTPException(500, "Render API not configured on server")
    return {
        "Authorization": f"Bearer {settings.RENDER_API_KEY}",
        "Content-Type": "application/json",
    }


def _create_python_backend(repo_url: str, name: str) -> dict:
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


def _create_react_frontend(repo_url: str, name: str) -> dict:
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


def _create_static_frontend(repo_url: str, name: str) -> dict:
    """For vanilla HTML/JS/CSS apps with no build step at all."""
    payload = {
        "type": "static_site",
        "name": f"{name}-frontend",
        "ownerId": settings.RENDER_OWNER_ID,
        "repo": repo_url,
        "branch": "main",
        "autoDeploy": "yes",
        "serviceDetails": {
            "buildCommand": "echo 'no build needed'",
            "publishPath": ".",
        },
    }
    r = httpx.post(f"{RENDER_API}/services", json=payload, headers=_render_headers(), timeout=30)
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Render frontend deploy failed: {r.text}")
    return r.json()


def _update_service_env_var(service_id: str, key: str, value: str):
    """
    Adds or updates a single environment variable on an existing Render
    service. Render's API requires PUTting the full env var list, so we
    fetch what's there first and merge in our new value.
    """
    headers = _render_headers()
    existing = httpx.get(f"{RENDER_API}/services/{service_id}/env-vars", headers=headers, timeout=20)
    current_vars = existing.json() if existing.status_code == 200 else []

    merged = {v["envVar"]["key"]: v["envVar"]["value"] for v in current_vars if "envVar" in v}
    merged[key] = value

    payload = [{"key": k, "value": v} for k, v in merged.items()]
    httpx.put(f"{RENDER_API}/services/{service_id}/env-vars", json=payload, headers=headers, timeout=20)


@router.post("")
def deploy_project(body: DeployRequest, user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)
    project = db.table("projects").select("*").eq("id", body.project_id).single().execute()
    if not project.data:
        raise HTTPException(404, "Project not found")

    name = project.data["name"].lower().replace(" ", "-")[:20]
    urls = {}
    backend_service_id = None
    frontend_service_id = None

    if body.backend_type == "python":
        result = _create_python_backend(body.repo_url, name)
        service = result.get("service", result)
        backend_service_id = service.get("id")
        urls["backend_url"] = service.get("serviceDetails", {}).get("url")

    if body.frontend_type == "react":
        result = _create_react_frontend(body.repo_url, name)
        service = result.get("service", result)
        frontend_service_id = service.get("id")
        urls["frontend_url"] = service.get("serviceDetails", {}).get("url")
    elif body.frontend_type == "static":
        result = _create_static_frontend(body.repo_url, name)
        service = result.get("service", result)
        frontend_service_id = service.get("id")
        urls["frontend_url"] = service.get("serviceDetails", {}).get("url")

    # Now that both real URLs (with Render's random suffixes) are known,
    # wire each service to point at the other's actual deployed address.
    if backend_service_id and urls.get("frontend_url"):
        _update_service_env_var(backend_service_id, "FRONTEND_URL", urls["frontend_url"])
    if frontend_service_id and urls.get("backend_url"):
        _update_service_env_var(frontend_service_id, "VITE_API_BASE", urls["backend_url"])

    update_fields = {"status": "deployed"}
    if urls.get("backend_url"):
        update_fields["deployed_backend_url"] = urls["backend_url"]
    if urls.get("frontend_url"):
        update_fields["deployed_frontend_url"] = urls["frontend_url"]

    db.table("projects").update(update_fields).eq("id", body.project_id).execute()

    return urls


@router.delete("/service")
def delete_render_service(service_url: str, user: CurrentUser = Depends(get_current_user)):
    """
    Deletes a Render service. We have to look it up by matching its URL
    since Render's API identifies services by ID, not URL.
    """
    headers = _render_headers()
    list_resp = httpx.get(f"{RENDER_API}/services", headers=headers, params={"limit": 100}, timeout=20)
    if list_resp.status_code != 200:
        raise HTTPException(502, "Couldn't list Render services")

    services = list_resp.json()
    match = None
    for entry in services:
        svc = entry.get("service", entry)
        svc_url = svc.get("serviceDetails", {}).get("url", "")
        if svc_url and svc_url in service_url or service_url in svc_url:
            match = svc
            break

    if not match:
        return {"deleted": False, "reason": "Service not found (may already be deleted)"}

    del_resp = httpx.delete(f"{RENDER_API}/services/{match['id']}", headers=headers, timeout=20)
    if del_resp.status_code not in (200, 204):
        raise HTTPException(502, f"Couldn't delete Render service: {del_resp.text}")

    return {"deleted": True}
