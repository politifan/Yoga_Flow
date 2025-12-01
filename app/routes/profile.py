import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Body, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, constr
from PIL import Image

from app.api.security import get_session_user_id
from app.api.users import (
    USERNAME_PATTERN,
    find_user,
    load_users,
    save_users,
    username_taken,
)


MAX_AVATAR_BYTES = 5 * 1024 * 1024
AVATAR_SIZE = 256  # stored size; scaled down in CSS
UPLOAD_DIR = Path("static/uploads")


class UsernamePayload(BaseModel):
    username: constr(pattern=USERNAME_PATTERN, strip_whitespace=True)


router = APIRouter()


@router.post("/update-username")
def update_username(req: Request, payload: UsernamePayload = Body(...)):
    uid = get_session_user_id(req)
    if not uid:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    username = payload.username.strip()
    users = load_users()
    user = find_user(users, uid)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if username_taken(users, username, exclude_id=uid):
        raise HTTPException(status_code=409, detail="Имя уже занято. Попробуйте другое.")

    user["username"] = username
    save_users(users)
    return {"ok": True, "username": username}


def _process_image(contents: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(contents))
        image = image.convert("RGB")
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Не удалось прочитать изображение") from exc
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((AVATAR_SIZE, AVATAR_SIZE))
    return image


@router.post("/upload-avatar")
async def upload_avatar(req: Request, file: UploadFile = File(...)):
    uid = get_session_user_id(req)
    if not uid:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    if file.content_type not in ("image/png", "image/jpeg"):
        raise HTTPException(status_code=400, detail="Поддерживаются только PNG или JPG.")

    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Размер файла не должен превышать 5MB.")

    processed = _process_image(contents)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uid}_{uuid.uuid4().hex}.jpg"
    path = UPLOAD_DIR / filename
    processed.save(path, format="JPEG", quality=90)

    users = load_users()
    user = find_user(users, uid)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    public_url = f"/static/uploads/{filename}"
    user["avatar_url"] = public_url
    save_users(users)
    return {"ok": True, "avatar_url": public_url}
