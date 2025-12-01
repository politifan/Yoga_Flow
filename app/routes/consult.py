from datetime import datetime

from fastapi import APIRouter, Form
from fastapi.responses import RedirectResponse

from app.api.storage import load_json, save_json
from app.api.validators import is_email, is_phone


router = APIRouter()


@router.post("/consult")
def consult_post(name: str = Form(""), email: str = Form(...), phone: str = Form(...), plan: str = Form("undecided")):
    if not is_email(email) or not is_phone(phone):
        return RedirectResponse("/?consult=invalid", status_code=303)
    cons = load_json("data/consultations.json")
    cons.append(
        {
            "id": f"c_{len(cons) + 1:04d}",
            "name": name,
            "email": email,
            "phone": phone,
            "plan_interest": plan,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "notes": "",
        }
    )
    save_json("data/consultations.json", cons)
    return RedirectResponse("/?consult=ok", status_code=303)

