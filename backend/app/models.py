from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    prompt: str


class ProjectOut(BaseModel):
    id: str
    user_id: str
    name: str
    prompt: str
    status: str
    github_repo_url: Optional[str] = None
    created_at: datetime


class GeneratedFile(BaseModel):
    path: str
    content: str


class MessageIn(BaseModel):
    project_id: str
    content: str
    current_files: Optional[list[GeneratedFile]] = None


class MessageOut(BaseModel):
    id: str
    project_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class GithubPushRequest(BaseModel):
    project_id: str
    repo_name: str
    private: bool = True


class GenerationResult(BaseModel):
    project_id: str
    reply: str
    files: list[GeneratedFile] = []
