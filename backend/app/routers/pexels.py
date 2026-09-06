import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from app.config import settings

router = APIRouter(prefix="/pexels", tags=["pexels"])


@router.get("/search")
def search_photos(query: str = Query(...), per_page: int = Query(6, le=15)):
    """
    Public proxy so any app AppForge generates and deploys can pull real
    stock photos without ever seeing the actual Pexels API key. Open to all
    origins on purpose — this only serves free stock imagery, nothing
    sensitive, and generated apps live on unpredictable Render subdomains
    we can't know in advance.
    """
    if not settings.PEXELS_API_KEY:
        raise HTTPException(500, "Pexels API key not configured on server")

    response = httpx.get(
        "https://api.pexels.com/v1/search",
        params={"query": query, "per_page": per_page},
        headers={"Authorization": settings.PEXELS_API_KEY},
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(502, "Pexels API error")

    data = response.json()
    photos = [
        {
            "url": p["src"]["large"],
            "alt": p.get("alt", ""),
            "photographer": p["photographer"],
        }
        for p in data.get("photos", [])
    ]

    return JSONResponse(
        content={"photos": photos},
        headers={"Access-Control-Allow-Origin": "*"},
)
