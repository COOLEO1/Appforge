import httpx
from fastapi import APIRouter, HTTPException, Query
from app.config import settings

router = APIRouter(prefix="/pexels", tags=["pexels"])


@router.get("/search")
def search_photos(query: str = Query(...), per_page: int = Query(6, le=15)):
    """
    Public proxy so generated apps can pull real stock photos without ever
    seeing the actual Pexels API key. No auth required — this only reads
    free stock imagery, nothing sensitive.
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
    return {"photos": photos}
