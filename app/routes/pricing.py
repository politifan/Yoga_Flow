from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from app.api.storage import load_json


templates = Jinja2Templates(directory="templates")

router = APIRouter()


@router.get("/pricing")
def pricing(req: Request):
    plans = load_json("data/plans.json")
    return templates.TemplateResponse("pricing.html", {"request": req, "plans": plans})

