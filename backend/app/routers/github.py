from fastapi import APIRouter, Depends, HTTPException
from github import Github, GithubException

from app.auth import get_current_user, CurrentUser
from app.database import get_user_client
from app.config import settings
from app.models import GithubPushRequest

router = APIRouter(prefix="/github", tags=["github"])


@router.post("/push")
def push_to_github(body: GithubPushRequest, user: CurrentUser = Depends(get_current_user)):
    db = get_user_client(user.token)

    project = db.table("projects").select("*").eq("id", body.project_id).single().execute()
    if not project.data:
        raise HTTPException(404, "Project not found")

    messages = (
        db.table("messages")
        .select("content, role")
        .eq("project_id", body.project_id)
        .execute()
    )

    # Files are generated client-side by the last chat response and passed
    # back in on push, OR you can persist the last generation server-side.
    # For v1 simplicity, the frontend sends the file list along with the push
    # (see body extension below if you want that instead of re-deriving it).

    if not settings.GITHUB_TOKEN:
        raise HTTPException(500, "GitHub token not configured on server")

    gh = Github(settings.GITHUB_TOKEN)
    gh_user = gh.get_user()

    try:
        repo = gh_user.create_repo(name=body.repo_name, private=body.private, auto_init=True)
    except GithubException as e:
        if e.status == 422:
            raise HTTPException(409, "A repo with that name already exists")
        raise HTTPException(502, f"GitHub error: {e.data}")

    db.table("projects").update(
        {"github_repo_url": repo.html_url, "status": "pushed"}
    ).eq("id", body.project_id).execute()

    return {"repo_url": repo.html_url}


@router.post("/push-files")
def push_files(project_id: str, repo_name: str, files: list[dict], user: CurrentUser = Depends(get_current_user)):
    """
    Call this with the actual generated files (path/content pairs) once you
    have them client-side from the chat response. Creates the repo if it
    doesn't exist yet, then commits each file.
    """
    db = get_user_client(user.token)
    project = db.table("projects").select("*").eq("id", project_id).single().execute()
    if not project.data:
        raise HTTPException(404, "Project not found")

    gh = Github(settings.GITHUB_TOKEN)
    gh_user = gh.get_user()

    try:
        repo = gh_user.get_repo(repo_name)
    except GithubException:
        repo = gh_user.create_repo(name=repo_name, private=True, auto_init=True)

    for f in files:
        path, content = f["path"], f["content"]
        try:
            existing = repo.get_contents(path)
            repo.update_file(path, f"Update {path}", content, existing.sha)
        except GithubException:
            repo.create_file(path, f"Add {path}", content)

    db.table("projects").update(
        {"github_repo_url": repo.html_url, "status": "pushed"}
    ).eq("id", project_id).execute()

    return {"repo_url": repo.html_url}
