import httpx
from bs4 import BeautifulSoup

SEARCH_TRIGGERS = [
    "latest", "current version", "newest", "deprecated", "still supported",
    "up to date", "recommended way", "best practice", "official docs",
    "changed recently", "new api", "breaking change",
]


def needs_search(text: str) -> bool:
    lowered = text.lower()
    return any(trigger in lowered for trigger in SEARCH_TRIGGERS)


def web_search(query: str, max_results: int = 3) -> str:
    """
    Free web search via DuckDuckGo's HTML endpoint — no API key, no card,
    no signup required. Returns a short text summary of top results, or an
    empty string if the request fails, so callers can always safely fall
    back to generating without it.
    """
    try:
        response = httpx.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={"User-Agent": "Mozilla/5.0 (AppForge search bot)"},
            timeout=8,
        )
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception:
        return ""

    results = []
    for result in soup.select(".result__body")[:max_results]:
        title_el = result.select_one(".result__title")
        snippet_el = result.select_one(".result__snippet")
        title = title_el.get_text(strip=True) if title_el else ""
        snippet = snippet_el.get_text(strip=True) if snippet_el else ""
        if title or snippet:
            results.append(f"- {title}: {snippet}")

    return "\n".join(results)
