from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user, CurrentUser
from app.database import get_user_client
from app.models import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut)
def create_project(body: ProjectCreate, user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)
    result = (
        db.table("projects")
        .insert({"user_id": user.id, "name": body.name, "prompt": body.prompt, "status": "draft"})
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Failed to create project")
    return result.data[0]


@router.get("", response_model=list[ProjectOut])
def list_projects(user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)
    result = (
        db.table("projects")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)
    result = db.table("projects").select("*").eq("id", project_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Project not found")
    return result.data


@router.delete("/{project_id}")
def delete_project(project_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)
    db.table("projects").delete().eq("id", project_id).execute()
    return {"ok": True}
