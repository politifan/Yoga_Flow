from datetime import datetime

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.api.storage import load_json, save_json
from app.api.security import get_session_user_id
from app.api.subscriptions import serialize_subscription, user_subscriptions
from app.api.users import normalize_profile


templates = Jinja2Templates(directory="templates")


router = APIRouter()


@router.post("/subscribe")
def subscribe(req: Request, plan_id: str = Form(...)):
    uid = get_session_user_id(req)
    if not uid:
        return RedirectResponse("/auth/login?next=/pricing", status_code=303)
    subs = load_json("data/subscriptions.json")
    subs.append(
        {
            "id": f"s_{len(subs) + 1:04d}",
            "user_id": uid,
            "plan_id": plan_id,
            "status": "pending",
            "started_at": None,
            "ends_at": None,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
    )
    save_json("data/subscriptions.json", subs)
    return RedirectResponse("/dashboard?sub=ok", status_code=303)


@router.get("/subscriptions")
def subscriptions_api(req: Request):
    uid = get_session_user_id(req)
    if not uid:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    return {"ok": True, "subscriptions": user_subscriptions(uid)}


@router.get("/subscriptions/{sub_id}")
def subscription_detail(req: Request, sub_id: str):
    uid = get_session_user_id(req)
    if not uid:
        return RedirectResponse("/auth/login?next=/dashboard", status_code=303)
    users = load_json("data/users.json")
    user = next((u for u in users if u.get("id") == uid), None)
    data = load_json("data/subscriptions.json")
    plans = {p.get("id"): p for p in load_json("data/plans.json")}
    sub = next((s for s in data if s.get("id") == sub_id and s.get("user_id") == uid), None)
    if not sub:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    subs_json = serialize_subscription(sub, plans)
    return templates.TemplateResponse(
        "subscription_detail.html",
        {
            "request": req,
            "user": normalize_profile(user) if user else None,
            "subscription": subs_json,
        },
    )


@router.get("/subscriptions/{sub_id}/cancel")
def cancel_subscription(req: Request, sub_id: str):
    uid = get_session_user_id(req)
    if not uid:
        return RedirectResponse("/auth/login?next=/dashboard", status_code=303)
    subs = load_json("data/subscriptions.json")
    sub = next((s for s in subs if s.get("id") == sub_id and s.get("user_id") == uid), None)
    if not sub:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    sub["status"] = "cancelled"
    sub["ends_at"] = sub.get("ends_at") or sub.get("started_at")
    save_json("data/subscriptions.json", subs)
    return RedirectResponse("/dashboard?sub=cancelled", status_code=303)
