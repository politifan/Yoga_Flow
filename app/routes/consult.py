from datetime import datetime

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse, JSONResponse

from app.api.storage import load_json, save_json
from app.api.validators import is_email, is_phone


router = APIRouter()


@router.post("/consult")
def consult_post(
    req: Request,
    name: str = Form(""),
    email: str = Form(...),
    phone: str = Form(...),
    plan: str = Form("undecided"),
    call_time: str = Form(""),
):
    wants_json = "application/json" in (req.headers.get("accept") or "").lower()
    if not is_email(email) or not is_phone(phone):
        if wants_json:
            return JSONResponse({"ok": False, "error": "Invalid email or phone"}, status_code=400)
        return RedirectResponse("/?consult=invalid", status_code=303)
    cons = load_json("data/consultations.json")
    cons.append(
        {
            "id": f"c_{len(cons) + 1:04d}",
            "name": name,
            "email": email,
            "phone": phone,
            "plan_interest": plan,
            "call_time": call_time,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "notes": "",
        }
    )
    save_json("data/consultations.json", cons)
    if wants_json:
        return {"ok": True}
    return RedirectResponse("/?consult=ok", status_code=303)

