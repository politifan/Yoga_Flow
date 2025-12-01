from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from fastapi.templating import Jinja2Templates
from app.api.storage import load_json
from app.api.security import get_session_user_id
from app.api.users import normalize_profile
from app.api.subscriptions import user_subscriptions


templates = Jinja2Templates(directory="templates")

router = APIRouter()


@router.get("/")
def home(req: Request):
    plans = load_json("data/plans.json")
    consult_ok = req.query_params.get("consult") == "ok"
    uid = get_session_user_id(req)
    return templates.TemplateResponse(
        "home.html",
        {"request": req, "plans": plans, "consult_ok": consult_ok, "uid": uid},
    )


@router.get("/dashboard")
def dashboard(req: Request):
    uid = get_session_user_id(req)
    if not uid:
        return RedirectResponse("/auth/login?next=/dashboard", status_code=303)
    users = load_json("data/users.json")
    user = next((u for u in users if u.get("id") == uid), None)
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": req,
            "user": normalize_profile(user) if user else None,
            "subs": user_subscriptions(uid),
        },
    )


@router.get("/api/plans")
def api_plans():
    return JSONResponse(load_json("data/plans.json"))
