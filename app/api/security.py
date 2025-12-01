from datetime import datetime
from typing import Optional, Dict, Any

import bcrypt
from fastapi import Request, Response
from itsdangerous import URLSafeSerializer, BadSignature

from app.config import settings


SESSION_COOKIE = "session"


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def _serializer() -> URLSafeSerializer:
    return URLSafeSerializer(settings.SECRET_KEY, salt="sess")


def create_session(resp: Response, user_id: str) -> None:
    payload = {"uid": user_id, "iat": datetime.utcnow().isoformat() + "Z"}
    token = _serializer().dumps(payload)
    resp.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=(settings.ENV.lower() == "prod"),
        path="/",
    )


def clear_session(resp: Response) -> None:
    resp.delete_cookie(SESSION_COOKIE, path="/")


def get_session(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    try:
        data = _serializer().loads(token)
        return data if isinstance(data, dict) else None
    except BadSignature:
        return None


def get_session_user_id(request: Request) -> Optional[str]:
    sess = get_session(request)
    return sess.get("uid") if sess else None
