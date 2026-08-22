from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import projects, chat, github, export, credits, pexels

app = FastAPI(title="AppForge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(chat.router)
app.include_router(github.router)
app.include_router(export.router)
app.include_router(credits.router)
app.include_router(pexels.router)


@app.get("/")
def health():
    return {"status": "ok", "service": "AppForge API"}
