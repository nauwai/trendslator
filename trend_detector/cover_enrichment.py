import json
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

# Support both old (duckduckgo_search) and new (ddgs) package names
try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS

OUTPUT_FILE = Path("data/trends.json")

# Domaines connus pour bloquer le hotlinking ou renvoyer des images inutilisables
BLOCKED_DOMAINS = {
    "tiktok.com",
    "tiktokv.com",
    "tiktokcdn.com",
    "facebook.com",
    "fbcdn.net",
    "instagram.com",
    "cdninstagram.com",
    "twitter.com",
    "twimg.com",
    "x.com",
}

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}


def normalize_hashtag(raw_value: str) -> str:
    if not isinstance(raw_value, str):
        return ""
    return raw_value.strip().lstrip("#").lower()


def ascii_safe(text: str) -> str:
    """Supprime les accents pour éviter les problèmes d'encodage dans les requêtes."""
    return (
        unicodedata.normalize("NFKD", text)
        .encode("ascii", "ignore")
        .decode("ascii")
        .strip()
    )


def is_domain_blocked(url: str) -> bool:
    for domain in BLOCKED_DOMAINS:
        if domain in url:
            return True
    return False


def is_image_accessible(url: str) -> bool:
    """Vérifie qu'une image est accessible via une requête HEAD légère."""
    try:
        resp = requests.head(url, headers=HTTP_HEADERS, timeout=8, allow_redirects=True)
        return resp.status_code == 200
    except Exception:
        return False


def search_images_ddg(query: str, max_results: int = 10) -> List[str]:
    """Retourne une liste d'URLs candidates depuis DuckDuckGo Images."""
    try:
        ddgs = DDGS()
        results = list(ddgs.images(query, max_results=max_results))
        return [r.get("image", "") for r in results if r.get("image", "").startswith("http")]
    except Exception as exc:
        print(f"[COVER]   DDG erreur ({query!r}): {exc}")
        return []


def pick_valid_url(candidates: List[str]) -> Optional[str]:
    """Sélectionne la première URL accessible et non bloquée."""
    for url in candidates:
        if not url:
            continue
        if is_domain_blocked(url):
            continue
        if is_image_accessible(url):
            return url
    return None


def fetch_cover_image_url(
    specific_hashtag: str,
    generic_hashtag: str,
    title: str,
) -> Optional[str]:
    """
    Tente plusieurs requêtes en cascade pour trouver une cover valide.

    Cascade :
      1. Titre + hashtag spécifique + "tiktok"
      2. Titre + "tiktok trend" (sans hashtag)
      3. Hashtag générique + "tiktok"
      4. Mots-clés ASCII du titre uniquement
    """
    title_ascii = ascii_safe(title)
    specific_ascii = ascii_safe(specific_hashtag)
    generic_ascii = ascii_safe(generic_hashtag)

    queries = []
    if title_ascii and specific_ascii:
        queries.append(f"{title_ascii} #{specific_ascii} tiktok")
    if title_ascii:
        queries.append(f"{title_ascii} tiktok trend")
    if generic_ascii and generic_ascii != specific_ascii:
        queries.append(f"#{generic_ascii} tiktok")
    if title_ascii:
        # Juste les 2 premiers mots du titre, très générique
        keywords = " ".join(title_ascii.split()[:2])
        queries.append(f"{keywords} tiktok")

    for attempt, query in enumerate(queries, start=1):
        print(f"[COVER]   Tentative {attempt}: {query!r}")
        candidates = search_images_ddg(query, max_results=10)
        url = pick_valid_url(candidates)
        if url:
            return url
        time.sleep(0.5)

    return None


def main() -> None:
    if not OUTPUT_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {OUTPUT_FILE}")

    payload = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("JSON invalide: objet racine attendu.")

    trends = payload.get("tendances")
    if not isinstance(trends, list):
        trends = payload.get("trends")
    if not isinstance(trends, list):
        print("[COVER] Aucun tableau tendances/trends trouvé.")
        return

    for idx, trend in enumerate(trends[:10], start=1):
        if not isinstance(trend, dict):
            continue

        # Hashtag spécifique (champ m) et générique (champ hashtag)
        specific = normalize_hashtag(str(trend.get("m", "") or trend.get("k", "")))
        generic = normalize_hashtag(str(trend.get("hashtag", "") or trend.get("m", "")))
        title = str(trend.get("ti", "")).strip()

        hashtag_display = specific or generic
        if not hashtag_display and not title:
            print(f"[COVER] Trend {idx}: données insuffisantes, skip.")
            continue

        print(f"[COVER] Trend {idx}: recherche cover pour #{hashtag_display} ({title})...")
        cover_url = fetch_cover_image_url(specific, generic, title)

        if cover_url:
            trend["cover"] = cover_url
            print(f"[COVER] Trend {idx}: ✓ {cover_url[:90]}...")
        else:
            trend["cover"] = ""
            print(f"[COVER] Trend {idx}: ✗ aucune cover trouvée même avec les backups")

        # Pause polie entre les trends
        time.sleep(1.5)

    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\n[COVER] Enrichissement terminé : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
