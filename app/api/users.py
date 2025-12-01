import re
from typing import Any, Dict, Iterable, List, Optional

from app.api.storage import load_json, save_json


USERNAME_PATTERN = r"^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$"
USERNAME_RE = re.compile(USERNAME_PATTERN)


def _sanitize_username(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-zА-Яа-яЁё0-9_-]", "", value or "")
    return cleaned[:20]


def default_username(email: str, existing: Iterable[str]) -> str:
    local = (email or "").split("@")[0]
    candidate = _sanitize_username(local) or "yogi"
    candidate = candidate if len(candidate) >= 3 else f"{candidate}{'0'*(3-len(candidate))}"
    reserved = {e.lower() for e in existing}
    if candidate.lower() not in reserved:
        return candidate
    suffix = 1
    base = candidate[:-2] if len(candidate) >= 19 else candidate
    while True:
        proposal = f"{base}{suffix}"
        proposal = proposal[:20]
        if proposal.lower() not in reserved:
            return proposal
        suffix += 1


def avatar_letter(email: str) -> str:
    local = (email or "").split("@")[0]
    for char in local:
        if char.isalpha():
            return char.upper()
    return (local[:1] or "?").upper()


def load_users() -> List[Dict[str, Any]]:
    return load_json("data/users.json")


def save_users(users: List[Dict[str, Any]]) -> None:
    save_json("data/users.json", users)


def find_user(users: List[Dict[str, Any]], user_id: str) -> Optional[Dict[str, Any]]:
    return next((u for u in users if u.get("id") == user_id), None)


def username_taken(users: List[Dict[str, Any]], username: str, *, exclude_id: Optional[str] = None) -> bool:
    return any(
        u.get("username", "").lower() == username.lower()
        for u in users
        if u.get("username") and u.get("id") != exclude_id
    )


def normalize_profile(user: Dict[str, Any]) -> Dict[str, Any]:
    email = user.get("email", "")
    username = user.get("username") or (email.split("@")[0])
    username = username.strip() or "yogi"
    avatar_url = user.get("avatar_url")
    return {
        "id": user.get("id"),
        "email": email,
        "username": username,
        "avatar_letter": user.get("avatar_letter") or avatar_letter(email),
        "avatar_url": avatar_url,
    }
