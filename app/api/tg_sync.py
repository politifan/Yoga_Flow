from datetime import datetime, timedelta
from secrets import token_urlsafe
from typing import Any, Dict, List, Optional, Tuple

from app.api.storage import load_json, save_json

LINKS_PATH = "data/tg_links.json"
TOKENS_PATH = "data/tg_tokens.json"
TOKEN_TTL_MINUTES = 15


def iso_now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def parse_iso(dt: Optional[str]) -> Optional[datetime]:
    if not dt:
        return None
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00"))
    except Exception:
        return None


def load_links() -> List[Dict[str, Any]]:
    data = load_json(LINKS_PATH)
    return data if isinstance(data, list) else []


def save_links(data: List[Dict[str, Any]]) -> None:
    save_json(LINKS_PATH, data)


def load_tokens() -> List[Dict[str, Any]]:
    data = load_json(TOKENS_PATH)
    return data if isinstance(data, list) else []


def save_tokens(data: List[Dict[str, Any]]) -> None:
    save_json(TOKENS_PATH, data)


def prune_tokens(tokens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    result = []
    for tok in tokens:
        if tok.get("used_at"):
            continue
        expires = parse_iso(tok.get("expires_at"))
        if not expires or expires <= now:
            continue
        result.append(tok)
    return result


def generate_token(user_id: str) -> Dict[str, Any]:
    tokens = prune_tokens(load_tokens())
    now = datetime.utcnow()
    expires_at = (now + timedelta(minutes=TOKEN_TTL_MINUTES)).isoformat() + "Z"
    record = {
        "token": token_urlsafe(16),
        "user_id": user_id,
        "created_at": iso_now(),
        "expires_at": expires_at,
        "used_at": None,
        "telegram_id": None,
    }
    tokens.append(record)
    save_tokens(tokens)
    return record


def consume_token(token: str, telegram_id: str) -> Tuple[Optional[Dict[str, Any]], str]:
    tokens = prune_tokens(load_tokens())
    match = next((t for t in tokens if t.get("token") == token), None)
    now = datetime.utcnow()
    if not match:
        save_tokens(tokens)
        return None, "invalid"

    expires = parse_iso(match.get("expires_at"))
    if not expires or expires <= now:
        tokens = [t for t in tokens if t.get("token") != token]
        save_tokens(tokens)
        return None, "expired"

    if match.get("used_at"):
        return None, "used"

    match["used_at"] = iso_now()
    match["telegram_id"] = str(telegram_id)
    save_tokens(tokens)

    links = load_links()
    links = [
        l for l in links
        if l.get("telegram_id") != str(telegram_id) and l.get("user_id") != match["user_id"]
    ]
    links.append(
        {
            "telegram_id": str(telegram_id),
            "user_id": match["user_id"],
            "linked_at": iso_now(),
        }
    )
    save_links(links)
    return match, "ok"


def find_link_by_telegram(telegram_id: str) -> Optional[Dict[str, Any]]:
    links = load_links()
    return next((l for l in links if str(l.get("telegram_id")) == str(telegram_id)), None)


def find_link_by_user(user_id: str) -> Optional[Dict[str, Any]]:
    links = load_links()
    return next((l for l in links if str(l.get("user_id")) == str(user_id)), None)
