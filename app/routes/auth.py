from datetime import datetime

from fastapi import APIRouter, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from app.api.storage import load_json, save_json
from app.api.security import hash_password, verify_password, create_session, clear_session
from app.api.validators import is_email
from app.api.users import default_username, avatar_letter


templates = Jinja2Templates(directory="templates")

router = APIRouter(prefix="/auth")


@router.get("/register")
def register_form(req: Request):
    return templates.TemplateResponse("auth_register.html", {"request": req, "error": None})


@router.post("/register")
def register_post(req: Request, email: str = Form(...), password: str = Form(...), phone: str = Form("")):
    users = load_json("data/users.json")
    if not is_email(email):
        return templates.TemplateResponse("auth_register.html", {"request": req, "error": "Invalid email"})
    if any(u.get("email", "").lower() == email.lower() for u in users):
        return RedirectResponse("/auth/register?err=exists", status_code=303)

    username = default_username(email, (u.get("username") for u in users if u.get("username")))
    user = {
        "id": f"u_{len(users) + 1:04d}",
        "email": email,
        "password_hash": hash_password(password),
        "phone": phone,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "default_plan": None,
        "username": username,
        "avatar_letter": avatar_letter(email),
        "avatar_url": None,
    }
    users.append(user)
    save_json("data/users.json", users)
    resp = RedirectResponse(url="/dashboard", status_code=303)
    create_session(resp, user_id=user["id"])
    return resp


@router.get("/login")
def login_form(req: Request):
    err = req.query_params.get("err")
    return templates.TemplateResponse("auth_login.html", {"request": req, "error": err})


@router.post("/login")
def login_post(email: str = Form(...), password: str = Form(...)):
    users = load_json("data/users.json")
    user = next((u for u in users if u.get("email", "").lower() == email.lower()), None)
    if not user or not verify_password(password, user.get("password_hash", "")):
        return RedirectResponse("/auth/login?err=invalid", status_code=303)
    resp = RedirectResponse(url="/dashboard", status_code=303)
    create_session(resp, user_id=user["id"])
    return resp


@router.post("/logout")
def logout_post():
    resp = RedirectResponse("/", status_code=303)
    clear_session(resp)
    return resp
