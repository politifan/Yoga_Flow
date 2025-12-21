from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from app.api.security import get_session_user_id
from app.api.tg_sync import (
    TOKEN_TTL_MINUTES,
    find_link_by_user,
    generate_token,
    load_links,
)
from app.api.users import find_user, load_users, normalize_profile
from app.config import settings

templates = Jinja2Templates(directory="templates")

router = APIRouter(prefix="/tg", tags=["telegram"])


@router.get("/link")
def tg_link(req: Request):
    uid = get_session_user_id(req)
    if not uid:
        return RedirectResponse("/auth/login?next=/tg/link", status_code=303)

    user = find_user(load_users(), uid)
    if not user:
        return RedirectResponse("/auth/login?next=/tg/link", status_code=303)

    token_data = generate_token(uid)
    bot_username = settings.USER_BOT_USERNAME or ""
    deep_link = f"https://t.me/{bot_username}?start={token_data['token']}" if bot_username else None

    return templates.TemplateResponse(
        "tg_link.html",
        {
            "request": req,
            "user": normalize_profile(user),
            "link": find_link_by_user(uid),
            "token": token_data["token"],
            "expires_at": token_data["expires_at"],
            "bot_username": bot_username,
            "deep_link": deep_link,
            "token_ttl": TOKEN_TTL_MINUTES,
            "links_count": len(load_links()),
        },
    )
