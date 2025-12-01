from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.api.security import get_session_user_id
from app.api.users import load_users, find_user
from uvicorn import run

# Routers
from app.routes import pages, auth, pricing, consult, subscriptions, profile

app = FastAPI(title="Yoga Telegram Courses")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(pages.router)
app.include_router(pricing.router)
app.include_router(auth.router)
app.include_router(consult.router)
app.include_router(subscriptions.router)
app.include_router(profile.router)


@app.middleware("http")
async def add_session_user(request, call_next):
    uid = get_session_user_id(request)
    request.state.uid = uid
    request.state.user = None
    if uid:
        users = load_users()
        request.state.user = find_user(users, uid)
    response = await call_next(request)
    return response


@app.get("/healthz")
def healthz():
    return {"ok": True, "env": settings.ENV}

if __name__ == '__main__':
    run(app)
